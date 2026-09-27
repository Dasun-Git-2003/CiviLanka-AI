// backend/modules/member4_operations_audit/controllers/lifecycleController.js
const { workOrders, budgetLogs, auditLogs } = require('../../../shared/mockDataStore');
const budgetService = require('../services/budgetService');
const safetyAuditAgent = require('../services/safetyAuditAgent');
const notificationService = require('../services/notificationService');

const VALID_STAGES = [
  'AI_PROPOSED',
  'PENDING_APPROVAL',
  'APPROVED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'VERIFIED',
  'CLOSED'
];

exports.getAllWorkOrders = (req, res) => {
  try {
    const { status, priority, is_arterial_road, assigned_worker } = req.query;
    let list = [...workOrders];

    if (status) {
      list = list.filter(w => w.status === status);
    }
    if (priority) {
      list = list.filter(w => w.priority.toUpperCase() === priority.toUpperCase());
    }
    if (is_arterial_road !== undefined) {
      list = list.filter(w => String(w.is_arterial_road) === String(is_arterial_road));
    }
    if (assigned_worker) {
      list = list.filter(w => w.assigned_worker && w.assigned_worker.toLowerCase().includes(assigned_worker.toLowerCase()));
    }

    res.json({ success: true, count: list.length, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWorkOrderById = (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = workOrders.find(w => w.id === id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    // Attach related logs for comprehensive detail view
    const relatedBudgetLog = budgetLogs.find(b => b.work_order_id === id) || null;
    const relatedAuditLogs = auditLogs.filter(a => a.work_order_id === id);

    res.json({
      success: true,
      data: {
        ...order,
        budget_log: relatedBudgetLog,
        audit_logs: relatedAuditLogs
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Evaluates initial proposal and routes to PENDING_APPROVAL or APPROVED
 */
exports.evaluateProposal = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = workOrders.find(w => w.id === id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    const check = budgetService.checkApprovalRequirement(order.estimated_cost, order.is_arterial_road);

    if (check.requiresDirectorApproval) {
      order.status = 'PENDING_APPROVAL';
      order.approval_status = 'PENDING';
      order.updated_at = new Date().toISOString();

      await notificationService.sendPushNotification({
        recipientRole: 'DIRECTOR',
        title: 'Action Required: Director Approval Needed',
        body: `Work Order #${order.id} (${order.title}) requires statutory approval: ${check.reasonSummary}`,
        data: { workOrderId: order.id, estimatedCost: order.estimated_cost }
      });
    } else {
      order.status = 'APPROVED';
      order.approval_status = 'APPROVED';
      order.approver_name = 'System Auto-Approved';
      order.approval_date = new Date().toISOString();
      order.updated_at = new Date().toISOString();

      // Automatically allocate budget
      budgetService.createBudgetLog({
        workOrderId: order.id,
        allocatedBudget: order.estimated_cost,
        estimatedCost: order.estimated_cost,
        actualCost: 0,
        approvedAmount: order.estimated_cost,
        approver: 'System Auto-Approved',
        notes: 'Auto-approved under routine threshold rules'
      });
    }

    res.json({
      success: true,
      message: `Work order transitioned to ${order.status}`,
      requiresDirectorApproval: check.requiresDirectorApproval,
      reasons: check.reasons,
      data: order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Public Works Director Human Approval Action
 * PENDING_APPROVAL -> APPROVED
 */
exports.directorApprove = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { approvedAmount, approverName = 'Dr. Anura Bandara (Director, Public Works)', notes } = req.body;
    const order = workOrders.find(w => w.id === id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    const approvedFunds = Number(approvedAmount || order.estimated_cost);

    order.status = 'APPROVED';
    order.approval_status = 'APPROVED';
    order.approver_name = approverName;
    order.approval_date = new Date().toISOString();
    order.updated_at = new Date().toISOString();

    // Create or update associated budget log
    const existingBudget = budgetLogs.find(b => b.work_order_id === id);
    if (!existingBudget) {
      budgetService.createBudgetLog({
        workOrderId: order.id,
        allocatedBudget: approvedFunds,
        estimatedCost: order.estimated_cost,
        actualCost: 0,
        approvedAmount: approvedFunds,
        approver: approverName,
        notes: notes || 'Approved by Public Works Director'
      });
    } else {
      existingBudget.approved_amount = approvedFunds;
      existingBudget.allocated_budget = approvedFunds;
      existingBudget.approver = approverName;
      existingBudget.approval_date = new Date().toISOString();
    }

    await notificationService.sendPushNotification({
      recipientRole: 'DISPATCHER',
      title: 'Work Order Approved',
      body: `Work Order #${order.id} approved by Director for LKR ${approvedFunds.toLocaleString()}. Ready for crew assignment.`,
      data: { workOrderId: order.id }
    });

    res.json({
      success: true,
      message: `Work Order #${order.id} approved successfully`,
      data: order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Assign Work Order to Field Crew / Worker
 * APPROVED -> ASSIGNED
 */
exports.assignWorkOrder = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { assignedCrew, assignedWorker } = req.body;
    const order = workOrders.find(w => w.id === id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    order.assigned_crew = assignedCrew || 'Crew #1 (Emergency Maintenance)';
    order.assigned_worker = assignedWorker || 'Kamal Perera';
    order.status = 'ASSIGNED';
    order.updated_at = new Date().toISOString();

    await notificationService.sendPushNotification({
      recipientRole: 'FIELD_WORKER',
      title: 'New Work Order Assigned',
      body: `You have been dispatched to ${order.title} at ${order.road_name}.`,
      data: { workOrderId: order.id, priority: order.priority }
    });

    res.json({
      success: true,
      message: `Work Order #${order.id} assigned to ${order.assigned_worker}`,
      data: order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Field Worker starts execution
 * ASSIGNED -> IN_PROGRESS
 */
exports.startWork = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = workOrders.find(w => w.id === id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    order.status = 'IN_PROGRESS';
    order.updated_at = new Date().toISOString();

    res.json({
      success: true,
      message: `Work Order #${order.id} marked IN_PROGRESS`,
      data: order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Field Worker submits completion evidence
 * IN_PROGRESS -> COMPLETED
 */
exports.completeWork = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const {
      actualCost,
      materialsUsed,
      beforePhoto,
      afterPhoto,
      completionNotes,
      completionLat,
      completionLng
    } = req.body;

    const order = workOrders.find(w => w.id === id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    if (actualCost !== undefined) order.actual_cost = Number(actualCost);
    if (materialsUsed) order.materials_json = Array.isArray(materialsUsed) ? materialsUsed : [materialsUsed];
    if (beforePhoto) order.before_photo = beforePhoto;
    if (afterPhoto) order.after_photo = afterPhoto;
    if (completionNotes) order.completion_notes = completionNotes;
    if (completionLat !== undefined) order.completion_lat = Number(completionLat);
    if (completionLng !== undefined) order.completion_lng = Number(completionLng);

    order.status = 'COMPLETED';
    order.updated_at = new Date().toISOString();

    // Update actual expenditure in budget log
    budgetService.updateActualSpend(order.id, order.actual_cost);

    res.json({
      success: true,
      message: `Work Order #${order.id} completed by field worker. Ready for Municipal Safety & Audit Agent verification.`,
      data: order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Trigger Municipal Safety & Audit Agent
 * COMPLETED -> VERIFIED (if PASS) or remains COMPLETED (if FAILED)
 */
exports.runAuditVerification = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = workOrders.find(w => w.id === id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    const budgetLog = budgetLogs.find(b => b.work_order_id === id) || null;

    // Run Municipal Safety & Audit Agent
    const auditResult = await safetyAuditAgent.auditWorkOrder(order, budgetLog);

    // Save to audit_logs table
    const newAuditLog = {
      id: auditLogs.length ? Math.max(...auditLogs.map(a => a.id)) + 1 : 1,
      work_order_id: order.id,
      compliance_status: auditResult.compliance,
      approval_required: auditResult.approval_required,
      safety_rules_passed: auditResult.safety_rules_passed,
      budget_threshold_passed: auditResult.budget_threshold_passed,
      gps_verified: auditResult.gps_verified,
      gps_distance_meters: auditResult.gps_distance_meters,
      before_photo_url: auditResult.before_photo_url,
      after_photo_url: auditResult.after_photo_url,
      materials_verified: auditResult.materials_verified,
      violations_json: auditResult.violations_json,
      ai_reasoning: auditResult.ai_reasoning,
      audited_at: new Date().toISOString()
    };
    auditLogs.unshift(newAuditLog);

    // If compliance is PASS, advance to VERIFIED
    if (auditResult.compliance === 'PASS') {
      order.status = 'VERIFIED';
      order.ai_recommendation = `Audit passed: ${auditResult.reason}`;
    } else {
      order.ai_recommendation = `Audit violation flagged: ${auditResult.violations_json.join('; ')}`;
    }
    order.updated_at = new Date().toISOString();

    res.json({
      success: true,
      message: `Audit completed: ${auditResult.compliance}`,
      auditResult: {
        compliance: auditResult.compliance,
        approval_required: auditResult.approval_required,
        reason: auditResult.reason,
        gps_distance_meters: auditResult.gps_distance_meters,
        violations: auditResult.violations_json,
        safety_notes: auditResult.safety_notes
      },
      workOrder: order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Close work order and reconcile budget
 * VERIFIED -> CLOSED
 */
exports.closeWorkOrder = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = workOrders.find(w => w.id === id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Work order not found' });
    }

    if (order.status !== 'VERIFIED') {
      return res.status(400).json({
        success: false,
        message: `Cannot close work order in status ${order.status}. Must be VERIFIED first.`
      });
    }

    order.status = 'CLOSED';
    order.updated_at = new Date().toISOString();

    // Reconcile budget
    const log = budgetLogs.find(b => b.work_order_id === id);
    if (log) {
      log.status = 'RECONCILED';
      log.notes = (log.notes ? log.notes + ' | ' : '') + 'Final reconciliation complete on ticket closure.';
    }

    res.json({
      success: true,
      message: `Work Order #${order.id} closed and budget reconciled.`,
      data: order
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
