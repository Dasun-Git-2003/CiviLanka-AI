import { useState } from 'react';
import {
  GitBranch,
  ArrowRight,
  MapPin,
  CheckCircle2,
  User,
} from 'lucide-react';
import { INITIAL_WORK_ORDERS, type WorkOrder } from '../data/member4Data';

const STAGES = [
  { id: 'AI_PROPOSED', label: 'AI Proposed', color: 'bg-purple-100 text-purple-800 border-purple-200' },
  { id: 'PENDING_APPROVAL', label: 'Pending Approval', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'APPROVED', label: 'Approved', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'ASSIGNED', label: 'Assigned', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  { id: 'COMPLETED', label: 'Completed', color: 'bg-teal-100 text-teal-800 border-teal-200' },
  { id: 'VERIFIED', label: 'Verified', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'CLOSED', label: 'Closed', color: 'bg-slate-100 text-slate-800 border-slate-200' },
];

export default function WorkOrderLifecycle() {
  const [orders, setOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredOrders = orders.filter((o) => {
    const matchesStage = selectedStage === 'ALL' || o.status === selectedStage;
    const matchesSearch =
      o.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.road_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(o.id).includes(searchQuery);
    return matchesStage && matchesSearch;
  });

  const advanceOrder = (orderId: number) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        switch (o.status) {
          case 'AI_PROPOSED':
            return {
              ...o,
              status: o.estimated_cost > 1000 || o.is_arterial_road ? 'PENDING_APPROVAL' : 'APPROVED',
            };
          case 'PENDING_APPROVAL':
            return { ...o, status: 'APPROVED', approval_status: 'APPROVED' };
          case 'APPROVED':
            return { ...o, status: 'ASSIGNED', assigned_worker: 'Kamal Perera (Crew #1)' };
          case 'ASSIGNED':
            return { ...o, status: 'IN_PROGRESS' };
          case 'IN_PROGRESS':
            return { ...o, status: 'COMPLETED' };
          case 'COMPLETED':
            return { ...o, status: 'VERIFIED' };
          case 'VERIFIED':
            return { ...o, status: 'CLOSED' };
          default:
            return o;
        }
      })
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Work-Order Lifecycle Management</h1>
              <p className="text-sm text-slate-500">
                8-Stage State Machine strictly governed by <strong>Member 4</strong>
              </p>
            </div>
          </div>
        </div>

        <span className="px-3 py-1 bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-full">
          {orders.length} Managed Orders
        </span>
      </div>

      {/* Stage Stepper Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setSelectedStage('ALL')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
            selectedStage === 'ALL'
              ? 'bg-slate-800 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Stages ({orders.length})
        </button>
        {STAGES.map((s) => {
          const count = orders.filter((o) => o.status === s.id).length;
          const isSelected = selectedStage === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedStage(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition ${
                isSelected
                  ? 'bg-primary-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Search Input */}
      <div className="max-w-md">
        <input
          type="text"
          placeholder="Filter by title, road name, or ID..."
          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredOrders.map((order) => {
          const stageObj = STAGES.find((s) => s.id === order.status) || STAGES[0];

          return (
            <div
              key={order.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-primary-300 transition"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${stageObj.color}`}
                  >
                    {stageObj.label}
                  </span>
                  <span className="text-xs font-bold text-slate-400">WO #{order.id}</span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-800">{order.title}</h4>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{order.description}</p>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-primary-600 shrink-0" />
                  <span className="truncate">{order.road_name}</span>
                </div>

                {order.assigned_worker && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>{order.assigned_worker}</span>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-4">
                <span className="text-xs font-extrabold text-emerald-600">
                  LKR {order.estimated_cost.toLocaleString()}
                </span>

                {order.status !== 'CLOSED' ? (
                  <button
                    onClick={() => advanceOrder(order.id)}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <span>Advance State</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                ) : (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Closed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
