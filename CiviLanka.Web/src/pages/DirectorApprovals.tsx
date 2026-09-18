// CiviLanka.Web/src/pages/DirectorApprovals.tsx
import React, { useState } from 'react';
import {
  FileCheck,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { INITIAL_WORK_ORDERS, type WorkOrder } from '../data/member4Data';

export default function DirectorApprovals() {
  const [orders, setOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [approvedAmount, setApprovedAmount] = useState<string>('');
  const [approvalNotes, setApprovalNotes] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter orders needing Director action: PENDING_APPROVAL or AI_PROPOSED exceeding limit
  const pendingOrders = orders.filter(
    (w) =>
      w.status === 'PENDING_APPROVAL' ||
      (w.status === 'AI_PROPOSED' && (w.estimated_cost > 1000 || w.is_arterial_road))
  );

  const handleOpenModal = (order: WorkOrder) => {
    setSelectedOrder(order);
    setApprovedAmount(order.estimated_cost.toString());
    setApprovalNotes('Authorized after executive review of AI proposal and municipal contingency funds.');
  };

  const handleConfirmApproval = () => {
    if (!selectedOrder) return;
    const amount = Number(approvedAmount) || selectedOrder.estimated_cost;

    setOrders((prev) =>
      prev.map((o) =>
        o.id === selectedOrder.id
          ? {
              ...o,
              status: 'APPROVED',
              approval_status: 'APPROVED',
              approver_name: 'Dr. Anura Bandara (Director, Public Works)',
              approval_date: new Date().toISOString(),
              actual_cost: 0,
            }
          : o
      )
    );

    setSuccessMessage(`Work Order #${selectedOrder.id} successfully approved for LKR ${amount.toLocaleString()}. Dispatched to crew allocation queue.`);
    setSelectedOrder(null);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-lg">
              <FileCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Director Approval Queue</h1>
              <p className="text-sm text-slate-500">
                Statutory executive review governed by <strong>Member 4</strong> (Maintenance Operations & Audit)
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-full flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {pendingOrders.length} Mandatory Actions
          </span>
          <span className="px-3 py-1 bg-primary-50 border border-primary-200 text-primary-800 text-xs font-semibold rounded-full">
            Member 4 Module
          </span>
        </div>
      </div>

      {/* Statutory Rule Banner */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
        <div className="text-xs text-amber-900 leading-relaxed">
          <strong>Mandatory Human Approval Rule:</strong> In accordance with municipal infrastructure safety regulations, Public Works Director approval is required whenever estimated repair costs exceed <strong>LKR 1,000</strong> or the work involves a <strong>high-risk arterial road</strong>. The AI Agent prepares and recommends work orders, but human executive sign-off is mandatory.
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Orders Grid */}
      {pendingOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-800">All Statutory Approvals Cleared</h3>
          <p className="text-sm text-slate-500 mt-1">
            No work orders currently require Public Works Director intervention.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {pendingOrders.map((order) => {
            const exceedsCost = order.estimated_cost > 1000;
            const isArterial = order.is_arterial_road;

            return (
              <div
                key={order.id}
                className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between hover:border-primary-300 transition-all"
              >
                <div className="space-y-4">
                  {/* Tags */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 text-xs font-bold rounded-md">
                        WO #{order.id}
                      </span>
                      <span className="px-2.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-md">
                        {order.priority}
                      </span>
                      <span className="px-2.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-md">
                        {order.hazard_category}
                      </span>
                    </div>

                    {/* Statutory Reason Badges */}
                    <div className="flex items-center gap-1.5">
                      {exceedsCost && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded border border-amber-300">
                          &gt; LKR 1,000
                        </span>
                      )}
                      {isArterial && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[11px] font-bold rounded border border-red-300">
                          ARTERIAL ROAD
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-bold text-slate-800">{order.title}</h3>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {order.description}
                    </p>
                  </div>

                  {/* Location & AI Recommendation */}
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                      <span>{order.road_name}</span>
                    </div>
                    <div className="flex items-start gap-1.5 text-slate-600 italic">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                      <span>"{order.ai_recommendation}"</span>
                    </div>
                  </div>

                  {/* Materials */}
                  {order.materials_json && order.materials_json.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                        Required Materials:
                      </span>
                      <div className="flex gap-1.5 flex-wrap">
                        {order.materials_json.map((m, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] rounded"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Action */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-5">
                  <div>
                    <span className="text-[11px] text-slate-400 block">Estimated Cost</span>
                    <span className="text-lg font-extrabold text-emerald-600">
                      LKR {order.estimated_cost.toLocaleString()}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenModal(order)}
                    className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                  >
                    <FileCheck className="w-4 h-4" />
                    Approve & Allocate
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approval Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold text-primary-600">Work Order #{selectedOrder.id}</span>
                <h3 className="text-lg font-bold text-slate-800">
                  Public Works Director Authorization
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Approved Budget Allocation (LKR)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-800 focus:outline-none focus:border-primary-500"
                  value={approvedAmount}
                  onChange={(e) => setApprovedAmount(e.target.value)}
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  AI Proposal estimate: LKR {selectedOrder.estimated_cost.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Authorized Approver</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-600 cursor-not-allowed"
                  value="Dr. Anura Bandara (Director, Public Works)"
                  disabled
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Executive Approval Notes
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-primary-500"
                  rows={3}
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmApproval}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg shadow-sm"
              >
                Confirm Sign-Off & Create Budget Log
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
