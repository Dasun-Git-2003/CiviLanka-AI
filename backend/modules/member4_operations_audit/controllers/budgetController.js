// backend/modules/member4_operations_audit/controllers/budgetController.js
const { budgetLogs } = require('../../../shared/mockDataStore');
const budgetService = require('../services/budgetService');

exports.getBudgetSummary = (req, res) => {
  try {
    const summary = budgetService.getBudgetSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllBudgetLogs = (req, res) => {
  try {
    const { status, work_order_id } = req.query;
    let results = [...budgetLogs];

    if (status) {
      results = results.filter(b => b.status === status);
    }
    if (work_order_id) {
      results = results.filter(b => b.work_order_id === Number(work_order_id));
    }

    res.json({ success: true, count: results.length, data: results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBudgetLogById = (req, res) => {
  try {
    const id = Number(req.params.id);
    const log = budgetLogs.find(b => b.id === id);

    if (!log) {
      return res.status(404).json({ success: false, message: 'Budget log not found' });
    }

    res.json({ success: true, data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createBudgetLog = (req, res) => {
  try {
    const { workOrderId, allocatedBudget, estimatedCost, actualCost, approvedAmount, approver, notes } = req.body;

    if (!workOrderId || !allocatedBudget || !estimatedCost) {
      return res.status(400).json({
        success: false,
        message: 'workOrderId, allocatedBudget, and estimatedCost are required'
      });
    }

    const newLog = budgetService.createBudgetLog({
      workOrderId,
      allocatedBudget,
      estimatedCost,
      actualCost,
      approvedAmount,
      approver,
      notes
    });

    res.status(201).json({ success: true, message: 'Budget log created successfully', data: newLog });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateBudgetLog = (req, res) => {
  try {
    const id = Number(req.params.id);
    const log = budgetLogs.find(b => b.id === id);

    if (!log) {
      return res.status(404).json({ success: false, message: 'Budget log not found' });
    }

    const { allocated_budget, actual_cost, approved_amount, status, notes } = req.body;

    if (allocated_budget !== undefined) log.allocated_budget = Number(allocated_budget);
    if (actual_cost !== undefined) log.actual_cost = Number(actual_cost);
    if (approved_amount !== undefined) log.approved_amount = Number(approved_amount);
    if (status !== undefined) log.status = status;
    if (notes !== undefined) log.notes = notes;

    log.remaining_budget = Number(log.allocated_budget) - Number(log.actual_cost);
    if (log.actual_cost > log.approved_amount) {
      log.status = 'EXCEEDED';
    }

    res.json({ success: true, message: 'Budget log updated successfully', data: log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteBudgetLog = (req, res) => {
  try {
    const id = Number(req.params.id);
    const index = budgetLogs.findIndex(b => b.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Budget log not found' });
    }

    const deleted = budgetLogs.splice(index, 1)[0];
    res.json({ success: true, message: 'Budget log deleted successfully', data: deleted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
