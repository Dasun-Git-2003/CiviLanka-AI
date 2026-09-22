import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Wrench,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  Shield,
  Layers,
} from 'lucide-react';
import { maintenanceService } from '../services/maintenanceService';
import { workOrderService } from '../services/workOrderService';
import type { WorkOrder } from '../types/workOrder';
import type { CreateMaintenanceRecordRequest } from '../types/maintenance';

export const CreateMaintenanceRecord: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedWoId = searchParams.get('workOrderId');

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loadingWos, setLoadingWos] = useState(false);

  const [formData, setFormData] = useState<CreateMaintenanceRecordRequest>({
    workOrderId: preselectedWoId || '',
    assetId: '',
    maintenanceType: 'Corrective',
    description: '',
    materialsUsed: '',
    equipmentUsed: '',
    labourHours: 1,
    actualCost: 0,
    safetyChecklist: 'Mandatory PPE Verified | Traffic Control Deployed',
    workerNotes: '',
  });

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

  const handleWoSelect = (woId: string) => {
    const selected = workOrders.find((w) => w.id === woId);
    setFormData((prev) => ({
      ...prev,
      workOrderId: woId,
      assetId: selected?.assetId || '',
      description: selected ? `Maintenance execution for: ${selected.title}` : prev.description,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.workOrderId) {
      setError('Please select a valid Work Order.');
      return;
    }
    if (!formData.description.trim()) {
      setError('Please provide a maintenance job description.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const created = await maintenanceService.create(formData);
      navigate(`/maintenance/${created.id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to create maintenance record.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center justify-between">
        <Link
          to="/maintenance"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Maintenance Dashboard
        </Link>
      </div>

      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-xs">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Create Field Maintenance Record
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Initiate field operational tracking linked to an approved municipal work order
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        {/* Section 1: Work Order Association */}
        <div>
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-600" />
            1. Work Order &amp; Asset Linkage
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Work Order <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.workOrderId}
                onChange={(e) => handleWoSelect(e.target.value)}
                required
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-800"
              >
                <option value="">-- Choose Approved Work Order --</option>
                {workOrders.map((wo) => (
                  <option key={wo.id} value={wo.id}>
                    {wo.workOrderNumber} — {wo.title} ({wo.priority} | {wo.status})
                  </option>
                ))}
              </select>
              {loadingWos && <p className="text-[11px] text-slate-400 mt-1">Loading work orders...</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Infrastructure Asset ID (Optional)
              </label>
              <input
                type="text"
                value={formData.assetId || ''}
                onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                placeholder="e.g. AST-ROA-001"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Operation Details */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-teal-600" />
            2. Operational Parameters
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Maintenance Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.maintenanceType}
                onChange={(e) => setFormData({ ...formData, maintenanceType: e.target.value })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-800"
              >
                <option value="Corrective">Corrective</option>
                <option value="Preventive">Preventive</option>
                <option value="Emergency">Emergency</option>
                <option value="Routine">Routine</option>
                <option value="Inspection">Inspection</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Logged Labour Hours
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formData.labourHours}
                onChange={(e) => setFormData({ ...formData, labourHours: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Actual Cost (LKR)
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={formData.actualCost}
                onChange={(e) => setFormData({ ...formData, actualCost: parseFloat(e.target.value) || 0 })}
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Job Description &amp; Scope <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed description of the maintenance activity to be executed by the field team..."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
            />
          </div>
        </div>

        {/* Section 3: Materials & Equipment */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-teal-600" />
            3. Logistics, Materials &amp; Equipment
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Materials Requisitioned / Used
              </label>
              <input
                type="text"
                value={formData.materialsUsed || ''}
                onChange={(e) => setFormData({ ...formData, materialsUsed: e.target.value })}
                placeholder="e.g. 50kg cold mix asphalt, bitumen tack coat, PVC couplings"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Equipment &amp; Machinery Used
              </label>
              <input
                type="text"
                value={formData.equipmentUsed || ''}
                onChange={(e) => setFormData({ ...formData, equipmentUsed: e.target.value })}
                placeholder="e.g. Plate compactor, boom lift, jackhammer, traffic signage"
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Safety Protocols */}
        <div className="pt-4 border-t border-slate-100">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-teal-600" />
            4. Initial Safety Protocol Checklist
          </h2>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Active Safety Measures
            </label>
            <textarea
              rows={2}
              value={formData.safetyChecklist || ''}
              onChange={(e) => setFormData({ ...formData, safetyChecklist: e.target.value })}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 font-mono text-[11px]"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Standard pre-populated items can be updated as work progresses.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
          <Link
            to="/maintenance"
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            {submitting ? 'Creating Record...' : 'Create Maintenance Record'}
          </button>
        </div>
      </form>
    </div>
  );
};
