import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  Bot,
  Building2,
  Search,
  Filter,
  User,
  X,
  Layers,
  Sparkles,
  ArrowRight,
  Route,
  MapPin,
  Lock,
} from 'lucide-react';
import { workOrderService } from '../services/workOrderService';
import { authService } from '../services/authService';
import { PriorityBadge } from '../components/PriorityBadge';
import type { WorkOrder } from '../types/workOrder';

export const ApprovalQueue: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication & Director authorization check (Member 3)
  const currentUser = authService.getCurrentUser();
  const isDirector =
    currentUser?.role === 'PublicWorksDirector' ||
    currentUser?.role === 'Director';

  // Filter & Search States
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED'>('PENDING');
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Decision Modal State
  const [decisionModal, setDecisionModal] = useState<{
    isOpen: boolean;
    mode: 'approve' | 'reject';
    workOrder: WorkOrder | null;
  }>({
    isOpen: false,
    mode: 'approve',
    workOrder: null,
  });
  const [decisionNotes, setDecisionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);

  const fetchWorkOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workOrderService.getAll();
      setWorkOrders(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load work orders approval queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const formatLKR = (amount?: number) => {
    if (!amount && amount !== 0) return '—';
    return `Rs. ${amount.toLocaleString('en-LK')}`;
  };

  // Status classifier helper
  const getApprovalState = (wo: WorkOrder): 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED' => {
    if (wo.approvalStatus === 'APPROVED' || wo.status === 'APPROVED') return 'APPROVED';
    if (wo.approvalStatus === 'REJECTED' || wo.status === 'REJECTED') return 'REJECTED';
    if (wo.approvalStatus === 'PENDING' || wo.status === 'PENDING_APPROVAL' || wo.approvalRequired) return 'PENDING';
    return 'NOT_REQUIRED';
  };

  // Tab counts
  const tabCounts = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    let notRequired = 0;

    workOrders.forEach((wo) => {
      const state = getApprovalState(wo);
      if (state === 'PENDING') pending++;
      else if (state === 'APPROVED') approved++;
      else if (state === 'REJECTED') rejected++;
      else notRequired++;
    });

    return {
      all: workOrders.length,
      pending,
      approved,
      rejected,
      notRequired,
    };
  }, [workOrders]);

  // Statistics KPI cards
  const stats = useMemo(() => {
    const pendingList = workOrders.filter((w) => getApprovalState(w) === 'PENDING');
    const pendingSum = pendingList.reduce((acc, w) => acc + (w.estimatedCost || 0), 0);

    const approvedList = workOrders.filter((w) => getApprovalState(w) === 'APPROVED');
    const approvedSum = approvedList.reduce((acc, w) => acc + (w.approvedBudget || w.estimatedCost || 0), 0);

    const rejectedCount = workOrders.filter((w) => getApprovalState(w) === 'REJECTED').length;

    const highConfidenceAICount = workOrders.filter(
      (w) => (w.latestAIAnalysis?.confidence || 0) >= 0.8 || (w.latestCostEstimate?.confidence || 0) >= 0.8
    ).length;
    const aiConfidencePct = workOrders.length > 0 ? Math.round((highConfidenceAICount / workOrders.length) * 100) : 95;

    return {
      pendingCount: pendingList.length,
      pendingSum,
      approvedCount: approvedList.length,
      approvedSum,
      rejectedCount,
      aiConfidencePct,
    };
  }, [workOrders]);

  // Filtered List
  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter((wo) => {
      const state = getApprovalState(wo);
      const matchesTab = activeTab === 'ALL' || state === activeTab;

      const q = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        wo.workOrderNumber.toLowerCase().includes(q) ||
        wo.title.toLowerCase().includes(q) ||
        wo.description.toLowerCase().includes(q) ||
        (wo.assetName && wo.assetName.toLowerCase().includes(q)) ||
        (wo.assignedContractorName && wo.assignedContractorName.toLowerCase().includes(q));

      const matchesPriority = priorityFilter === 'ALL' || wo.priority === priorityFilter;

      return matchesTab && matchesSearch && matchesPriority;
    });
  }, [workOrders, activeTab, searchTerm, priorityFilter]);

  // Open Decision Modal (Defensively guarded to authorized Directors)
  const openDecisionModal = (wo: WorkOrder, mode: 'approve' | 'reject') => {
    if (!isDirector) {
      alert('Access Restricted: Only the Public Works Director or Director may authorize or reject work orders.');
      return;
    }
    setDecisionModal({
      isOpen: true,
      mode,
      workOrder: wo,
    });
    setDecisionNotes(
      mode === 'approve'
        ? 'Approved for immediate field execution and material procurement under Municipal Standard §2026.'
        : ''
    );
  };

  // Submit Decision (Defensively guarded to authorized Directors)
  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) {
      alert('Access Restricted: Only the Public Works Director or Director may authorize or reject work orders.');
      return;
    }
    if (!decisionModal.workOrder) return;

    const woId = decisionModal.workOrder.id;
    const isApprove = decisionModal.mode === 'approve';

    try {
      setSubmitting(true);
      const notesToSend = decisionNotes.trim() ? decisionNotes.trim() : undefined;
      let updated: WorkOrder;
      if (isApprove) {
        updated = await workOrderService.approve(woId, notesToSend);
      } else {
        updated = await workOrderService.reject(woId, notesToSend);
      }

      // Update local state smoothly
      setWorkOrders((prev) =>
        prev.map((item) => (item.id === woId ? { ...item, ...updated, approvalStatus: isApprove ? 'APPROVED' : 'REJECTED' } : item))
      );

      setDecisionModal({ isOpen: false, mode: 'approve', workOrder: null });
      setToast({
        show: true,
        message: `Work Order ${decisionModal.workOrder.workOrderNumber} successfully ${isApprove ? 'approved' : 'rejected'}.`,
        type: 'success',
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err: any) {
      alert(err?.message || `Failed to ${decisionModal.mode} work order.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="bg-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative overflow-hidden">
        {/* Subtle glowing background aura */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 relative">
          <div className="w-14 h-14 rounded-2xl bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shadow-inner flex-shrink-0">
            <ShieldCheck className="w-7 h-7 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Public Works Director Approval Queue
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-900/60 text-cyan-300 border border-cyan-700/60 uppercase">
                Executive Portal
              </span>
              {isDirector ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 uppercase flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Director Authorized ({currentUser?.role})
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 uppercase flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  Read-Only View ({currentUser?.role || 'Guest'})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Mandatory statutory sign-off queue for municipal infrastructure contracts, emergency roadworks, and capital treasury authorizations.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto relative">
          <button
            onClick={fetchWorkOrders}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 transition-colors shadow-xs cursor-pointer"
            title="Refresh Queue"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
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
          <button onClick={() => setToast(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Executive KPI Summary Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center justify-between">
            <span>Awaiting Director Action</span>
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">{loading ? '...' : stats.pendingCount}</div>
          <div className="text-[11px] text-slate-500 font-mono">
            {formatLKR(stats.pendingSum)} pending
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-between">
            <span>Authorized &amp; Committed</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">{loading ? '...' : stats.approvedCount}</div>
          <div className="text-[11px] text-slate-500 font-mono">
            {formatLKR(stats.approvedSum)} allocated
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center justify-between">
            <span>Rejections / Returned</span>
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-2xl font-black text-rose-700">{loading ? '...' : stats.rejectedCount}</div>
          <div className="text-[11px] text-slate-500">Requires engineer revision</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs space-y-1">
          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider flex items-center justify-between">
            <span>AI Risk Alignment</span>
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-700">{stats.aiConfidencePct}%</div>
          <div className="text-[11px] text-slate-500">Confidence &ge; 80%</div>
        </div>
      </div>

      {/* ── State Navigation Tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-px">
        <button
          onClick={() => setActiveTab('PENDING')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'PENDING'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Pending Director Sign-Off</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800 font-extrabold">
            {tabCounts.pending}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('APPROVED')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'APPROVED'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>Approved &amp; Authorized</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-extrabold">
            {tabCounts.approved}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('REJECTED')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'REJECTED'
              ? 'border-rose-600 text-rose-700 bg-rose-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <XCircle className="w-3.5 h-3.5 text-rose-600" />
          <span>Rejected / Revision Requested</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-extrabold">
            {tabCounts.rejected}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'ALL'
              ? 'border-cyan-600 text-cyan-700 bg-cyan-50/50'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-cyan-600" />
          <span>All Work Orders</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-200 text-slate-700 font-extrabold">
            {tabCounts.all}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('NOT_REQUIRED')}
          className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            activeTab === 'NOT_REQUIRED'
              ? 'border-slate-600 text-slate-800 bg-slate-100'
              : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
          }`}
        >
          <span>Standard Triage</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600 font-extrabold">
            {tabCounts.notRequired}
          </span>
        </button>
      </div>

      {/* ── Search & Filter Controls ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by WO#, title, asset, or contractor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs p-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent Priority</option>
            <option value="HIGH">High Priority</option>
            <option value="NORMAL">Normal Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {(searchTerm || priorityFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setPriorityFilter('ALL');
              }}
              className="text-xs px-2.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* ── Queue List ────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center text-xs text-slate-500">
          <div className="w-8 h-8 border-3 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading director approval queue records...
        </div>
      ) : filteredWorkOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">
            {activeTab === 'PENDING'
              ? 'All Clear! No Pending Approvals'
              : 'No Work Orders Found in this View'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {activeTab === 'PENDING'
              ? 'All infrastructure work orders requiring Public Works Director authorization have been evaluated.'
              : 'Try clearing your search query or switching to another state tab.'}
          </p>
          <div className="pt-2">
            <Link
              to="/work-orders"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
            >
              <span>View All Work Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between px-1">
            <span>
              SHOWING {filteredWorkOrders.length} WORK ORDER{filteredWorkOrders.length > 1 ? 'S' : ''} IN QUEUE
            </span>
            <span className="font-mono text-[11px] text-slate-400">Policy: Mandatory Director Sign-Off §2026</span>
          </div>

          {filteredWorkOrders.map((wo) => {
            const approvalState = getApprovalState(wo);
            const isPending = approvalState === 'PENDING';
            const isApproved = approvalState === 'APPROVED';
            const isRejected = approvalState === 'REJECTED';

            return (
              <div
                key={wo.id}
                className={`bg-white rounded-2xl p-6 border transition-all shadow-xs hover:shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6 ${
                  isPending
                    ? 'border-amber-300 ring-1 ring-amber-100'
                    : isApproved
                    ? 'border-emerald-200'
                    : isRejected
                    ? 'border-rose-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Details Section */}
                <div className="space-y-3 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {wo.workOrderNumber}
                    </span>
                    <PriorityBadge priority={wo.priority} />

                    {isPending && (
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Director Approval Required
                      </span>
                    )}

                    {isApproved && (
                      <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Approved &amp; Capital Committed
                      </span>
                    )}

                    {isRejected && (
                      <span className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        Returned for Revision
                      </span>
                    )}

                    {/* Member 3 Risk & Reason Metadata Badges */}
                    {wo.isArterialRoad && (
                      <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Route className="w-3 h-3 text-red-600" />
                        Arterial Road
                      </span>
                    )}
                    {wo.approvalReason === 'Both' && (
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                        Threshold + Arterial Risk
                      </span>
                    )}
                    {wo.approvalReason === 'ArterialRoadRisk' && (
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                        Arterial Corridor
                      </span>
                    )}
                    {wo.approvalReason === 'ThresholdExceeded' && (
                      <span className="text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
                        Budget Threshold
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">{wo.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-1 leading-relaxed">
                      {wo.description}
                    </p>
                  </div>

                  {/* Metadata & AI Analysis preview */}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    {wo.assetName && (
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{wo.assetName}</span>
                      </div>
                    )}

                    {wo.hazardAddress && (
                      <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate max-w-xs">{wo.hazardAddress}</span>
                      </div>
                    )}

                    {wo.assignedContractorName && (
                      <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Contractor: {wo.assignedContractorName}</span>
                      </div>
                    )}

                    {wo.latestCostEstimate?.modelName && (
                      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-50 px-2.5 py-0.5 rounded-lg border border-slate-200">
                        <Sparkles className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                        <span>
                          {wo.latestCostEstimate.modelName === 'RuleBasedFallback' ||
                          wo.latestCostEstimate.modelName?.toLowerCase().includes('fallback')
                            ? 'Source: Rule-Based Fallback'
                            : 'Source: Gemini'}
                        </span>
                        {wo.latestCostEstimate.confidence != null && (
                          <span className="text-slate-400">
                            ({Math.round(wo.latestCostEstimate.confidence * 100)}% confidence)
                          </span>
                        )}
                      </div>
                    )}

                    {wo.latestAIAnalysis?.reason && (
                      <div className="flex items-center gap-1.5 text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-100 font-medium truncate max-w-md">
                        <Bot className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                        <span className="truncate italic">&quot;{wo.latestAIAnalysis.reason}&quot;</span>
                      </div>
                    )}

                    {wo.notes && (
                      <div className="text-[11px] text-slate-500 italic">
                        Notes: {wo.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Cost & Decision Action Block */}
                <div className="flex flex-col lg:items-end justify-between gap-4 flex-shrink-0 lg:border-l lg:border-slate-100 lg:pl-6">
                  <div className="text-left lg:text-right">
                    <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      {isApproved ? 'Approved Budget' : 'Estimated Cost'}
                    </div>
                    <div className="text-2xl font-black font-mono text-slate-900 mt-0.5">
                      {formatLKR(isApproved ? (wo.approvedBudget || wo.estimatedCost) : wo.estimatedCost)}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Target Currency: LKR
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/work-orders/${wo.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold transition-colors"
                      title="Inspect Full Work Order Details"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Details</span>
                    </Link>

                    {isDirector ? (
                      isPending ? (
                        <>
                          <button
                            onClick={() => openDecisionModal(wo, 'reject')}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>

                          <button
                            onClick={() => openDecisionModal(wo, 'approve')}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Authorize</span>
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => openDecisionModal(wo, isApproved ? 'reject' : 'approve')}
                          className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <span>Change Decision</span>
                        </button>
                      )
                    ) : (
                      <span className="text-[11px] text-slate-400 italic px-2 py-1">
                        {isPending ? 'Director Action Required' : `Decision: ${wo.approvalStatus || wo.status}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Director Decision Modal Dialog ────────────────────────────────────── */}
      {isDirector && decisionModal.isOpen && decisionModal.workOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div
              className={`p-5 text-white flex items-center justify-between ${
                decisionModal.mode === 'approve' ? 'bg-slate-900' : 'bg-rose-950'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    decisionModal.mode === 'approve'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-rose-900 text-rose-300 border border-rose-700'
                  }`}
                >
                  {decisionModal.mode === 'approve' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {decisionModal.mode === 'approve'
                      ? 'Executive Director Authorization'
                      : 'Reject / Return Work Order'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Work Order #{decisionModal.workOrder.workOrderNumber}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setDecisionModal({ isOpen: false, mode: 'approve', workOrder: null })}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleDecisionSubmit} className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
                <div className="text-xs font-bold text-slate-900">{decisionModal.workOrder.title}</div>
                <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-200/60 font-mono">
                  <span>Estimated Capital Required:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatLKR(decisionModal.workOrder.estimatedCost)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {decisionModal.mode === 'approve'
                    ? 'Director Directives & Authorization Notes (Optional)'
                    : 'Reason for Rejection / Corrective Actions Needed (Optional)'}
                </label>
                <textarea
                  rows={4}
                  value={decisionNotes}
                  onChange={(e) => setDecisionNotes(e.target.value)}
                  placeholder={
                    decisionModal.mode === 'approve'
                      ? 'Enter any special directives or conditions...'
                      : 'Specify reasons for return or rejection (optional)...'
                  }
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 text-slate-800 leading-relaxed"
                />
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-600 flex-shrink-0" />
                <span>
                  Authorized under Municipal Transparency Standard §2026. Action will be permanently recorded in the Audit Ledger.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setDecisionModal({ isOpen: false, mode: 'approve', workOrder: null })}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50 cursor-pointer ${
                    decisionModal.mode === 'approve'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {decisionModal.mode === 'approve' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <XCircle className="w-4 h-4" />
                  )}
                  <span>
                    {submitting
                      ? 'Submitting...'
                      : decisionModal.mode === 'approve'
                      ? 'Authorize Work Order'
                      : 'Reject Work Order'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalQueue;
