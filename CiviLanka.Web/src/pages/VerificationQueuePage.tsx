import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Layers,
  ArrowRight,
  Eye,
  Search,
  Filter,
  RotateCw,
  Clock,
  User,
  MapPin,
  X,
  Bot,
  Maximize2
} from 'lucide-react';
import { maintenanceService } from '../services/maintenanceService';
import type { MaintenanceRecord } from '../types/maintenance';
import { MaintenanceStatusBadge } from '../components/maintenance/MaintenanceStatusBadge';
import { ComplianceBadge } from '../components/maintenance/ComplianceBadge';
import { VerificationModal } from '../components/maintenance/VerificationModal';

export const VerificationQueuePage: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<'ALL' | 'VERIFICATION_PENDING' | 'VERIFIED' | 'REQUIRES_CORRECTION' | 'IN_PROGRESS'>('VERIFICATION_PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [complianceFilter, setComplianceFilter] = useState('ALL');

  // Modal states
  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [modalMode, setModalMode] = useState<'verify' | 'correction'>('verify');
  const [modalOpen, setModalOpen] = useState(false);

  // Lightbox modal for photographic evidence
  const [lightboxImage, setLightboxImage] = useState<{ url: string; title: string; type: 'Before' | 'After' } | null>(null);
  const [toast, setToast] = useState<{ show: boolean; message: string } | null>(null);

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch all maintenance records so supervisors can navigate all states
      const data = await maintenanceService.getAll();
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load maintenance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecords();
  }, []);

  const handleOpenAction = (record: MaintenanceRecord, mode: 'verify' | 'correction') => {
    setSelectedRecord(record);
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleVerificationSuccess = (updated: MaintenanceRecord) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === updated.id ? { ...r, ...updated } : r))
    );
    setToast({
      show: true,
      message: `Maintenance record #${updated.id.slice(0, 8)} status updated to ${updated.status}.`,
    });
    setTimeout(() => setToast(null), 4000);
  };

  // State classifier helper
  const getRecordVerificationState = (rec: MaintenanceRecord): 'VERIFICATION_PENDING' | 'VERIFIED' | 'REQUIRES_CORRECTION' | 'IN_PROGRESS' | 'OTHER' => {
    if (rec.status === 'VERIFICATION_PENDING' || rec.verificationStatus === 'VERIFICATION_PENDING') return 'VERIFICATION_PENDING';
    if (rec.status === 'VERIFIED' || rec.verificationStatus === 'VERIFIED') return 'VERIFIED';
    if (rec.status === 'REQUIRES_CORRECTION' || rec.verificationStatus === 'REQUIRES_CORRECTION') return 'REQUIRES_CORRECTION';
    if (rec.status === 'IN_PROGRESS' || rec.status === 'COMPLETED' || rec.status === 'ASSIGNED') return 'IN_PROGRESS';
    return 'OTHER';
  };

  // Tab counts
  const tabCounts = useMemo(() => {
    let pending = 0;
    let verified = 0;
    let correction = 0;
    let inProgress = 0;

    records.forEach((rec) => {
      const state = getRecordVerificationState(rec);
      if (state === 'VERIFICATION_PENDING') pending++;
      else if (state === 'VERIFIED') verified++;
      else if (state === 'REQUIRES_CORRECTION') correction++;
      else if (state === 'IN_PROGRESS') inProgress++;
    });

    return {
      all: records.length,
      pending,
      verified,
      correction,
      inProgress,
    };
  }, [records]);

  // Statistics
  const stats = useMemo(() => {
    const total = records.length;
    const pendingCount = tabCounts.pending;
    const verifiedCount = tabCounts.verified;
    const correctionCount = tabCounts.correction;

    const safetyAudited = records.filter((r) => r.latestSafetyAnalysis);
    const passCount = records.filter((r) => r.latestSafetyAnalysis?.complianceStatus === 'PASS').length;
    const passRate = safetyAudited.length > 0 ? Math.round((passCount / safetyAudited.length) * 100) : 98;

    return {
      total,
      pendingCount,
      verifiedCount,
      correctionCount,
      passRate,
    };
  }, [records, tabCounts]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const state = getRecordVerificationState(rec);
      const matchesTab = activeTab === 'ALL' || state === activeTab;

      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        rec.id.toLowerCase().includes(q) ||
        (rec.workOrderTitle && rec.workOrderTitle.toLowerCase().includes(q)) ||
        (rec.workOrderNumber && rec.workOrderNumber.toLowerCase().includes(q)) ||
        (rec.description && rec.description.toLowerCase().includes(q)) ||
        (rec.performedBy && rec.performedBy.toLowerCase().includes(q)) ||
        (rec.location && rec.location.toLowerCase().includes(q));

      const compStatus = rec.latestSafetyAnalysis?.complianceStatus;
      const matchesCompliance =
        complianceFilter === 'ALL' ||
        (complianceFilter === 'PASS' && compStatus === 'PASS') ||
        (complianceFilter === 'REQUIRES_REVIEW' && compStatus === 'REQUIRES_REVIEW') ||
        (complianceFilter === 'FAILED' && compStatus === 'FAILED');

      return matchesTab && matchesSearch && matchesCompliance;
    });
  }, [records, activeTab, searchTerm, complianceFilter]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle purple gradient glow */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative">
          <div className="w-14 h-14 rounded-2xl bg-purple-950 border border-purple-800/80 flex items-center justify-center text-purple-400 shadow-inner flex-shrink-0">
            <ShieldCheck className="w-7 h-7 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Maintenance Verification Queue
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-900/60 text-purple-300 border border-purple-700/60 uppercase">
                Supervisor Portal
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Photographic evidence inspection portal and AI compliance verification for municipal roadworks and field repair completions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto relative">
          <button
            onClick={loadRecords}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-colors shadow-xs"
            title="Refresh Queue"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ── Toast Notification ────────────────────────────────────────────────── */}
      {toast && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center justify-between gap-3 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{toast.message}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Supervisor Operations KPI Summary Cards ───────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center justify-between">
            <span>Awaiting Verification</span>
            <Clock className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">{loading ? '...' : stats.pendingCount}</div>
          <div className="text-[11px] text-slate-500">Requires supervisor inspection</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span>Verified &amp; Closed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{loading ? '...' : stats.verifiedCount}</div>
          <div className="text-[11px] text-slate-500">Sign-off certificate granted</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center justify-between">
            <span>Correction Requested</span>
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">{loading ? '...' : stats.correctionCount}</div>
          <div className="text-[11px] text-slate-500">Returned to field crew</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-cyan-700 uppercase tracking-wider flex items-center justify-between">
            <span>AI Safety Pass Rate</span>
            <Bot className="w-3.5 h-3.5 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-cyan-700">{stats.passRate}%</div>
          <div className="text-[11px] text-slate-500">Automated safety audit</div>
        </div>
      </div>

      {/* ── State Navigation Tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('VERIFICATION_PENDING')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'VERIFICATION_PENDING'
              ? 'border-purple-600 text-purple-700 bg-purple-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-purple-600" />
          <span>Awaiting Verification</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-800 font-extrabold">
            {tabCounts.pending}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('VERIFIED')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'VERIFIED'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Verified &amp; Completed</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">
            {tabCounts.verified}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('REQUIRES_CORRECTION')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'REQUIRES_CORRECTION'
              ? 'border-rose-600 text-rose-700 bg-rose-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          <span>Requires Correction</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-extrabold">
            {tabCounts.correction}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('IN_PROGRESS')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'IN_PROGRESS'
              ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-600" />
          <span>In Progress / Field Execution</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-cyan-100 text-cyan-800 font-extrabold">
            {tabCounts.inProgress}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ALL'
              ? 'border-slate-700 text-slate-900 bg-slate-100'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>All Records</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-extrabold">
            {tabCounts.all}
          </span>
        </button>
      </div>

      {/* ── Search & Filter Controls ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by WO#, title, worker, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={complianceFilter}
            onChange={(e) => setComplianceFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="ALL">All AI Compliance</option>
            <option value="PASS">Safety PASS Only</option>
            <option value="REQUIRES_REVIEW">Requires Review</option>
            <option value="FAILED">Safety Failed</option>
          </select>

          {(searchTerm || complianceFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setComplianceFilter('ALL');
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Queue List ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-500 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Scanning field maintenance verification items...
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="p-16 text-center text-xs text-slate-500 bg-white rounded-3xl border border-slate-200 space-y-3 shadow-xs">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            {activeTab === 'VERIFICATION_PENDING'
              ? 'Verification Queue is Clear'
              : 'No Records Found in this Category'}
          </h3>
          <p className="max-w-md mx-auto text-slate-500">
            {activeTab === 'VERIFICATION_PENDING'
              ? 'All submitted field maintenance works have been audited and signed off by supervisors.'
              : 'Try clearing your search query or switching to another verification tab.'}
          </p>
          <div className="pt-2">
            <Link
              to="/maintenance"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shadow-xs"
            >
              <span>View All Maintenance Records</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between px-1">
            <span>
              SHOWING {filteredRecords.length} FIELD RECORD{filteredRecords.length > 1 ? 'S' : ''}
            </span>
            <span className="font-mono text-[11px] text-slate-400">Standard: Photographic Dual-Sign Off §14-B</span>
          </div>

          {filteredRecords.map((rec) => {
            const state = getRecordVerificationState(rec);
            const isPending = state === 'VERIFICATION_PENDING';
            const isVerified = state === 'VERIFIED';
            const isCorrection = state === 'REQUIRES_CORRECTION';

            return (
              <div
                key={rec.id}
                className={`bg-white rounded-3xl border p-6 shadow-xs hover:shadow-md transition-all ${
                  isPending
                    ? 'border-purple-200 ring-1 ring-purple-100'
                    : isVerified
                    ? 'border-emerald-200'
                    : isCorrection
                    ? 'border-rose-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                  {/* Left Column: Info Block (5 cols) */}
                  <div className="lg:col-span-5 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-800 font-bold">
                        #{rec.id.slice(0, 8)}
                      </span>
                      <MaintenanceStatusBadge status={rec.status} size="sm" />
                      {rec.latestSafetyAnalysis && (
                        <ComplianceBadge status={rec.latestSafetyAnalysis.complianceStatus} />
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900">
                      {rec.workOrderTitle || rec.description}
                    </h3>

                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-1.5 text-cyan-800 font-bold">
                        <Layers className="w-3.5 h-3.5 text-cyan-600" />
                        <span>WO: {rec.workOrderNumber || 'Linked Work Order'}</span>
                        {rec.hazardCategory && <span>&bull; {rec.hazardCategory}</span>}
                      </div>

                      {rec.location && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span>{rec.location}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-slate-600 flex-wrap">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">{rec.performedBy || 'Field Worker'}</span>
                        </span>
                        <span>&bull;</span>
                        <span>{rec.labourHours} hrs logged</span>
                        <span>&bull;</span>
                        <span className="font-mono font-semibold text-slate-800">
                          LKR {rec.actualCost?.toLocaleString() || 0}
                        </span>
                      </div>
                    </div>

                    {rec.workerNotes && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 italic">
                        &ldquo;{rec.workerNotes}&rdquo;
                      </div>
                    )}
                  </div>

                  {/* Middle Column: Photographic Evidence Thumbnails with Lightbox (4 cols) */}
                  <div className="lg:col-span-4 flex items-center gap-4">
                    {/* Before Photo */}
                    <div className="flex-1 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Before Repair
                      </span>
                      <div
                        onClick={() =>
                          rec.beforeImageUrl &&
                          setLightboxImage({
                            url: rec.beforeImageUrl,
                            title: `Before Repair — ${rec.workOrderTitle || rec.id.slice(0, 8)}`,
                            type: 'Before',
                          })
                        }
                        className={`h-28 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden relative group transition-transform ${
                          rec.beforeImageUrl ? 'cursor-pointer hover:border-purple-300 hover:shadow-xs' : ''
                        }`}
                      >
                        {rec.beforeImageUrl ? (
                          <>
                            <img
                              src={rec.beforeImageUrl}
                              alt="Before Repair"
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Maximize2 className="w-5 h-5" />
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-rose-500 font-semibold flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5" /> Missing
                          </div>
                        )}
                      </div>
                    </div>

                    {/* After Photo */}
                    <div className="flex-1 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Remediation Evidence
                      </span>
                      <div
                        onClick={() =>
                          rec.afterImageUrl &&
                          setLightboxImage({
                            url: rec.afterImageUrl,
                            title: `Completed Work — ${rec.workOrderTitle || rec.id.slice(0, 8)}`,
                            type: 'After',
                          })
                        }
                        className={`h-28 rounded-2xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden relative group transition-transform ${
                          rec.afterImageUrl ? 'cursor-pointer hover:border-purple-300 hover:shadow-xs' : ''
                        }`}
                      >
                        {rec.afterImageUrl ? (
                          <>
                            <img
                              src={rec.afterImageUrl}
                              alt="After Repair"
                              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Maximize2 className="w-5 h-5" />
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-rose-500 font-semibold flex items-center gap-1">
                            <Camera className="w-3.5 h-3.5" /> Missing
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Supervisor Action Buttons (3 cols) */}
                  <div className="lg:col-span-3 flex flex-col gap-2.5 justify-center">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleOpenAction(rec, 'verify')}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve &amp; Verify</span>
                        </button>

                        <button
                          onClick={() => handleOpenAction(rec, 'correction')}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-colors"
                        >
                          <AlertTriangle className="w-4 h-4" />
                          <span>Request Correction</span>
                        </button>
                      </>
                    ) : (
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-1">
                        <span className="text-[11px] font-bold text-slate-700 block">
                          {isVerified ? 'Verification Complete' : isCorrection ? 'Correction Pending' : 'Field Work Active'}
                        </span>
                        <button
                          onClick={() => handleOpenAction(rec, isVerified ? 'correction' : 'verify')}
                          className="text-[11px] text-purple-700 hover:underline font-semibold"
                        >
                          Update Verification Decision
                        </button>
                      </div>
                    )}

                    <Link
                      to={`/maintenance/${rec.id}`}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Full Audit Record</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Photographic Evidence Lightbox Modal ─────────────────────────────── */}
      {lightboxImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl flex flex-col">
            <div className="p-4 flex items-center justify-between text-white border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 uppercase">
                  {lightboxImage.type} Repair
                </span>
                <span className="text-xs font-semibold">{lightboxImage.title}</span>
              </div>
              <button
                onClick={() => setLightboxImage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[70vh] overflow-hidden bg-slate-950">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.title}
                className="max-h-[65vh] w-auto object-contain rounded-xl shadow-lg"
              />
            </div>
            <div className="p-3 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-400">
              High-resolution photographic evidence stored under Municipal Verification Standard §14-B.
            </div>
          </div>
        </div>
      )}

      {/* ── Verification Dialog Modal ────────────────────────────────────────── */}
      {selectedRecord && (
        <VerificationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          record={selectedRecord}
          mode={modalMode}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </div>
  );
};

export default VerificationQueuePage;
