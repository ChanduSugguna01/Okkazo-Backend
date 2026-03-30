const reportService = require('../services/reportService');

const getAdminReports = async (req, res) => {
  const result = await reportService.getAdminReports(req.query, req.user);

  res.status(200).json({
    success: true,
    data: result,
  });
};

module.exports = {
  getAdminReports,
};
