const express = require('express');
const router = express.Router();
const tenantService = require('../services/tenantService');
const { transactionLog } = require('./payments');
const { requireAuth, requireRole, requireAnyRole } = require('../middleware/auth');

// Onboard a new tenant (admin only)
router.post('/', requireAuth, requireRole('admin'), (req, res) => {
  const { name, preferredProcessor, apiKey } = req.body;
  if (!name || !preferredProcessor || !apiKey) {
    return res.status(400).json({ error: 'name, preferredProcessor, and apiKey are required' });
  }
  const newTenant = tenantService.addTenant({ name, preferredProcessor, apiKey });
  res.status(201).json(newTenant);
});

// Get tenant info (admin or viewer, only for their own tenant)
router.get('/:tenantId', requireAuth, requireAnyRole(['admin', 'viewer'], true), (req, res) => {
  const tenant = tenantService.getTenantById(req.params.tenantId);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  const { apiKey, ...tenantInfo } = tenant;
  res.json(tenantInfo);
});

// Get a mock LLM summary of recent tenant activity (admin or viewer, only for their own tenant)
router.get('/:tenantId/summary', requireAuth, requireAnyRole(['admin', 'viewer'], true), (req, res) => {
  const { tenantId } = req.params;
  const tenant = tenantService.getTenantById(tenantId);
  if (!tenant) {
    return res.status(404).json({ error: 'Tenant not found' });
  }
  const tenantTxs = transactionLog.filter(tx => tx.tenantId === tenantId);
  const total = tenantTxs.length;
  const success = tenantTxs.filter(tx => tx.success).length;
  const fail = total - success;
  const successRate = total ? Math.round((success / total) * 100) : 0;
  const highRisk = tenantTxs.filter(tx => tx.processor === 'paypal' && !tx.success).length;
  const summary = `Tenant '${tenant.name}' processed ${total} payments, with a ${successRate}% success rate. ${highRisk ? highRisk + ' high-risk transaction(s) were routed to PayPal.' : ''}`;
  res.json({ summary });
});

module.exports = router; 