const { requestUpstream } = require('../utils/upstreamProxy');

const requestService = async ({ baseUrl, path, user, query, timeout = 15000 }) => {
  return requestUpstream({
    baseUrl,
    path,
    user,
    query,
    timeout,
    fallbackMessage: 'Failed to fetch dashboard data',
  });
};

const VALID_ANALYTICS_WINDOWS = new Set(['last30', 'last90', 'last180', 'ytd']);

const startOfUtcDay = (value) => {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const endOfUtcDay = (value) => {
  const date = new Date(value);
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

const buildAnalyticsWindow = (windowKey = 'last180') => {
  const normalizedWindow = VALID_ANALYTICS_WINDOWS.has(String(windowKey || '').trim().toLowerCase())
    ? String(windowKey).trim().toLowerCase()
    : 'last180';

  const now = new Date();
  const to = endOfUtcDay(now);
  const from = startOfUtcDay(now);

  if (normalizedWindow === 'ytd') {
    from.setUTCMonth(0, 1);
  } else if (normalizedWindow === 'last30') {
    from.setUTCDate(from.getUTCDate() - 29);
  } else if (normalizedWindow === 'last90') {
    from.setUTCDate(from.getUTCDate() - 89);
  } else {
    from.setUTCDate(from.getUTCDate() - 179);
  }

  return {
    windowKey: normalizedWindow,
    from,
    to,
  };
};

const buildReportQueryFromWindow = ({ windowKey, from, to }) => {
  if (windowKey === 'last30' || windowKey === 'last90' || windowKey === 'ytd') {
    return {
      range: windowKey,
      recentLimit: 6,
    };
  }

  return {
    range: 'custom',
    from: from.toISOString(),
    to: to.toISOString(),
    recentLimit: 6,
  };
};

const toMonthKey = (date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;

const toMonthLabel = (date) => date.toLocaleDateString('en-US', {
  month: 'short',
  timeZone: 'UTC',
}).toUpperCase();

const buildMonthlyRevenueOverview = ({ rows = [], from, to, maxBuckets = 6 }) => {
  const monthBuckets = [];
  const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
  const endCursor = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), 1));

  while (cursor.getTime() <= endCursor.getTime()) {
    monthBuckets.push(new Date(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  const selectedBuckets = monthBuckets.slice(-maxBuckets);
  const amountByMonth = new Map(selectedBuckets.map((monthDate) => [toMonthKey(monthDate), 0]));

  rows.forEach((row) => {
    const date = row?.paidAt ? new Date(row.paidAt) : new Date(row?.createdAt || 0);
    if (Number.isNaN(date.getTime())) return;

    const key = toMonthKey(date);
    if (!amountByMonth.has(key)) return;

    const previous = Number(amountByMonth.get(key) || 0);
    amountByMonth.set(key, previous + Number(row?.amount || 0));
  });

  return selectedBuckets.map((monthDate) => {
    const key = toMonthKey(monthDate);
    return {
      label: toMonthLabel(monthDate),
      currentRevenue: Number(amountByMonth.get(key) || 0),
      previousRevenue: 0,
    };
  });
};

const parseVendorActivityDate = (application) => {
  const candidate =
    application?.approvedAt
    || application?.createdAt
    || application?.submittedAt
    || application?.updatedAt
    || null;

  if (!candidate) return null;

  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const fetchApprovedVendorApplications = async ({ vendorServiceUrl, user, maxPages = 100 }) => {
  const limit = 100;
  let skip = 0;
  let total = Number.POSITIVE_INFINITY;
  let safetyCounter = 0;
  const applications = [];

  while (skip < total && safetyCounter < maxPages) {
    // eslint-disable-next-line no-await-in-loop
    const payload = await requestService({
      baseUrl: vendorServiceUrl,
      path: '/api/vendor/applications',
      user,
      query: {
        status: 'APPROVED',
        limit,
        skip,
      },
    });

    const pageRows = Array.isArray(payload?.applications) ? payload.applications : [];
    const nextTotal = Number(payload?.total);

    if (Number.isFinite(nextTotal) && nextTotal >= 0) {
      total = nextTotal;
    }

    applications.push(...pageRows);

    if (pageRows.length < limit) {
      break;
    }

    skip += limit;
    safetyCounter += 1;
  }

  return {
    applications,
    total: Number.isFinite(total) ? total : applications.length,
  };
};

const countVendorApplicationsBetween = ({ applications = [], from, to }) => {
  const fromTs = from.getTime();
  const toTs = to.getTime();

  return applications.reduce((count, application) => {
    const activityDate = parseVendorActivityDate(application);
    if (!activityDate) return count;

    const ts = activityDate.getTime();
    return (ts >= fromTs && ts <= toTs) ? count + 1 : count;
  }, 0);
};

const fetchLedgerTransactionsForWindow = async ({ orderServiceUrl, user, from, to, maxPages = 50 }) => {
  const limit = 100;
  let page = 1;
  let totalPages = 1;
  const transactions = [];

  while (page <= totalPages && page <= maxPages) {
    // eslint-disable-next-line no-await-in-loop
    const ledgerPage = await requestService({
      baseUrl: orderServiceUrl,
      path: '/orders/admin/ledger',
      user,
      query: {
        page,
        limit,
        from: from.toISOString(),
        to: to.toISOString(),
        sortBy: 'createdAt',
        sortDir: 'asc',
      },
    });

    const pageRows = Array.isArray(ledgerPage?.transactions) ? ledgerPage.transactions : [];
    transactions.push(...pageRows);

    totalPages = Math.max(1, Number(ledgerPage?.pagination?.totalPages || totalPages));
    if (pageRows.length === 0) {
      break;
    }

    page += 1;
  }

  return transactions;
};

const calculateTrendPercent = (currentValue, previousValue) => {
  const current = Number(currentValue || 0);
  const previous = Number(previousValue || 0);

  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }

  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(2));
};

const normalizeStatus = (value) => String(value || '').trim().toUpperCase();

const parseEventDate = (event) => {
  const candidate =
    event?.schedule?.startAt
    || event?.schedule?.start
    || event?.eventDate
    || event?.createdAt
    || null;

  if (!candidate) return null;
  const date = new Date(candidate);
  if (Number.isNaN(date.getTime())) return null;
  return date;
};

const normalizeRevenueAmount = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? amount : 0;
};

const sumEventRevenue = (rows) => (Array.isArray(rows)
  ? rows.reduce((sum, row) => sum + normalizeRevenueAmount(row?.amount), 0)
  : 0);

const getAdminDashboard = async (query = {}, user) => {
  const orderServiceUrl = process.env.ORDER_SERVICE_URL || 'http://order-service:8087';
  const eventServiceUrl = process.env.EVENT_SERVICE_URL || 'http://event-service:8086';
  const userServiceUrl = process.env.USER_SERVICE_URL || 'http://user-service:8082';
  const vendorServiceUrl = process.env.VENDOR_SERVICE_URL || 'http://vendor-service:8084';

  const analyticsWindow = buildAnalyticsWindow(query.analyticsWindow || query.range || 'last180');
  const reportQuery = buildReportQueryFromWindow(analyticsWindow);

  const dashboardLimit = Math.min(Math.max(Number(query.limit || 150), 10), 500);

  const vendorsCurrentFrom = startOfUtcDay(analyticsWindow.to);
  vendorsCurrentFrom.setUTCDate(vendorsCurrentFrom.getUTCDate() - 29);
  const vendorsCurrentTo = endOfUtcDay(analyticsWindow.to);

  const vendorsPreviousTo = new Date(vendorsCurrentFrom.getTime() - 1);
  const vendorsPreviousFrom = startOfUtcDay(vendorsPreviousTo);
  vendorsPreviousFrom.setUTCDate(vendorsPreviousFrom.getUTCDate() - 29);

  const vendorsCurrent7From = startOfUtcDay(analyticsWindow.to);
  vendorsCurrent7From.setUTCDate(vendorsCurrent7From.getUTCDate() - 6);
  const vendorsCurrent7To = endOfUtcDay(analyticsWindow.to);

  const [
    reportData,
    planningData,
    promoteData,
    userStats,
    approvedVendorsResult,
    ledgerTransactions,
  ] = await Promise.all([
    requestService({
      baseUrl: orderServiceUrl,
      path: '/orders/admin/reports',
      user,
      query: reportQuery,
    }),
    requestService({
      baseUrl: eventServiceUrl,
      path: '/planning/admin/dashboard',
      user,
      query: { limit: dashboardLimit },
    }),
    requestService({
      baseUrl: eventServiceUrl,
      path: '/promote/admin/dashboard',
      user,
      query: { limit: dashboardLimit },
    }),
    requestService({
      baseUrl: userServiceUrl,
      path: '/stats',
      user,
    }),
    fetchApprovedVendorApplications({
      vendorServiceUrl,
      user,
    }),
    fetchLedgerTransactionsForWindow({
      orderServiceUrl,
      user,
      from: analyticsWindow.from,
      to: analyticsWindow.to,
    }),
  ]);

  const planningAssigned = Array.isArray(planningData?.assigned) ? planningData.assigned : [];
  const planningApplications = Array.isArray(planningData?.applications) ? planningData.applications : [];
  const promoteAssigned = Array.isArray(promoteData?.assigned) ? promoteData.assigned : [];
  const promoteApplications = Array.isArray(promoteData?.applications) ? promoteData.applications : [];

  const planningEvents = [...planningAssigned, ...planningApplications].map((item) => ({
    eventId: item?.eventId,
    name: item?.eventTitle || 'Untitled Event',
    status: normalizeStatus(item?.status),
    date: parseEventDate(item),
    source: 'PLANNING',
  }));

  const promoteEvents = [...promoteAssigned, ...promoteApplications].map((item) => ({
    eventId: item?.eventId,
    name: item?.eventTitle || 'Untitled Event',
    status: normalizeStatus(item?.eventStatus),
    date: parseEventDate(item),
    source: 'PROMOTE',
  }));

  const allEvents = [...planningEvents, ...promoteEvents]
    .filter((item) => item.eventId)
    .sort((a, b) => {
      const aTs = a.date ? a.date.getTime() : Number.MAX_SAFE_INTEGER;
      const bTs = b.date ? b.date.getTime() : Number.MAX_SAFE_INTEGER;
      return aTs - bTs;
    });

  const activeEventsCount = allEvents.filter((item) => {
    const s = normalizeStatus(item.status);
    return !['REJECTED', 'COMPLETED', 'COMPLETE', 'CANCELLED'].includes(s);
  }).length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingCandidates = allEvents.filter((item) => item.date && item.date.getTime() >= today.getTime());
  const chosenUpcoming = (upcomingCandidates.length > 0 ? upcomingCandidates : allEvents)
    .slice(0, 3);

  const revenueResults = await Promise.all(chosenUpcoming.map(async (eventItem) => {
    try {
      const byEvent = await requestService({
        baseUrl: orderServiceUrl,
        path: `/orders/admin/event/${encodeURIComponent(String(eventItem.eventId))}/transactions`,
        user,
      });

      return {
        eventId: eventItem.eventId,
        revenue: sumEventRevenue(byEvent?.transactions),
      };
    } catch (_error) {
      return {
        eventId: eventItem.eventId,
        revenue: 0,
      };
    }
  }));

  const revenueByEventId = new Map(revenueResults.map((item) => [item.eventId, item.revenue]));

  const upcomingEvents = chosenUpcoming.map((item) => ({
    eventId: item.eventId,
    name: item.name,
    status: item.status || 'UNKNOWN',
    date: item.date ? item.date.toISOString() : null,
    source: item.source,
    revenue: Number(revenueByEventId.get(item.eventId) || 0),
  }));

  const summary = reportData?.summary || {};
  const approvedVendorApplications = Array.isArray(approvedVendorsResult?.applications)
    ? approvedVendorsResult.applications
    : [];
  const totalApprovedVendors = Number(approvedVendorsResult?.total || approvedVendorApplications.length || 0);
  const vendorsCurrent30 = countVendorApplicationsBetween({
    applications: approvedVendorApplications,
    from: vendorsCurrentFrom,
    to: vendorsCurrentTo,
  });
  const vendorsPrevious30 = countVendorApplicationsBetween({
    applications: approvedVendorApplications,
    from: vendorsPreviousFrom,
    to: vendorsPreviousTo,
  });
  const vendorsCurrent7 = countVendorApplicationsBetween({
    applications: approvedVendorApplications,
    from: vendorsCurrent7From,
    to: vendorsCurrent7To,
  });
  const growthRatePercent = Number(summary?.growthRatePercent || 0);
  const vendorGrowthPercent = calculateTrendPercent(vendorsCurrent30, vendorsPrevious30);
  const revenueOverview = buildMonthlyRevenueOverview({
    rows: ledgerTransactions,
    from: analyticsWindow.from,
    to: analyticsWindow.to,
    maxBuckets: 6,
  });

  return {
    analyticsWindow: analyticsWindow.windowKey,
    summaryCards: {
      totalRevenue: Number(summary?.totalRevenue || 0),
      totalRevenueTrendPercent: growthRatePercent,
      activeEvents: activeEventsCount,
      activeEventsTrendPercent: activeEventsCount > 0
        ? Number(((upcomingEvents.length / activeEventsCount) * 100).toFixed(2))
        : 0,
      newVendors: vendorsCurrent30,
      newVendorsLast7Days: vendorsCurrent7,
      newVendorsTrendPercent: vendorGrowthPercent,
      monthlyGrowthPercent: growthRatePercent,
      monthlyGrowthTrendPercent: growthRatePercent,
    },
    revenueOverview,
    upcomingEvents,
    totals: {
      totalUsers: Number(userStats?.totalUsers || 0),
      totalVendors: totalApprovedVendors,
    },
  };
};

module.exports = {
  getAdminDashboard,
};
