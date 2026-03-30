const { createApiError } = require('../utils/ApiError');
const { requestUpstream } = require('../utils/upstreamProxy');

const requestOrderService = async ({ path, method = 'GET', user, query }) => {
  const baseUrl = process.env.ORDER_SERVICE_URL || 'http://order-service:8087';
  return requestUpstream({
    baseUrl,
    path,
    method,
    user,
    query,
    timeout: 15000,
    responseType: path.includes('/export/csv') ? 'text' : 'json',
    fallbackMessage: 'Failed to fetch ledger data from order-service',
  });
};

const getAdminLedger = async (query, user) => {
  return requestOrderService({
    path: '/orders/admin/ledger',
    method: 'GET',
    user,
    query,
  });
};

const getAdminLedgerTransactionById = async (transactionId, user) => {
  const normalizedTransactionId = String(transactionId || '').trim();
  if (!normalizedTransactionId) {
    throw createApiError(400, 'Transaction ID is required');
  }

  return requestOrderService({
    path: `/orders/admin/ledger/${encodeURIComponent(normalizedTransactionId)}`,
    method: 'GET',
    user,
  });
};

const exportAdminLedgerCsv = async (query, user) => {
  return requestOrderService({
    path: '/orders/admin/ledger/export/csv',
    method: 'GET',
    user,
    query,
  });
};

module.exports = {
  getAdminLedger,
  getAdminLedgerTransactionById,
  exportAdminLedgerCsv,
};
