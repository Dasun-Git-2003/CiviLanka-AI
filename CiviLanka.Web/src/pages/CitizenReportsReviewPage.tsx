import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  MapPin,
  Calendar,
  Sparkles,
  Wrench,
  Loader2,
  FileCheck,
  AlertCircle,
  X,
  MessageSquare,
  PlusCircle,
  Copy,
  Check,
} from 'lucide-react';
import { hazardService } from '../services/hazardService';
import type { HazardDto, ReviewHazardPayload } from '../types/hazard';

export const CitizenReportsReviewPage: React.FC = () => {
  const [hazards, setHazards] = useState<HazardDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL | PENDING | APPROVED | IN_PROGRESS | RESOLVED | REJECTED
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');

  // Review Modal State
  const [selectedHazard, setSelectedHazard] = useState<HazardDto | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewCategory, setReviewCategory] = useState('');
  const [reviewPriority, setReviewPriority] = useState('');
  const [reviewSeverity, setReviewSeverity] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchHazards = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await hazardService.getAll();
      setHazards(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load citizen reports.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHazards();
  }, []);

  const handleCopyTicket = (ticket: string) => {
    navigator.clipboard.writeText(ticket);
    setCopiedId(ticket);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openReviewModal = (hazard: HazardDto, defaultAction: 'APPROVE' | 'REJECT' = 'APPROVE') => {
    setSelectedHazard(hazard);
    setReviewAction(defaultAction);
    setReviewCategory(hazard.category);
    setReviewPriority(hazard.priority || 'NORMAL');
    setReviewSeverity(hazard.severity || 'MEDIUM');
    setReviewNotes(defaultAction === 'REJECT' ? 'Duplicate complaint / outside municipal jurisdiction.' : '');
    setActionSuccess(null);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHazard) return;

    if (reviewAction === 'REJECT' && !reviewNotes.trim()) {
      alert('Please provide a rejection reason for the citizen audit record.');
      return;
    }

    try {
      setSubmittingReview(true);
      const payload: ReviewHazardPayload = {
        action: reviewAction,
        reviewNotes: reviewNotes.trim() || undefined,
        category: reviewCategory !== selectedHazard.category ? reviewCategory : undefined,
        priority: reviewPriority !== selectedHazard.priority ? reviewPriority : undefined,
        severity: reviewSeverity !== selectedHazard.severity ? reviewSeverity : undefined,
      };

      const updated = await hazardService.reviewHazard(selectedHazard.id, payload);

      // Update state
      setHazards((prev) => prev.map((h) => (h.id === updated.id ? updated : h)));
      setActionSuccess(
        reviewAction === 'APPROVE'
          ? `Report ${updated.ticketNumber} approved successfully. You can now dispatch a work order.`
          : `Report ${updated.ticketNumber} marked as Rejected.`
      );

      setTimeout(() => {
        setSelectedHazard(null);
        setActionSuccess(null);
      }, 1500);
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Helper to determine the comprehensive complaint lifecycle status
  const getComplaintStatus = (hazard: HazardDto) => {
    const rawStatus = (hazard.status || '').toLowerCase();

    if (rawStatus === 'resolved') {
      return {
        label: 'Repaired & Resolved',
        color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
        icon: CheckCircle2,
        stage: 'RESOLVED',
      };
    }

    if (rawStatus === 'rejected') {
      return {
        label: 'Rejected by Official',
        color: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700',
        icon: XCircle,
        stage: 'REJECTED',
      };
    }

    if (hazard.linkedWorkOrderId) {
      const woStatus = (hazard.linkedWorkOrderStatus || '').toUpperCase();
      if (woStatus === 'IN_PROGRESS') {
        return {
          label: `Field Repair In-Progress (${hazard.linkedWorkOrderNumber})`,
          color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700',
          icon: Wrench,
          stage: 'IN_PROGRESS',
        };
      }
      if (woStatus === 'COMPLETED' || woStatus === 'VERIFIED') {
        return {
          label: `Repair Verified (${hazard.linkedWorkOrderNumber})`,
          color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
          icon: CheckCircle2,
          stage: 'RESOLVED',
        };
      }
      return {
        label: `Work Order Dispatched (${hazard.linkedWorkOrderNumber}: ${woStatus})`,
        color: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
        icon: FileCheck,
        stage: 'DISPATCHED',
      };
    }

    if (rawStatus === 'approved') {
      return {
        label: 'Approved (Pending Work Order)',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700',
        icon: CheckCircle2,
        stage: 'APPROVED',
      };
    }

    return {
      label: 'Awaiting Official Review',
      color: 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
      icon: Clock,
      stage: 'PENDING',
    };
  };

  // KPIs
  const kpis = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let inProgress = 0;
    let resolved = 0;
    let rejected = 0;

    hazards.forEach((h) => {
      const s = (h.status || '').toLowerCase();
      if (s === 'resolved') resolved++;
      else if (s === 'rejected') rejected++;
      else if (h.linkedWorkOrderId) inProgress++;
      else if (s === 'approved') approved++;
      else pending++;
    });

    return { total: hazards.length, pending, approved, inProgress, resolved, rejected };
  }, [hazards]);

  // Filtered List
  const filteredHazards = useMemo(() => {
    return hazards.filter((h) => {
      // Search
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matches =
          h.ticketNumber.toLowerCase().includes(query) ||
          h.category.toLowerCase().includes(query) ||
          h.description.toLowerCase().includes(query) ||
          (h.address && h.address.toLowerCase().includes(query)) ||
          (h.citizenName && h.citizenName.toLowerCase().includes(query)) ||
          (h.linkedWorkOrderNumber && h.linkedWorkOrderNumber.toLowerCase().includes(query));
        if (!matches) return false;
      }

      // Status Tab Filter
      if (statusFilter !== 'ALL') {
        const s = (h.status || '').toLowerCase();
        if (statusFilter === 'PENDING') {
          if (s === 'approved' || s === 'rejected' || s === 'resolved' || h.linkedWorkOrderId) return false;
        } else if (statusFilter === 'APPROVED') {
          if (s !== 'approved' && !h.linkedWorkOrderId) return false;
          if (s === 'resolved' || s === 'rejected') return false;
        } else if (statusFilter === 'RESOLVED') {
          if (s !== 'resolved') return false;
        } else if (statusFilter === 'REJECTED') {
          if (s !== 'rejected') return false;
        }
      }

      // Category Filter
      if (categoryFilter !== 'ALL' && h.category !== categoryFilter) {
        return false;
      }

      // Severity Filter
      if (severityFilter !== 'ALL') {
        const sev = (h.severity || h.latestAIAnalysis?.severity || '').toUpperCase();
        if (sev !== severityFilter) return false;
      }

      return true;
    });
  }, [hazards, searchQuery, statusFilter, categoryFilter, severityFilter]);

  const categories = useMemo(() => {
    const set = new Set(hazards.map((h) => h.category).filter(Boolean));
    return Array.from(set);
  }, [hazards]);

  return (
    <div className="space-y-6">
      {/* ── Top Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Citizen Reports &amp; Complaints Triage</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
              Official Review Queue
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Authoritative municipal review portal for citizen-reported infrastructure hazards. Approve complaints to release work order generation or reject duplicates.
          </p>
        </div>

        <button
          onClick={fetchHazards}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Reports</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl p-4 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── KPI Summary Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div
          onClick={() => setStatusFilter('PENDING')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            statusFilter === 'PENDING'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700 ring-2 ring-amber-400'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Needs Review
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700 dark:text-amber-300 mt-1">{kpis.pending}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Awaiting official action</div>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            statusFilter === 'APPROVED'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-400'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Approved
            </span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-blue-700 dark:text-blue-300 mt-1">{kpis.approved}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Ready for work orders</div>
        </div>

        <div
          onClick={() => setStatusFilter('APPROVED')}
          className="rounded-xl p-4 border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
              In Execution
            </span>
            <Wrench className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300 mt-1">{kpis.inProgress}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Active field work orders</div>
        </div>

        <div
          onClick={() => setStatusFilter('RESOLVED')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            statusFilter === 'RESOLVED'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 ring-2 ring-emerald-400'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Resolved
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300 mt-1">{kpis.resolved}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Repaired &amp; verified</div>
        </div>

        <div
          onClick={() => setStatusFilter('REJECTED')}
          className={`cursor-pointer rounded-xl p-4 border transition-all ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 ring-2 ring-rose-400'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400">
              Rejected
            </span>
            <XCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-700 dark:text-rose-300 mt-1">{kpis.rejected}</div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Duplicates &amp; out-of-scope</div>
        </div>
      </div>

      {/* ── Filters & Tabs Bar ──────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 shadow-2xs space-y-3">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-100 dark:border-slate-700 pb-3">
          {[
            { id: 'ALL', label: 'All Citizen Reports', count: kpis.total },
            { id: 'PENDING', label: 'Needs Review', count: kpis.pending },
            { id: 'APPROVED', label: 'Approved Complaints', count: kpis.approved + kpis.inProgress },
            { id: 'RESOLVED', label: 'Resolved', count: kpis.resolved },
            { id: 'REJECTED', label: 'Rejected', count: kpis.rejected },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search & Dropdown Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticket, citizen, street..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Dropdown */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs border border-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-white rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Reports List ────────────────────────────────────────────────────── */}
      {loading && hazards.length === 0 ? (
        <div className="p-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
          <span>Loading citizen complaint registry...</span>
        </div>
      ) : filteredHazards.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">No Citizen Reports Match Filters</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, status tab, or category filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center justify-between px-1">
            <span>
              Showing {filteredHazards.length} report{filteredHazards.length > 1 ? 's' : ''}
            </span>
          </div>

          {filteredHazards.map((hazard) => {
            const statusInfo = getComplaintStatus(hazard);
            const StatusIcon = statusInfo.icon;
            const sev = (hazard.severity || hazard.latestAIAnalysis?.severity || 'MEDIUM').toUpperCase();

            return (
              <div
                key={hazard.id}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all flex flex-col md:flex-row gap-4 justify-between"
              >
                {/* Left Side: Photo + Details */}
                <div className="flex gap-4 flex-1">
                  {/* Photo Evidence */}
                  <div className="flex-shrink-0">
                    {hazard.imageUrl ? (
                      <div
                        onClick={() => setPreviewImage(hazard.imageUrl!)}
                        className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-slate-100 dark:bg-slate-700 overflow-hidden relative group cursor-pointer border border-slate-200 dark:border-slate-700"
                      >
                        <img
                          src={hazard.imageUrl}
                          alt="Hazard evidence"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            // Fallback if image path fails
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                          Inspect
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-lg bg-slate-100 dark:bg-slate-700/60 border border-dashed border-slate-300 dark:border-slate-600 flex flex-col items-center justify-center text-slate-400">
                        <AlertTriangle className="w-5 h-5 mb-1" />
                        <span className="text-[10px]">No Photo</span>
                      </div>
                    )}
                  </div>

                  {/* Information Details */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Ticket Number with Copy */}
                      <span className="font-mono font-bold text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded text-indigo-700 dark:text-indigo-300 inline-flex items-center gap-1">
                        {hazard.ticketNumber}
                        <button
                          onClick={() => handleCopyTicket(hazard.ticketNumber)}
                          className="hover:text-indigo-900"
                          title="Copy Ticket"
                        >
                          {copiedId === hazard.ticketNumber ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </span>

                      {/* Category Badge */}
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                        {hazard.category}
                      </span>

                      {/* AI Severity Tag */}
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          sev === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                            : sev === 'HIGH'
                            ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300'
                            : sev === 'LOW'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {sev}
                      </span>

                      {/* Date */}
                      <span className="text-[11px] text-slate-400 dark:text-slate-500 inline-flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {new Date(hazard.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {/* Citizen & Location */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        Reported by: <strong className="text-slate-700 dark:text-slate-300">{hazard.citizenName || 'Citizen'}</strong>
                      </span>
                      {hazard.address && (
                        <span className="inline-flex items-center gap-1 truncate max-w-md" title={hazard.address}>
                          <MapPin className="w-3 h-3 text-rose-500 flex-shrink-0" />
                          <span className="truncate">{hazard.address}</span>
                        </span>
                      )}
                    </div>

                    {/* Citizen Description */}
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                      "{hazard.description}"
                    </p>

                    {/* AI Analysis Note / Review Note */}
                    {hazard.reviewNotes ? (
                      <div className="text-[11px] bg-purple-50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-300 px-2.5 py-1.5 rounded-lg border border-purple-200 dark:border-purple-800 flex items-start gap-1.5 mt-1">
                        <MessageSquare className="w-3.5 h-3.5 text-purple-600 flex-shrink-0 mt-0.5" />
                        <span>{hazard.reviewNotes}</span>
                      </div>
                    ) : hazard.latestAIAnalysis?.reason ? (
                      <div className="text-[11px] bg-slate-50 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-100 dark:border-slate-700 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-cyan-600 flex-shrink-0" />
                        <span className="truncate">AI: {hazard.latestAIAnalysis.reason}</span>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* Right Side: Status Pipeline + Actions */}
                <div className="flex flex-col sm:items-end justify-between gap-3 flex-shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-700">
                  {/* Complaint Status Badge */}
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${statusInfo.color}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      <span>{statusInfo.label}</span>
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* If Pending: Show Approve and Reject Buttons */}
                    {statusInfo.stage === 'PENDING' && (
                      <>
                        <button
                          onClick={() => openReviewModal(hazard, 'APPROVE')}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Approve Report</span>
                        </button>
                        <button
                          onClick={() => openReviewModal(hazard, 'REJECT')}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-800 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}

                    {/* If Approved without Work Order: Allow Work Order Creation */}
                    {statusInfo.stage === 'APPROVED' && (
                      <>
                        <Link
                          to={`/work-orders/create?hazardId=${hazard.id}`}
                          className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>Dispatch Work Order</span>
                        </Link>
                        <button
                          onClick={() => openReviewModal(hazard, 'REJECT')}
                          className="px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600"
                        >
                          Revoke / Reject
                        </button>
                      </>
                    )}

                    {/* If Work Order already exists: Direct Link */}
                    {hazard.linkedWorkOrderId && (
                      <Link
                        to={`/work-orders/${hazard.linkedWorkOrderId}`}
                        className="px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <span>View Work Order</span>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      </Link>
                    )}

                    {/* If Rejected: Option to Re-evaluate */}
                    {statusInfo.stage === 'REJECTED' && (
                      <button
                        onClick={() => openReviewModal(hazard, 'APPROVE')}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold"
                      >
                        Re-evaluate &amp; Approve
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Official Review Modal (Approve / Reject) ─────────────────────────── */}
      {selectedHazard && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-700 space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`p-2 rounded-lg ${
                    reviewAction === 'APPROVE'
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60'
                  }`}
                >
                  {reviewAction === 'APPROVE' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Official Triage: {selectedHazard.ticketNumber}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Municipal Complaint Assessment &amp; Authorization
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedHazard(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                {/* Decision Toggle */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    Official Decision Action
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReviewAction('APPROVE')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        reviewAction === 'APPROVE'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Approve Report</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setReviewAction('REJECT')}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                        reviewAction === 'REJECT'
                          ? 'bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                          : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Reject Report</span>
                    </button>
                  </div>
                </div>

                {/* Complaint Summary Context */}
                <div className="bg-slate-50 dark:bg-slate-700/40 p-3 rounded-xl border border-slate-100 dark:border-slate-700 text-xs space-y-1">
                  <div className="text-slate-600 dark:text-slate-300">
                    <strong>Report:</strong> "{selectedHazard.description}"
                  </div>
                  {selectedHazard.address && (
                    <div className="text-slate-500 dark:text-slate-400 truncate">
                      <strong>Location:</strong> {selectedHazard.address}
                    </div>
                  )}
                </div>

                {/* Category & Severity Confirmation (if approving) */}
                {reviewAction === 'APPROVE' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Category Verification
                      </label>
                      <select
                        value={reviewCategory}
                        onChange={(e) => setReviewCategory(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="Pothole">Pothole</option>
                        <option value="DamagedRoad">Damaged Road</option>
                        <option value="WaterLeak">Water Leak</option>
                        <option value="DrainageProblem">Drainage Problem</option>
                        <option value="StreetLightProblem">Street Light Problem</option>
                        <option value="BrokenTrafficSignal">Broken Traffic Signal</option>
                        <option value="FallenTree">Fallen Tree</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Priority Level
                      </label>
                      <select
                        value={reviewPriority}
                        onChange={(e) => setReviewPriority(e.target.value)}
                        className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                      >
                        <option value="LOW">LOW</option>
                        <option value="NORMAL">NORMAL</option>
                        <option value="HIGH">HIGH</option>
                        <option value="URGENT">URGENT</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Reviewer Notes / Justification */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {reviewAction === 'APPROVE'
                      ? 'Reviewer Notes / Crew Direction (Optional)'
                      : 'Rejection Reason (Mandatory for citizen audit record)'}
                  </label>
                  <textarea
                    rows={3}
                    required={reviewAction === 'REJECT'}
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder={
                      reviewAction === 'APPROVE'
                        ? 'e.g. Field verification confirmed 2x2m road cavitation. Approved for work order dispatch.'
                        : 'e.g. Duplicate report already being addressed under ticket #CG-2026-00018.'
                    }
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 dark:bg-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setSelectedHazard(null)}
                    disabled={submittingReview}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md flex items-center gap-1.5 disabled:opacity-50 ${
                      reviewAction === 'APPROVE'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                        : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/25'
                    }`}
                  >
                    {submittingReview ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        {reviewAction === 'APPROVE' ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5" />
                        )}
                        <span>Confirm {reviewAction === 'APPROVE' ? 'Approval' : 'Rejection'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Photo Preview Modal ────────────────────────────────────────────── */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 cursor-pointer"
        >
          <div className="max-w-2xl max-h-[85vh] bg-white dark:bg-slate-800 rounded-2xl overflow-hidden shadow-2xl relative p-2">
            <img src={previewImage} alt="Hazard Full Resolution" className="w-full h-auto max-h-[80vh] object-contain rounded-xl" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CitizenReportsReviewPage;
