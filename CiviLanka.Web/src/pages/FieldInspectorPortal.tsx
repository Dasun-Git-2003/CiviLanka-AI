import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertTriangle,
  Camera,
  Layers,
  MapPin,
  ExternalLink,
  ChevronRight,
  Shield,
  Users,
  PlusCircle,
  ClipboardCheck,
  Search,
  RefreshCw,
  Send,
  Navigation,
  Eye,
  CheckCircle,
  X,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import { maintenanceService } from '../services/maintenanceService';
import type { MaintenanceRecord } from '../types/maintenance';
import { MaintenanceStatusBadge } from '../components/maintenance/MaintenanceStatusBadge';
import { SafetyRiskBadge } from '../components/maintenance/SafetyRiskBadge';
import { EvidenceUploadModal } from '../components/maintenance/EvidenceUploadModal';
import { authService } from '../services/authService';

type TabType = 'all' | 'action_needed' | 'in_progress' | 'pending_verification' | 'verified';

export const FieldInspectorPortal: React.FC = () => {
  const [assignments, setAssignments] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('action_needed');
  const [filterRiskOnly, setFilterRiskOnly] = useState(false);

  // Quick Action States
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Evidence Upload Modal State
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadRecordId, setUploadRecordId] = useState<string>('');
  const [uploadImageType, setUploadImageType] = useState<'before' | 'after'>('before');

  // Quick Sign-Off Modal State
  const [signOffModalOpen, setSignOffModalOpen] = useState(false);
  const [signOffRecord, setSignOffRecord] = useState<MaintenanceRecord | null>(null);
  const [signOffNotes, setSignOffNotes] = useState('');
  const [signOffHours, setSignOffHours] = useState<number>(4);
  const [signOffCost, setSignOffCost] = useState<number>(0);
  const [submittingSignOff, setSubmittingSignOff] = useState(false);

  // Photo Lightbox Preview
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  const user = authService.getCurrentUser();

  const loadAssignments = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await maintenanceService.getMyAssignments();
      setAssignments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load inspector assignments.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  // Quick Start: Transition ASSIGNED -> IN_PROGRESS
  const handleStartInspection = async (recordId: string) => {
    try {
      setActionLoadingId(recordId);
      await maintenanceService.updateStatus(recordId, {
        status: 'IN_PROGRESS',
        notes: `Inspection and site operations commenced by ${user?.fullName || 'Field Inspector'}`,
      });
      await loadAssignments(true);
    } catch (err: any) {
      alert(err.message || 'Failed to start inspection task.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Sign-Off Modal
  const handleOpenSignOff = (record: MaintenanceRecord) => {
    setSignOffRecord(record);
    setSignOffNotes(record.workerNotes || '');
    setSignOffHours(record.labourHours > 0 ? record.labourHours : 4);
    setSignOffCost(record.actualCost || 0);
    setSignOffModalOpen(true);
  };

  // Submit Sign-Off Modal
  const handleSubmitSignOff = async () => {
    if (!signOffRecord) return;
    try {
      setSubmittingSignOff(true);
      // 1. Update notes and metrics
      await maintenanceService.update(signOffRecord.id, {
        workerNotes: signOffNotes,
        labourHours: Number(signOffHours) || 0,
        actualCost: Number(signOffCost) || 0,
      });

      // 2. Transition status to COMPLETED
      await maintenanceService.updateStatus(signOffRecord.id, {
        status: 'COMPLETED',
        notes: signOffNotes || 'Completed and submitted for supervisor verification.',
      });

      // 3. Trigger Safety AI analysis if photos are present
      if (signOffRecord.beforeImageUrl || signOffRecord.afterImageUrl) {
        try {
          await maintenanceService.runSafetyAnalysis(signOffRecord.id);
        } catch {
          // Non-blocking
        }
      }

      setSignOffModalOpen(false);
      setSignOffRecord(null);
      await loadAssignments(true);
    } catch (err: any) {
      alert(err.message || 'Failed to submit inspection sign-off.');
    } finally {
      setSubmittingSignOff(false);
    }
  };

  // Filter Counts
  const counts = useMemo(() => {
    const actionNeeded = assignments.filter(
      (r) => r.status === 'ASSIGNED' || r.status === 'REQUIRES_CORRECTION'
    ).length;
    const inProgress = assignments.filter((r) => r.status === 'IN_PROGRESS').length;
    const pendingVerification = assignments.filter(
      (r) => r.status === 'COMPLETED' || r.status === 'VERIFICATION_PENDING'
    ).length;
    const verified = assignments.filter((r) => r.status === 'VERIFIED').length;
    return {
      all: assignments.length,
      action_needed: actionNeeded,
      in_progress: inProgress,
      pending_verification: pendingVerification,
      verified,
    };
  }, [assignments]);

  // High Risk / Critical assignments requiring immediate caution
  const highRiskAssignments = useMemo(() => {
    return assignments.filter(
      (r) =>
        (r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS' || r.status === 'REQUIRES_CORRECTION') &&
        (r.latestSafetyAnalysis?.safetyRiskLevel === 'HIGH' ||
          r.latestSafetyAnalysis?.safetyRiskLevel === 'CRITICAL' ||
          r.workOrderPriority === 'URGENT')
    );
  }, [assignments]);

  // Filtered List
  const filteredAssignments = useMemo(() => {
    return assignments.filter((job) => {
      // Tab filter
      if (activeTab === 'action_needed') {
        if (job.status !== 'ASSIGNED' && job.status !== 'REQUIRES_CORRECTION') return false;
      } else if (activeTab === 'in_progress') {
        if (job.status !== 'IN_PROGRESS') return false;
      } else if (activeTab === 'pending_verification') {
        if (job.status !== 'COMPLETED' && job.status !== 'VERIFICATION_PENDING') return false;
      } else if (activeTab === 'verified') {
        if (job.status !== 'VERIFIED') return false;
      }

      // Risk filter
      if (filterRiskOnly) {
        const risk = job.latestSafetyAnalysis?.safetyRiskLevel;
        if (risk !== 'HIGH' && risk !== 'CRITICAL' && job.workOrderPriority !== 'URGENT') {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = (job.workOrderTitle || job.description || '').toLowerCase().includes(q);
        const matchWo = (job.workOrderNumber || '').toLowerCase().includes(q);
        const matchLocation = (job.location || '').toLowerCase().includes(q);
        const matchCrew = (job.assignedCrew || '').toLowerCase().includes(q);
        const matchId = job.id.toLowerCase().includes(q);
        if (!matchTitle && !matchWo && !matchLocation && !matchCrew && !matchId) {
          return false;
        }
      }

      return true;
    });
  }, [assignments, activeTab, filterRiskOnly, searchQuery]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 font-sans">
      {/* ── Banner Header ── */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* Subtle background circuit watermark */}
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-400/30 text-teal-200 text-xs font-bold uppercase tracking-wider">
                <ClipboardCheck className="w-3.5 h-3.5 text-teal-300" />
                Mobile Inspector Terminal
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[11px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                Telemetry Live
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Field Inspector Hub &bull; {user?.fullName || 'Municipal Officer'}
            </h1>
            <p className="text-xs sm:text-sm text-teal-100/80 max-w-2xl leading-relaxed">
              Dispatch execution, photographic evidence verification, safety protocol checklist, and direct supervisor sign-off submission.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-center">
            <button
              onClick={() => loadAssignments(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all shadow-xs"
              title="Refresh assigned records"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-teal-300' : ''}`} />
              <span>{refreshing ? 'Syncing...' : 'Sync Feed'}</span>
            </button>

            <Link
              to="/maintenance/create"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black transition-all shadow-md hover:shadow-teal-500/25"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Log Maintenance Record</span>
            </Link>

            <Link
              to="/dashboard"
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md border border-white/20 transition-all"
            >
              <Navigation className="w-4 h-4 text-teal-300" />
              <span>City Map</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Operational KPI Metrics Strip ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setActiveTab('action_needed')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'action_needed'
              ? 'bg-amber-500/10 border-amber-500 text-amber-900 dark:text-amber-300 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            <span>Action Required</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{counts.action_needed}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Assigned or correction requested</div>
        </div>

        <div
          onClick={() => setActiveTab('in_progress')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'in_progress'
              ? 'bg-teal-500/10 border-teal-500 text-teal-900 dark:text-teal-300 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            <span>In Execution</span>
            <PlayCircle className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-black text-teal-600 dark:text-teal-400">{counts.in_progress}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Currently on-site</div>
        </div>

        <div
          onClick={() => setActiveTab('pending_verification')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'pending_verification'
              ? 'bg-purple-500/10 border-purple-500 text-purple-900 dark:text-purple-300 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            <span>Awaiting Sign-Off</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-black text-purple-600 dark:text-purple-400">{counts.pending_verification}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Submitted for supervisor check</div>
        </div>

        <div
          onClick={() => setActiveTab('verified')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            activeTab === 'verified'
              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-900 dark:text-emerald-300 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
            <span>Verified &amp; Closed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{counts.verified}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Quality approved operations</div>
        </div>
      </div>

      {/* ── High Risk / Critical Caution Alert Banner ── */}
      {highRiskAssignments.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-amber-950/30 border border-rose-200 dark:border-rose-800/80 rounded-2xl flex items-start gap-3.5 shadow-xs">
          <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1 text-xs">
            <div className="font-bold text-rose-900 dark:text-rose-200 flex items-center gap-2">
              <span>High Safety Risk Notice ({highRiskAssignments.length} Operations)</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 font-mono text-[10px] font-bold">
                MANDATORY PPE
              </span>
            </div>
            <p className="text-rose-800 dark:text-rose-300 leading-relaxed">
              AI Safety Compliance Agent has identified high risk factors or urgent priority on active work orders. Full barricading, utility clearance, and certified personal protective equipment must be verified before commencing work.
            </p>
          </div>
          <button
            onClick={() => setFilterRiskOnly(!filterRiskOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              filterRiskOnly
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-rose-100 dark:bg-rose-900/50 text-rose-800 dark:text-rose-200 hover:bg-rose-200'
            }`}
          >
            {filterRiskOnly ? 'Show All Tasks' : 'Filter High Risk'}
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Search Bar & Filter Tabs ── */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by WO#, Ticket#, Street, or Crew..."
              className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick tab filters */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('action_needed')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'action_needed'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Action Needed</span>
              <span className="px-1.5 py-0.2 bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 text-[10px] rounded-full font-bold">
                {counts.action_needed}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('in_progress')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'in_progress'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>In Progress</span>
              <span className="px-1.5 py-0.2 bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 text-[10px] rounded-full font-bold">
                {counts.in_progress}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('pending_verification')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'pending_verification'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Sign-Off Pending</span>
              <span className="px-1.5 py-0.2 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400 text-[10px] rounded-full font-bold">
                {counts.pending_verification}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              All ({counts.all})
            </button>
          </div>
        </div>
      </div>

      {/* ── Active Task Cards ── */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
            <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">Synchronizing field terminal assignments...</p>
            <p className="text-[11px] text-slate-400 mt-1">Connecting to CiviLanka Municipal Telemetry API</p>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              {searchQuery ? 'No matching assignments found' : 'All clear for this view'}
            </h3>
            <p className="text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No assignments matched "${searchQuery}". Try clearing search filters.`
                : 'No inspection tasks pending in this queue. Select another tab or click Sync Feed.'}
            </p>
            {(searchQuery || filterRiskOnly) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterRiskOnly(false);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-bold hover:bg-teal-100 transition-colors"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredAssignments.map((job) => {
              const isAssigned = job.status === 'ASSIGNED';
              const isInProgress = job.status === 'IN_PROGRESS';
              const isCorrection = job.status === 'REQUIRES_CORRECTION';
              const isActionLoading = actionLoadingId === job.id;

              return (
                <div
                  key={job.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-5 sm:p-6 shadow-xs transition-all ${
                    isCorrection
                      ? 'border-rose-300 dark:border-rose-800 bg-rose-50/20'
                      : isAssigned
                      ? 'border-amber-200 dark:border-amber-900/60'
                      : isInProgress
                      ? 'border-teal-300 dark:border-teal-800/80 shadow-teal-500/5'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                    {/* Left details */}
                    <div className="space-y-3 flex-1">
                      {/* Top Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs px-2.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                          #{job.id.slice(0, 8)}
                        </span>

                        <MaintenanceStatusBadge status={job.status} size="sm" />

                        {job.workOrderNumber && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                            <Layers className="w-3 h-3 text-teal-600" />
                            WO: {job.workOrderNumber}
                          </span>
                        )}

                        {job.workOrderPriority && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              job.workOrderPriority === 'URGENT'
                                ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                : job.workOrderPriority === 'HIGH'
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {job.workOrderPriority}
                          </span>
                        )}

                        {job.latestSafetyAnalysis && (
                          <SafetyRiskBadge level={job.latestSafetyAnalysis.safetyRiskLevel} />
                        )}
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-base font-bold text-slate-900 dark:text-white leading-snug">
                          {job.workOrderTitle || job.description}
                        </h3>
                        {job.description && job.workOrderTitle && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                            {job.description}
                          </p>
                        )}
                      </div>

                      {/* Location & Crew Metadata */}
                      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500 dark:text-slate-400 pt-1">
                        {job.location && (
                          <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                            <span className="font-medium">{job.location}</span>
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.location)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-teal-600 hover:text-teal-700 dark:text-teal-400 ml-1 inline-flex items-center"
                              title="Open in Google Maps"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                        )}

                        {job.assignedCrew && (
                          <div className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>Crew: <strong className="text-slate-700 dark:text-slate-200">{job.assignedCrew}</strong></span>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Logged: <strong>{job.labourHours} hrs</strong></span>
                        </div>

                        {job.actualCost > 0 && (
                          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                            <span>LKR {job.actualCost.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      {/* ── Photographic Evidence & Safety Readiness Strip ── */}
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex flex-wrap items-center gap-4">
                          {/* Before Photo */}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-500">Before Photo:</span>
                            {job.beforeImageUrl ? (
                              <button
                                onClick={() => setPreviewPhotoUrl(job.beforeImageUrl || null)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 text-[11px] hover:bg-emerald-100 transition-colors"
                              >
                                <Eye className="w-3 h-3" /> Captured ✓
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setUploadRecordId(job.id);
                                  setUploadImageType('before');
                                  setUploadModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800 text-[11px] hover:bg-amber-100 transition-colors"
                              >
                                <Camera className="w-3 h-3" /> + Upload
                              </button>
                            )}
                          </div>

                          {/* After Photo */}
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-semibold text-slate-500">After Photo:</span>
                            {job.afterImageUrl ? (
                              <button
                                onClick={() => setPreviewPhotoUrl(job.afterImageUrl || null)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800 text-[11px] hover:bg-emerald-100 transition-colors"
                              >
                                <Eye className="w-3 h-3" /> Captured ✓
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setUploadRecordId(job.id);
                                  setUploadImageType('after');
                                  setUploadModalOpen(true);
                                }}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 font-bold border border-amber-200 dark:border-amber-800 text-[11px] hover:bg-amber-100 transition-colors"
                              >
                                <Camera className="w-3 h-3" /> + Upload
                              </button>
                            )}
                          </div>

                          {/* Safety Protocol */}
                          <div className="flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-teal-600" />
                            <span
                              className={`text-[11px] font-semibold ${
                                job.safetyChecklist ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-400'
                              }`}
                            >
                              Safety Checklist {job.safetyChecklist ? '✓ Verified' : '○ Pending'}
                            </span>
                          </div>
                        </div>

                        {/* AI Safety Compliance Chip */}
                        {job.latestSafetyAnalysis && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            <span>AI Confidence: {Math.round(job.latestSafetyAnalysis.confidence * 100)}%</span>
                          </div>
                        )}
                      </div>

                      {/* Supervisor Correction Notice if any */}
                      {isCorrection && (
                        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
                          <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <strong className="font-bold">Supervisor Correction Requested:</strong>
                            <p className="mt-0.5">
                              {job.verificationNotes || 'Workmanship or evidence needs correction before final municipal sign-off.'}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right action control column */}
                    <div className="flex lg:flex-col items-center lg:items-end justify-between lg:justify-center gap-2 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800 flex-shrink-0">
                      {isAssigned && (
                        <button
                          onClick={() => handleStartInspection(job.id)}
                          disabled={isActionLoading}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black shadow-xs transition-all"
                        >
                          <PlayCircle className="w-4 h-4" />
                          <span>{isActionLoading ? 'Commencing...' : 'Start Inspection'}</span>
                        </button>
                      )}

                      {(isInProgress || isCorrection) && (
                        <button
                          onClick={() => handleOpenSignOff(job)}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all"
                        >
                          <Send className="w-4 h-4" />
                          <span>Submit Sign-Off</span>
                        </button>
                      )}

                      <Link
                        to={`/maintenance/${job.id}`}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
                      >
                        <span>Full Inspector Sheet</span>
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal: Rapid Evidence Upload ── */}
      <EvidenceUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        maintenanceId={uploadRecordId}
        imageType={uploadImageType}
        onUploaded={() => {
          loadAssignments(true);
        }}
      />

      {/* ── Modal: Rapid Sign-Off & Verification Submission ── */}
      {signOffModalOpen && signOffRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-teal-600" />
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Submit Inspection Sign-Off
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  WO: {signOffRecord.workOrderNumber || signOffRecord.id.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={() => setSignOffModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Field Observations &amp; Rectification Memo <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={signOffNotes}
                  onChange={(e) => setSignOffNotes(e.target.value)}
                  placeholder="Detail completed repairs, contractor quality, safety controls observed, and surface finish..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Labour Hours Executed
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={signOffHours}
                    onChange={(e) => setSignOffHours(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Actual Cost Incurred (LKR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={signOffCost}
                    onChange={(e) => setSignOffCost(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Evidence check indicator */}
              <div className="p-3 bg-teal-50 dark:bg-teal-950/40 rounded-xl border border-teal-200 dark:border-teal-800 text-xs text-teal-800 dark:text-teal-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                  <span>Evidence Audit Status</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] pt-1">
                  <span>Before Photo: {signOffRecord.beforeImageUrl ? '✓ Present' : '○ Not Uploaded'}</span>
                  <span>After Photo: {signOffRecord.afterImageUrl ? '✓ Present' : '○ Not Uploaded'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setSignOffModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitSignOff}
                disabled={submittingSignOff || !signOffNotes.trim()}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-black shadow-md transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                <span>{submittingSignOff ? 'Submitting to Queue...' : 'Confirm & Submit to Supervisor'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Photo Lightbox Modal ── */}
      {previewPhotoUrl && (
        <div
          onClick={() => setPreviewPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 cursor-pointer"
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/20 shadow-2xl">
            <button
              onClick={() => setPreviewPhotoUrl(null)}
              className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={previewPhotoUrl}
              alt="Inspection Photographic Evidence"
              className="w-full h-auto max-h-[80vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Backward-compatible alias
export const FieldWorkerPortal = FieldInspectorPortal;
export default FieldInspectorPortal;
