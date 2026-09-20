import React, { useState, useEffect } from 'react';
import { Shield, CheckSquare, Square, AlertCircle, Save } from 'lucide-react';

interface SafetyChecklistPanelProps {
  initialChecklist?: string | null;
  readOnly?: boolean;
  onSave?: (checklistString: string) => Promise<void>;
}

const CHECKLIST_ITEMS = [
  { id: 'ppe', label: 'Mandatory PPE Verified (Hardhat, Hi-Vis Vest, Steel-toe Boots, Gloves)' },
  { id: 'traffic_cones', label: 'Traffic Control Deployed (Reflective Cones, Lane Tapers, Flagging)' },
  { id: 'warning_signs', label: 'Advance Warning Signage (Positioned 50m–100m upstream of work zone)' },
  { id: 'trench_shoring', label: 'Excavation & Trench Shoring Box (Required if depth exceeds 1.2m)' },
  { id: 'loto_electrical', label: 'Lockout / Tagout (LOTO) Electrical & Power Isolation Verified' },
  { id: 'gas_testing', label: 'Atmospheric Gas Testing Conducted (Confined space / deep culverts)' },
  { id: 'first_aid', label: 'Certified First Aid Kit & Emergency Eyewash Available On-Site' },
  { id: 'drop_zone', label: 'Drop Zone Perimeter Barricaded (Overhead boom / tree pruning)' },
];

export const SafetyChecklistPanel: React.FC<SafetyChecklistPanelProps> = ({
  initialChecklist,
  readOnly = false,
  onSave,
}) => {
  const [checkedState, setCheckedState] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    const state: Record<string, boolean> = {};
    if (initialChecklist) {
      CHECKLIST_ITEMS.forEach((item) => {
        if (initialChecklist.includes(item.id) || initialChecklist.includes(item.label.slice(0, 15))) {
          state[item.id] = true;
        }
      });
    }
    setCheckedState(state);
  }, [initialChecklist]);

  const toggleItem = (id: string) => {
    if (readOnly) return;
    setCheckedState((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSave = async () => {
    if (!onSave) return;
    try {
      setSaving(true);
      const selectedLabels = CHECKLIST_ITEMS.filter((item) => checkedState[item.id]).map(
        (item) => item.id
      );
      const serialized = selectedLabels.join(' | ');
      await onSave(serialized);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const completedCount = Object.values(checkedState).filter(Boolean).length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Municipal Field Safety Checklist
            </h3>
            <p className="text-[11px] text-slate-500">
              Mandatory pre-operation &amp; site protocols compliance
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {completedCount} of {CHECKLIST_ITEMS.length} Completed
          </span>
          {!readOnly && onSave && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Checklist'}
            </button>
          )}
        </div>
      </div>

      {savedSuccess && (
        <div className="mb-4 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium">
          Safety checklist updated successfully.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CHECKLIST_ITEMS.map((item) => {
          const isChecked = !!checkedState[item.id];
          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-3 rounded-lg border flex items-start gap-3 transition-colors ${
                readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-50'
              } ${
                isChecked
                  ? 'bg-teal-50/40 border-teal-200 text-slate-900'
                  : 'bg-white border-slate-200 text-slate-600'
              }`}
            >
              {isChecked ? (
                <CheckSquare className="w-4 h-4 text-teal-600 mt-0.5 flex-shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
              )}
              <span className="text-xs font-medium leading-relaxed">{item.label}</span>
            </div>
          );
        })}
      </div>

      {completedCount < 3 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-600" />
          <span>Notice: Safety checklist must be completed prior to submitting maintenance for supervisor verification.</span>
        </div>
      )}
    </div>
  );
};
