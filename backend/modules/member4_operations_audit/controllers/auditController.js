// backend/modules/member4_operations_audit/controllers/auditController.js
const { auditLogs, workOrders, budgetLogs } = require('../../../shared/mockDataStore');
const safetyAuditAgent = require('../services/safetyAuditAgent');

exports.getAllAuditLogs = (req, res) => {
  try {
    const { compliance_status, work_order_id } = req.query;
    let list = [...auditLogs];

    if (compliance_status) {
      list = list.filter(a => a.compliance_status.toUpperCase() === compliance_status.toUpperCase());
    }
    if (work_order_id) {
      list = list.filter(a => a.work_order_id === Number(work_order_id));
    }

    res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAuditLogById = (req, res) => {
  try {
    const id = Number(req.params.id);
    const log = auditLogs.find(a => a.id === id);

    if (!log) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Dedicated AI Agent API endpoint
 * Standard format matching PDF:
 * {"compliance":"PASS","approval_required":true,"reason":"Estimated cost exceeds threshold"}
 */
exports.evaluateAgentAudit = async (req, res) => {
  try {
    const { workOrderId } = req.body;
    const order = workOrders.find(w => w.id === Number(workOrderId));

    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Work Order #${workOrderId} not found.`
      });
    }

    const budgetLog = budgetLogs.find(b => b.work_order_id === order.id) || null;
    const auditRecord = await safetyAuditAgent.auditWorkOrder(order, budgetLog);

    // Return the exact JSON structure defined in the PDF specification
    res.json({
      compliance: auditRecord.compliance,
      approval_required: auditRecord.approval_required,
      reason: auditRecord.reason,
      details: {
        work_order_id: order.id,
        gps_distance_meters: auditRecord.gps_distance_meters,
        gps_verified: auditRecord.gps_verified,
        safety_rules_passed: auditRecord.safety_rules_passed,
        budget_threshold_passed: auditRecord.budget_threshold_passed,
        violations: auditRecord.violations_json,
        safety_notes: auditRecord.safety_notes
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
