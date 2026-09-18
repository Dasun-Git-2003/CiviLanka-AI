// CiviLanka.Web/src/pages/BudgetManagement.tsx
import React, { useState } from 'react';
import {
  Coins,
  DollarSign,
  TrendingUp,
  AlertCircle,
  PlusCircle,
  Trash2,
  Edit2,
  XCircle,
  FileSpreadsheet,
} from 'lucide-react';
import { INITIAL_BUDGET_LOGS, type BudgetLog } from '../data/member4Data';

export default function BudgetManagement() {
  const [logs, setLogs] = useState<BudgetLog[]>(INITIAL_BUDGET_LOGS);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLog, setEditingLog] = useState<BudgetLog | null>(null);
  const [formData, setFormData] = useState({
    workOrderId: '',
    allocatedBudget: '',
    estimatedCost: '',
    actualCost: '0',
    approvedAmount: '',
    approver: 'Dr. Anura Bandara (Director, Public Works)',
    notes: 'Municipal infrastructure maintenance fund',
  });

  const totalAllocated = logs.reduce((sum, b) => sum + b.allocated_budget, 0);
  const totalApproved = logs.reduce((sum, b) => sum + b.approved_amount, 0);
  const totalActual = logs.reduce((sum, b) => sum + b.actual_cost, 0);
  const remaining = totalAllocated - totalActual;
  const overrunCount = logs.filter((b) => b.actual_cost > b.approved_amount).length;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLog) {
      setLogs((prev) =>
        prev.map((l) =>
          l.id === editingLog.id
            ? {
                ...l,
                allocated_budget: Number(formData.allocatedBudget),
                actual_cost: Number(formData.actualCost),
                approved_amount: Number(formData.approvedAmount),
                remaining_budget: Number(formData.allocatedBudget) - Number(formData.actualCost),
                status:
                  Number(formData.actualCost) > Number(formData.approvedAmount)
                    ? 'EXCEEDED'
                    : l.status,
                notes: formData.notes,
              }
            : l
        )
      );
      setEditingLog(null);
    } else {
      const newEntry: BudgetLog = {
        id: logs.length ? Math.max(...logs.map((l) => l.id)) + 1 : 1,
        work_order_id: Number(formData.workOrderId),
        allocated_budget: Number(formData.allocatedBudget),
        estimated_cost: Number(formData.estimatedCost),
        actual_cost: Number(formData.actualCost),
        approved_amount: Number(formData.approvedAmount || formData.allocatedBudget),
        remaining_budget: Number(formData.allocatedBudget) - Number(formData.actualCost),
        approver: formData.approver,
        approval_date: new Date().toISOString(),
        status:
          Number(formData.actualCost) >
          Number(formData.approvedAmount || formData.allocatedBudget)
            ? 'EXCEEDED'
            : 'ACTIVE',
        notes: formData.notes,
        created_at: new Date().toISOString(),
      };
      setLogs([newEntry, ...logs]);
      setShowAddModal(false);
    }
  };

  const handleDelete = (id: number) => {
    if (window.confirm(`Delete Budget Log #${id}?`)) {
      setLogs((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const handleOpenEdit = (log: BudgetLog) => {
    setEditingLog(log);
    setFormData({
      workOrderId: log.work_order_id.toString(),
      allocatedBudget: log.allocated_budget.toString(),
      estimatedCost: log.estimated_cost.toString(),
      actualCost: log.actual_cost.toString(),
      approvedAmount: log.approved_amount.toString(),
      approver: log.approver,
      notes: log.notes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Budget Operations & Ledger</h1>
              <p className="text-sm text-slate-500">
                CRUD Ownership: <strong>Member 4</strong> (Maintenance Operations & Audit)
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingLog(null);
            setFormData({
              workOrderId: '',
              allocatedBudget: '',
              estimatedCost: '',
              actualCost: '0',
              approvedAmount: '',
              approver: 'Dr. Anura Bandara (Director, Public Works)',
              notes: 'Supplemental municipal infrastructure allocation',
            });
            setShowAddModal(true);
          }}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Create Budget Log
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
            <span>Total Allocated Budget</span>
            <Coins className="w-4 h-4 text-primary-600" />
          </div>
          <p className="text-2xl font-extrabold text-slate-800">
            LKR {totalAllocated.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Approved municipal ceiling</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
            <span>Actual Expenditure</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">
            LKR {totalActual.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Utilization: {((totalActual / (totalAllocated || 1)) * 100).toFixed(1)}%
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
            <span>Remaining Contingency</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-extrabold text-amber-600">
            LKR {remaining.toLocaleString()}
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Available reserve fund</span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center text-xs text-slate-500 mb-2">
            <span>Overrun / Variance Flags</span>
            <AlertCircle className="w-4 h-4 text-red-600" />
          </div>
          <p className={`text-2xl font-extrabold ${overrunCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {overrunCount} Flags
          </p>
          <span className="text-[11px] text-slate-400 mt-1 block">Actual &gt; approved threshold</span>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-800">
              BudgetLogs Data Table (Entity: Member 4)
            </h3>
          </div>
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded">
            {logs.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
              <tr>
                <th className="p-3">Log ID</th>
                <th className="p-3">Work Order</th>
                <th className="p-3">Allocated</th>
                <th className="p-3">Estimated</th>
                <th className="p-3">Actual Spent</th>
                <th className="p-3">Approved Amount</th>
                <th className="p-3">Remaining</th>
                <th className="p-3">Approver</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => {
                const isOverrun = log.actual_cost > log.approved_amount;
                return (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3 font-bold text-primary-700">#{log.id}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-bold rounded">
                        WO #{log.work_order_id}
                      </span>
                    </td>
                    <td className="p-3 font-medium">LKR {log.allocated_budget.toLocaleString()}</td>
                    <td className="p-3 text-slate-400">LKR {log.estimated_cost.toLocaleString()}</td>
                    <td className={`p-3 font-bold ${isOverrun ? 'text-red-600' : 'text-emerald-600'}`}>
                      LKR {log.actual_cost.toLocaleString()}
                    </td>
                    <td className="p-3 font-medium">LKR {log.approved_amount.toLocaleString()}</td>
                    <td className={`p-3 font-semibold ${log.remaining_budget < 0 ? 'text-red-600' : 'text-slate-800'}`}>
                      LKR {log.remaining_budget.toLocaleString()}
                    </td>
                    <td className="p-3">{log.approver}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                          log.status === 'RECONCILED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.status === 'EXCEEDED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-primary-100 text-primary-800'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-1">
                      <button
                        onClick={() => handleOpenEdit(log)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 rounded"
                        title="Edit Log"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(log.id)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                        title="Delete Log"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {(showAddModal || editingLog) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                {editingLog ? `Edit Budget Log #${editingLog.id}` : 'Create New Budget Log'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingLog(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Work Order ID</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    value={formData.workOrderId}
                    onChange={(e) => setFormData({ ...formData, workOrderId: e.target.value })}
                    required
                    disabled={!!editingLog}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Allocated Budget (LKR)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    value={formData.allocatedBudget}
                    onChange={(e) => setFormData({ ...formData, allocatedBudget: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estimated Cost (LKR)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    value={formData.estimatedCost}
                    onChange={(e) => setFormData({ ...formData, estimatedCost: e.target.value })}
                    required
                    disabled={!!editingLog}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Approved Amount (LKR)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    value={formData.approvedAmount}
                    onChange={(e) => setFormData({ ...formData, approvedAmount: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Actual Spend (LKR)</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    value={formData.actualCost}
                    onChange={(e) => setFormData({ ...formData, actualCost: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Authorizing Approver</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    value={formData.approver}
                    onChange={(e) => setFormData({ ...formData, approver: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Notes</label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingLog(null);
                  }}
                  className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow-sm"
                >
                  Save Budget Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
