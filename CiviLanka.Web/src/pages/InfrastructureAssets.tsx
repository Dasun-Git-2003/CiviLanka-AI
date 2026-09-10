import { useState } from 'react';
import {
  Plus, Search, Filter, X, Building2,
  ClipboardCheck, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Inspection = {
  date: string;
  condition: 'Good' | 'Moderate' | 'Poor' | 'Critical';
  issues: string;
  notes: string;
};

type Asset = {
  id: string;
  name: string;
  type: string;
  status: string;
  location: string;
  installationDate: string;
  description: string;
  latitude: string;
  longitude: string;
  inspections: Inspection[];
};

type AssetFormData = {
  name: string;
  type: string;
  status: string;
  location: string;
  installationDate: string;
  description: string;
  latitude: string;
  longitude: string;
};

type InspectionFormData = {
  date: string;
  condition: 'Good' | 'Moderate' | 'Poor' | 'Critical';
  issues: string;
  notes: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSET_FORM_INIT: AssetFormData = {
  name: '',
  type: 'Water',
  status: 'Active',
  location: '',
  installationDate: '',
  description: '',
  latitude: '',
  longitude: '',
};

const INSPECTION_INIT: InspectionFormData = {
  date: new Date().toISOString().split('T')[0],
  condition: 'Good',
  issues: '',
  notes: '',
};

const CONDITIONS: InspectionFormData['condition'][] = ['Good', 'Moderate', 'Poor', 'Critical'];

const CONDITION_META: Record<
  InspectionFormData['condition'],
  { ring: string; text: string; dot: string; desc: string }
> = {
  Good:     { ring: 'ring-emerald-400 bg-emerald-50', text: 'text-emerald-700', dot: 'bg-emerald-500', desc: 'Asset is fully operational.' },
  Moderate: { ring: 'ring-amber-400 bg-amber-50',     text: 'text-amber-700',   dot: 'bg-amber-400',   desc: 'Minor issues; monitoring needed.' },
  Poor:     { ring: 'ring-red-400 bg-red-50',         text: 'text-red-700',     dot: 'bg-red-500',     desc: 'Significant deterioration; repair required.' },
  Critical: { ring: 'ring-red-600 bg-red-100',        text: 'text-red-800',     dot: 'bg-red-700',     desc: 'Immediate action required.' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function conditionBadge(condition: string) {
  const map: Record<string, string> = {
    Good: 'bg-emerald-100 text-emerald-700',
    Moderate: 'bg-amber-100 text-amber-700',
    Poor: 'bg-red-100 text-red-700',
    Critical: 'bg-red-200 text-red-800 font-semibold',
  };
  return map[condition] ?? 'bg-slate-100 text-slate-600';
}

function latestCondition(asset: Asset) {
  if (asset.inspections.length === 0) return null;
  return [...asset.inspections].sort((a, b) => b.date.localeCompare(a.date))[0].condition;
}

// ─── Register Asset Modal ─────────────────────────────────────────────────────

function RegisterAssetModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: AssetFormData) => void;
}) {
  const [form, setForm] = useState<AssetFormData>(ASSET_FORM_INIT);
  const [errors, setErrors] = useState<Partial<AssetFormData>>({});

  const validate = () => {
    const e: Partial<AssetFormData> = {};
    if (!form.name.trim()) e.name = 'Asset name is required.';
    if (!form.location.trim()) e.location = 'Location is required.';
    return e;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    onSubmit(form);
    onClose();
  };

  const lbl = 'block text-sm font-medium text-slate-700 mb-1';
  const inp = (err?: string) =>
    `w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${err ? 'border-red-400 bg-red-50' : 'border-slate-300'}`;
  const sel = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Register New Asset</h2>
              <p className="text-xs text-slate-500">Add basic information about the asset.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Asset Name */}
          <div>
            <label className={lbl}>
              Asset Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Main St Water Pipe"
              className={inp(errors.name)}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Type + Installation Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>
                Asset Type <span className="text-red-500">*</span>
              </label>
              <select name="type" value={form.type} onChange={handleChange} className={sel}>
                <option>Water</option>
                <option>Electrical</option>
                <option>Civil</option>
                <option>Roads & Bridges</option>
                <option>Sanitation</option>
                <option>Telecom</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Installation Date</label>
              <input
                name="installationDate"
                type="date"
                value={form.installationDate}
                onChange={handleChange}
                className={inp()}
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className={lbl}>
              Location / Area <span className="text-red-500">*</span>
            </label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. Main Street, Colombo"
              className={inp(errors.location)}
            />
            {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
          </div>

          {/* GPS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Latitude</label>
              <input
                name="latitude"
                type="number"
                step="any"
                value={form.latitude}
                onChange={handleChange}
                placeholder="e.g. 6.9271"
                className={inp()}
              />
            </div>
            <div>
              <label className={lbl}>Longitude</label>
              <input
                name="longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={handleChange}
                placeholder="e.g. 79.8612"
                className={inp()}
              />
            </div>
          </div>

          {/* Status */}
          <div>
            <label className={lbl}>
              Status <span className="text-red-500">*</span>
            </label>
            <select name="status" value={form.status} onChange={handleChange} className={sel}>
              <option>Active</option>
              <option>Inactive</option>
              <option>Decommissioned</option>
              <option>Under Construction</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className={lbl}>Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Optional notes about the asset..."
              rows={3}
              className={`${inp()} resize-none`}
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors shadow-sm"
            >
              Register Asset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Inspection Modal ─────────────────────────────────────────────────────────

function InspectionModal({
  asset,
  onClose,
  onSubmit,
}: {
  asset: Asset;
  onClose: () => void;
  onSubmit: (data: InspectionFormData) => void;
}) {
  const [form, setForm] = useState<InspectionFormData>(INSPECTION_INIT);
  const [errors, setErrors] = useState<{ date?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date) { setErrors({ date: 'Inspection date is required.' }); return; }
    onSubmit(form);
    onClose();
  };

  const inp = (err?: string) =>
    `w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${err ? 'border-red-400 bg-red-50' : 'border-slate-300'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Record Asset Inspection</h2>
              <p className="text-xs text-slate-500">
                Asset: <span className="font-medium text-slate-700">{asset.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Inspection Date */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Inspection Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => { setForm((p) => ({ ...p, date: e.target.value })); setErrors({}); }}
              className={inp(errors.date)}
            />
            {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
          </div>

          {/* Condition radio cards */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Condition <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS.map((c) => {
                const meta = CONDITION_META[c];
                const selected = form.condition === c;
                return (
                  <label
                    key={c}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      selected ? `ring-2 ${meta.ring} border-transparent` : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="condition"
                      value={c}
                      checked={selected}
                      onChange={() => setForm((p) => ({ ...p, condition: c }))}
                      className="sr-only"
                    />
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${meta.dot}`} />
                    <div>
                      <div className={`text-sm font-semibold ${selected ? meta.text : 'text-slate-700'}`}>{c}</div>
                      <div className="text-xs text-slate-400 leading-tight">{meta.desc}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Issues Found */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Issues Found</label>
            <input
              type="text"
              value={form.issues}
              onChange={(e) => setForm((p) => ({ ...p, issues: e.target.value }))}
              placeholder="e.g. Small leakage near junction"
              className={inp()}
            />
          </div>

          {/* Inspector Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Inspector Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Detailed observations by the inspector..."
              rows={3}
              className={`${inp()} resize-none`}
            />
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors shadow-sm"
            >
              Save Inspection
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Inspection History Row ───────────────────────────────────────────────────

function InspectionHistoryRow({ asset }: { asset: Asset }) {
  const [open, setOpen] = useState(false);
  if (asset.inspections.length === 0) return null;

  const sorted = [...asset.inspections].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <tr className="bg-slate-50 border-b border-slate-100">
      <td colSpan={7} className="px-6 pb-4 pt-0">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-slate-500 font-medium flex items-center gap-1 mt-1 hover:text-slate-700 transition-colors"
        >
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {open ? 'Hide' : 'Show'} inspection history ({asset.inspections.length})
        </button>
        {open && (
          <div className="mt-2 space-y-2">
            {sorted.map((ins, i) => (
              <div
                key={i}
                className="bg-white rounded-lg border border-slate-200 p-3 text-xs text-slate-600 grid grid-cols-4 gap-3"
              >
                <div>
                  <div className="text-slate-400 mb-0.5">Date</div>
                  <div className="font-medium text-slate-800">{ins.date}</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-0.5">Condition</div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${conditionBadge(ins.condition)}`}>
                    {ins.condition}
                  </span>
                </div>
                <div>
                  <div className="text-slate-400 mb-0.5">Issues Found</div>
                  <div>{ins.issues || '—'}</div>
                </div>
                <div>
                  <div className="text-slate-400 mb-0.5">Inspector Notes</div>
                  <div className="truncate">{ins.notes || '—'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_ASSETS: Asset[] = [
  {
    id: 'AST-001',
    name: 'Main St Water Pipe',
    type: 'Water',
    status: 'Active',
    location: 'Downtown, Colombo',
    installationDate: '2008-06-15',
    description: 'Primary water supply pipe running along Main Street.',
    latitude: '6.9271',
    longitude: '79.8612',
    inspections: [
      {
        date: '2026-08-10',
        condition: 'Poor',
        issues: 'Small leakage near junction',
        notes: 'Pipe shows corrosion on south end. Replacement recommended within 6 months.',
      },
    ],
  },
  {
    id: 'AST-002',
    name: 'Oak Ave Streetlight',
    type: 'Electrical',
    status: 'Active',
    location: 'Northside, Colombo',
    installationDate: '2015-03-22',
    description: 'LED streetlight grid along Oak Avenue.',
    latitude: '6.9310',
    longitude: '79.8450',
    inspections: [
      {
        date: '2026-09-01',
        condition: 'Good',
        issues: '',
        notes: 'All lights operational. Firmware updated.',
      },
    ],
  },
  {
    id: 'AST-003',
    name: 'Central Park Pathway',
    type: 'Civil',
    status: 'Active',
    location: 'City Center, Colombo',
    installationDate: '2011-11-30',
    description: 'Pedestrian pathway through Central Park.',
    latitude: '6.9050',
    longitude: '79.8510',
    inspections: [],
  },
];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function InfrastructureAssets() {
  const [assets, setAssets] = useState<Asset[]>(SEED_ASSETS);
  const [showRegister, setShowRegister] = useState(false);
  const [inspectTarget, setInspectTarget] = useState<Asset | null>(null);
  const [search, setSearch] = useState('');

  const handleRegister = (data: AssetFormData) => {
    const newId = `AST-${String(assets.length + 1).padStart(3, '0')}`;
    setAssets((prev) => [...prev, { ...data, id: newId, inspections: [] }]);
  };

  const handleInspection = (assetId: string, data: InspectionFormData) => {
    setAssets((prev) =>
      prev.map((a) => (a.id === assetId ? { ...a, inspections: [...a.inspections, data] } : a))
    );
  };

  const filtered = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase()) ||
      a.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {showRegister && (
        <RegisterAssetModal
          onClose={() => setShowRegister(false)}
          onSubmit={handleRegister}
        />
      )}
      {inspectTarget && (
        <InspectionModal
          asset={inspectTarget}
          onClose={() => setInspectTarget(null)}
          onSubmit={(data) => handleInspection(inspectTarget.id, data)}
        />
      )}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Infrastructure Assets</h1>
          <p className="text-slate-500 text-sm mt-1">Manage, register, and inspect municipal assets.</p>
        </div>
        <button
          onClick={() => setShowRegister(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm text-sm"
        >
          <Plus className="w-4 h-4" />
          Register Asset
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search bar */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 bg-slate-50">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, or location..."
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium text-slate-700 transition-colors bg-white text-sm">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Asset ID</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Last Condition</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400 text-sm">
                    No assets found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((asset) => {
                  const cond = latestCondition(asset);
                  return (
                    <>
                      <tr key={asset.id} className="hover:bg-slate-50 transition-colors border-b border-slate-100">
                        <td className="p-4 text-sm font-mono font-medium text-slate-800">{asset.id}</td>
                        <td className="p-4 text-sm font-medium text-slate-900">{asset.name}</td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                            {asset.type}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            asset.status === 'Active'
                              ? 'bg-emerald-100 text-emerald-700'
                              : asset.status === 'Inactive'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            {asset.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {cond ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${conditionBadge(cond)}`}>
                              {cond}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Not inspected</span>
                          )}
                        </td>
                        <td className="p-4 text-sm text-slate-600">{asset.location}</td>
                        <td className="p-4 text-sm">
                          <div className="flex items-center gap-3">
                            <button className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors">
                              Edit
                            </button>
                            <button
                              onClick={() => setInspectTarget(asset)}
                              className="flex items-center gap-1 text-violet-600 hover:text-violet-800 font-medium text-sm transition-colors"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                      <InspectionHistoryRow key={`${asset.id}-history`} asset={asset} />
                    </>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-200 text-sm text-slate-500 text-center bg-slate-50">
          Showing {filtered.length} of {assets.length} assets
        </div>
      </div>
    </div>
  );
}
