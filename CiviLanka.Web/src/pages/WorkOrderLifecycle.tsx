import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  GitBranch,
  ArrowRight,
  MapPin,
  CheckCircle2,
  User,
  RotateCw,
  Search,
  ExternalLink,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  Loader2,
  TrendingUp,
  Filter,
} from 'lucide-react';
import { workOrderService } from '../services/workOrderService';
import type { WorkOrder } from '../types/workOrder';

// Municipal 8-Stage Execution & Verification State Machine
const STAGES = [
  { id: 'AI_GENERATED', label: 'AI Proposed', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { id: 'PENDING_APPROVAL', label: 'Pending Approval', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'APPROVED', label: 'Approved', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'ASSIGNED', label: 'Assigned', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { id: 'COMPLETED', label: 'Completed', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { id: 'VERIFIED', label: 'Verified', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'CLOSED', label: 'Closed', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

// Fallback municipal dataset used when the backend is offline
const MUNICIPAL_FALLBACK_ORDERS: WorkOrder[] = [
  {
    id: 'WO-2026-001',
    workOrderNumber: 'WO-2026-001',
    title: 'Severe Asphalt Pothole Repair - Galle Road',
    description: 'Deep road depression near Bambalapitiya Junction posing critical risk to two-wheelers and high-speed bus lanes.',
    hazardCategory: 'Pothole',
    hazardAddress: 'Galle Road, Bambalapitiya, Colombo 04',
    priority: 'HIGH',
    status: 'AI_GENERATED',
    estimatedCost: 145000,
    approvalStatus: 'PENDING',
    approvalRequired: true,
    createdBy: 'AI Predictive Dispatcher',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCancelled: false,
    items: [],
  },
  {
    id: 'WO-2026-002',
    workOrderNumber: 'WO-2026-002',
    title: 'Culvert & Stormwater Drainage Blockage',
    description: 'Heavy silt and plastic debris obstruction causing street waterlogging during monsoon showers.',
    hazardCategory: 'Drainage',
    hazardAddress: 'Baseline Road, Dematagoda, Colombo 09',
    priority: 'URGENT',
    status: 'PENDING_APPROVAL',
    estimatedCost: 280000,
    approvalStatus: 'PENDING',
    approvalRequired: true,
    createdBy: 'Urban Hydrology Engine',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    isCancelled: false,
    items: [],
  },
  {
    id: 'WO-2026-003',
    workOrderNumber: 'WO-2026-003',
    title: 'Pedestrian Crossing Signal Head Replacement',
    description: 'Amber flasher unit shattered by high-profile vehicle overhang; manual traffic direction currently active.',
    hazardCategory: 'Traffic Signal',
    hazardAddress: 'Olpcott Mawatha, Pettah, Colombo 11',
    priority: 'HIGH',
    status: 'APPROVED',
    estimatedCost: 85000,
    approvalStatus: 'APPROVED',
    approvalRequired: false,
    assignedCrew: 'Rapid Electrical Unit #3',
    createdBy: 'Municipal Safety Hub',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    updatedAt: new Date().toISOString(),
    isCancelled: false,
    items: [],
  },
  {
    id: 'WO-2026-004',
    workOrderNumber: 'WO-2026-004',
    title: 'Exposed High-Voltage Cable Conduit Re-insulation',
    description: 'Excavation work unshielded power trunking near public bus terminal. Immediate hazard barricaded.',
    hazardCategory: 'Electrical',
    hazardAddress: 'High Level Road, Nugegoda',
    priority: 'URGENT',
    status: 'ASSIGNED',
    estimatedCost: 110000,
    approvalStatus: 'APPROVED',
    approvalRequired: true,
    assignedCrew: 'CEB Municipal Liaison Crew A',
    assignedContractorName: 'Lanka Electric Infra Ltd',
    createdBy: 'Field Inspector Portal',
    createdAt: new Date(Date.now() - 14400000).toISOString(),
    updatedAt: new Date().toISOString(),
    isCancelled: false,
    items: [],
  },
  {
    id: 'WO-2026-005',
    workOrderNumber: 'WO-2026-005',
    title: 'Crumbling Retaining Wall Stabilization',
    description: 'Earth slip stabilization along canal boundary wall using steel shotcrete and micropiling.',
    hazardCategory: 'Structural',
    hazardAddress: 'Marine Drive, Kollupitiya',
    priority: 'NORMAL',
    status: 'IN_PROGRESS',
    estimatedCost: 450000,
    approvalStatus: 'APPROVED',
    approvalRequired: true,
    assignedCrew: 'Civil Works Squadron #4',
    assignedContractorName: 'State Engineering Corp',
    createdBy: 'Drone Geo-Survey AI',
    createdAt: new Date(Date.now() - 28800000).toISOString(),
    updatedAt: new Date().toISOString(),
    isCancelled: false,
    items: [],
  },
  {
    id: 'WO-2026-006',
    workOrderNumber: 'WO-2026-006',
    title: 'Fallen Mahogany Tree Trunk Removal & Trenching',
    description: 'Emergency tree clearing completed following heavy wind squalls; asphalt resurfacing finalized.',
    hazardCategory: 'Obstruction',
    hazardAddress: 'Bauddhaloka Mawatha, Colombo 07',
    priority: 'HIGH',
    status: 'COMPLETED',
    estimatedCost: 65000,
    approvalStatus: 'APPROVED',
    approvalRequired: false,
    assignedCrew: 'Urban Forestry Team',
    createdBy: 'Emergency Operations',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
    isCancelled: false,
    items: [],
  },
  {
    id: 'WO-2026-007',
    workOrderNumber: 'WO-2026-007',
    title: 'Median Guard Rail & Kerbstone Realignment',
    description: 'Field inspector photographic sign-off verified against post-repair GPS geofence.',
    hazardCategory: 'Road Furniture',
    hazardAddress: 'Sri Jayawardenepura Mawatha, Rajagiriya',
    priority: 'LOW',
    status: 'VERIFIED',
    estimatedCost: 195000,
    approvalStatus: 'APPROVED',
    approvalRequired: true,
    assignedCrew: 'Highway Maintenance Division',
    createdBy: 'Field Inspector Portal',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    updatedAt: new Date().toISOString(),
    isCancelled: false,
    items: [],
  },
  {
    id: 'WO-2026-008',
    workOrderNumber: 'WO-2026-008',
    title: 'Main Boulevard LED Luminaire Modernization',
    description: 'Contractor warranty sign-off complete. Digital audit trail archived into Municipal Ledger.',
    hazardCategory: 'Lighting',
    hazardAddress: 'Independence Avenue, Colombo 07',
    priority: 'LOW',
    status: 'CLOSED',
    estimatedCost: 320000,
    approvalStatus: 'APPROVED',
    approvalRequired: true,
    assignedCrew: 'Metropolitan Energy Crew',
    createdBy: 'Smart City Sensor Network',
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    updatedAt: new Date().toISOString(),
    isCancelled: false,
    items: [],
  },
];

export default function WorkOrderLifecycle() {
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isLiveConnected, setIsLiveConnected] = useState<boolean>(false);
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Fetch live work orders from backend API
  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const data = await workOrderService.getAll();
      if (Array.isArray(data) && data.length > 0) {
        setOrders(data);
        setIsLiveConnected(true);
      } else {
        // Fallback if backend returned empty array
        setOrders(MUNICIPAL_FALLBACK_ORDERS);
        setIsLiveConnected(false);
      }
    } catch (err) {
      console.warn('Backend unavailable, operating in Municipal Resilient Mode:', err);
      setOrders(MUNICIPAL_FALLBACK_ORDERS);
      setIsLiveConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkOrders();
  }, []);

  // Quick auto-dismiss notification
  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 4500);
    return () => clearTimeout(timer);
  }, [notification]);

  // Determine the next status in the state machine
  const getNextStage = (currentStatus: string, cost: number = 0): { nextStatus: string; label: string } | null => {
    const status = currentStatus.toUpperCase();
    switch (status) {
      case 'AI_PROPOSED':
      case 'AI_GENERATED':
        // High cost orders require formal committee approval
        if (cost > 100000) {
          return { nextStatus: 'PENDING_APPROVAL', label: 'Submit for Director Approval' };
        }
        return { nextStatus: 'APPROVED', label: 'Approve Work Order' };
      case 'PENDING_APPROVAL':
        return { nextStatus: 'APPROVED', label: 'Grant Director Approval' };
      case 'APPROVED':
        return { nextStatus: 'ASSIGNED', label: 'Assign Field Crew' };
      case 'ASSIGNED':
      case 'SCHEDULED':
        return { nextStatus: 'IN_PROGRESS', label: 'Commence Field Operations' };
      case 'IN_PROGRESS':
        return { nextStatus: 'COMPLETED', label: 'Mark Work Completed' };
      case 'COMPLETED':
        return { nextStatus: 'VERIFIED', label: 'Perform QA Sign-Off' };
      case 'VERIFIED':
        return { nextStatus: 'CLOSED', label: 'Archive & Close Order' };
      default:
        return null;
    }
  };

  // Advance state through live API or optimistic local transition
  const handleAdvanceState = async (order: WorkOrder) => {
    const next = getNextStage(order.status, order.estimatedCost || 0);
    if (!next) return;

    setAdvancingId(order.id);
    try {
      if (isLiveConnected) {
        await workOrderService.updateStatus(order.id, next.nextStatus, `Advanced via Lifecycle State Machine to ${next.nextStatus}`);
      }

      // Optimistic update in UI
      setOrders((prev) =>
        prev.map((o) => {
          if (o.id !== order.id) return o;
          return {
            ...o,
            status: next.nextStatus as any,
            assignedCrew:
              next.nextStatus === 'ASSIGNED' && !o.assignedCrew
                ? 'Rapid Response Squad #1'
                : o.assignedCrew,
            approvalStatus:
              next.nextStatus === 'APPROVED' ? 'APPROVED' : o.approvalStatus,
          };
        })
      );

      setNotification({
        message: `Order #${order.workOrderNumber || order.id} successfully transitioned to ${next.nextStatus.replace('_', ' ')}`,
        type: 'success',
      });
    } catch (err: any) {
      console.error('Failed to advance state:', err);
      setNotification({
        message: `Status update failed: ${err.message || 'API rejected transition'}`,
        type: 'error',
      });
    } finally {
      setAdvancingId(null);
    }
  };

  // Helper to match stage taking into account legacy variants
  const matchesSelectedStage = (orderStatus: string, filterStage: string) => {
    if (filterStage === 'ALL') return true;
    const normOrder = orderStatus.toUpperCase();
    const normFilter = filterStage.toUpperCase();

    if (normFilter === 'AI_GENERATED') {
      return normOrder === 'AI_GENERATED' || normOrder === 'AI_PROPOSED';
    }
    if (normFilter === 'ASSIGNED') {
      return normOrder === 'ASSIGNED' || normOrder === 'SCHEDULED';
    }
    return normOrder === normFilter;
  };

  // Filtered orders based on selected stage and search query
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const inStage = matchesSelectedStage(o.status, selectedStage);
      const query = searchQuery.trim().toLowerCase();
      if (!query) return inStage;

      const titleMatch = (o.title || '').toLowerCase().includes(query);
      const locMatch = (o.hazardAddress || '').toLowerCase().includes(query);
      const numMatch = (o.workOrderNumber || o.id || '').toLowerCase().includes(query);
      const crewMatch = (o.assignedCrew || o.assignedContractorName || '').toLowerCase().includes(query);

      return inStage && (titleMatch || locMatch || numMatch || crewMatch);
    });
  }, [orders, selectedStage, searchQuery]);

  // Aggregate stats
  const totalCost = useMemo(() => {
    return orders.reduce((acc, curr) => acc + (curr.estimatedCost || 0), 0);
  }, [orders]);

  const activeWorkflowsCount = useMemo(() => {
    return orders.filter(
      (o) => o.status !== 'CLOSED' && o.status !== 'CANCELLED' && !o.isCancelled
    ).length;
  }, [orders]);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-sm font-semibold flex items-center justify-between shadow-sm transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : notification.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-xs opacity-75 hover:opacity-100 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm">
              <GitBranch className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  Work-Order Lifecycle Management
                </h1>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isLiveConnected
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isLiveConnected ? 'bg-emerald-500 animate-pulse' : 'bg-blue-500'
                    }`}
                  />
                  {isLiveConnected ? 'Live Database Sync' : 'Municipal Autonomous Mode'}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Autonomous Municipal 8-Stage Execution & Verification State Machine
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchWorkOrders}
            disabled={loading}
            className="px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95"
            title="Refresh from API"
          >
            <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span>Sync Orders</span>
          </button>

          <Link
            to="/work-orders/new"
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition"
          >
            <span>+ Create Order</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Orders</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{orders.length}</p>
          </div>
          <div className="p-2.5 bg-slate-100 rounded-xl text-slate-600">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Active Pipeline</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">{activeWorkflowsCount}</p>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-purple-600">AI Driven</p>
            <p className="text-2xl font-extrabold text-slate-800 mt-1">
              {orders.filter((o) => o.status === 'AI_GENERATED' || (o.status as any) === 'AI_PROPOSED').length}
            </p>
          </div>
          <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Managed Value</p>
            <p className="text-xl font-extrabold text-slate-800 mt-1">
              Rs. {(totalCost / 1000).toFixed(0)}k
            </p>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Stage Stepper Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setSelectedStage('ALL')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            selectedStage === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <span>All Stages</span>
          <span className="px-1.5 py-0.2 bg-black/20 rounded-full text-[10px]">
            {orders.length}
          </span>
        </button>

        {STAGES.map((s) => {
          const count = orders.filter((o) => matchesSelectedStage(o.status, s.id)).length;
          const isSelected = selectedStage === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedStage(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>{s.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search work orders by title, street location, crew, or ID..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium px-2">
          <span>Showing <strong>{filteredOrders.length}</strong> of {orders.length} orders</span>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-pulse space-y-4">
              <div className="flex justify-between items-center">
                <div className="h-5 w-24 bg-slate-200 rounded-md" />
                <div className="h-4 w-16 bg-slate-100 rounded" />
              </div>
              <div className="h-5 w-3/4 bg-slate-200 rounded" />
              <div className="h-10 w-full bg-slate-100 rounded" />
              <div className="h-8 w-full bg-slate-100 rounded pt-3" />
            </div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Work Orders Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No active work orders match your search "${searchQuery}". Try clearing filters.`
              : 'There are no work orders currently in this lifecycle stage.'}
          </p>
          {(searchQuery || selectedStage !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStage('ALL');
              }}
              className="mt-4 px-3.5 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold hover:bg-slate-700 transition"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        /* Orders Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const normalizedStatus = (order.status as string) === 'AI_PROPOSED' ? 'AI_GENERATED' : order.status;
            const stageObj = STAGES.find((s) => s.id === normalizedStatus) || STAGES[0];
            const nextAction = getNextStage(order.status, order.estimatedCost || 0);
            const isAdvancing = advancingId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition group"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 text-[11px] font-extrabold rounded-md border ${stageObj.color}`}>
                      {stageObj.label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-400">
                        #{order.workOrderNumber || order.id}
                      </span>
                      <Link
                        to={`/work-orders/${order.id}`}
                        className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition"
                        title="View Full Details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition line-clamp-1">
                      {order.title}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {order.description || 'No detailed work scope specified.'}
                    </p>
                  </div>

                  {/* Location & Metadata */}
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{order.hazardAddress || 'Municipal Highway Grid'}</span>
                    </div>

                    {(order.assignedCrew || order.assignedContractorName) && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{order.assignedCrew || order.assignedContractorName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Cost & Action Button */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Estimated Cost
                    </span>
                    <span className="text-xs font-extrabold text-slate-800">
                      Rs. {(order.estimatedCost || 0).toLocaleString('en-LK')}
                    </span>
                  </div>

                  {nextAction ? (
                    <button
                      onClick={() => handleAdvanceState(order)}
                      disabled={isAdvancing}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-blue-600 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition active:scale-95 disabled:opacity-50"
                      title={nextAction.label}
                    >
                      {isAdvancing ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          <span>Advancing...</span>
                        </>
                      ) : (
                        <>
                          <span>Advance</span>
                          <ArrowRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  ) : order.status === 'CLOSED' ? (
                    <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Archived
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Completed</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
