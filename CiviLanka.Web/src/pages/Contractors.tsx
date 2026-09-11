import { useState } from 'react';
import {
  UserPlus, Star, MapPin, Phone, X, Building2,
  Briefcase, CheckCircle, Clock, AlertCircle,
} from 'lucide-react';
import { REPAIR_ASSETS, type SharedAsset } from '../data/sharedAssets';


// ─── Types ────────────────────────────────────────────────────────────────────

type Contractor = {
  id: number;
  name: string;
  spec: string;
  rating: number;
  location: string;
  phone: string;
  email: string;
  available: boolean;
  jobCount: number;
  assignments: Assignment[];
};

type Assignment = {
  assetName: string;
  assetType: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  notes: string;
  status: 'Pending' | 'In Progress' | 'Done';
};

type ContractorForm = {
  name: string;
  spec: string;
  location: string;
  phone: string;
  email: string;
};

type WorkForm = {
  selectedAsset: SharedAsset | null;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  notes: string;
};


// ─── Constants ────────────────────────────────────────────────────────────────

const SEED_CONTRACTORS: Contractor[] = [
  { id: 1, name: 'Acme Civil Works',   spec: 'Roads & Bridges',  rating: 4.8, location: 'City Center',    phone: '011-234-5678', email: 'info@acmecivil.lk',     available: true,  jobCount: 24, assignments: [] },
  { id: 2, name: 'ElectroFix Pro',     spec: 'Electrical',       rating: 4.5, location: 'North District', phone: '011-987-6543', email: 'work@electrofixpro.lk', available: false, jobCount: 24, assignments: [] },
  { id: 3, name: 'AquaFlow Utilities', spec: 'Water & Plumbing', rating: 4.9, location: 'South District', phone: '011-555-1234', email: 'ops@aquaflow.lk',        available: true,  jobCount: 24, assignments: [] },
];

const PRIORITY_COLORS: Record<Assignment['priority'], string> = {
  Low:      'bg-slate-100 text-slate-600',
  Medium:   'bg-blue-100 text-blue-700',
  High:     'bg-amber-100 text-amber-700',
  Critical: 'bg-red-100 text-red-700',
};

const STATUS_META: Record<Assignment['status'], { icon: React.ElementType; cls: string }> = {
  'Pending':     { icon: Clock,        cls: 'text-slate-500'   },
  'In Progress': { icon: AlertCircle,  cls: 'text-amber-500'   },
  'Done':        { icon: CheckCircle,  cls: 'text-emerald-500' },
};

// ─── Shared style helpers ─────────────────────────────────────────────────────

const inp = (err?: string) =>
  `w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${err ? 'border-red-400 bg-red-50' : 'border-slate-300'}`;
const sel = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white';
const lbl = 'block text-sm font-medium text-slate-700 mb-1';

// ─── Add Contractor Modal ─────────────────────────────────────────────────────

function AddContractorModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: ContractorForm) => void;
}) {
  const [form, setForm] = useState<ContractorForm>({ name: '', spec: 'Roads & Bridges', location: '', phone: '', email: '' });
  const [errors, setErrors] = useState<Partial<ContractorForm>>({});

  const validate = () => {
    const e: Partial<ContractorForm> = {};
    if (!form.name.trim())     e.name     = 'Company name is required.';
    if (!form.location.trim()) e.location = 'Location is required.';
    if (!form.phone.trim())    e.phone    = 'Phone number is required.';
    return e;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    setErrors((p) => ({ ...p, [name]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Add Contractor</h2>
              <p className="text-xs text-slate-500">Register a new municipal contractor.</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className={lbl}>Company Name <span className="text-red-500">*</span></label>
            <input name="name" value={form.name} onChange={handleChange} placeholder="e.g. Acme Civil Works" className={inp(errors.name)} />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className={lbl}>Specialization</label>
            <select name="spec" value={form.spec} onChange={handleChange} className={sel}>
              <option>Roads & Bridges</option>
              <option>Electrical</option>
              <option>Water & Plumbing</option>
              <option>Sanitation</option>
              <option>Civil</option>
              <option>Telecom</option>
            </select>
          </div>

          <div>
            <label className={lbl}>Location <span className="text-red-500">*</span></label>
            <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. North District" className={inp(errors.location)} />
            {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Phone <span className="text-red-500">*</span></label>
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="011-000-0000" className={inp(errors.phone)} />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className={lbl}>Email</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="info@company.lk" className={inp()} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">Add Contractor</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Assign Work Modal ────────────────────────────────────────────────────────

function AssignWorkModal({
  contractor,
  onClose,
  onSubmit,
}: {
  contractor: Contractor;
  onClose: () => void;
  onSubmit: (data: WorkForm) => void;
}) {
  const [form, setForm] = useState<WorkForm>({
    selectedAsset: null,
    priority: 'Medium',
    dueDate: '',
    notes: '',
  });
  const [errors, setErrors] = useState<{ asset?: string; dueDate?: string }>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: { asset?: string; dueDate?: string } = {};
    if (!form.selectedAsset) errs.asset   = 'Please select a repair site.';
    if (!form.dueDate)       errs.dueDate = 'Due date is required.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onSubmit(form);
    onClose();
  };

  const vinp = (err?: string) =>
    `w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-violet-500 ${err ? 'border-red-400 bg-red-50' : 'border-slate-300'}`;
  const vsel = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-violet-500 bg-white';

  const condBadge = (c: SharedAsset['condition']) =>
    c === 'Poor'     ? 'bg-red-100 text-red-700 border-red-200' :
    c === 'Moderate' ? 'bg-amber-100 text-amber-700 border-amber-200' : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-violet-100 rounded-lg flex items-center justify-center">
              <Briefcase className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Assign Work</h2>
              <p className="text-xs text-slate-500">To: <span className="font-medium text-slate-700">{contractor.name}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

          {/* ── Asset Picker ── */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Repair Site <span className="text-red-500">*</span>
              <span className="ml-2 text-xs font-normal text-slate-400">
                ({REPAIR_ASSETS.length} assets need attention)
              </span>
            </label>

            {REPAIR_ASSETS.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-6 border-2 border-dashed border-slate-200 rounded-xl">
                No assets require repair at this time.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                {REPAIR_ASSETS.map((asset) => {
                  const selected = form.selectedAsset?.id === asset.id;
                  return (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => { setForm((p) => ({ ...p, selectedAsset: asset })); setErrors((p) => ({ ...p, asset: '' })); }}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${
                        selected
                          ? 'border-violet-500 bg-violet-50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {/* Selection dot */}
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selected ? 'border-violet-500 bg-violet-500' : 'border-slate-300'
                      }`}>
                        {selected && <span className="w-1.5 h-1.5 rounded-full bg-white block" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-slate-900">{asset.name}</span>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${condBadge(asset.condition)}`}>
                            {asset.condition}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                          <span>{asset.id}</span>
                          <span>·</span>
                          <span>{asset.type}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{asset.location}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {errors.asset && <p className="text-xs text-red-500 mt-1">{errors.asset}</p>}
          </div>

          {/* ── Priority & Due Date ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value as WorkForm['priority'] }))}
                className={vsel}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
                <option>Critical</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Due Date <span className="text-red-500">*</span></label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => { setForm((p) => ({ ...p, dueDate: e.target.value })); setErrors((p) => ({ ...p, dueDate: '' })); }}
                className={vinp(errors.dueDate)}
              />
              {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
            </div>
          </div>

          {/* ── Notes ── */}
          <div>
            <label className={lbl}>Work Instructions / Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Describe the repair work required..."
              rows={3}
              className={`${vinp()} resize-none`}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50 transition-colors">Cancel</button>
            <button type="submit" className="flex-1 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors">Assign Work</button>
          </div>
        </form>
      </div>
    </div>
  );
}


// ─── View Profile Modal ───────────────────────────────────────────────────────

function ViewProfileModal({
  contractor,
  onClose,
}: {
  contractor: Contractor;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-slate-800 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">{contractor.name}</h2>
              <p className="text-xs text-slate-500">{contractor.spec}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            {([
              { icon: MapPin, label: 'Location', value: contractor.location },
              { icon: Phone,  label: 'Phone',    value: contractor.phone    },
            ] as const).map((item) => (
              <div key={item.label} className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs mb-1">
                  <item.icon className="w-3.5 h-3.5" />
                  {item.label}
                </div>
                <div className="text-sm font-semibold text-slate-800">{item.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-amber-50 rounded-xl p-4 text-center">
              <div className="flex justify-center mb-1">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              </div>
              <div className="text-xl font-bold text-slate-900">{contractor.rating > 0 ? contractor.rating : '—'}</div>
              <div className="text-xs text-slate-500">Rating</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-xl font-bold text-slate-900">{contractor.jobCount}</div>
              <div className="text-xs text-slate-500">Total Jobs</div>
            </div>
            <div className={`rounded-xl p-4 text-center ${contractor.available ? 'bg-emerald-50' : 'bg-red-50'}`}>
              <div className={`text-xl font-bold ${contractor.available ? 'text-emerald-700' : 'text-red-600'}`}>
                {contractor.available ? 'Free' : 'Busy'}
              </div>
              <div className="text-xs text-slate-500">Status</div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Current Assignments</h3>
            {contractor.assignments.length === 0 ? (
              <div className="text-center text-slate-400 text-sm py-6 border-2 border-dashed border-slate-200 rounded-xl">
                No work assigned yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-52 overflow-y-auto">
                {contractor.assignments.map((a, i) => {
                  const Meta = STATUS_META[a.status];
                  const StatusIcon = Meta.icon;
                  return (
                    <div key={i} className="flex items-start gap-3 bg-slate-50 rounded-lg p-3 border border-slate-200">
                      <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${Meta.cls}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-slate-900">{a.assetName}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[a.priority]}`}>{a.priority}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">Due: {a.dueDate} · {a.status}</div>
                        {a.notes && <div className="text-xs text-slate-400 mt-1 truncate">{a.notes}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Contractors() {
  const [contractors, setContractors] = useState<Contractor[]>(SEED_CONTRACTORS);
  const [showAdd, setShowAdd] = useState(false);
  const [assignTarget, setAssignTarget] = useState<Contractor | null>(null);
  const [viewTarget, setViewTarget] = useState<Contractor | null>(null);

  const handleAddContractor = (data: ContractorForm) => {
    setContractors((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: data.name,
        spec: data.spec,
        rating: 0,
        location: data.location,
        phone: data.phone,
        email: data.email,
        available: true,
        jobCount: 0,
        assignments: [],
      },
    ]);
  };

  const handleAssignWork = (contractorId: number, data: WorkForm) => {
    if (!data.selectedAsset) return;
    setContractors((prev) =>
      prev.map((c) =>
        c.id === contractorId
          ? {
              ...c,
              available: false,
              jobCount: c.jobCount + 1,
              assignments: [
                ...c.assignments,
                {
                  assetName: data.selectedAsset!.name,
                  assetType: data.selectedAsset!.type,
                  priority: data.priority,
                  dueDate: data.dueDate,
                  notes: data.notes,
                  status: 'Pending' as const,
                },
              ],
            }
          : c
      )
    );
  };


  return (
    <div className="space-y-6">
      {showAdd && (
        <AddContractorModal onClose={() => setShowAdd(false)} onSubmit={handleAddContractor} />
      )}
      {assignTarget && (
        <AssignWorkModal
          contractor={assignTarget}
          onClose={() => setAssignTarget(null)}
          onSubmit={(data) => handleAssignWork(assignTarget.id, data)}
        />
      )}
      {viewTarget && (
        <ViewProfileModal contractor={viewTarget} onClose={() => setViewTarget(null)} />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contractor Management</h1>
          <p className="text-slate-500 text-sm mt-1">Directory of specialized municipal contractors.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add Contractor
        </button>
      </div>

      {/* Contractor cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {contractors.map((contractor) => (
          <div
            key={contractor.id}
            className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
          >
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-slate-900 leading-tight">{contractor.name}</h3>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-2 ${
                  contractor.available ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                }`}>
                  {contractor.available ? 'Available' : 'Busy'}
                </span>
              </div>

              <div className="space-y-2.5">
                <div>
                  <span className="inline-flex items-center px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium border border-blue-100">
                    {contractor.spec}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                  <span className="font-semibold text-slate-900">{contractor.rating > 0 ? contractor.rating : '—'}</span>
                  <span className="text-slate-400 text-xs">(Based on {contractor.jobCount} jobs)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {contractor.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  {contractor.phone}
                </div>
                {contractor.assignments.length > 0 && (
                  <div className="flex items-center gap-1.5 text-xs text-violet-600 font-medium bg-violet-50 rounded-lg px-3 py-1.5 border border-violet-100">
                    <Briefcase className="w-3.5 h-3.5" />
                    {contractor.assignments.length} active assignment{contractor.assignments.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 p-4 bg-slate-50 flex gap-3">
              <button
                onClick={() => setViewTarget(contractor)}
                className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                View Profile
              </button>
              <button
                onClick={() => setAssignTarget(contractor)}
                className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                Assign Work
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
