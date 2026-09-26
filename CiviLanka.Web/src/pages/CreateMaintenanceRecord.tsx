import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Users,
  HardHat,
} from 'lucide-react';
import { maintenanceService } from '../services/maintenanceService';
import { workOrderService } from '../services/workOrderService';
import { authService } from '../services/authService';
import type { WorkOrder } from '../types/workOrder';
import type { CreateMaintenanceRecordRequest } from '../types/maintenance';

const MAINTENANCE_TYPES = [
  { id: 'Corrective', label: 'Corrective Repair', desc: 'Fix damage or rectify operational fault' },
  { id: 'Preventive', label: 'Preventive Service', desc: 'Scheduled service to prevent asset breakdown' },
  { id: 'Emergency', label: 'Emergency Response', desc: 'Immediate intervention for severe hazard' },
  { id: 'Routine', label: 'Routine Servicing', desc: 'Standard periodic upkeep and cleaning' },
  { id: 'Inspection', label: 'Field Inspection', desc: 'Diagnostic testing and structural survey' },
];

const STANDARD_MATERIALS = [
  'Cold Mix Asphalt (50kg)',
  'Bitumen Emulsion Tack Coat',
  'PVC Pipe Couplings & Seals',
  'Aggregate Base Grade 1',
  'Electrical Conduit & Cable',
  'Hydraulic Rapid Cement',
  'Rebar Tie Wire & Mesh',
];

const STANDARD_EQUIPMENT = [
  'Vibratory Plate Compactor',
  'Mini Hydraulic Excavator',
  'Boom Lift / Aerial Bucket',
  'Pneumatic Jackhammer',
  'Submersible Dewatering Pump',
  'Reflective Cones & Signage',
  'Portable 5kVA Generator',
];

const SAFETY_PROTOCOLS = [
  'Mandatory PPE Verified (Helmets, High-Vis Vests, Steel-Toe Boots)',
  'Work Zone Barricading & Traffic Control Signage Deployed',
  'Underground Utility Line Clearance / Electrical Isolation Verified',
  'First Aid Equipment & Emergency Contacts on Active Standby',
  'Environmental & Weather Hazard Assessment Completed',
];

export const CreateMaintenanceRecord: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedWoId = searchParams.get('workOrderId');

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loadingWos, setLoadingWos] = useState(false);

  const currentUser = authService.getCurrentUser();

  const [formData, setFormData] = useState<CreateMaintenanceRecordRequest>({
    workOrderId: preselectedWoId || '',
    assetId: '',
    maintenanceType: 'Corrective',
    description: '',
    materialsUsed: '',
    equipmentUsed: '',
    labourHours: 4,
    actualCost: 0,
    safetyChecklist: SAFETY_PROTOCOLS.slice(0, 2).join(' | '),
    workerNotes: '',
  });

  const [selectedProtocols, setSelectedProtocols] = useState<string[]>(
    SAFETY_PROTOCOLS.slice(0, 2)
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorkOrders = async () => {
      try {
        setLoadingWos(true);
        const wos = await workOrderService.getAll();
        setWorkOrders(wos);

        if (preselectedWoId) {
          const matched = wos.find((w) => w.id === preselectedWoId);
          if (matched) {
            setFormData((prev) => ({
              ...prev,
              workOrderId: matched.id,
              assetId: matched.assetId || '',
              description: `Maintenance execution for: ${matched.title}`,
              maintenanceType: matched.hazardCategory?.includes('Water')
                ? 'Corrective'
                : 'Corrective',
              labourHours: matched.estimatedDurationHours || 4,
            }));
          }
        }
      } catch (err) {
        console.error('Failed to load work orders:', err);
      } finally {
        setLoadingWos(false);
      }
    };
    fetchWorkOrders();
  }, [preselectedWoId]);

  const selectedWo = workOrders.find((w) => w.id === formData.workOrderId);

  const handleWoSelect = (woId: string) => {
    const selected = workOrders.find((w) => w.id === woId);
    setFormData((prev) => ({
      ...prev,
      workOrderId: woId,
      assetId: selected?.assetId || '',
      description: selected ? `Maintenance execution for: ${selected.title}` : prev.description,
      labourHours: selected?.estimatedDurationHours || prev.labourHours,
    }));
  };

  const handleToggleProtocol = (protocol: string) => {
    const updated = selectedProtocols.includes(protocol)
      ? selectedProtocols.filter((p) => p !== protocol)
      : [...selectedProtocols, protocol];

    setSelectedProtocols(updated);
    setFormData((prev) => ({
      ...prev,
      safetyChecklist: updated.join(' | '),
    }));
  };

  const handleAddMaterialChip = (item: string) => {
    setFormData((prev) => {
      const current = prev.materialsUsed ? prev.materialsUsed.split(', ').filter(Boolean) : [];
      if (!current.includes(item)) {
        return {
          ...prev,
          materialsUsed: [...current, item].join(', '),
        };
      }
      return prev;
    });
  };

  const handleAddEquipmentChip = (item: string) => {
    setFormData((prev) => {
      const current = prev.equipmentUsed ? prev.equipmentUsed.split(', ').filter(Boolean) : [];
      if (!current.includes(item)) {
        return {
          ...prev,
          equipmentUsed: [...current, item].join(', '),
        };
      }
      return prev;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.workOrderId) {
      setError('Please select an authorized Work Order.');
      return;
    }
    if (!formData.description.trim()) {
      setError('Please provide a maintenance job description and scope.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const created = await maintenanceService.create(formData);
      navigate(`/maintenance/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create field maintenance record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/maintenance"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Maintenance Dashboard
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-cyan-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-teal-200 text-xs font-semibold uppercase tracking-wider">
              <HardHat className="w-4 h-4" />
              <span>Municipal Field Operations Log</span>
            </div>
            <h1 className="text-xl font-black tracking-tight">Create Field Maintenance Record</h1>
            <p className="text-xs text-teal-100/90">
              Dispatch, track labor, requisition materials, and log safety protocols for approved work orders.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xs px-3.5 py-2 rounded-xl border border-white/20 text-xs">
            <Users className="w-4 h-4 text-teal-200" />
            <div>
              <div className="text-[10px] text-teal-200 uppercase font-bold">Logged by</div>
              <div className="font-semibold text-white">{currentUser?.fullName || 'Field Technician'}</div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* ─── SECTION 1: WORK ORDER ASSOCIATION ─── */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[11px] font-bold flex items-center justify-center">
              1
            </span>
            <span>Authorized Work Order &amp; Target Asset</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Municipal Work Order <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.workOrderId}
                onChange={(e) => handleWoSelect(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-800"
              >
                <option value="">-- Choose Approved Work Order --</option>
                {workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.workOrderNumber} — {wo.title} ({wo.priority} | {wo.status})
                  </option>
                ))}
              </select>
              {loadingWos && <p className="text-[11px] text-slate-400 mt-1">Loading authorized work orders...</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Infrastructure Asset ID (Optional)
              </label>
              <input
                type="text"
                value={formData.assetId || ''}
                onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                placeholder="e.g. AST-001 (auto-populated if linked)"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
              />
            </div>
          </div>

          {/* Interactive Selected Work Order Briefing Card */}
          {selectedWo && (
            <div className="mt-3 p-4 bg-teal-50/60 border border-teal-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-teal-950">
                <span className="font-mono text-teal-800">{selectedWo.workOrderNumber}: {selectedWo.title}</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-200/80 text-teal-800 text-[10px] font-black">
                  {selectedWo.status}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-teal-800 pt-1 border-t border-teal-200/60">
                <div>
                  <span className="text-teal-600 block text-[10px] uppercase font-bold">Priority</span>
                  <span className="font-semibold">{selectedWo.priority}</span>
                </div>
                <div>
                  <span className="text-teal-600 block text-[10px] uppercase font-bold">Approved Budget</span>
                  <span className="font-semibold">
                    Rs. {Number(selectedWo.approvedBudget || selectedWo.estimatedCost || 0).toLocaleString('en-LK')}
                  </span>
                </div>
                <div>
                  <span className="text-teal-600 block text-[10px] uppercase font-bold">Assigned Crew</span>
                  <span className="font-semibold truncate block">{selectedWo.assignedCrew || 'Default Field Crew'}</span>
                </div>
                <div>
                  <span className="text-teal-600 block text-[10px] uppercase font-bold">Target Asset</span>
                  <span className="font-semibold">{selectedWo.assetId || 'Municipal Site'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── SECTION 2: OPERATIONAL PARAMETERS ─── */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[11px] font-bold flex items-center justify-center">
              2
            </span>
            <span>Operational Classification &amp; Metrics</span>
          </h2>

          {/* Maintenance Type Selector Chips */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Maintenance Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {MAINTENANCE_TYPES.map((t) => {
                const selected = formData.maintenanceType === t.id;
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => setFormData({ ...formData, maintenanceType: t.id })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      selected
                        ? 'border-teal-600 bg-teal-50 text-teal-900 font-bold shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="text-xs font-bold">{t.label}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{t.desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estimated / Logged Labour Hours
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={formData.labourHours}
                  onChange={(e) =>
                    setFormData({ ...formData, labourHours: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold text-center"
                />
                <div className="flex gap-1">
                  {[2, 4, 8].map((h) => (
                    <button
                      type="button"
                      key={h}
                      onClick={() => setFormData({ ...formData, labourHours: h })}
                      className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold hover:bg-slate-100 text-slate-600"
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initial Operational / Actual Cost (LKR)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Rs.
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.actualCost}
                  onChange={(e) =>
                    setFormData({ ...formData, actualCost: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full pl-10 pr-3 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Execution Scope &amp; Activity Instructions <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe exact physical work steps, materials handling, surface preparation, and quality checks..."
              className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
            />
          </div>
        </div>

        {/* ─── SECTION 3: MATERIALS & MACHINERY REQUISITION ─── */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[11px] font-bold flex items-center justify-center">
              3
            </span>
            <span>Materials &amp; Equipment Requisition</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Materials Logger */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Materials Requisitioned / Consumed
              </label>
              <textarea
                rows={2}
                value={formData.materialsUsed || ''}
                onChange={(e) => setFormData({ ...formData, materialsUsed: e.target.value })}
                placeholder="e.g. 50kg cold mix asphalt, bitumen tack coat, PVC couplings"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
              />
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Add Materials:</span>
                <div className="flex flex-wrap gap-1">
                  {STANDARD_MATERIALS.map((m) => (
                    <button
                      type="button"
                      key={m}
                      onClick={() => handleAddMaterialChip(m)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-medium text-slate-600 transition-colors"
                    >
                      + {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Equipment Logger */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Machinery &amp; Tools Deployed
              </label>
              <textarea
                rows={2}
                value={formData.equipmentUsed || ''}
                onChange={(e) => setFormData({ ...formData, equipmentUsed: e.target.value })}
                placeholder="e.g. Plate compactor, mini excavator, generator, traffic signage"
                className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
              />
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Add Equipment:</span>
                <div className="flex flex-wrap gap-1">
                  {STANDARD_EQUIPMENT.map((eq) => (
                    <button
                      type="button"
                      key={eq}
                      onClick={() => handleAddEquipmentChip(eq)}
                      className="px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-[10px] font-medium text-slate-600 transition-colors"
                    >
                      + {eq}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── SECTION 4: SAFETY PROTOCOLS & COMPLIANCE ─── */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[11px] font-bold flex items-center justify-center">
              4
            </span>
            <span>Mandatory Municipal Safety Protocol Verification</span>
          </h2>

          <div className="space-y-2">
            {SAFETY_PROTOCOLS.map((protocol) => {
              const checked = selectedProtocols.includes(protocol);
              return (
                <label
                  key={protocol}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    checked
                      ? 'bg-teal-50/60 border-teal-300 text-teal-950 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleToggleProtocol(protocol)}
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-xs">{protocol}</span>
                </label>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Technician Notes / Pre-start Site Observations
            </label>
            <textarea
              rows={2}
              value={formData.workerNotes || ''}
              onChange={(e) => setFormData({ ...formData, workerNotes: e.target.value })}
              placeholder="Note initial site conditions, weather factors, or specialized safety equipment requirements..."
              className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
            />
          </div>
        </div>

        {/* ─── ACTION BUTTONS ─── */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
          <Link
            to="/maintenance"
            className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 rounded-xl shadow-md hover:shadow-lg shadow-teal-600/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Initializing Maintenance...' : 'Initialize Maintenance Record'}
          </button>
        </div>
      </form>
    </div>
  );
};
