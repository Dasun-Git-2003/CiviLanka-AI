import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Plus, RotateCw, Trash2, ExternalLink, Wrench, ShieldAlert } from 'lucide-react';
import { workOrderService } from '../services/workOrderService';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import type { WorkOrder } from '../types/workOrder';

export const WorkOrderList: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const data = await workOrderService.getAll();
      setWorkOrders(data);
    } catch (err) {
      console.error('Failed to load work orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  const handleCancel = async (id: string, woNum: string) => {
    if (!window.confirm(`Are you sure you want to cancel Work Order ${woNum}? This soft-deletes the order while preserving the municipal audit log.`)) {
      return;
    }
    try {
      await workOrderService.cancel(id);
      await fetchWorkOrders();
    } catch (err) {
      alert('Failed to cancel work order');
    }
  };

  const filtered = workOrders.filter((wo) => {
    const matchesSearch =
      wo.workOrderNumber.toLowerCase().includes(search.toLowerCase()) ||
      wo.title.toLowerCase().includes(search.toLowerCase()) ||
      (wo.assetName && wo.assetName.toLowerCase().includes(search.toLowerCase())) ||
      (wo.hazardAddress && wo.hazardAddress.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || wo.status === statusFilter;
    const matchesPriority = priorityFilter === 'ALL' || wo.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const formatLKR = (amount?: number) => {
    if (!amount) return '—';
    return `Rs. ${amount.toLocaleString('en-LK')}`;
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Municipal Work Orders</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage, triage, and track municipal infrastructure maintenance orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchWorkOrders}
            className="p-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/work-orders/create"
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Work Order
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by WO Number, Title, Asset, or Location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none bg-white font-medium text-slate-700"
          >
            <option value="ALL">All Statuses</option>
            <option value="AI_GENERATED">AI Generated</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none bg-white font-medium text-slate-700"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading work orders...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No work orders match the current search &amp; filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">WO Number</th>
                  <th className="px-4 py-3">Title &amp; Scope</th>
                  <th className="px-4 py-3">Infrastructure Asset</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3 text-right">Est. Cost (LKR)</th>
                  <th className="px-4 py-3">Approval</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">
                      <Link to={`/work-orders/${wo.id}`} className="hover:underline">
                        {wo.workOrderNumber}
                      </Link>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 line-clamp-1">{wo.title}</span>
                        {wo.isArterialRoad && (
                          <span
                            title="Arterial Road (Higher traffic & safety priority)"
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 flex-shrink-0"
                          >
                            <ShieldAlert className="w-2.5 h-2.5 text-rose-600" />
                            Arterial
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{wo.description}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{wo.assetName || 'None'}</div>
                      <div className="text-[10px] text-slate-400">{wo.assetType}</div>
                    </td>

                    <td className="px-4 py-3">
                      <PriorityBadge priority={wo.priority} />
                    </td>

                    <td className="px-4 py-3 text-right font-mono font-semibold text-slate-900">
                      {formatLKR(wo.estimatedCost)}
                    </td>

                    <td className="px-4 py-3">
                      {wo.approvalStatus === 'APPROVED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Approved
                        </span>
                      ) : wo.approvalStatus === 'PENDING' ? (
                        <div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 inline-block">
                            Pending Director
                          </span>
                          {wo.approvalReason && wo.approvalReason !== 'None' && (
                            <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                              {wo.approvalReason === 'Both'
                                ? 'Cost & Arterial'
                                : wo.approvalReason === 'ArterialRoadRisk'
                                ? 'Arterial Road'
                                : 'Cost Threshold'}
                            </div>
                          )}
                        </div>
                      ) : wo.approvalStatus === 'REJECTED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          Rejected
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Not Required</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={wo.status} size="sm" />
                    </td>

                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {['APPROVED', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS'].includes(wo.status) && (
                          <Link
                            to={`/maintenance/create?workOrderId=${wo.id}`}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"
                            title="Handoff to Maintenance (Member 4)"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        <Link
                          to={`/work-orders/${wo.id}`}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                          title="View Details"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                        {wo.status !== 'CANCELLED' && (
                          <button
                            onClick={() => handleCancel(wo.id, wo.workOrderNumber)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Cancel Work Order"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
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
