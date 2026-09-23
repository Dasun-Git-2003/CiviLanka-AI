import React, { useEffect, useState } from 'react';
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
  Route,
  Sparkles,
  MapPin,
} from 'lucide-react';
import { workOrderService } from '../services/workOrderService';
import { authService } from '../services/authService';
import { PriorityBadge } from '../components/PriorityBadge';
import type { WorkOrder } from '../types/workOrder';

export const ApprovalQueue: React.FC = () => {
  const [pendingOrders, setPendingOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const currentUser = authService.getCurrentUser();
  const isDirector =
    currentUser?.role === 'PublicWorksDirector' ||
    currentUser?.role === 'Director';

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const data = await workOrderService.getPendingApproval();
      setPendingOrders(data);
    } catch (err) {
      console.error('Failed to load approval queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (id: string) => {
    const notes = window.prompt('Director Approval Notes (Optional):', 'Approved for immediate execution.');
    if (notes === null) return;

    setProcessingId(id);
    try {
      await workOrderService.approve(id, notes);
      await fetchQueue();
    } catch (err) {
      alert('Failed to approve work order.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const notes = window.prompt('Reason for Rejection:');
    if (!notes) return;

    setProcessingId(id);
    try {
      await workOrderService.reject(id, notes);
      await fetchQueue();
    } catch (err) {
      alert('Failed to reject work order.');
    } finally {
      setProcessingId(null);
    }
  };

  const formatLKR = (amount?: number) => {
    if (!amount) return '—';
    return `Rs. ${amount.toLocaleString('en-LK')}`;
  };

  const getReasonBadge = (reason?: string) => {
    switch (reason) {
      case 'Both':
        return (
          <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-purple-600" />
            Cost threshold + arterial-road risk
          </span>
        );
      case 'ArterialRoadRisk':
        return (
          <span className="text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Route className="w-3 h-3 text-rose-600" />
            High-risk arterial road
          </span>
        );
      case 'ThresholdExceeded':
        return (
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Cost exceeds Director threshold
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Approval Required
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/20 border border-amber-400/30 rounded-xl text-amber-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Public Works Director Approval Queue</h1>
            <p className="text-xs text-slate-300 mt-0.5">
              Review and authorize high-value (&gt; Rs. 100,000) or high-risk arterial road work orders.
            </p>
          </div>
        </div>

        <button
          onClick={fetchQueue}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors self-start sm:self-auto cursor-pointer"
          title="Refresh Queue"
        >
          <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Queue List */}
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-400">
          Loading approval queue...
        </div>
      ) : pendingOrders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900">All Clear! No Pending Approvals</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            All work orders requiring Director authorization have been processed. New high-budget or high-risk arterial orders will appear
            here automatically.
          </p>
          <Link
            to="/work-orders"
            className="inline-block mt-4 text-xs font-semibold text-indigo-600 hover:underline"
          >
            View All Work Orders &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-xs font-semibold text-slate-500 flex items-center justify-between">
            <span>{pendingOrders.length} WORK ORDER{pendingOrders.length > 1 ? 'S' : ''} AWAITING AUTHORIZATION</span>
            <span>Policy: &gt; Rs. 100,000 OR High-Risk Arterial Road</span>
          </div>

          {pendingOrders.map((wo) => {
            const isFallback =
              wo.latestCostEstimate?.modelName === 'RuleBasedFallback' ||
              wo.latestCostEstimate?.modelName?.toLowerCase().includes('fallback');
            const confidence =
              wo.latestCostEstimate?.confidence != null
                ? Math.round(wo.latestCostEstimate.confidence * 100)
                : null;

            return (
              <div
                key={wo.id}
                className="bg-white border border-amber-200 rounded-xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {wo.workOrderNumber}
                    </span>
                    <PriorityBadge priority={wo.priority} />
                    {getReasonBadge(wo.approvalReason)}
                    {wo.isArterialRoad && (
                      <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Route className="w-3 h-3 text-red-600" />
                        Arterial Road
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{wo.title}</h3>
                  <p className="text-xs text-slate-600 line-clamp-2">{wo.description}</p>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-2 border-t border-slate-100">
                    {wo.assetName && (
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{wo.assetName}</span>
                      </div>
                    )}

                    {wo.hazardAddress && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{wo.hazardAddress}</span>
                      </div>
                    )}

                    {wo.latestCostEstimate?.modelName && (
                      <div className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                        <Sparkles className="w-3 h-3 text-indigo-500" />
                        <span>{isFallback ? 'Source: Rule-Based Fallback' : 'Source: Gemini'}</span>
                        {confidence !== null && (
                          <span className="text-slate-400">({confidence}% AI confidence)</span>
                        )}
                      </div>
                    )}

                    {wo.latestAIAnalysis?.reason && (
                      <div className="flex items-center gap-1.5 text-indigo-600 font-medium truncate max-w-md">
                        <Bot className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate italic">&quot;{wo.latestAIAnalysis.reason}&quot;</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cost & Decision Buttons */}
                <div className="flex flex-col md:items-end gap-3 flex-shrink-0 md:border-l md:border-slate-100 md:pl-5">
                  <div className="text-left md:text-right">
                    <div className="text-[11px] text-slate-400 font-medium">Estimated Repair Cost</div>
                    <div className="text-xl font-bold font-mono text-emerald-600">
                      {formatLKR(wo.estimatedCost)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      to={`/work-orders/${wo.id}`}
                      className="p-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg text-xs"
                      title="Inspect Full Details"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>

                    {isDirector && (
                      <>
                        <button
                          onClick={() => handleReject(wo.id)}
                          disabled={processingId === wo.id}
                          className="flex items-center gap-1 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>

                        <button
                          onClick={() => handleApprove(wo.id)}
                          disabled={processingId === wo.id}
                          className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
