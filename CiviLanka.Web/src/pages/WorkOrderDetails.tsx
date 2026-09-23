import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  Building2,
  AlertTriangle,
  MapPin,
  Calendar,
  Users,
  Trash2,
  Edit,
  Wrench,
  ShieldAlert,
} from 'lucide-react';
import { workOrderService } from '../services/workOrderService';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { CostEstimateCard } from '../components/CostEstimateCard';
import { ApprovalPanel } from '../components/ApprovalPanel';
import type { WorkOrder } from '../types/workOrder';

export const WorkOrderDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimating, setEstimating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractors, setContractors] = useState<any[]>([]);

  // Edit / Status change modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  // Contractor assignment modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedContractor, setSelectedContractor] = useState<number | undefined>();
  const [assignedCrew, setAssignedCrew] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');

  const fetchDetails = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await workOrderService.getById(id);
      setWorkOrder(data);
      setNewStatus(data.status);
      setSelectedContractor(data.assignedContractorId);
      setAssignedCrew(data.assignedCrew || '');
      setScheduledDate(data.scheduledDate ? data.scheduledDate.split('T')[0] : '');
    } catch (err: any) {
      setError('Failed to load work order details.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
    workOrderService.getContractors().then(setContractors).catch(console.error);
  }, [id]);

  const handleGenerateEstimate = async () => {
    if (!id) return;
    setEstimating(true);
    try {
      const updated = await workOrderService.generateEstimate(id);
      setWorkOrder(updated);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'AI estimation failed. Please check Gemini API key configuration.';
      alert(msg);
      console.error('AI Estimation error:', err);
    } finally {
      setEstimating(false);
    }
  };

  const handleApprove = async (notes: string) => {
    if (!id) return;
    try {
      const updated = await workOrderService.approve(id, notes);
      setWorkOrder(updated);
    } catch (err) {
      alert('Failed to approve work order.');
    }
  };

  const handleReject = async (notes: string) => {
    if (!id) return;
    try {
      const updated = await workOrderService.reject(id, notes);
      setWorkOrder(updated);
    } catch (err) {
      alert('Failed to reject work order.');
    }
  };

  const handleUpdateStatus = async () => {
    if (!id || !newStatus) return;
    try {
      const updated = await workOrderService.updateStatus(id, newStatus, statusNotes);
      setWorkOrder(updated);
      setShowStatusModal(false);
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  const handleAssignContractor = async () => {
    if (!id) return;
    try {
      const updated = await workOrderService.update(id, {
        assignedContractorId: selectedContractor,
        assignedCrew,
        scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
        status: workOrder?.status === 'APPROVED' ? 'ASSIGNED' : workOrder?.status,
      });
      setWorkOrder(updated);
      setShowAssignModal(false);
    } catch (err) {
      alert('Failed to assign contractor.');
    }
  };

  const handleCancel = async () => {
    if (!id || !workOrder) return;
    if (!window.confirm(`Are you sure you want to cancel Work Order ${workOrder.workOrderNumber}?`)) return;
    try {
      await workOrderService.cancel(id);
      navigate('/work-orders');
    } catch (err) {
      alert('Failed to cancel work order.');
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading work order details...</div>;
  }

  if (error || !workOrder) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <p className="text-sm font-semibold text-slate-800">{error || 'Work order not found.'}</p>
        <Link to="/work-orders" className="text-xs text-indigo-600 font-semibold mt-3 inline-block hover:underline">
          &larr; Back to Work Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Navigation & Header */}
      <div>
        <Link
          to="/work-orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Work Orders
        </Link>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-sm font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded">
                {workOrder.workOrderNumber}
              </span>
              <PriorityBadge priority={workOrder.priority} />
              <StatusBadge status={workOrder.status} />
              {workOrder.isArterialRoad && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  Arterial Road
                </span>
              )}
              {workOrder.approvalRequired && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                  Director Approval Required
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-slate-900">{workOrder.title}</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">{workOrder.description}</p>

            {workOrder.approvalRequired && workOrder.approvalStatus === 'PENDING' && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Director Approval Required Before Work Can Begin: </span>
                  {workOrder.approvalReason === 'Both'
                    ? 'Estimated cost exceeds threshold AND site is located on a high-risk arterial road.'
                    : workOrder.approvalReason === 'ArterialRoadRisk'
                    ? 'Site is located on a high-risk arterial road or traffic corridor.'
                    : workOrder.approvalReason === 'ThresholdExceeded'
                    ? 'Estimated repair cost exceeds configured municipal approval threshold.'
                    : 'Requires human director approval.'}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {['APPROVED', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS'].includes(workOrder.status) && (
              <Link
                to={`/maintenance/create?workOrderId=${workOrder.id}`}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                title="Create Maintenance Execution Record (Member 4)"
              >
                <Wrench className="w-3.5 h-3.5" />
                Handoff to Maintenance
              </Link>
            )}

            <button
              onClick={handleGenerateEstimate}
              disabled={estimating}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 ${estimating ? 'animate-spin' : ''}`} />
              {estimating ? 'Estimating...' : 'Generate AI Estimate'}
            </button>

            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 transition-colors"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              Assign
            </button>

            <button
              onClick={() => setShowStatusModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-xs font-medium text-slate-700 transition-colors"
            >
              <Edit className="w-3.5 h-3.5 text-slate-500" />
              Status
            </button>

            {workOrder.status !== 'CANCELLED' && (
              <button
                onClick={handleCancel}
                className="p-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs transition-colors"
                title="Cancel Work Order"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Context Information (Hazard + Asset) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Hazard Information (Member 1) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Member 1 Hazard Origin
            </h3>
            {workOrder.hazardTicket && (
              <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {workOrder.hazardTicket}
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400">Category:</span>
              <span className="font-semibold text-slate-800 ml-2">{workOrder.hazardCategory || 'General Hazard'}</span>
            </div>

            {workOrder.hazardDescription && (
              <div>
                <span className="text-slate-400">Citizen Report:</span>
                <p className="text-slate-700 mt-1 italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  &quot;{workOrder.hazardDescription}&quot;
                </p>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-slate-400">AI Severity:</span>
                <span className="font-semibold text-red-600 ml-2">{workOrder.hazardSeverity || 'HIGH'}</span>
              </div>
              <div>
                <span className="text-slate-400">Priority:</span>
                <span className="font-semibold text-amber-600 ml-2">{workOrder.hazardPriority || 'URGENT'}</span>
              </div>
            </div>

            {workOrder.hazardAddress && (
              <div className="flex items-start gap-1.5 pt-2 border-t border-slate-100 text-slate-600">
                <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <span>{workOrder.hazardAddress}</span>
              </div>
            )}
          </div>
        </div>

        {/* Infrastructure Asset Information (Member 2) */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-500" />
              Member 2 Infrastructure Asset
            </h3>
            {workOrder.assetId && (
              <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {workOrder.assetId}
              </span>
            )}
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-slate-400">Asset Name:</span>
              <span className="font-semibold text-slate-800 ml-2">
                {workOrder.assetName || 'No Infrastructure Asset Linked'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400">Type:</span>
                <span className="font-medium text-slate-800 ml-2">{workOrder.assetType || 'Civil'}</span>
              </div>
              <div>
                <span className="text-slate-400">Condition:</span>
                <span
                  className={`font-semibold ml-2 ${
                    workOrder.assetCondition === 'Poor'
                      ? 'text-red-600'
                      : workOrder.assetCondition === 'Fair'
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                  }`}
                >
                  {workOrder.assetCondition || 'Poor'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div>
                <span className="text-slate-400">Assigned Contractor:</span>
                <span className="font-semibold text-slate-800 ml-2">
                  {workOrder.assignedContractorName || 'Not yet assigned'}
                </span>
              </div>
              {workOrder.assignedCrew && (
                <div>
                  <span className="text-slate-400">Field Crew:</span>
                  <span className="text-slate-700 ml-2">{workOrder.assignedCrew}</span>
                </div>
              )}
              {workOrder.scheduledDate && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Scheduled Date: {new Date(workOrder.scheduledDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Cost & Material Estimation Component */}
      <div>
        <CostEstimateCard estimate={workOrder.latestCostEstimate} items={workOrder.items} />
      </div>

      {/* Director Approval Panel (Section 21, 22, 23) */}
      <div>
        <ApprovalPanel workOrder={workOrder} onApprove={handleApprove} onReject={handleReject} />
      </div>

      {/* Audit & Notes */}
      {workOrder.notes && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-xs text-slate-600">
          <h4 className="font-semibold text-slate-800 mb-2">Audit Notes &amp; History</h4>
          <pre className="font-sans whitespace-pre-wrap leading-relaxed">{workOrder.notes}</pre>
        </div>
      )}

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-4">Update Work Order Status</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none"
                >
                  <option value="AI_GENERATED">AI_GENERATED</option>
                  <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="ASSIGNED">ASSIGNED</option>
                  <option value="SCHEDULED">SCHEDULED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="VERIFIED">VERIFIED</option>
                  <option value="CLOSED">CLOSED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status Change Notes</label>
                <textarea
                  rows={2}
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  placeholder="Reason for status change..."
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateStatus}
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
              >
                Save Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contractor Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-900 mb-4">Assign Contractor &amp; Schedule</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Contractor</label>
                <select
                  value={selectedContractor || ''}
                  onChange={(e) => setSelectedContractor(e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none"
                >
                  <option value="">Select Contractor...</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.specialization})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Assigned Field Crew</label>
                <input
                  type="text"
                  value={assignedCrew}
                  onChange={(e) => setAssignedCrew(e.target.value)}
                  placeholder="e.g. Crew Alpha (3 technicians)"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Scheduled Repair Date</label>
                <input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-5">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignContractor}
                className="px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg"
              >
                Save Assignment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
