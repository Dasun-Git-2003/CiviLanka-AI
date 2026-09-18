// backend/modules/member4_operations_audit/routes/lifecycleRoutes.js
const express = require('express');
const router = express.Router();
const lifecycleController = require('../controllers/lifecycleController');

// Standard Work Order querying
router.get('/', lifecycleController.getAllWorkOrders);
router.get('/:id', lifecycleController.getWorkOrderById);

// Lifecycle State Machine transitions (Owned by Member 4)
// AI_PROPOSED -> PENDING_APPROVAL
router.post('/:id/evaluate', lifecycleController.evaluateProposal);

// PENDING_APPROVAL -> APPROVED (Director Human Approval Rule)
router.post('/:id/approve', lifecycleController.directorApprove);

// APPROVED -> ASSIGNED
router.post('/:id/assign', lifecycleController.assignWorkOrder);

// ASSIGNED -> IN_PROGRESS (Field Worker action)
router.post('/:id/start', lifecycleController.startWork);

// IN_PROGRESS -> COMPLETED (Field Worker action with photo evidence & GPS)
router.post('/:id/complete', lifecycleController.completeWork);

// COMPLETED -> VERIFIED (Municipal Safety & Audit Agent verification)
router.post('/:id/audit', lifecycleController.runAuditVerification);

// VERIFIED -> CLOSED (Final reconciliation)
router.post('/:id/close', lifecycleController.closeWorkOrder);

module.exports = router;
