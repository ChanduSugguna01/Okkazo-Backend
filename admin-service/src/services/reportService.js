const { requestUpstream } = require('../utils/upstreamProxy');

const getAdminReports = async (query, user) => {
  const baseUrl = process.env.ORDER_SERVICE_URL || 'http://order-service:8087';
  return requestUpstream({
    baseUrl,
    path: '/orders/admin/reports',
    user,
    query,
    timeout: 15000,
    fallbackMessage: 'Failed to fetch report data from order-service',
  });
};

module.exports = {
  getAdminReports,
};
