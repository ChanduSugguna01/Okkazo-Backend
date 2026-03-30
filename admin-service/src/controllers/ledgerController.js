const ledgerService = require('../services/ledgerService');

const getAdminLedger = async (req, res) => {
  const result = await ledgerService.getAdminLedger(req.query, req.user);

  res.status(200).json({
    success: true,
    data: result,
  });
};

const getAdminLedgerTransactionById = async (req, res) => {
  const result = await ledgerService.getAdminLedgerTransactionById(req.params.transactionId, req.user);

  res.status(200).json({
    success: true,
    data: result,
  });
};

const exportAdminLedgerCsv = async (req, res) => {
  const csv = await ledgerService.exportAdminLedgerCsv(req.query, req.user);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="admin-ledger-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.status(200).send(csv);
};

module.exports = {
  getAdminLedger,
  getAdminLedgerTransactionById,
  exportAdminLedgerCsv,
};
