const express = require('express');
const router = express.Router({ mergeParams: true });
const tenantService = require('../services/tenantService');
const { decrypt } = require('../utils/encryption');
const stripeMock = require('../services/stripeMock');
const paypalMock = require('../services/paypalMock');
const { requireAuth, requireRole } = require('../middleware/auth');

// In-memory transaction log for demonstration
const transactionLog = [];

// Process a payment for a tenant
router.post('/', requireAuth, requireRole('admin', true), (req, res) => {
  const { tenantId } = req.params;
  const { amount, currency, source } = req.body;
  const tenant = tenantService.getTenantById(tenantId);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  const apiKey = decrypt(tenant.apiKey);
  let result;
  if (tenant.preferredProcessor === 'stripe') {
    result = stripeMock.processPayment({ amount, currency, source, apiKey });
  } else if (tenant.preferredProcessor === 'paypal') {
    result = paypalMock.processPayment({ amount, currency, source, apiKey });
  } else {
    return res.status(400).json({ error: 'Unsupported payment processor' });
  }
  // Log the transaction
  transactionLog.push({
    timestamp: new Date().toISOString(),
    tenantId,
    amount,
    currency,
    source,
    processor: tenant.preferredProcessor,
    success: result.success,
    transactionId: result.transactionId || null,
    error: result.error || null
  });
  res.json(result);
});

module.exports = { router, transactionLog }; 