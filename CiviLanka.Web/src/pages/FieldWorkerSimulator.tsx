// CiviLanka.Web/src/pages/FieldWorkerSimulator.tsx
import React, { useState } from 'react';
import {
  Smartphone,
  MapPin,
  Camera,
  Play,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Sparkles,
} from 'lucide-react';
import { INITIAL_WORK_ORDERS, type WorkOrder } from '../data/member4Data';

export default function FieldWorkerSimulator() {
  const [orders, setOrders] = useState<WorkOrder[]>(INITIAL_WORK_ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState<number>(104);
  const currentOrder = orders.find((o) => o.id === selectedOrderId) || orders[0];

  const [actualCost, setActualCost] = useState<number>(currentOrder?.estimated_cost || 12000);
  const [materials, setMaterials] = useState<string[]>(['Thermal fuse 16A', 'Insulation tape']);
  const [newMaterial, setNewMaterial] = useState<string>('');
  const [notes, setNotes] = useState<string>('Repairs executed flush with municipal standard. Safety cones deployed.');
  const [simMode, setSimMode] = useState<'valid' | 'invalid'>('valid');
  const [auditResult, setAuditResult] = useState<any | null>(null);

  const handleStart = () => {
    setOrders((prev) =>
      prev.map((o) => (o.id === currentOrder.id ? { ...o, status: 'IN_PROGRESS' } : o))
    );
  };

  const handleAddMaterial = () => {
    if (newMaterial.trim()) {
      setMaterials([...materials, newMaterial.trim()]);
      setNewMaterial('');
    }
  };

  const handleComplete = () => {
    const isGpsPass = simMode === 'valid';
    const gpsDistance = isGpsPass ? 11.8 : 2410.0;
    const violations = [];

    if (!isGpsPass) {
      violations.push('GPS location violation: Field worker recorded 2410m away from incident pin (>50m tolerance).');
    }

    const compliance = violations.length === 0 ? 'PASS' : 'FAILED';
    const reason =
      compliance === 'PASS'
        ? 'Field evidence validated: Before & After photos confirmed, GPS proximity passed (11.8m <= 50m).'
        : violations.join(' | ');

    setAuditResult({
      compliance,
      reason,
      gps_distance_meters: gpsDistance,
      violations,
    });

    setOrders((prev) =>
      prev.map((o) =>
        o.id === currentOrder.id
          ? {
              ...o,
              status: compliance === 'PASS' ? 'VERIFIED' : 'COMPLETED',
              actual_cost: actualCost,
            }
          : o
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Field Worker Mobile Simulator</h1>
              <p className="text-sm text-slate-500">
                Companion browser simulator for <strong>Member 4 Flutter Mode</strong>
              </p>
            </div>
          </div>
        </div>

        <span className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-800 text-xs font-bold rounded-full">
          Flutter Mode Preview
        </span>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Smartphone Frame */}
        <div className="w-[360px] h-[700px] bg-slate-950 rounded-[40px] border-[8px] border-slate-800 shadow-2xl overflow-hidden flex flex-col mx-auto shrink-0 relative">
          {/* Top Notch */}
          <div className="w-28 h-4 bg-slate-800 rounded-b-xl mx-auto mb-2"></div>

          {/* App Header */}
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-emerald-400 font-bold tracking-wider uppercase block">
                CivitaGuard Field Ops
              </span>
              <span className="text-xs font-bold text-white">WO #{currentOrder.id}</span>
            </div>
            <span className="px-2 py-0.5 bg-slate-800 text-slate-300 text-[10px] font-bold rounded">
              {currentOrder.status}
            </span>
          </div>

          {/* Screen Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-white text-xs">
            <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[10px] font-bold text-red-400">{currentOrder.priority}</span>
                <span className="text-[10px] font-bold text-slate-400">{currentOrder.hazard_category}</span>
              </div>
              <h4 className="font-bold text-sm text-slate-100">{currentOrder.title}</h4>
              <p className="text-[11px] text-slate-400 line-clamp-2">{currentOrder.description}</p>
              <div className="flex items-center gap-1 text-[11px] text-primary-400 pt-1">
                <MapPin className="w-3 h-3 shrink-0" />
                <span className="truncate">{currentOrder.road_name}</span>
              </div>
            </div>

            {currentOrder.status === 'ASSIGNED' && (
              <button
                onClick={handleStart}
                className="w-full py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition text-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> Start Work (Set IN_PROGRESS)
              </button>
            )}

            {/* Photos */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Photo Evidence:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-20 bg-slate-900 rounded-lg overflow-hidden relative border border-slate-800">
                  <img
                    src="https://images.unsplash.com/photo-1542013936693-884638332954?w=400&auto=format&fit=crop&q=80"
                    alt="Before"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 bg-black/70 text-[9px] px-1 rounded text-white font-bold">
                    BEFORE
                  </span>
                </div>
                <div className="h-20 bg-slate-900 rounded-lg overflow-hidden relative border border-slate-800">
                  <img
                    src="https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=400&auto=format&fit=crop&q=80"
                    alt="After"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-1 left-1 bg-black/70 text-[9px] px-1 rounded text-white font-bold">
                    AFTER
                  </span>
                </div>
              </div>
            </div>

            {/* Materials */}
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Materials Consumed:
              </span>
              <div className="flex gap-1 flex-wrap mb-1.5">
                {materials.map((m, i) => (
                  <span key={i} className="px-2 py-0.5 bg-slate-800 text-[10px] rounded text-slate-300">
                    {m}
                  </span>
                ))}
              </div>
              <div className="flex gap-1">
                <input
                  type="text"
                  placeholder="Add item..."
                  className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-white focus:outline-none"
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                />
                <button
                  onClick={handleAddMaterial}
                  className="px-2 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
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
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-xs text-emerald-400 font-bold focus:outline-none"
                value={actualCost}
                onChange={(e) => setActualCost(Number(e.target.value))}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Completion Notes
              </label>
              <textarea
                className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button
              onClick={handleComplete}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition text-xs flex items-center justify-center gap-1.5 shadow-sm mt-2"
            >
              <Sparkles className="w-3.5 h-3.5" /> Complete Job & Run AI Audit
            </button>
          </div>
        </div>

        {/* Right Side Simulator Controls */}
        <div className="flex-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-base font-bold text-slate-800">Simulator Settings</h3>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">
                Select Work Order to Execute
              </label>
              <select
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                value={selectedOrderId}
                onChange={(e) => setSelectedOrderId(Number(e.target.value))}
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    WO #{o.id} - {o.title} [{o.status}]
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-2">
                Field Technician GPS Geofence Simulation
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setSimMode('valid')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition ${
                    simMode === 'valid'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Within 50m Site Pin (PASS)
                </button>
                <button
                  onClick={() => setSimMode('invalid')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition ${
                    simMode === 'invalid'
                      ? 'bg-red-50 border-red-500 text-red-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  2.4km Offset (VIOLATION)
                </button>
              </div>
            </div>
          </div>

          {/* AI Audit Feedback Result */}
          {auditResult && (
            <div
              className={`p-6 rounded-xl border ${
                auditResult.compliance === 'PASS'
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : 'bg-red-50/50 border-red-200'
              } space-y-3`}
            >
              <div className="flex items-center gap-2">
                {auditResult.compliance === 'PASS' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                )}
                <h4 className="text-sm font-bold text-slate-800">
                  Municipal AI Audit Result: {auditResult.compliance}
                </h4>
              </div>

              <p className="text-xs text-slate-700">{auditResult.reason}</p>

              <div className="text-xs text-slate-600">
                <strong>GPS Distance Recorded:</strong> {auditResult.gps_distance_meters}m
              </div>

              {auditResult.violations.length > 0 && (
                <div className="p-3 bg-red-100/60 rounded-lg text-xs text-red-800 space-y-1">
                  <span className="font-bold">Violations Flagged:</span>
                  <ul className="list-disc pl-4 space-y-0.5">
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
