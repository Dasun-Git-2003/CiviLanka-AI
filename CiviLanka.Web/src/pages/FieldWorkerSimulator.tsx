import { useState, useEffect, useMemo } from 'react';
import {
  Smartphone,
  MapPin,
  Play,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Sparkles,
  Wifi,
  WifiOff,
  Battery,
  Camera,
  RotateCw,
  Loader2,
  Check,
  Navigation,
} from 'lucide-react';
import { workOrderService } from '../services/workOrderService';
import { aiService } from '../services/aiService';
import type { WorkOrder } from '../types/workOrder';

// Fallback municipal assignments for field technicians
const FALLBACK_SIMULATOR_ORDERS: WorkOrder[] = [
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
    assignedCrew: 'Rapid Electrical Unit #3',
    createdBy: 'Field Inspector Portal',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCancelled: false,
    items: [],
  },
  {
    id: 'WO-2026-001',
    workOrderNumber: 'WO-2026-001',
    title: 'Severe Asphalt Pothole Repair - Galle Road',
    description: 'Deep road depression near Bambalapitiya Junction posing risk to high-speed bus lanes.',
    hazardCategory: 'Pothole',
    hazardAddress: 'Galle Road, Bambalapitiya, Colombo 04',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    estimatedCost: 145000,
    approvalStatus: 'APPROVED',
    approvalRequired: true,
    assignedCrew: 'Rapid Response Squadron #1',
    createdBy: 'AI Predictive Dispatcher',
    createdAt: new Date().toISOString(),
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
    createdBy: 'Drone Geo-Survey AI',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCancelled: false,
    items: [],
  },
];

export default function FieldWorkerSimulator() {
  const [orders, setOrders] = useState<WorkOrder[]>(FALLBACK_SIMULATOR_ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('WO-2026-004');
  const [loadingOrders, setLoadingOrders] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Field worker device state
  const [actualCost, setActualCost] = useState<number>(115000);
  const [materials, setMaterials] = useState<string[]>([
    'Heavy-Duty PVC Cable Conduit 4"',
    'Rubberized Heat-Shrink Wrap',
    'Safety Barrier Tape 50m',
  ]);
  const [newMaterial, setNewMaterial] = useState<string>('');
  const [notes, setNotes] = useState<string>(
    'Conduit secured and sealed to IP67 standard. Work zone barricaded and traffic diverted safely.'
  );
  const [simMode, setSimMode] = useState<'valid' | 'invalid'>('valid');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [afterPhotoUploaded, setAfterPhotoUploaded] = useState<boolean>(true);
  const [auditResult, setAuditResult] = useState<any | null>(null);

  // Load real assignments from backend
  const loadOrders = async () => {
    setLoadingOrders(true);
    try {
      const data = await workOrderService.getAll();
      if (Array.isArray(data) && data.length > 0) {
        // Prioritize ASSIGNED or IN_PROGRESS orders
        const fieldOrders = data.filter(
          (o) => o.status === 'ASSIGNED' || o.status === 'IN_PROGRESS' || o.status === 'APPROVED'
        );
        const listToUse = fieldOrders.length > 0 ? fieldOrders : data;
        setOrders(listToUse);
        if (!listToUse.some((o) => o.id === selectedOrderId)) {
          setSelectedOrderId(listToUse[0].id);
        }
      } else {
        setOrders(FALLBACK_SIMULATOR_ORDERS);
      }
    } catch {
      setOrders(FALLBACK_SIMULATOR_ORDERS);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const currentOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId) || orders[0];
  }, [orders, selectedOrderId]);

  // Sync actual cost whenever selected order changes
  useEffect(() => {
    if (currentOrder?.estimatedCost) {
      setActualCost(currentOrder.estimatedCost);
    }
  }, [selectedOrderId]);

  // Action: Start Work Order
  const handleStart = async () => {
    if (!currentOrder) return;
    setIsProcessing(true);
    try {
      await workOrderService.updateStatus(currentOrder.id, 'IN_PROGRESS', 'Worker arrived on site via Mobile App');
    } catch (e) {
      console.warn('API update failed, updating local simulator state:', e);
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === currentOrder.id ? { ...o, status: 'IN_PROGRESS' } : o))
    );
    setIsProcessing(false);
  };

  // Action: Add Material
  const handleAddMaterial = () => {
    if (newMaterial.trim()) {
      setMaterials([...materials, newMaterial.trim()]);
      setNewMaterial('');
    }
  };

  // Action: Complete Job & Trigger Safety Audit
  const handleComplete = async () => {
    if (!currentOrder) return;
    setIsProcessing(true);

    const isGpsPass = simMode === 'valid';
    const gpsDistance = isGpsPass ? 8.6 : 2840.0;
    const violations: string[] = [];

    if (!isGpsPass) {
      violations.push('GPS Location Deviation: Field worker device geofence was 2,840m away from registered incident pin (>50m municipal limit).');
    }

    if (!afterPhotoUploaded) {
      violations.push('Missing Evidence: Completed work photograph not uploaded to mobile evidence locker.');
    }

    const compliance = violations.length === 0 ? 'PASS' : 'FAILED';
    const reason =
      compliance === 'PASS'
        ? `Field evidence ratified: GPS matched within ${gpsDistance}m tolerance. Dual-photo photographic evidence authenticated.`
        : violations.join(' | ');

    // Attempt backend audit if online
    if (isOnline) {
      try {
        await aiService.auditWorkOrderSafety(currentOrder.id);
        await workOrderService.updateStatus(
          currentOrder.id,
          compliance === 'PASS' ? 'COMPLETED' : 'IN_PROGRESS',
          notes
        );
      } catch (e) {
        console.warn('Backend call skipped in simulator mode:', e);
      }
    }

    setAuditResult({
      compliance,
      reason,
      gps_distance_meters: gpsDistance,
      violations,
      timestamp: new Date().toLocaleTimeString(),
    });

    setOrders((prev) =>
      prev.map((o) =>
        o.id === currentOrder.id
          ? {
              ...o,
              status: compliance === 'PASS' ? 'COMPLETED' : o.status,
              actualCost,
            }
          : o
      )
    );

    setIsProcessing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 text-white rounded-xl shadow-sm">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-black text-slate-800 tracking-tight">
                  Field Worker Mobile Simulator
                </h1>
                <span className="px-2.5 py-0.5 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold rounded-full">
                  Flutter In-Situ Edition
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Interactive In-Situ Field Device Simulator for Municipal Road Crews &amp; Utility Contractors
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadOrders}
          disabled={loadingOrders}
          className="px-3.5 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95"
        >
          <RotateCw className={`w-3.5 h-3.5 text-slate-500 ${loadingOrders ? 'animate-spin' : ''}`} />
          <span>Reload Active Jobs</span>
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Smartphone Emulation Frame */}
        <div className="w-[375px] h-[750px] bg-slate-950 rounded-[44px] border-[10px] border-slate-800 shadow-2xl overflow-hidden flex flex-col mx-auto shrink-0 relative ring-1 ring-slate-700">
          {/* Top Notch / Camera Cutout */}
          <div className="w-32 h-4 bg-slate-800 rounded-b-2xl mx-auto flex items-center justify-center gap-2 z-20">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-950" />
            <div className="w-1.5 h-1.5 rounded-full bg-blue-950" />
          </div>

          {/* Mobile Hardware Status Bar */}
          <div className="px-5 py-1 text-[11px] text-slate-300 flex items-center justify-between z-10 bg-slate-950 select-none">
            <span className="font-bold font-mono">09:41</span>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[10px] flex items-center gap-0.5">
                {isOnline ? (
                  <>
                    <Wifi className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">5G</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3 text-rose-400" />
                    <span className="text-rose-400">Offline</span>
                  </>
                )}
              </span>
              <div className="flex items-center gap-0.5">
                <span className="text-[10px] font-mono">88%</span>
                <Battery className="w-3.5 h-3.5 text-slate-300" />
              </div>
            </div>
          </div>

          {/* In-App Header */}
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-400 font-extrabold tracking-wider uppercase block">
                CivitaGuard Mobile
              </span>
              <span className="text-xs font-bold text-white">
                WO #{currentOrder?.workOrderNumber || currentOrder?.id}
              </span>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] font-extrabold rounded-md uppercase border ${
                currentOrder?.status === 'IN_PROGRESS'
                  ? 'bg-amber-950 text-amber-300 border-amber-800'
                  : currentOrder?.status === 'COMPLETED'
                  ? 'bg-teal-950 text-teal-300 border-teal-800'
                  : 'bg-blue-950 text-blue-300 border-blue-800'
              }`}
            >
              {currentOrder?.status}
            </span>
          </div>

          {/* Screen Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-white text-xs scrollbar-thin">
            {/* Job Details Card */}
            <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-extrabold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900">
                  {currentOrder?.priority} PRIORITY
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {currentOrder?.hazardCategory || 'General Civic'}
                </span>
              </div>

              <h4 className="font-bold text-sm text-slate-100 leading-snug">
                {currentOrder?.title}
              </h4>
              <p className="text-[11px] text-slate-400 line-clamp-2">
                {currentOrder?.description}
              </p>

              <div className="flex items-center gap-1.5 text-[11px] text-blue-400 pt-1 border-t border-slate-800/80">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{currentOrder?.hazardAddress || 'Colombo Metropolitan Sector'}</span>
              </div>
            </div>

            {/* In-Situ GPS Satellite Fix Status */}
            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <Navigation className={`w-3.5 h-3.5 ${simMode === 'valid' ? 'text-emerald-400' : 'text-rose-400'}`} />
                <span className="text-slate-300">
                  GPS: {simMode === 'valid' ? '6.8924° N, 79.8553° E' : '6.9654° N, 79.8821° E'}
                </span>
              </div>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  simMode === 'valid'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                }`}
              >
                {simMode === 'valid' ? '±8.6m (ON-SITE)' : '±2.8km (OFF-SITE)'}
              </span>
            </div>

            {/* Action: Start Work if ASSIGNED */}
            {currentOrder?.status === 'ASSIGNED' && (
              <button
                onClick={handleStart}
                disabled={isProcessing}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                <span>Clock In &amp; Start Repair Work</span>
              </button>
            )}

            {/* Dual Photographic Evidence */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Field Photo Evidence
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Geotagged
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-20 bg-slate-900 rounded-xl overflow-hidden relative border border-slate-800">
                  <img
                    src="https://images.unsplash.com/photo-1542013936693-884638332954?w=400&auto=format&fit=crop&q=80"
                    alt="Before"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 bg-black/80 text-[8px] px-1.5 py-0.5 rounded text-white font-bold">
                    BEFORE REPAIR
                  </span>
                </div>

                <div className="h-20 bg-slate-900 rounded-xl overflow-hidden relative border border-slate-800 flex items-center justify-center group">
                  {afterPhotoUploaded ? (
                    <>
                      <img
                        src="https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=400&auto=format&fit=crop&q=80"
                        alt="After"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-1 left-1 bg-emerald-900/90 text-[8px] px-1.5 py-0.5 rounded text-emerald-200 font-bold">
                        COMPLETED
                      </span>
                    </>
                  ) : (
                    <button
                      onClick={() => setAfterPhotoUploaded(true)}
                      className="flex flex-col items-center gap-1 text-slate-400 hover:text-white transition"
                    >
                      <Camera className="w-5 h-5 text-purple-400" />
                      <span className="text-[9px]">Tap to Capture</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Materials Consumed */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Civil Materials Applied:
              </span>
              <div className="flex gap-1.5 flex-wrap mb-2">
                {materials.map((m, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-[10px] rounded-md text-slate-300">
                    {m}
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Record material applied..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] text-white focus:outline-none focus:border-purple-500"
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                />
                <button
                  onClick={handleAddMaterial}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Actual Cost */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Actual Expenditure (LKR)
              </label>
              <input
                type="number"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-emerald-400 font-extrabold focus:outline-none"
                value={actualCost}
                onChange={(e) => setActualCost(Number(e.target.value))}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Field Sign-off Notes
              </label>
              <textarea
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 focus:outline-none"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Completion Button */}
            <button
              onClick={handleComplete}
              disabled={isProcessing}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting &amp; Auditing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Finalize Work &amp; Run AI Safety Audit</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Side Simulator Controls & Audit Console */}
        <div className="flex-1 space-y-6 w-full">
          {/* Controls Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div>
              <h3 className="text-base font-black text-slate-800">
                Field Environment &amp; Telemetry Simulator
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Simulate various field technician hardware conditions to test edge cases
              </p>
            </div>

            {/* Work Order Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Select Active Municipal Job to Emulate
              </label>
              <select
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(e.target.value)}
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.workOrderNumber || o.id} - {o.title} [{o.status}]
                  </option>
                ))}
              </select>
            </div>

            {/* GPS Telemetry Simulation Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Simulated Technician GPS Proximity (Municipal Tolerance: 50m)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => setSimMode('valid')}
                  className={`p-3 rounded-xl text-left border transition ${
                    simMode === 'valid'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${simMode === 'valid' ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold text-slate-800">On-Site (PASS)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Galle Road Bambalapitiya (8.6m offset &le; 50m tolerance)
                  </p>
                </button>

                <button
                  onClick={() => setSimMode('invalid')}
                  className={`p-3 rounded-xl text-left border transition ${
                    simMode === 'invalid'
                      ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-4 h-4 ${simMode === 'invalid' ? 'text-rose-600' : 'text-slate-400'}`} />
                    <span className="text-xs font-bold text-slate-800">Geofence Deviation (VIOLATION)</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Peliyagoda Depot offset (2.8km away from incident pin)
                  </p>
                </button>
              </div>
            </div>

            {/* Connectivity & Evidence Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Device Network Connection
                </label>
                <button
                  onClick={() => setIsOnline(!isOnline)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition ${
                    isOnline
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300'
                  }`}
                >
                  {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                  <span>{isOnline ? 'Online (5G Live Sync)' : 'Offline (Local SQLite Cache)'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Photo Evidence Status
                </label>
                <button
                  onClick={() => setAfterPhotoUploaded(!afterPhotoUploaded)}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition ${
                    afterPhotoUploaded
                      ? 'bg-purple-50 text-purple-700 border-purple-300'
                      : 'bg-rose-50 text-rose-700 border-rose-300'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{afterPhotoUploaded ? 'After-Photo Attached' : 'Missing After-Photo'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* AI Audit Feedback Result */}
          {auditResult && (
            <div
              className={`p-6 rounded-2xl border space-y-3.5 shadow-sm transition-all ${
                auditResult.compliance === 'PASS'
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : 'bg-rose-50/60 border-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {auditResult.compliance === 'PASS' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  )}
                  <h4 className="text-base font-bold text-slate-800">
                    Municipal Audit Verdict: {auditResult.compliance}
                  </h4>
                </div>
                <span className="text-xs text-slate-400 font-mono">
                  {auditResult.timestamp}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed font-medium">
                {auditResult.reason}
              </p>

              <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
                <span>
                  <strong>GPS Discrepancy:</strong> {auditResult.gps_distance_meters}m
                </span>
                <span>
                  <strong>Geofence Bound:</strong> &le; 50.0m
                </span>
              </div>

              {auditResult.violations.length > 0 && (
                <div className="p-3.5 bg-rose-100/70 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-1">
                  <span className="font-bold block">Violations Intercepted by Safety Agent:</span>
                  <ul className="list-disc pl-4 space-y-1">
                    {auditResult.violations.map((v: string, idx: number) => (
                      <li key={idx}>{v}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
