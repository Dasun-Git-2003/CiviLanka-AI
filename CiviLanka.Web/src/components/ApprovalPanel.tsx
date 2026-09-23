import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, FileCheck, ShieldAlert, Route } from 'lucide-react';
import { authService } from '../services/authService';
import type { WorkOrder } from '../types/workOrder';

interface ApprovalPanelProps {
  workOrder: WorkOrder;
  onApprove: (notes: string) => Promise<void>;
  onReject: (notes: string) => Promise<void>;
}

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({ workOrder, onApprove, onReject }) => {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<'approve' | 'reject' | null>(null);

  const currentUser = authService.getCurrentUser();
  const isDirector =
    currentUser?.role === 'PublicWorksDirector' ||
    currentUser?.role === 'Director';

  const handleAction = async (action: 'approve' | 'reject') => {
    setLoading(true);
    try {
      if (action === 'approve') {
        await onApprove(notes);
      } else {
        await onReject(notes);
      }
      setShowConfirm(null);
      setNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isPending = workOrder.approvalStatus === 'PENDING' || workOrder.status === 'PENDING_APPROVAL';
  const isApproved = workOrder.approvalStatus === 'APPROVED' || workOrder.status === 'APPROVED';
  const isRejected = workOrder.approvalStatus === 'REJECTED' || workOrder.status === 'REJECTED';

  // Format Approval Reason label
  const getApprovalReasonDisplay = () => {
    switch (workOrder.approvalReason) {
      case 'Both':
        return {
          title: 'Cost Threshold Exceeded + Arterial Road Risk',
          description:
            `Estimated cost (Rs. ${(workOrder.estimatedCost || 0).toLocaleString()}) exceeds the Rs. 100,000 threshold AND this site is on a high-risk arterial road with heavy traffic flow. Mandatory Director authorization required.`,
        };
      case 'ArterialRoadRisk':
        return {
          title: 'High-Risk Arterial Road Safety Oversight',
          description:
            'This repair is located on a major arterial thoroughfare. Mandatory Director review required to ensure traffic diversion and safety measures before mobilizing.',
        };
      case 'ThresholdExceeded':
        return {
          title: 'Cost Exceeds Director Approval Threshold',
          description:
            `Estimated cost (Rs. ${(workOrder.estimatedCost || 0).toLocaleString()}) exceeds the configured municipal threshold of Rs. 100,000. Formal Director authorization required.`,
        };
      default:
        return null;
    }
  };

  const reasonInfo = getApprovalReasonDisplay();

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-4 mb-5 gap-3">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="font-semibold text-slate-800 text-sm">Director Review &amp; Governance</h3>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500">
              <span>Status: <strong className="text-slate-700">{workOrder.status}</strong></span>
              <span>•</span>
              <span>Approval Status: <strong className="text-slate-700">{workOrder.approvalStatus}</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {workOrder.isArterialRoad && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              <Route className="w-3.5 h-3.5" />
              Arterial Road
            </span>
          )}

          {isApproved && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approved for Execution
            </span>
          )}
          {isRejected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
              <XCircle className="w-3.5 h-3.5" />
              Rejected by Director
            </span>
          )}
          {isPending && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5" />
              Director Approval Required
            </span>
          )}
          {!isPending && !isApproved && !isRejected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              Standard Procedure (No Approval Needed)
            </span>
          )}
        </div>
      </div>

      {/* Approval Reason Notice */}
      {workOrder.approvalRequired && reasonInfo && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3.5 text-xs flex items-start gap-2.5 mb-5">
          <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{reasonInfo.title}:</span> {reasonInfo.description}
          </div>
        </div>
      )}

      {/* Action Controls */}
      {isPending ? (
        <div className="space-y-4">
          {isDirector ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Director Decision Notes / Instructions (Optional)
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Budget approved under municipal emergency fund. Ensure traffic barriers are placed."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowConfirm('approve')}
                  disabled={loading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-xs"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Approve Work Order &amp; Release Budget
                </button>

                <button
                  onClick={() => setShowConfirm('reject')}
                  disabled={loading}
                  className="bg-white hover:bg-red-50 text-red-600 border border-red-200 font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-400 flex-shrink-0" />
              <span>
                Director Authorization Required: Only a <strong>Public Works Director</strong> or <strong>Director</strong> is authorized to approve or reject this work order.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-slate-400" />
          <span>
            This work order is not currently pending authorization. Current status: <strong>{workOrder.status}</strong>.
          </span>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <h4 className="text-base font-semibold text-slate-900 mb-2">
              {showConfirm === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
            </h4>
            <p className="text-xs text-slate-600 mb-5 leading-relaxed">
              {showConfirm === 'approve'
                ? `Are you sure you want to approve Work Order ${workOrder.workOrderNumber}? This authorizes the estimated repair budget and enables contractor dispatch.`
                : `Are you sure you want to reject Work Order ${workOrder.workOrderNumber}? The work order status will be updated to REJECTED.`}
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConfirm(null)}
                disabled={loading}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(showConfirm)}
                disabled={loading}
                className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors ${
                  showConfirm === 'approve' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? 'Processing...' : showConfirm === 'approve' ? 'Yes, Approve' : 'Yes, Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
