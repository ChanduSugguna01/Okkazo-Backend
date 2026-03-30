const dashboardService = require('../services/dashboardService');

const getAdminDashboard = async (req, res) => {
  const result = await dashboardService.getAdminDashboard(req.query, req.user);

  res.status(200).json({
    success: true,
    data: result,
  });
};

module.exports = {
  getAdminDashboard,
};
