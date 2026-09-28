import React, { useState, useEffect } from 'react';
import {
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
  PlusCircle,
  Wallet,
  History,
  ArrowUpRight,
  X,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { apiClient, getErrorMessage } from '../services/apiService';
import { authService } from '../services/authService';

interface DepartmentBudget {
  department: string;
  allocated: number;
  spent: number;
  committed: number;
  remaining: number;
  utilizationPercent: number;
}

interface BudgetAllocationItem {
  id: string;
  amount: number;
  allocationType: string;
  sector: string;
  allocatedBy: string;
  notes: string;
  timestamp: string;
}

interface BudgetSummary {
  accessLevel: string;
  isDirector: boolean;
  totalAllocatedBudget: number;
  allocatedTreasuryBudget: number;
  totalSpent: number;
  totalCommitted: number;
  remainingBudget: number;
  uncommittedBudget: number;
  burnRatePercent: number;
  actualSpentPercent: number;
  directorApprovalThreshold: number;
  requireDirectorApprovalAlways: boolean;
  fiscalYear: number;
  workOrdersEstimatedTotal: number;
  workOrdersActualTotal: number;
  maintenanceActualTotal: number;
  totalLabourHours: number;
  activeWorkOrdersCount: number;
  departmentBreakdown: DepartmentBudget[];
  quarterlyAllocations: Array<{ quarter: string; allocated: number; spent: number; status: string }>;
  allocationHistory: BudgetAllocationItem[];
  notice?: string | null;
}

export const BudgetManagementPage: React.FC = () => {
  const user = authService.getCurrentUser();
  const isDirector = user?.role === 'PublicWorksDirector' || user?.role?.toLowerCase()?.includes('director');

  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Budget Modal State (Director Only)
  const [showAddBudgetModal, setShowAddBudgetModal] = useState(false);
  const [addAmount, setAddAmount] = useState<number | ''>('');
  const [allocationType, setAllocationType] = useState<'TOP_UP' | 'SET_TOTAL'>('TOP_UP');
  const [targetSector, setTargetSector] = useState('All Municipal Sectors');
  const [allocationNotes, setAllocationNotes] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [allocateSuccess, setAllocateSuccess] = useState<string | null>(null);
  const [allocateError, setAllocateError] = useState<string | null>(null);

  // Threshold edit state for Director
  const [showThresholdForm, setShowThresholdForm] = useState(false);
  const [newThreshold, setNewThreshold] = useState<number>(0);
  const [updatingThreshold, setUpdatingThreshold] = useState(false);
  const [thresholdSuccess, setThresholdSuccess] = useState(false);

  const fetchBudget = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<BudgetSummary>('/api/budget/summary');
      setSummary(res.data);
      if (res.data.directorApprovalThreshold !== undefined) {
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

  const handleAddBudgetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) return;
    if (!addAmount || Number(addAmount) <= 0) {
      setAllocateError('Please enter a valid budget amount greater than 0.');
      return;
    }

    try {
      setAllocating(true);
      setAllocateError(null);
      await apiClient.post('/api/budget/allocate', {
        amount: Number(addAmount),
        allocationType,
        sector: targetSector,
        notes: allocationNotes || undefined,
      });

      setAllocateSuccess(
        allocationType === 'TOP_UP'
          ? `Successfully added ${formatLKR(Number(addAmount))} to the municipal operational budget.`
          : `Successfully set total municipal budget to ${formatLKR(Number(addAmount))}.`
      );
      setAddAmount('');
      setAllocationNotes('');
      await fetchBudget();

      setTimeout(() => {
        setAllocateSuccess(null);
        setShowAddBudgetModal(false);
      }, 2000);
    } catch (err) {
      setAllocateError(getErrorMessage(err));
    } finally {
      setAllocating(false);
    }
  };

  const handleUpdateThreshold = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) return;

    try {
      setUpdatingThreshold(true);
      setError(null);
      await apiClient.post('/api/budget/threshold', { newThreshold });
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
    }).format(amount || 0);
  };

  // Quick preset helper
  const handleQuickAddPreset = (val: number) => {
    setAddAmount((prev) => (prev ? Number(prev) + val : val));
  };

  return (
    <div className="space-y-6">
      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">
              {isDirector ? 'Municipal Fiscal Treasury & Operational Budget' : 'Field Operations Cost & Material Tracker'}
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
              ? 'Authoritative municipal capital expenditure allocation, top-up grants, and live burn-rate governance.'
              : 'Operational work-order expenditures, contractor commitments, and remaining liquid balance.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* Director Only: Add Budget Action */}
          {isDirector && (
            <button
              onClick={() => {
                setAllocateError(null);
                setAllocateSuccess(null);
                setShowAddBudgetModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all shadow-sm shadow-purple-700/25"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Budget Funds</span>
            </button>
          )}

          {isDirector && (
            <button
              onClick={() => setShowThresholdForm((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
            >
              <Sliders className="w-3.5 h-3.5 text-slate-500" />
              <span>{showThresholdForm ? 'Hide Policy' : 'Approval Policy'}</span>
            </button>
          )}

          <button
            onClick={fetchBudget}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Ledger</span>
          </button>
        </div>
      </div>

      {/* Role Notice for Supervisors */}
      {!isDirector && summary?.notice && (
        <div className="bg-blue-50/70 border border-blue-200 text-blue-900 rounded-xl p-3.5 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Lock className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>{summary.notice}</span>
          </div>
          <span className="font-mono text-[10px] uppercase font-bold bg-white px-2.5 py-1 rounded-md border border-blue-200 text-blue-700">
            Read-Only
          </span>
        </div>
      )}

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
          {/* ── Summary Cards (4 Key Metrics) ─────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Allocated Budget */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-1 relative overflow-hidden">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Total Allocated Budget</span>
                <Wallet className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl font-extrabold text-slate-900">
                {formatLKR(summary.totalAllocatedBudget)}
              </div>
              <div className="text-[11px] text-slate-500 font-mono flex items-center justify-between">
                <span>FY {summary.fiscalYear} Municipal Capital</span>
                {isDirector && (
                  <button
                    onClick={() => setShowAddBudgetModal(true)}
                    className="text-[10px] text-purple-700 hover:underline font-bold"
                  >
                    + Top-Up
                  </button>
                )}
              </div>
            </div>

            {/* Actual Disbursed (Spent) */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Actual Disbursed (Spent)</span>
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-extrabold text-emerald-700">
                {formatLKR(summary.totalSpent)}
              </div>
              <div className="text-[11px] text-slate-500">
                {summary.totalAllocatedBudget > 0
                  ? `${Math.round((summary.totalSpent / summary.totalAllocatedBudget) * 100)}% of total fund settled`
                  : 'No disbursements'}
              </div>
            </div>

            {/* Committed / In Flight */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider">Committed / In Flight</span>
                <PieChart className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-xl font-extrabold text-amber-600">
                {formatLKR(summary.totalCommitted)}
              </div>
              <div className="text-[11px] text-slate-500">
                {summary.activeWorkOrdersCount} active work orders in execution
              </div>
            </div>

            {/* Available Liquidity (Remaining) */}
            <div
              className={`rounded-xl p-5 border shadow-2xs space-y-1 ${
                summary.remainingBudget <= 0
                  ? 'bg-red-50/50 border-red-200 text-red-900'
                  : summary.remainingBudget < summary.totalAllocatedBudget * 0.15
                  ? 'bg-amber-50/50 border-amber-200 text-amber-900'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                  Remaining Liquidity
                </span>
                <CheckCircle2
                  className={`w-4 h-4 ${
                    summary.remainingBudget <= 0
                      ? 'text-red-600'
                      : summary.remainingBudget < summary.totalAllocatedBudget * 0.15
                      ? 'text-amber-600'
                      : 'text-blue-600'
                  }`}
                />
              </div>
              <div
                className={`text-xl font-extrabold ${
                  summary.remainingBudget <= 0
                    ? 'text-red-700'
                    : summary.remainingBudget < summary.totalAllocatedBudget * 0.15
                    ? 'text-amber-700'
                    : 'text-blue-700'
                }`}
              >
                {formatLKR(summary.remainingBudget)}
              </div>
              <div className="text-[11px] text-slate-500 flex items-center justify-between">
                <span>Uncommitted Treasury Reserve</span>
                <span className="font-mono font-bold">
                  {summary.totalAllocatedBudget > 0
                    ? `${Math.round((summary.remainingBudget / summary.totalAllocatedBudget) * 100)}% free`
                    : '0%'}
                </span>
              </div>
            </div>
          </div>

          {/* ── Visual Budget Burn & Allocation Gauge ─────────────────────────── */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Treasury Capital Liquidity &amp; Consumption</h3>
                <p className="text-xs text-slate-500">
                  Real-time visualization of disbursed funds, committed contractor tenders, and uncommitted liquidity.
                </p>
              </div>
              <div className="font-mono text-xs font-bold text-slate-700">
                Overall Utilization: <span className="text-purple-700">{summary.burnRatePercent}%</span>
              </div>
            </div>

            {/* Multi-segment Progress Bar */}
            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden flex shadow-inner">
              {/* Disbursed (Spent) */}
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{
                  width: `${
                    summary.totalAllocatedBudget > 0
                      ? Math.min(100, (summary.totalSpent / summary.totalAllocatedBudget) * 100)
                      : 0
                  }%`,
                }}
                title={`Disbursed: ${formatLKR(summary.totalSpent)}`}
              />
              {/* Committed */}
              <div
                className="bg-amber-400 h-full transition-all duration-500"
                style={{
                  width: `${
                    summary.totalAllocatedBudget > 0
                      ? Math.min(
                          100 - (summary.totalSpent / summary.totalAllocatedBudget) * 100,
                          (summary.totalCommitted / summary.totalAllocatedBudget) * 100
                        )
                      : 0
                  }%`,
                }}
                title={`Committed: ${formatLKR(summary.totalCommitted)}`}
              />
              {/* Remaining */}
              <div
                className="bg-blue-200 h-full transition-all duration-500"
                style={{
                  width: `${
                    summary.totalAllocatedBudget > 0
                      ? Math.max(
                          0,
                          100 -
                            ((summary.totalSpent + summary.totalCommitted) / summary.totalAllocatedBudget) * 100
                        )
                      : 0
                  }%`,
                }}
                title={`Remaining Liquidity: ${formatLKR(summary.remainingBudget)}`}
              />
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-6 pt-1 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500 flex-shrink-0" />
                <span className="text-slate-600 font-medium">Disbursed (Spent):</span>
                <span className="font-mono font-bold text-slate-900">{formatLKR(summary.totalSpent)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-400 flex-shrink-0" />
                <span className="text-slate-600 font-medium">In-Flight (Committed):</span>
                <span className="font-mono font-bold text-slate-900">{formatLKR(summary.totalCommitted)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-200 border border-blue-300 flex-shrink-0" />
                <span className="text-slate-600 font-medium">Remaining Liquidity:</span>
                <span className="font-mono font-bold text-blue-700">{formatLKR(summary.remainingBudget)}</span>
              </div>
            </div>
          </div>

          {/* ── Director Threshold Policy Form (Collapsible) ───────────────────── */}
          {isDirector && showThresholdForm && (
            <div className="bg-gradient-to-r from-purple-50 via-white to-slate-50 rounded-2xl p-6 border border-purple-200 shadow-xs">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-xl">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold tracking-wider uppercase border border-purple-200">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Executive Governance Policy</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Work Order Director Approval Threshold
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Municipal governance mandates Director electronic authorization for work orders prior to field crew dispatch and capital disbursement.
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
          )}

          {/* ── Department Breakdown Table ────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Departmental Capital Breakdown</h3>
                <p className="text-xs text-slate-500">
                  Sector allocations, actual disbursements, and remaining liquidity across municipal sectors.
                </p>
              </div>
              <div className="text-xs text-slate-400 font-mono">Fiscal Year {summary.fiscalYear}</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Sector / Department</th>
                    <th className="px-5 py-3 text-right">Allocated</th>
                    <th className="px-5 py-3 text-right">Disbursed (Spent)</th>
                    <th className="px-5 py-3 text-right">Committed</th>
                    <th className="px-5 py-3 text-right">Remaining Balance</th>
                    <th className="px-5 py-3 text-right">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.departmentBreakdown?.map((dept, idx) => {
                    const utilPercent = dept.utilizationPercent || 0;

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
                        <td className="px-5 py-3.5 text-right font-mono font-semibold text-blue-700">
                          {formatLKR(dept.remaining)}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 bg-slate-100 h-2 rounded-full overflow-hidden">
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

          {/* ── Recent Treasury Allocations (Audit History) ──────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-600" />
                  <span>Treasury Allocation Ledger &amp; Top-Up History</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Audit trail of all municipal budget additions, supplementary grants, and base allocations.
                </p>
              </div>
              {isDirector && (
                <button
                  onClick={() => setShowAddBudgetModal(true)}
                  className="text-xs font-bold text-purple-700 hover:text-purple-900 inline-flex items-center gap-1"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>New Allocation</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3">Timestamp</th>
                    <th className="px-5 py-3">Allocation Type</th>
                    <th className="px-5 py-3">Sector</th>
                    <th className="px-5 py-3 text-right">Amount (LKR)</th>
                    <th className="px-5 py-3">Authorized By</th>
                    <th className="px-5 py-3">Justification / Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.allocationHistory && summary.allocationHistory.length > 0 ? (
                    summary.allocationHistory.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-5 py-3 font-mono text-[11px] text-slate-500">
                          {new Date(item.timestamp).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}{' '}
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-5 py-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              item.allocationType === 'TOP_UP'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-purple-50 text-purple-700 border border-purple-200'
                            }`}
                          >
                            {item.allocationType === 'TOP_UP' ? 'Budget Top-Up' : 'Base Allocation'}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-semibold text-slate-800">{item.sector}</td>
                        <td className="px-5 py-3 text-right font-mono font-bold text-slate-900">
                          +{formatLKR(item.amount)}
                        </td>
                        <td className="px-5 py-3 text-slate-700 font-mono text-[11px]">{item.allocatedBy}</td>
                        <td className="px-5 py-3 text-slate-600 max-w-xs truncate" title={item.notes}>
                          {item.notes || '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                        No previous allocation history found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {/* ── Director Only: Add Budget Modal ─────────────────────────────────── */}
      {showAddBudgetModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 rounded-lg text-purple-700">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Add Treasury Budget Allocation</h3>
                  <p className="text-xs text-slate-500">Public Works Directorate Capital Fund Disbursement</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddBudgetModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {allocateSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>{allocateSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleAddBudgetSubmit} className="space-y-4">
                {allocateError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>{allocateError}</span>
                  </div>
                )}

                {/* Allocation Mode */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Allocation Action</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAllocationType('TOP_UP')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        allocationType === 'TOP_UP'
                          ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>Top-Up (Add to Existing)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllocationType('SET_TOTAL')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                        allocationType === 'SET_TOTAL'
                          ? 'bg-purple-50 border-purple-500 text-purple-700 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      <span>Set Base Total</span>
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {allocationType === 'TOP_UP' ? 'Top-Up Amount (LKR)' : 'New Total Budget Amount (LKR)'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rs.</span>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="e.g. 5000000"
                      value={addAmount}
                      onChange={(e) => setAddAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full pl-10 pr-3 py-2 text-sm font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Presets */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Quick:</span>
                    {[1000000, 2500000, 5000000, 10000000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleQuickAddPreset(preset)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-purple-50 text-slate-700 hover:text-purple-700 rounded text-[11px] font-mono border border-slate-200 transition-colors"
                      >
                        +{preset >= 1000000 ? `${preset / 1000000}M` : `${preset / 1000}K`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sector / Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Sector Allocation</label>
                  <select
                    value={targetSector}
                    onChange={(e) => setTargetSector(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    <option value="All Municipal Sectors">All Municipal Sectors (General Treasury)</option>
                    <option value="Roads & Transport">Roads &amp; Transport</option>
                    <option value="Water Supply & Drainage">Water Supply &amp; Drainage</option>
                    <option value="Electrical & Lighting">Electrical &amp; Lighting</option>
                    <option value="Bridges & Civil Structures">Bridges &amp; Civil Structures</option>
                    <option value="Sanitation & Public Works">Sanitation &amp; Public Works</option>
                  </select>
                </div>

                {/* Justification / Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Justification / Cabinet Reference (Audit Trail)
                  </label>
                  <textarea
                    rows={2}
                    value={allocationNotes}
                    onChange={(e) => setAllocationNotes(e.target.value)}
                    placeholder="e.g. Supplementary grant approved by Municipal Commissioner for Q4 heavy rain road remediation."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                {/* Impact Preview */}
                {summary && addAmount !== '' && Number(addAmount) > 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1">
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Info className="w-3.5 h-3.5 text-purple-600" />
                      <span>Ledger Impact Preview</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Current Allocated:</span>
                      <span className="font-mono font-semibold">{formatLKR(summary.totalAllocatedBudget)}</span>
                    </div>
                    <div className="flex justify-between text-purple-700 font-bold">
                      <span>New Total Allocation:</span>
                      <span className="font-mono">
                        {formatLKR(
                          allocationType === 'TOP_UP'
                            ? summary.totalAllocatedBudget + Number(addAmount)
                            : Number(addAmount)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-blue-700 font-bold border-t border-slate-200 pt-1">
                      <span>New Remaining Liquidity:</span>
                      <span className="font-mono">
                        {formatLKR(
                          (allocationType === 'TOP_UP'
                            ? summary.totalAllocatedBudget + Number(addAmount)
                            : Number(addAmount)) -
                            (summary.totalSpent + summary.totalCommitted)
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddBudgetModal(false)}
                    disabled={allocating}
                    className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={allocating}
                    className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-purple-700/25 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {allocating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Allocating...</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>Authorize Allocation</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetManagementPage;
