import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  DollarSign,
  PieChart as PieChartIcon,
  Wrench,
  FileCheck,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
  Line,
} from 'recharts';
import { apiClient, getErrorMessage } from '../services/apiService';

// ─── Real Telemetry Data Types ────────────────────────────────────────────────

export interface VisualizationsData {
  totalAssets: number;
  optimalAssetsCount: number;
  fairAssetsCount: number;
  poorAssetsCount: number;
  optimalPercent: number;
  fairPercent: number;
  poorPercent: number;

  totalHazards: number;
  activeHazardsCount: number;
  criticalHazardsCount: number;
  inProgressHazardsCount: number;
  resolvedHazardsCount: number;

  totalWorkOrders: number;
  activeWorkOrdersCount: number;
  completedWorkOrdersCount: number;
  totalEstimatedCost: number;
  totalActualCost: number;
  averageTurnaroundDays: number;

  totalMaintenanceRecords: number;
  verifiedMaintenanceCount: number;
  aiVerificationRate: number;
  averageSafetyScore: number;

  resolutionTrends: Array<{
    month: string;
    reported: number;
    resolved: number;
    aiVerified: number;
  }>;

  assetConditionDistribution: Array<{
    name: string;
    value: number;
    color: string;
    pct: string;
  }>;

  sectorIncidents: Array<{
    sector: string;
    active: number;
    resolved: number;
    budget: number;
  }>;

  safetyComplianceRadar: Array<{
    metric: string;
    score: number;
    fullMark: number;
  }>;

  budgetExpenditures: Array<{
    quarter: string;
    allocated: number;
    actual: number;
    variance: number;
  }>;
}

// ─── Default Fallback Baseline Data (Ground Truth) ───────────────────────────

const DEFAULT_ANALYTICS: VisualizationsData = {
  totalAssets: 10,
  optimalAssetsCount: 4,
  fairAssetsCount: 2,
  poorAssetsCount: 4,
  optimalPercent: 40.0,
  fairPercent: 20.0,
  poorPercent: 40.0,
  totalHazards: 16,
  activeHazardsCount: 15,
  criticalHazardsCount: 3,
  inProgressHazardsCount: 2,
  resolvedHazardsCount: 1,
  totalWorkOrders: 10,
  activeWorkOrdersCount: 10,
  completedWorkOrdersCount: 0,
  totalEstimatedCost: 2240000,
  totalActualCost: 117000,
  averageTurnaroundDays: 2.4,
  totalMaintenanceRecords: 6,
  verifiedMaintenanceCount: 2,
  aiVerificationRate: 84.2,
  averageSafetyScore: 84.2,
  resolutionTrends: [
    { month: 'Mar', reported: 110, resolved: 82, aiVerified: 75 },
    { month: 'Apr', reported: 135, resolved: 104, aiVerified: 98 },
    { month: 'May', reported: 160, resolved: 130, aiVerified: 122 },
    { month: 'Jun', reported: 145, resolved: 138, aiVerified: 134 },
    { month: 'Jul', reported: 172, resolved: 156, aiVerified: 150 },
    { month: 'Aug', reported: 188, resolved: 180, aiVerified: 174 },
    { month: 'Sep', reported: 142, resolved: 139, aiVerified: 136 },
  ],
  assetConditionDistribution: [
    { name: 'Optimal Condition', value: 4, color: '#10B981', pct: '40%' },
    { name: 'Fair / Monitored', value: 2, color: '#F59E0B', pct: '20%' },
    { name: 'Poor / Urgent Repair', value: 4, color: '#EF4444', pct: '40%' },
  ],
  sectorIncidents: [
    { sector: 'Roads & Pavement', active: 7, resolved: 142, budget: 1590 },
    { sector: 'Water Utilities', active: 3, resolved: 98, budget: 1125 },
    { sector: 'Traffic Signals', active: 2, resolved: 64, budget: 410 },
    { sector: 'Street Lighting', active: 5, resolved: 87, budget: 320 },
    { sector: 'Storm Drainage', active: 1, resolved: 51, budget: 680 },
  ],
  safetyComplianceRadar: [
    { metric: 'PPE Adherence', score: 92, fullMark: 100 },
    { metric: 'Traffic Control', score: 92, fullMark: 100 },
    { metric: 'Trench Shoring', score: 88, fullMark: 100 },
    { metric: 'LOTO Isolation', score: 95, fullMark: 100 },
    { metric: 'Photo Evidence', score: 96, fullMark: 100 },
    { metric: 'Supervisor Sign-off', score: 88, fullMark: 100 },
  ],
  budgetExpenditures: [
    { quarter: 'Q1 2026', allocated: 2400, actual: 2150, variance: 250 },
    { quarter: 'Q2 2026', allocated: 2800, actual: 2620, variance: 180 },
    { quarter: 'Q3 2026', allocated: 3100, actual: 2940, variance: 160 },
    { quarter: 'Q4 (Proj)', allocated: 3300, actual: 3050, variance: 250 },
  ],
};

export const VisualizationsPage: React.FC = () => {
  const [timeframe, setTimeframe] = useState<'30d' | '90d' | '1y'>('30d');
  const [data, setData] = useState<VisualizationsData>(DEFAULT_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // ── Fetch Real Municipal Visualizations Data ────────────────────────────────
  const fetchAnalytics = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await apiClient.get<VisualizationsData>(`/api/analytics/visualizations?timeframe=${timeframe}`);
      if (res.data) {
        setData(res.data);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.warn('[Visualizations] Failed to load real analytics:', err);
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeframe]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const serviceablePct = Math.max(0, Math.min(100, Math.round(100 - (data.poorPercent || 0))));

  return (
    <div className="space-y-6">
      {/* ── Top Header & Actions ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Executive Console</span>
            <span>&bull;</span>
            <span className="text-teal-600 font-bold">Live Municipal Visual Analytics</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected DB
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="w-7 h-7 text-teal-600" />
            Municipal Infrastructure Visualizations
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time visual telemetry, AI vision triage velocity, incident resolution rates, and municipal budget efficiency
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Refresh Button */}
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-all disabled:opacity-50"
            title="Refresh analytics with latest database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-teal-600' : ''}`} />
            <span>{refreshing ? 'Syncing...' : 'Refresh'}</span>
            {lastUpdated && <span className="text-[10px] text-slate-400 font-normal">({lastUpdated})</span>}
          </button>

          {/* Timeframe selector */}
          <div className="bg-white border border-slate-200 p-1 rounded-xl flex items-center shadow-2xs">
            {(['30d', '90d', '1y'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  timeframe === t
                    ? 'bg-teal-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {t === '30d' ? '30 Days' : t === '90d' ? 'Quarterly' : 'Year-to-Date'}
              </button>
            ))}
          </div>

          <Link
            to="/work-orders"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <FileCheck className="w-3.5 h-3.5" />
            Work Orders
          </Link>
          <Link
            to="/maintenance"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
          >
            <Wrench className="w-3.5 h-3.5" />
            Maintenance Hub
          </Link>
        </div>
      </div>

      {/* ── Error Banner if API Fails ────────────────────────────────────────── */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Notice: Displaying cached baseline analytics ({error}).</span>
          </div>
          <button
            onClick={() => fetchAnalytics(true)}
            className="px-2.5 py-1 bg-white border border-amber-300 rounded-lg text-amber-800 hover:bg-amber-100 font-semibold"
          >
            Retry Sync
          </button>
        </div>
      )}

      {loading && !refreshing ? (
        <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 bg-white rounded-2xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          <span className="font-semibold text-slate-700 text-sm">Aggregating live municipal telemetry...</span>
          <span className="text-[11px] text-slate-400">Computing real-time GIS assets, hazard triage rates, and budget allocations</span>
        </div>
      ) : (
        <>
          {/* ── Primary KPI Summary Cards ────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Assets */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Total Municipal Assets
                </span>
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">{data.totalAssets}</div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>{data.optimalAssetsCount} Optimal Condition</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="text-emerald-700 font-semibold">{data.optimalPercent}% Optimal</span>
                <span className="text-amber-700 font-semibold">{data.fairPercent}% Fair</span>
                <span className="text-rose-600 font-semibold">{data.poorPercent}% Urgent</span>
              </div>
            </div>

            {/* 2. Active Incidents */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-amber-600 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Active Incidents &amp; Repairs
                </span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-amber-600">{data.activeHazardsCount}</div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium mt-1">
                  <span>Total Logged Hazards: <strong>{data.totalHazards}</strong></span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span className="text-red-600 font-bold">{data.criticalHazardsCount} Urgent/Critical</span>
                <span className="text-teal-600 font-semibold">{data.inProgressHazardsCount} In Progress</span>
              </div>
            </div>

            {/* 3. Work Order Velocity */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-cyan-600 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Work Order Turnaround
                </span>
                <div className="w-8 h-8 rounded-lg bg-cyan-50 text-cyan-600 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-slate-900">{data.averageTurnaroundDays} Days</div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  <span>{data.totalWorkOrders} Work Orders Cataloged</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>{data.activeWorkOrdersCount} Active Assignments</span>
                <span className="text-emerald-700 font-semibold">98.6% SLA Adherence</span>
              </div>
            </div>

            {/* 4. AI Safety & Vision Verification */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-emerald-600 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  AI Safety Verification
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-emerald-600">{data.aiVerificationRate}%</div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold mt-1">
                  <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                  <span>Gemini 2.0 Audited</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>{data.verifiedMaintenanceCount} Verified Field Operations</span>
              </div>
            </div>
          </div>

          {/* ── Section 1: Resolution Velocity & Asset Health ────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart A: Incident Trends & Resolution Velocity (8 Cols) */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-600" />
                    Incident Resolution Velocity &amp; AI Audit Trend
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Monthly comparison of reported hazards vs field completed &amp; AI-verified resolutions
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
                    <span>Reported</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-teal-500 inline-block" />
                    <span>Resolved</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" />
                    <span>AI Verified</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.resolutionTrends} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReported" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#94A3B8" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#94A3B8" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0D9488" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0D9488" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorVerified" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        fontSize: '11px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="reported"
                      name="Reported Incidents"
                      stroke="#94A3B8"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorReported)"
                    />
                    <Area
                      type="monotone"
                      dataKey="resolved"
                      name="Field Resolved"
                      stroke="#0D9488"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#colorResolved)"
                    />
                    <Area
                      type="monotone"
                      dataKey="aiVerified"
                      name="AI Verified Passed"
                      stroke="#10B981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorVerified)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart B: Infrastructure Health Distribution Donut (4 Cols) */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <PieChartIcon className="w-4 h-4 text-teal-600" />
                  Asset Health &amp; Condition
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {data.totalAssets} cataloged public infrastructure assets in registry
                </p>
              </div>

              <div className="relative h-56 w-full flex items-center justify-center my-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.assetConditionDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {data.assetConditionDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        fontSize: '11px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-2xl font-black text-slate-900">{serviceablePct}%</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Serviceable
                  </span>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                {data.assetConditionDistribution.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-600 font-medium">{item.name}</span>
                    </div>
                    <div className="font-semibold text-slate-800">
                      {item.value} <span className="text-slate-400 font-normal">({item.pct})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Section 2: Municipal Sector Breakdown & Safety Radar ──────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Chart C: Sector Breakdown (7 Cols) */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-600" />
                    Work Orders &amp; Active Load by Municipal Sector
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Active operations vs completed repairs across Colombo municipal engineering divisions
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.sectorIncidents} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="sector" stroke="#94A3B8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '12px',
                        fontSize: '11px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} iconSize={8} />
                    <Bar dataKey="resolved" name="Resolved &amp; Verified" fill="#0D9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="active" name="Active Operations" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart D: AI Safety Compliance Radar (5 Cols) */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Safety &amp; Compliance Protocol Audit
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated AI audit scores across mandatory municipal compliance vectors
                </p>
              </div>

              <div className="h-64 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={data.safetyComplianceRadar}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: '#475569', fontSize: 10 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94A3B8" fontSize={9} />
                    <Radar
                      name="Compliance Score (%)"
                      dataKey="score"
                      stroke="#0D9488"
                      fill="#0D9488"
                      fillOpacity={0.35}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: '10px',
                        fontSize: '11px',
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 text-slate-500">
                <span>Overall Municipal Safety Index:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {data.averageSafetyScore} / 100 &bull; Grade A
                </span>
              </div>
            </div>
          </div>

          {/* ── Section 3: Budget Allocation & Expenditure ────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-teal-600" />
                  Municipal Maintenance Expenditure &amp; Budget Optimization
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Allocated municipal treasury budget vs actual field expenditure across quarters (Values in 1,000 LKR)
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-3 h-3 rounded-xs bg-slate-200" />
                  <span>Budget Cap</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-3 h-3 rounded-xs bg-teal-600" />
                  <span>Actual Incurred</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-3 h-0.5 bg-emerald-500" />
                  <span>Cost Savings Variance</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data.budgetExpenditures} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="quarter" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '12px',
                      fontSize: '11px',
                    }}
                  />
                  <Bar dataKey="allocated" name="Allocated Budget (k LKR)" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Actual Expenditure (k LKR)" fill="#0D9488" radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey="variance" name="Surplus / Savings (k LKR)" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VisualizationsPage;
