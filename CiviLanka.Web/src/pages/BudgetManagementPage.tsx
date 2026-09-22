import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  Lock,
  Sliders,
  PieChart,
  Loader2,
  Building,
  RefreshCw,
} from 'lucide-react';
import { apiClient, getErrorMessage } from '../services/apiService';
import { authService } from '../services/authService';

interface DepartmentBudget {
  department: string;
  allocated: number;
  spent: number;
  committed: number;
}

interface BudgetSummary {
  totalAllocatedBudget: number;
  totalSpent: number;
  totalCommitted: number;
  remainingBudget: number;
  directorApprovalThreshold: number;
  fiscalYear: number;
  departmentBreakdown: DepartmentBudget[];
  scope: string;
}

export const BudgetManagementPage: React.FC = () => {
  const user = authService.getCurrentUser();
  const isDirector = user?.role === 'PublicWorksDirector' || user?.role?.toLowerCase()?.includes('director');

  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Threshold edit state for Director
  const [newThreshold, setNewThreshold] = useState<number>(500000);
  const [updatingThreshold, setUpdatingThreshold] = useState(false);
  const [thresholdSuccess, setThresholdSuccess] = useState(false);

  const fetchBudget = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<BudgetSummary>('/api/budget/summary');
      setSummary(res.data);
      if (res.data.directorApprovalThreshold) {
        setNewThreshold(res.data.directorApprovalThreshold);
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudget();
  }, []);

  const handleUpdateThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) return;

    try {
      setUpdatingThreshold(true);
      setError(null);
      await apiClient.post('/api/budget/threshold', { threshold: newThreshold });
      setThresholdSuccess(true);
      setTimeout(() => setThresholdSuccess(false), 3000);
      await fetchBudget();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setUpdatingThreshold(false);
    }
  };

  const formatLKR = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              {isDirector ? 'Municipal Fiscal Treasury & Budget Governance' : 'Field Operations Cost & Material Tracker'}
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                isDirector
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {isDirector ? 'Executive Treasury Level' : 'Supervisor Operational Scope'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {isDirector
              ? 'Multi-departmental capital expenditure oversight, threshold authorization limits, and audit governance.'
              : 'Operational work-order expenditures, contractor commitments, and equipment allocations.'}
          </p>
        </div>

        <button
          onClick={fetchBudget}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !summary ? (
        <div className="p-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-cyan-600" />
          <span>Loading municipal treasury ledger...</span>
        </div>
      ) : summary ? (
        <>
          {/* ── Summary Cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {isDirector ? 'Total Allocated Budget' : 'Annual Operations Cap'}
                </span>
                <DollarSign className="w-4 h-4 text-cyan-600" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {formatLKR(summary.totalAllocatedBudget)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono">FY {summary.fiscalYear} Municipal Allocation</div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Actual Disbursed</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-extrabold text-emerald-700">
                {formatLKR(summary.totalSpent)}
              </div>
              <div className="text-[11px] text-slate-500">
                {summary.totalAllocatedBudget > 0
                  ? `${Math.round((summary.totalSpent / summary.totalAllocatedBudget) * 100)}% of total fund utilized`
                  : 'No disbursements'}
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Committed / In Flight</span>
                <PieChart className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-extrabold text-amber-600">
                {formatLKR(summary.totalCommitted)}
              </div>
              <div className="text-[11px] text-slate-500">Active contractor contracts & orders</div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Available Liquidity</span>
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-extrabold text-blue-700">
                {formatLKR(summary.remainingBudget)}
              </div>
              <div className="text-[11px] text-slate-500">Uncommitted fiscal reserve</div>
            </div>
          </div>

          {/* ── Director Threshold Controls OR Supervisor Policy Card ───────── */}
          {isDirector ? (
            <div className="bg-gradient-to-r from-purple-50 via-white to-slate-50 rounded-2xl p-6 border border-purple-200 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold tracking-wider uppercase border border-purple-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Executive Approval Policy</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Work Order Director Approval Threshold
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Any work order or contractor estimation exceeding this threshold requires direct
                    sign-off from the Public Works Director before procurement dispatch.
                  </p>
                </div>

                <form onSubmit={handleUpdateThreshold} className="flex items-center gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Threshold Limit (LKR)
                    </label>
                    <input
                      type="number"
                      step="any"
                      value={newThreshold}
                      onChange={(e) => setNewThreshold(Number(e.target.value))}
                      className="w-48 p-2.5 rounded-xl border border-slate-300 bg-white font-mono font-bold text-sm text-slate-900 focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={updatingThreshold}
                    className="self-end px-4 py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-purple-700/20 disabled:opacity-50 flex items-center gap-2"
                  >
                    {updatingThreshold ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Sliders className="w-3.5 h-3.5" />
                    )}
                    <span>Apply Policy</span>
                  </button>
                </form>
              </div>

              {thresholdSuccess && (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Threshold policy updated and propagated to all work order dispatch workflows.</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-200/80 flex items-center justify-between text-xs text-blue-900">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <div>
                  <div className="font-bold">Director Approval Threshold Active</div>
                  <div className="text-blue-700 text-[11px]">
                    Work orders above {formatLKR(summary.directorApprovalThreshold)} are routed to the Public Works Directorate for sign-off.
                  </div>
                </div>
              </div>
              <div className="font-mono font-bold text-xs bg-white px-3 py-1.5 rounded-lg border border-blue-200">
                Limit: {formatLKR(summary.directorApprovalThreshold)}
              </div>
            </div>
          )}

          {/* ── Department Breakdown Table ────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Departmental Capital Breakdown</h3>
                <p className="text-xs text-slate-500">
                  Allocation and burn-rate tracking across municipal infrastructure sectors.
                </p>
              </div>
              <div className="text-xs text-slate-400 font-mono">Fiscal Year {summary.fiscalYear}</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Department / Division</th>
                    <th className="px-5 py-3 text-right">Allocated</th>
                    <th className="px-5 py-3 text-right">Disbursed (Spent)</th>
                    <th className="px-5 py-3 text-right">Committed</th>
                    <th className="px-5 py-3 text-right">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.departmentBreakdown?.map((dept, idx) => {
                    const utilPercent =
                      dept.allocated > 0
                        ? Math.min(100, Math.round(((dept.spent + dept.committed) / dept.allocated) * 100))
                        : 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3.5 font-bold text-slate-800 flex items-center gap-2">
                          <Building className="w-4 h-4 text-cyan-700" />
                          <span>{dept.department}</span>
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold text-slate-900">
                          {formatLKR(dept.allocated)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold text-emerald-700">
                          {formatLKR(dept.spent)}
                        </td>
                        <td className="px-5 py-3.5 text-right font-mono font-semibold text-amber-600">
                          {formatLKR(dept.committed)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-20 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  utilPercent > 90
                                    ? 'bg-red-500'
                                    : utilPercent > 70
                                    ? 'bg-amber-500'
                                    : 'bg-cyan-600'
                                }`}
                                style={{ width: `${utilPercent}%` }}
                              />
                            </div>
                            <span className="font-mono font-bold text-[11px] text-slate-700">
                              {utilPercent}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default BudgetManagementPage;
