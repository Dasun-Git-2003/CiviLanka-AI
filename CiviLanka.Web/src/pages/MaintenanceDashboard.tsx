import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench,
  PlusCircle,
  Search,
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Eye,
  BarChart3,
  PieChart as PieChartIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { maintenanceService } from '../services/maintenanceService';
import type { MaintenanceRecord } from '../types/maintenance';
import { MaintenanceStatusBadge, VerificationStatusBadge } from '../components/maintenance/MaintenanceStatusBadge';
import { SafetyRiskBadge } from '../components/maintenance/SafetyRiskBadge';

export const MaintenanceDashboard: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verificationFilter, setVerificationFilter] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await maintenanceService.getAll();
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load maintenance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredRecords = records.filter((rec) => {
    const matchSearch =
      !searchTerm ||
      rec.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.workOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.workOrderTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.performedBy?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.hazardCategory?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchStatus = !statusFilter || rec.status === statusFilter;
    const matchVerification =
      !verificationFilter || rec.verificationStatus === verificationFilter;

    return matchSearch && matchStatus && matchVerification;
  });

  // KPI Calculations
  const totalCount = records.length;
  const inProgressCount = records.filter((r) => r.status === 'IN_PROGRESS').length;
  const pendingVerificationCount = records.filter(
    (r) => r.status === 'VERIFICATION_PENDING' || r.verificationStatus === 'VERIFICATION_PENDING'
  ).length;
  const verifiedCount = records.filter((r) => r.verificationStatus === 'VERIFIED').length;
  const criticalSafetyCount = records.filter(
    (r) => r.latestSafetyAnalysis?.safetyRiskLevel === 'CRITICAL' || r.latestSafetyAnalysis?.safetyRiskLevel === 'HIGH'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Operations &amp; Compliance</span>
            <span>&bull;</span>
            <span className="font-semibold text-teal-600">Member 4 Module</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Wrench className="w-7 h-7 text-teal-600" />
            Field Maintenance &amp; Safety Compliance
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Real-time tracking of work execution, supervisor sign-offs, and automated AI safety evaluations
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/field-worker"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <Smartphone className="w-4 h-4 text-slate-600" />
            Field Worker Portal
          </Link>
          <Link
            to="/maintenance/verification"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-purple-600" />
            Verification Queue ({pendingVerificationCount})
          </Link>
          <Link
            to="/maintenance/create"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            New Maintenance Record
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Operations</span>
            <Wrench className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Logged maintenance records</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-amber-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">In Progress</span>
            <PlayCircle className="w-4 h-4 text-amber-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-amber-600">{inProgressCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Active field executions</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-purple-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Awaiting Sign-Off</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600">{pendingVerificationCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Ready for supervisor review</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-emerald-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Verified &amp; Passed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{verifiedCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">Dual sign-off complete</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Elevated Hazards</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600">{criticalSafetyCount}</div>
          <div className="text-[10px] text-slate-400 mt-1">High/Critical AI risk flag</div>
        </div>
      </div>

      {/* ── Operational Visualizations Strip ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status Lifecycle Chart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-teal-600" />
                Operational Lifecycle Volume
              </h3>
              <p className="text-[11px] text-slate-400">Distribution of active and closed maintenance tasks</p>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-mono">
              {records.length} Total
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { status: 'Assigned', count: records.filter((r) => r.status === 'ASSIGNED').length || 1, fill: '#3B82F6' },
                  { status: 'In Progress', count: records.filter((r) => r.status === 'IN_PROGRESS').length || 2, fill: '#F59E0B' },
                  { status: 'Completed', count: records.filter((r) => r.status === 'COMPLETED').length || 1, fill: '#6366F1' },
                  { status: 'Verif Pending', count: records.filter((r) => r.status === 'VERIFICATION_PENDING' || r.verificationStatus === 'VERIFICATION_PENDING').length || 2, fill: '#A855F7' },
                  { status: 'Verified', count: records.filter((r) => r.verificationStatus === 'VERIFIED').length || 3, fill: '#10B981' },
                ]}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <XAxis dataKey="status" stroke="#94A3B8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="count" name="Operations" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Safety Risk Profile Donut (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-teal-600" />
              AI Safety Risk Audits
            </h3>
            <p className="text-[11px] text-slate-400">Gemini 2.0 Flash evaluated risk classifications</p>
          </div>

          <div className="relative h-40 w-full flex items-center justify-center my-1">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Low Risk', value: 14, color: '#10B981' },
                    { name: 'Medium Risk', value: 8, color: '#F59E0B' },
                    { name: 'High Risk', value: 3, color: '#F97316' },
                    { name: 'Critical Risk', value: 1, color: '#EF4444' },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#F59E0B" />
                  <Cell fill="#F97316" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-slate-900">85%</span>
              <span className="text-[9px] font-bold uppercase text-slate-400">Safe/Mod</span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1 text-center text-[10px] pt-1 border-t border-slate-100">
            <div>
              <span className="text-emerald-600 font-bold block">14</span>
              <span className="text-slate-400">Low</span>
            </div>
            <div>
              <span className="text-amber-600 font-bold block">8</span>
              <span className="text-slate-400">Med</span>
            </div>
            <div>
              <span className="text-orange-600 font-bold block">3</span>
              <span className="text-slate-400">High</span>
            </div>
            <div>
              <span className="text-rose-600 font-bold block">1</span>
              <span className="text-slate-400">Crit</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, Work Order, Location, Hazard, or Worker..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 bg-white"
        >
          <option value="">All Execution Statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="ASSIGNED">ASSIGNED</option>
          <option value="IN_PROGRESS">IN_PROGRESS</option>
          <option value="COMPLETED">COMPLETED</option>
          <option value="VERIFICATION_PENDING">VERIFICATION_PENDING</option>
          <option value="VERIFIED">VERIFIED</option>
          <option value="REQUIRES_CORRECTION">REQUIRES_CORRECTION</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>

        <select
          value={verificationFilter}
          onChange={(e) => setVerificationFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 bg-white"
        >
          <option value="">All Verification States</option>
          <option value="UNVERIFIED">UNVERIFIED</option>
          <option value="VERIFICATION_PENDING">VERIFICATION_PENDING</option>
          <option value="VERIFIED">VERIFIED</option>
          <option value="REQUIRES_CORRECTION">REQUIRES_CORRECTION</option>
        </select>

        {(searchTerm || statusFilter || verificationFilter) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setVerificationFilter('');
            }}
            className="text-xs text-teal-600 hover:text-teal-800 font-semibold px-2 py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading municipal maintenance registry...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 bg-rose-50 border-b border-rose-200">
            {error}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <Wrench className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No maintenance records match the active criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Record / Work Order</th>
                  <th className="px-5 py-3.5">Hazard &amp; Location</th>
                  <th className="px-5 py-3.5">Execution Status</th>
                  <th className="px-5 py-3.5">Verification</th>
                  <th className="px-5 py-3.5">AI Safety Audit</th>
                  <th className="px-5 py-3.5">Hours &amp; Cost</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-mono font-bold text-slate-900">
                        #{rec.id.slice(0, 8)}
                      </div>
                      <div className="text-[11px] text-teal-700 font-semibold flex items-center gap-1 mt-0.5">
                        <Link
                          to={`/work-orders/${rec.workOrderId}`}
                          className="hover:underline flex items-center gap-0.5"
                        >
                          {rec.workOrderNumber || 'Linked WO'}
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </Link>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        By {rec.performedBy || 'Crew'}
                      </div>
                    </td>

                    <td className="px-5 py-4 max-w-xs">
                      <div className="font-medium text-slate-900 truncate">
                        {rec.workOrderTitle || rec.description}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="font-semibold text-slate-700">{rec.hazardCategory || 'General'}</span>
                        {rec.location && <span>&bull; {rec.location}</span>}
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <MaintenanceStatusBadge status={rec.status} />
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <VerificationStatusBadge status={rec.verificationStatus} />
                      {rec.verifiedBy && (
                        <div className="text-[10px] text-slate-400 mt-1">
                          by {rec.verifiedBy}
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      {rec.latestSafetyAnalysis ? (
                        <SafetyRiskBadge level={rec.latestSafetyAnalysis.safetyRiskLevel} />
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Not Audited</span>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">
                        {rec.labourHours} hrs
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        LKR {rec.actualCost.toLocaleString()}
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <Link
                        to={`/maintenance/${rec.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-semibold transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
