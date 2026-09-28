// backend/tests/budgetService.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const budgetService = require('../modules/member4_operations_audit/services/budgetService');

describe('BudgetService - Human Approval Rules', () => {
  it('should not require director approval for low-cost, non-arterial jobs', () => {
    const result = budgetService.checkApprovalRequirement(850, false);
    assert.equal(result.requiresDirectorApproval, false);
    assert.equal(result.reasons.length, 0);
  });

  it('should require director approval when estimated cost exceeds LKR 1,000 threshold', () => {
    const result = budgetService.checkApprovalRequirement(1500, false);
    assert.equal(result.requiresDirectorApproval, true);
    assert.ok(result.reasons.some((r) => r.includes('exceeds LKR 1,000')));
  });

  it('should require director approval for designated arterial roads even under budget', () => {
    const result = budgetService.checkApprovalRequirement(600, true);
    assert.equal(result.requiresDirectorApproval, true);
    assert.ok(result.reasons.some((r) => r.includes('arterial road')));
  });

  it('should record both reasons when cost exceeds limit and road is arterial', () => {
    const result = budgetService.checkApprovalRequirement(55000, true);
    assert.equal(result.requiresDirectorApproval, true);
    assert.equal(result.reasons.length, 2);
  });
});

describe('BudgetService - KPI Summary Calculation', () => {
  it('should calculate budget metrics and utilization rate', () => {
    const summary = budgetService.getBudgetSummary();
    assert.ok(typeof summary.totalAllocated === 'number');
    assert.ok(typeof summary.totalApproved === 'number');
    assert.ok(typeof summary.totalActualSpent === 'number');
    assert.equal(summary.remainingBudget, summary.totalAllocated - summary.totalActualSpent);
    assert.ok(summary.utilizationRate >= 0);
  });
});
