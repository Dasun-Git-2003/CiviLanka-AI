// backend/modules/member4_operations_audit/routes/auditRoutes.js
const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');

router.get('/', auditController.getAllAuditLogs);
router.get('/:id', auditController.getAuditLogById);

// Agentic AI compliance evaluation endpoint
router.post('/evaluate', auditController.evaluateAgentAudit);

module.exports = router;
