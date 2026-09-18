// backend/modules/member4_operations_audit/services/budgetService.js
const { budgetLogs, workOrders } = require('../../../shared/mockDataStore');

class BudgetService {
  /**
   * Get overall municipal budget summary and KPIs
   */
  getBudgetSummary() {
    const totalAllocated = budgetLogs.reduce((sum, b) => sum + Number(b.allocated_budget || 0), 0);
    const totalApproved = budgetLogs.reduce((sum, b) => sum + Number(b.approved_amount || 0), 0);
    const totalActualSpent = budgetLogs.reduce((sum, b) => sum + Number(b.actual_cost || 0), 0);
    const remainingBudget = totalAllocated - totalActualSpent;

    const pendingApprovalsCount = workOrders.filter(w => w.status === 'PENDING_APPROVAL').length;
    const overBudgetCount = budgetLogs.filter(b => Number(b.actual_cost) > Number(b.approved_amount)).length;

    return {
      totalAllocated,
      totalApproved,
      totalActualSpent,
      remainingBudget,
      pendingApprovalsCount,
      overBudgetCount,
      utilizationRate: totalAllocated > 0 ? ((totalActualSpent / totalAllocated) * 100).toFixed(1) : 0
    };
  }

  /**
   * Check whether an estimated cost or arterial road necessitates Director Approval
   * Human Approval Rule: Public Works Director approval is mandatory when:
   * 1. estimated repair cost exceeds LKR 1,000 OR
   * 2. the work involves a high-risk arterial road.
   */
  checkApprovalRequirement(estimatedCost, isArterialRoad) {
    const cost = Number(estimatedCost || 0);
    const costExceeded = cost > 1000;
    const arterial = Boolean(isArterialRoad);

    const requiresDirectorApproval = costExceeded || arterial;

    let reasons = [];
    if (costExceeded) {
      reasons.push(`Estimated cost (LKR ${cost.toLocaleString()}) exceeds LKR 1,000 statutory limit`);
    }
    if (arterial) {
      reasons.push(`Job involves a designated high-risk arterial road corridor`);
    }

    return {
      requiresDirectorApproval,
      reasons,
      reasonSummary: reasons.join('; ') || 'Standard low-risk maintenance within autonomous limits'
    };
  }

  /**
   * Create a new budget log entry
   */
  createBudgetLog({ workOrderId, allocatedBudget, estimatedCost, actualCost = 0, approvedAmount, approver, notes }) {
    const remaining = Number(allocatedBudget) - Number(actualCost);
    const newEntry = {
      id: budgetLogs.length ? Math.max(...budgetLogs.map(b => b.id)) + 1 : 1,
      work_order_id: Number(workOrderId),
      allocated_budget: Number(allocatedBudget),
      estimated_cost: Number(estimatedCost),
      actual_cost: Number(actualCost),
      approved_amount: Number(approvedAmount || allocatedBudget),
      remaining_budget: remaining,
      approver: approver || 'Public Works Director',
      approval_date: new Date().toISOString(),
      status: actualCost > (approvedAmount || allocatedBudget) ? 'EXCEEDED' : 'ACTIVE',
      notes: notes || 'Allocated via Maintenance Operations & Audit module',
      created_at: new Date().toISOString()
    };

    budgetLogs.unshift(newEntry);
    return newEntry;
  }

  /**
   * Update actual expenditure for a work order
   */
  updateActualSpend(workOrderId, actualSpend) {
    const log = budgetLogs.find(b => b.work_order_id === Number(workOrderId));
    if (log) {
      log.actual_cost = Number(actualSpend);
      log.remaining_budget = Number(log.allocated_budget) - Number(actualSpend);
      if (log.actual_cost > log.approved_amount) {
        log.status = 'EXCEEDED';
      }
      return log;
    }
    return null;
  }
}

module.exports = new BudgetService();
