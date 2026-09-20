import React, { useState } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, ShieldCheck, FileCheck } from 'lucide-react';
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
  const isApproved = workOrder.approvalStatus === 'APPROVED';
  const isRejected = workOrder.approvalStatus === 'REJECTED';

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-slate-800 text-sm">Director Review &amp; Approval Queue</h3>
        </div>

        <div>
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
              Action Required
            </span>
          )}
          {!isPending && !isApproved && !isRejected && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              Standard Procedure (No Approval Needed)
            </span>
          )}
        </div>
      </div>

      {/* Threshold Notice */}
      {workOrder.approvalRequired && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3 text-xs flex items-start gap-2.5 mb-5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Budget Threshold Exceeded:</span> Estimated cost of{' '}
            <strong>Rs. {(workOrder.estimatedCost || 0).toLocaleString()}</strong> exceeds the municipal threshold of
            Rs. 100,000. Formal authorization by the Public Works Director is mandatory before dispatching field crews.
          </div>
        </div>
      )}

      {/* Action Controls */}
      {isPending ? (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Director Decision Notes / Instructions (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Approved. Verify drainage pipe alignment before backfilling."
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowConfirm('approve')}
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
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
        </div>
      ) : (
        <div className="text-xs text-slate-500 flex items-center gap-2">
          <FileCheck className="w-4 h-4 text-slate-400" />
          <span>This work order is not pending authorization. Current status: <strong>{workOrder.status}</strong>.</span>
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
                ? `Are you sure you want to approve Work Order ${workOrder.workOrderNumber}? This will authorize the repair budget and enable contractor assignment.`
                : `Are you sure you want to reject Work Order ${workOrder.workOrderNumber}? The work order will be marked as REJECTED.`}
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
