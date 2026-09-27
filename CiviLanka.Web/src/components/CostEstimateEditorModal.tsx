import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Plus,
  Trash2,
  Package,
  Wrench,
  Users,
  Clock,
  RotateCcw,
  Save,
  Info,
  Loader2,
} from 'lucide-react';
import type {
  CostEstimate,
  WorkOrderItem,
  SaveWorkOrderItemDto,
  SaveWorkOrderEstimateDto,
  CostEstimatePreviewResponse,
} from '../types/workOrder';

interface CostEstimateEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialEstimate?: CostEstimate | CostEstimatePreviewResponse | SaveWorkOrderEstimateDto | null;
  initialItems?: (WorkOrderItem | SaveWorkOrderItemDto)[];
  onSave: (data: SaveWorkOrderEstimateDto) => Promise<void> | void;
  onRegenerateAI?: () => Promise<void> | void;
  title?: string;
  subtitle?: string;
  saving?: boolean;
}

export const CostEstimateEditorModal: React.FC<CostEstimateEditorModalProps> = ({
  isOpen,
  onClose,
  initialEstimate,
  initialItems = [],
  onSave,
  onRegenerateAI,
  title = 'Customize AI Cost & Materials Estimate',
  subtitle = 'Review, edit costs, add or remove materials before committing this estimate.',
  saving = false,
}) => {
  const [items, setItems] = useState<SaveWorkOrderItemDto[]>([]);
  const [labourCost, setLabourCost] = useState<number>(0);
  const [equipmentCost, setEquipmentCost] = useState<number>(0);
  const [recommendedCrewSize, setRecommendedCrewSize] = useState<number>(2);
  const [estimatedDurationHours, setEstimatedDurationHours] = useState<number>(4);
  const [estimatedLabourHours, setEstimatedLabourHours] = useState<number>(8);
  const [reason, setReason] = useState<string>('');
  const [manualTotalOverride, setManualTotalOverride] = useState<number | ''>('');
  const [regenerating, setRegenerating] = useState(false);

  // Initialize state when modal opens or initial data changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialItems && initialItems.length > 0) {
      setItems(
        initialItems.map((i) => ({
          id: (i as any).id || crypto.randomUUID(),
          itemType: (i.itemType as any) || 'Material',
          itemName: i.itemName || '',
          quantity: Number(i.quantity) || 1,
          unit: i.unit || 'units',
          estimatedUnitCost: Number(i.estimatedUnitCost) || 0,
          estimatedTotalCost:
            Number(i.estimatedTotalCost) ||
            (Number(i.quantity) || 1) * (Number(i.estimatedUnitCost) || 0),
        }))
      );
    } else if (initialEstimate && (initialEstimate as CostEstimatePreviewResponse).items) {
      setItems(
        (initialEstimate as CostEstimatePreviewResponse).items.map((i) => ({
          id: i.id || crypto.randomUUID(),
          itemType: i.itemType,
          itemName: i.itemName,
          quantity: i.quantity,
          unit: i.unit,
          estimatedUnitCost: i.estimatedUnitCost,
          estimatedTotalCost: i.estimatedTotalCost,
        }))
      );
    } else {
      setItems([]);
    }

    if (initialEstimate) {
      setLabourCost(Number(initialEstimate.labourCost) || 0);
      setEquipmentCost(Number(initialEstimate.equipmentCost) || 0);
      setRecommendedCrewSize(Number(initialEstimate.recommendedCrewSize) || 2);
      setEstimatedDurationHours(Number(initialEstimate.estimatedDurationHours) || 4);
      setEstimatedLabourHours(Number(initialEstimate.estimatedLabourHours) || 8);
      setReason(initialEstimate.reason || '');
      setManualTotalOverride('');
    }
  }, [isOpen, initialEstimate, initialItems]);

  if (!isOpen) return null;

  // Auto-calculated sums
  const materialsSum = items
    .filter((it) => it.itemType === 'Material')
    .reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.estimatedUnitCost) || 0), 0);

  const equipmentItemsSum = items
    .filter((it) => it.itemType === 'Equipment')
    .reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.estimatedUnitCost) || 0), 0);

  const effectiveEquipmentCost = equipmentCost > 0 ? equipmentCost : equipmentItemsSum;

  const autoCalculatedTotal =
    materialsSum + Number(labourCost || 0) + Number(effectiveEquipmentCost || 0);

  const finalEstimatedCost =
    manualTotalOverride !== '' ? Number(manualTotalOverride) : autoCalculatedTotal;

  const formatLKR = (amount: number) => `Rs. ${Math.round(amount).toLocaleString('en-LK')}`;

  const handleItemChange = (
    index: number,
    field: keyof SaveWorkOrderItemDto,
    value: string | number
  ) => {
    setItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: value };
      if (field === 'quantity' || field === 'estimatedUnitCost') {
        const q = field === 'quantity' ? Number(value) : Number(target.quantity);
        const uc = field === 'estimatedUnitCost' ? Number(value) : Number(target.estimatedUnitCost);
        target.estimatedTotalCost = (q || 0) * (uc || 0);
      }
      copy[index] = target;
      return copy;
    });
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        itemType: 'Material',
        itemName: '',
        quantity: 1,
        unit: 'units',
        estimatedUnitCost: 1000,
        estimatedTotalCost: 1000,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Ensure item calculations are accurate
    const preparedItems: SaveWorkOrderItemDto[] = items.map((i) => ({
      itemType: i.itemType || 'Material',
      itemName: i.itemName.trim() || 'Unspecified Item',
      quantity: Math.max(0.1, Number(i.quantity) || 1),
      unit: i.unit.trim() || 'unit',
      estimatedUnitCost: Math.max(0, Number(i.estimatedUnitCost) || 0),
      estimatedTotalCost:
        (Math.max(0.1, Number(i.quantity) || 1)) *
        (Math.max(0, Number(i.estimatedUnitCost) || 0)),
    }));

    const payload: SaveWorkOrderEstimateDto = {
      estimatedCost: Math.max(0, finalEstimatedCost),
      materialCost: materialsSum,
      labourCost: Math.max(0, Number(labourCost) || 0),
      equipmentCost: Math.max(0, Number(effectiveEquipmentCost) || 0),
      estimatedLabourHours: Math.max(0, Number(estimatedLabourHours) || 0),
      recommendedCrewSize: Math.max(1, Number(recommendedCrewSize) || 1),
      estimatedDurationHours: Math.max(0, Number(estimatedDurationHours) || 0),
      reason: reason.trim() || 'Supervisor customized cost & materials estimate.',
      items: preparedItems,
    };

    await onSave(payload);
  };

  const handleRegenerate = async () => {
    if (!onRegenerateAI) return;
    setRegenerating(true);
    try {
      await onRegenerateAI();
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-indigo-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">{title}</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                  Interactive Editor
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* Top Summary & Cost KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
            {/* Total Budget */}
            <div className="sm:col-span-1 p-3 bg-indigo-900 text-white rounded-xl shadow-xs">
              <div className="text-[11px] text-indigo-200 font-medium flex items-center justify-between">
                <span>Total Estimated Cost</span>
                <span className="text-[10px] text-emerald-300 font-mono">LKR</span>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-300 mt-1">
                {formatLKR(finalEstimatedCost)}
              </div>
              <div className="text-[10px] text-indigo-200 mt-1">
                {manualTotalOverride !== '' ? 'Custom Manual Budget' : 'Auto-summed from breakdown'}
              </div>
            </div>

            {/* Materials Breakdown */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <div className="text-slate-500 flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold">
                  <Package className="w-3.5 h-3.5 text-blue-500" />
                  Materials Cost
                </span>
              </div>
              <div className="text-base font-bold text-slate-800 font-mono mt-1">
                {formatLKR(materialsSum)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Sum of itemized materials</div>
            </div>

            {/* Labour Cost */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <label className="text-slate-500 flex items-center gap-1 font-semibold mb-1">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                Labour Cost (LKR)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={labourCost}
                onChange={(e) => setLabourCost(Math.max(0, Number(e.target.value)))}
                className="w-full text-xs font-mono font-bold text-slate-800 border border-slate-200 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <div className="text-[10px] text-slate-400 mt-1">Workforce compensation</div>
            </div>

            {/* Equipment Cost */}
            <div className="p-3 bg-white border border-slate-200 rounded-xl">
              <label className="text-slate-500 flex items-center gap-1 font-semibold mb-1">
                <Wrench className="w-3.5 h-3.5 text-amber-500" />
                Equipment Cost (LKR)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={equipmentCost}
                onChange={(e) => setEquipmentCost(Math.max(0, Number(e.target.value)))}
                className="w-full text-xs font-mono font-bold text-slate-800 border border-slate-200 rounded-lg p-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <div className="text-[10px] text-slate-400 mt-1">Machinery &amp; tool rental</div>
            </div>
          </div>

          {/* Operational Resources (Crew, Duration, Hours) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white border border-slate-200 p-4 rounded-xl">
            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-500" />
                Recommended Crew Size
              </label>
              <input
                type="number"
                min="1"
                max="50"
                step="any"
                value={recommendedCrewSize}
                onChange={(e) => setRecommendedCrewSize(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-1">Number of technicians</p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Repair Duration (Hours)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={estimatedDurationHours}
                onChange={(e) => setEstimatedDurationHours(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-1">On-site turnaround hours</p>
            </div>

            <div>
              <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                Total Labour Hours
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={estimatedLabourHours}
                onChange={(e) => setEstimatedLabourHours(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none font-medium"
              />
              <p className="text-[10px] text-slate-400 mt-1">Crew Size × Duration</p>
            </div>
          </div>

          {/* Itemized Materials & Equipment List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-600" />
                  Itemized Materials &amp; Equipment Breakdown
                </h4>
                <p className="text-[11px] text-slate-500">
                  Add, edit, or remove specific construction materials and plant equipment.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-xs transition-colors border border-indigo-200 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Material</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center">
                <Package className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-600">No materials or equipment listed.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click &quot;Add Material&quot; above to include concrete, asphalt, pipes, or equipment.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 text-[11px]">
                    <tr>
                      <th className="px-3 py-2.5 w-28">Type</th>
                      <th className="px-3 py-2.5">Item Name / Specification</th>
                      <th className="px-3 py-2.5 w-20 text-right">Qty</th>
                      <th className="px-3 py-2.5 w-24">Unit</th>
                      <th className="px-3 py-2.5 w-32 text-right">Unit Rate (LKR)</th>
                      <th className="px-3 py-2.5 w-32 text-right">Subtotal</th>
                      <th className="px-3 py-2.5 w-12 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {items.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-slate-50/60 transition-colors">
                        {/* Type */}
                        <td className="px-3 py-2">
                          <select
                            value={item.itemType}
                            onChange={(e) =>
                              handleItemChange(idx, 'itemType', e.target.value as any)
                            }
                            className="w-full text-[11px] border border-slate-200 rounded-md p-1 bg-white focus:outline-none"
                          >
                            <option value="Material">Material</option>
                            <option value="Equipment">Equipment</option>
                            <option value="Labour">Labour</option>
                          </select>
                        </td>

                        {/* Item Name */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            required
                            placeholder="e.g. Grade 30 Ready Mix Concrete"
                            value={item.itemName}
                            onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded-md px-2 py-1 focus:ring-1 focus:ring-indigo-500 focus:outline-none font-medium text-slate-800"
                          />
                        </td>

                        {/* Qty */}
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemChange(idx, 'quantity', parseFloat(e.target.value) || 0)
                            }
                            className="w-full text-xs text-right border border-slate-200 rounded-md px-2 py-1 font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </td>

                        {/* Unit */}
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            placeholder="units, m³, tons"
                            value={item.unit}
                            onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                            className="w-full text-[11px] border border-slate-200 rounded-md px-2 py-1 focus:outline-none text-slate-600"
                          />
                        </td>

                        {/* Unit Cost */}
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.estimatedUnitCost}
                            onChange={(e) =>
                              handleItemChange(
                                idx,
                                'estimatedUnitCost',
                                parseFloat(e.target.value) || 0
                              )
                            }
                            className="w-full text-xs text-right border border-slate-200 rounded-md px-2 py-1 font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </td>

                        {/* Total Cost */}
                        <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">
                          {formatLKR((item.quantity || 0) * (item.estimatedUnitCost || 0))}
                        </td>

                        {/* Delete Action */}
                        <td className="px-3 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* AI Reasoning / Notes Box */}
          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 space-y-1.5">
            <label className="text-xs font-semibold text-indigo-900 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-600" />
              Supervisor Justification / AI Context Notes
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Rationale for adjustments, specific contractor guidelines, or site constraints..."
              className="w-full text-xs border border-indigo-200/80 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white text-slate-800"
            />
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              {onRegenerateAI && (
                <button
                  type="button"
                  disabled={regenerating}
                  onClick={handleRegenerate}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
                  <span>{regenerating ? 'Re-querying AI...' : 'Re-run AI Baseline'}</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Estimate...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Save &amp; Apply Estimate</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
