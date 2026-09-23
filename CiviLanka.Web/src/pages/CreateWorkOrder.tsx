import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, AlertTriangle, Building2, Plus, Loader2, CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { workOrderService } from '../services/workOrderService';
import { CostEstimateEditorModal } from '../components/CostEstimateEditorModal';
import type { SaveWorkOrderEstimateDto, CostEstimatePreviewResponse } from '../types/workOrder';

export const CreateWorkOrder: React.FC = () => {
  const navigate = useNavigate();

  const [hazards, setHazards] = useState<any[]>([]);
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [selectedHazardId, setSelectedHazardId] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('NORMAL');
  const [estimatedCost, setEstimatedCost] = useState<number | ''>('');

  // AI Estimate Preview & Customization State
  const [estimating, setEstimating] = useState(false);
  const [showEditorModal, setShowEditorModal] = useState(false);
  const [customEstimate, setCustomEstimate] = useState<SaveWorkOrderEstimateDto | null>(null);
  const [previewEstimate, setPreviewEstimate] = useState<CostEstimatePreviewResponse | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hList, aList] = await Promise.all([
          workOrderService.getHazards(),
          workOrderService.getAssets(),
        ]);
        setHazards(hList);
        setAssets(aList);
      } catch (err) {
        console.error('Error fetching hazards/assets:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Autofill when a hazard is selected
  const handleHazardChange = (hazardId: string) => {
    setSelectedHazardId(hazardId);
    if (!hazardId) return;

    const hazard = hazards.find((h) => h.id === hazardId);
    if (hazard) {
      setTitle(`Repair: ${hazard.category} - ${hazard.ticketNumber || 'Citizen Report'}`);
      setDescription(hazard.description || '');
      setPriority(hazard.priority || 'NORMAL');
    }
  };

  const handleEstimateAI = async () => {
    setEstimating(true);
    try {
      const selectedHazard = hazards.find((h) => h.id === selectedHazardId);
      const preview = await workOrderService.previewEstimate({
        hazardId: selectedHazardId || undefined,
        assetId: selectedAssetId || undefined,
        category: selectedHazard?.category || 'Infrastructure Repair',
        description: description || title || 'Infrastructure maintenance and repair',
        priority,
      });
      setPreviewEstimate(preview);
      setShowEditorModal(true);
    } catch (err) {
      alert('AI estimation preview failed. Please check backend / Gemini configuration.');
      console.error(err);
    } finally {
      setEstimating(false);
    }
  };

  const handleSaveModalEstimate = (data: SaveWorkOrderEstimateDto) => {
    setCustomEstimate(data);
    setEstimatedCost(data.estimatedCost);
    setShowEditorModal(false);
  };

  const handleClearCustomEstimate = () => {
    setCustomEstimate(null);
    setPreviewEstimate(null);
    setEstimatedCost('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) {
      alert('Please provide a title and description.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await workOrderService.create({
        hazardId: selectedHazardId || undefined,
        assetId: selectedAssetId || undefined,
        title,
        description,
        priority,
        estimatedCost: estimatedCost !== '' ? Number(estimatedCost) : undefined,
        materialCost: customEstimate?.materialCost,
        labourCost: customEstimate?.labourCost,
        equipmentCost: customEstimate?.equipmentCost,
        estimatedDurationHours: customEstimate?.estimatedDurationHours,
        recommendedCrewSize: customEstimate?.recommendedCrewSize,
        estimateReason: customEstimate?.reason,
        items: customEstimate?.items,
      });

      navigate(`/work-orders/${created.id}`);
    } catch (err) {
      alert('Failed to create work order.');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          to="/work-orders"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Work Orders
        </Link>
        <h1 className="text-xl font-bold text-slate-900">Create Municipal Work Order</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Triage an active hazard report into a planned infrastructure repair task.
        </p>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Loading municipal hazards and asset registry...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
        {/* Source Hazard Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            Originating Citizen Hazard (Member 1)
          </label>
          <select
            value={selectedHazardId}
            onChange={(e) => handleHazardChange(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">Standalone / Proactive Maintenance (No Hazard Linked)</option>
            {hazards.map((h) => (
              <option key={h.id} value={h.id}>
                [{h.ticketNumber || 'TICKET'}] {h.category} - {h.address || h.description?.slice(0, 40)}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Selecting a hazard will automatically populate the title, description, and priority.
          </p>
        </div>

        {/* Target Asset Dropdown */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-blue-500" />
            Target Infrastructure Asset (Member 2)
          </label>
          <select
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="">Select Asset...</option>
            {assets.map((a) => (
              <option key={a.id} value={a.id}>
                [{a.id}] {a.name} ({a.type} - {a.location})
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Links the work order to Member 2&apos;s infrastructure registry for asset maintenance tracking.
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Work Order Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Repair burst underground water pipe on Main St"
            className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Scope of Repair &amp; Description <span className="text-red-500">*</span>
          </label>
          <textarea
            rows={3}
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed repair instructions, location details, safety requirements..."
            className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        {/* Priority & Baseline Cost */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Repair Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
            >
              <option value="LOW">LOW</option>
              <option value="NORMAL">NORMAL</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Estimated Budget (LKR)
              </label>
              <button
                type="button"
                onClick={handleEstimateAI}
                disabled={estimating}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <Sparkles className={`w-3 h-3 text-indigo-600 ${estimating ? 'animate-spin' : ''}`} />
                <span>{estimating ? 'Estimating...' : 'Estimate & Customize with AI'}</span>
              </button>
            </div>
            <input
              type="number"
              min="0"
              step="any"
              value={estimatedCost}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : '';
                setEstimatedCost(val);
                if (customEstimate) {
                  setCustomEstimate({ ...customEstimate, estimatedCost: Number(val) || 0 });
                }
              }}
              placeholder="e.g. 50000 or click Estimate with AI"
              className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Customized Estimate Active Card */}
        {customEstimate && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between gap-4 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500 text-white rounded-lg">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-xs text-emerald-950 flex items-center gap-2">
                  <span>Custom Estimate Configured:</span>
                  <span className="font-mono text-emerald-800 font-bold">
                    Rs. {Number(customEstimate.estimatedCost).toLocaleString('en-LK')}
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">
                    {customEstimate.items.length} items / materials
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Materials: Rs. {Number(customEstimate.materialCost || 0).toLocaleString()} • Labour: Rs. {Number(customEstimate.labourCost || 0).toLocaleString()} • Equipment: Rs. {Number(customEstimate.equipmentCost || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEditorModal(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white border border-emerald-300 text-emerald-900 font-semibold text-xs hover:bg-emerald-100/50 transition-colors cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>Edit Items</span>
              </button>
              <button
                type="button"
                onClick={handleClearCustomEstimate}
                className="p-1.5 text-emerald-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                title="Clear customized estimate"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* AI Info Banner */}
        {!customEstimate && (
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Interactive AI Cost Estimation:</span> Click &quot;Estimate &amp; Customize with AI&quot; above to preview suggested materials, labour rates, and equipment. You can review, add or delete items, and adjust costs before creating the work order.
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Link
            to="/work-orders"
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {submitting ? 'Creating Work Order...' : customEstimate ? 'Create Work Order with Custom Estimate' : 'Create Work Order'}
          </button>
        </div>
      </form>
      )}

      {/* AI Cost & Materials Estimation Review & Editor Modal */}
      {showEditorModal && (
        <CostEstimateEditorModal
          isOpen={showEditorModal}
          onClose={() => setShowEditorModal(false)}
          initialEstimate={customEstimate || previewEstimate}
          initialItems={customEstimate ? customEstimate.items : previewEstimate?.items}
          onSave={handleSaveModalEstimate}
          onRegenerateAI={handleEstimateAI}
          title="Customize Estimate & Materials"
          subtitle="Review the suggested materials and costs. Add or remove items before creating the work order."
        />
      )}
    </div>
  );
};
