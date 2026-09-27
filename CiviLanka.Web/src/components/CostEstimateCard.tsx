import React from 'react';
import { Bot, Clock, Users, Wrench, Package, ShieldAlert, Sparkles, Pencil, Loader2 } from 'lucide-react';
import type { CostEstimate, WorkOrderItem } from '../types/workOrder';

interface CostEstimateCardProps {
  estimate?: CostEstimate;
  items?: WorkOrderItem[];
  onEdit?: () => void;
  onGenerateAI?: () => void;
  generating?: boolean;
}

export const CostEstimateCard: React.FC<CostEstimateCardProps> = ({
  estimate,
  items,
  onEdit,
  onGenerateAI,
  generating = false,
}) => {
  if (!estimate) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center">
        <Bot className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-slate-700">No AI Cost Estimate Generated</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto mb-4">
          Click &quot;Generate AI Estimate&quot; to calculate material, labour, equipment costs and repair durations with
          Gemini 2.0. You will be able to review and customize all materials before saving.
        </p>
        {onGenerateAI && (
          <button
            type="button"
            onClick={onGenerateAI}
            disabled={generating}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            {generating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Estimating with AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate AI Estimate &amp; Preview</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  const formatLKR = (amount: number) => {
    return `Rs. ${amount.toLocaleString('en-LK')}`;
  };

  const confidencePercentage = Math.round(estimate.confidence * 100);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
      {/* Header with AI Badge */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/20 rounded-lg border border-indigo-400/30 text-indigo-300">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              Agentic AI Cost &amp; Material Estimate
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 font-mono">
                {estimate.modelName}
              </span>
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Multi-step reasoning based on hazard severity, asset condition, and repair history
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-all cursor-pointer shadow-2xs"
              title="Edit costs, add or remove materials"
            >
              <Pencil className="w-3.5 h-3.5 text-indigo-300" />
              <span>Edit Cost &amp; Materials</span>
            </button>
          )}

          <div className="text-right border-l border-white/10 pl-4">
            <div className="text-xs text-slate-400">Total Estimated Cost</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {formatLKR(estimate.estimatedCost)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Cost Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-blue-500" />
                Materials
              </span>
              <span className="font-semibold text-slate-700">
                {Math.round((estimate.materialCost / (estimate.estimatedCost || 1)) * 100)}%
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900">{formatLKR(estimate.materialCost)}</div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-500" />
                Labour
              </span>
              <span className="font-semibold text-slate-700">
                {Math.round((estimate.labourCost / (estimate.estimatedCost || 1)) * 100)}%
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900">{formatLKR(estimate.labourCost)}</div>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-lg p-4">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-500" />
                Equipment
              </span>
              <span className="font-semibold text-slate-700">
                {Math.round((estimate.equipmentCost / (estimate.estimatedCost || 1)) * 100)}%
              </span>
            </div>
            <div className="text-lg font-bold text-slate-900">{formatLKR(estimate.equipmentCost)}</div>
          </div>
        </div>

        {/* Operational Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-y border-slate-100 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Recommended Crew</div>
              <div className="text-sm font-semibold text-slate-800">
                {estimate.recommendedCrewSize} Field Workers
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs text-slate-500">Repair Duration</div>
              <div className="text-sm font-semibold text-slate-800">
                {estimate.estimatedDurationHours} hours ({estimate.estimatedLabourHours} labour hrs)
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Model Confidence</span>
                <span className="font-semibold text-emerald-600">{confidencePercentage}%</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1.5">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{ width: `${confidencePercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* AI Reasoning */}
        {estimate.reason && (
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-lg p-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-700 mb-1.5 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              Agent Reasoning &amp; Context
            </div>
            <p className="text-sm text-indigo-950 leading-relaxed">{estimate.reason}</p>
          </div>
        )}

        {/* Bill of Materials / Items Table */}
        {items && items.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-slate-500" />
              Itemized Materials &amp; Equipment Breakdown
            </h4>
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2.5">Type</th>
                    <th className="px-3 py-2.5">Item Name</th>
                    <th className="px-3 py-2.5 text-right">Qty</th>
                    <th className="px-3 py-2.5">Unit</th>
                    <th className="px-3 py-2.5 text-right">Est. Unit Cost</th>
                    <th className="px-3 py-2.5 text-right">Est. Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-3 py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            item.itemType === 'Material'
                              ? 'bg-blue-50 text-blue-700'
                              : item.itemType === 'Labour'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {item.itemType}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-slate-800">{item.itemName}</td>
                      <td className="px-3 py-2 text-right">{item.quantity}</td>
                      <td className="px-3 py-2 text-slate-500">{item.unit}</td>
                      <td className="px-3 py-2 text-right text-slate-600 font-mono">
                        {formatLKR(item.estimatedUnitCost)}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900 font-mono">
                        {formatLKR(item.estimatedTotalCost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
