import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Sparkles,
  TrendingUp,
  RotateCw,
} from 'lucide-react';
import { workOrderService } from '../services/workOrderService';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import type { WorkOrder } from '../types/workOrder';

export const WorkOrderDashboard: React.FC = () => {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workOrderService.getAll();
      setWorkOrders(data);
    } catch (err: any) {
      setError('Failed to load work orders. Ensure the ASP.NET Core backend is running.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  // Stats calculation
  const total = workOrders.length;
  const pendingApproval = workOrders.filter(
    (w) => w.status === 'PENDING_APPROVAL' || w.approvalStatus === 'PENDING'
  ).length;
  const approved = workOrders.filter((w) => w.status === 'APPROVED').length;
  const inProgress = workOrders.filter(
    (w) => w.status === 'IN_PROGRESS' || w.status === 'ASSIGNED' || w.status === 'SCHEDULED'
  ).length;
  const completed = workOrders.filter((w) => w.status === 'COMPLETED' || w.status === 'VERIFIED').length;
  const cancelled = workOrders.filter((w) => w.status === 'CANCELLED').length;

  const totalEstimatedCost = workOrders.reduce((sum, w) => sum + (w.estimatedCost || 0), 0);

  const formatLKR = (amount: number) => `Rs. ${amount.toLocaleString('en-LK')}`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            Member 3 — Work Order &amp; Cost Estimation
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Work Orders Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Automated maintenance planning with Gemini 2.0 cost estimation and director authorization.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchWorkOrders}
            className="p-2.5 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Data"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/work-orders/create"
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Work Order
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs p-4 rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchWorkOrders} className="underline font-semibold ml-4">
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">Total Orders</span>
            <ClipboardList className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">{total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">{cancelled} cancelled</div>
        </div>

        <Link
          to="/approval-queue"
          className="bg-white border border-amber-200 hover:border-amber-400 rounded-xl p-4 shadow-2xs transition-all group"
        >
          <div className="flex items-center justify-between text-amber-500 mb-2">
            <span className="text-xs font-medium text-amber-700">Pending Approval</span>
            <AlertCircle className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-amber-700 font-mono">{pendingApproval}</div>
        </Link>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">{approved}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">In Progress</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-600 font-mono">{inProgress}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-600 font-mono">{completed}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium text-slate-500">Total Estimated</span>
            <TrendingUp className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-sm font-bold text-slate-900 font-mono truncate mt-1">
            {formatLKR(totalEstimatedCost)}
          </div>
        </div>
      </div>

      {/* Pending Approval Action Banner */}
      {pendingApproval > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 rounded-lg backdrop-blur-xs">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">
                {pendingApproval} Work Order{pendingApproval > 1 ? 's' : ''} Require Director Approval
              </h3>
              <p className="text-xs text-amber-100 mt-0.5">
                Executive Director authorization is mandatory prior to crew dispatch and municipal budget release.
              </p>
            </div>
          </div>

          <Link
            to="/approval-queue"
            className="px-4 py-2 bg-white text-amber-900 hover:bg-amber-50 rounded-lg text-xs font-bold transition-colors whitespace-nowrap"
          >
            Open Approval Queue &rarr;
          </Link>
        </div>
      )}

      {/* Recent Work Orders Section */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Recent Work Orders</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest municipal repair tasks generated from citizen hazards</p>
          </div>

          <Link
            to="/work-orders"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            View All ({total})
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading work orders...</div>
        ) : workOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No work orders created yet.</p>
            <Link
              to="/work-orders/create"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-semibold mt-2 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              Create your first work order
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3">WO Number</th>
                  <th className="px-5 py-3">Title &amp; Asset</th>
                  <th className="px-5 py-3">Priority</th>
                  <th className="px-5 py-3 text-right">Est. Cost</th>
                  <th className="px-5 py-3">Approval</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workOrders.slice(0, 8).map((wo) => (
                  <tr key={wo.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-indigo-600">
                      <Link to={`/work-orders/${wo.id}`} className="hover:underline">
                        {wo.workOrderNumber}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900 line-clamp-1">{wo.title}</div>
                      <div className="text-[11px] text-slate-400">{wo.assetName || 'No Asset Attached'}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <PriorityBadge priority={wo.priority} />
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-slate-800">
                      {wo.estimatedCost ? formatLKR(wo.estimatedCost) : '—'}
                    </td>
                    <td className="px-5 py-3.5">
                      {wo.approvalStatus === 'APPROVED' ? (
                        <span className="text-[11px] font-semibold text-emerald-600">Approved</span>
                      ) : wo.approvalStatus === 'PENDING' ? (
                        <span className="text-[11px] font-semibold text-amber-600">Pending</span>
                      ) : wo.approvalStatus === 'REJECTED' ? (
                        <span className="text-[11px] font-semibold text-red-600">Rejected</span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Not Required</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={wo.status} size="sm" />
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        to={`/work-orders/${wo.id}`}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                      >
                        View &rarr;
                      </Link>
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
