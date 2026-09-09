import { useState } from 'react';
import { Plus, Search, Filter, X, Building2 } from 'lucide-react';

type Asset = {
  id: string;
  name: string;
  type: string;
  condition: string;
  location: string;
};

type AssetFormData = {
  name: string;
  type: string;
  condition: string;
  location: string;
  description: string;
  latitude: string;
  longitude: string;
};

const INITIAL_FORM: AssetFormData = {
  name: '',
  type: 'Water',
  condition: 'Good',
  location: '',
  description: '',
  latitude: '',
  longitude: '',
};

function RegisterAssetModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: AssetFormData) => void;
}) {
  const [form, setForm] = useState<AssetFormData>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<AssetFormData>>({});

  const validate = () => {
    const e: Partial<AssetFormData> = {};
    if (!form.name.trim()) e.name = 'Asset name is required.';
    if (!form.location.trim()) e.location = 'Location is required.';
    return e;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length > 0) {
      setErrors(e2);
      return;
    }
    onSubmit(form);
    onClose();
  };

  return (
    /* Backdrop */
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Register New Asset</h2>
              <p className="text-xs text-slate-500">Fill in the details for the new infrastructure asset.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Asset Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Asset Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="e.g. Main St Water Pipe"
              className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-400 bg-red-50' : 'border-slate-300'
              }`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Type & Condition row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Asset Type</label>
              <select
                name="type"
                value={form.type}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option>Water</option>
                <option>Electrical</option>
                <option>Civil</option>
                <option>Roads & Bridges</option>
                <option>Sanitation</option>
                <option>Telecom</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Condition</label>
              <select
                name="condition"
                value={form.condition}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option>Good</option>
                <option>Fair</option>
                <option>Poor</option>
                <option>Critical</option>
              </select>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Location / Area <span className="text-red-500">*</span>
            </label>
            <input
              name="location"
              value={form.location}
              onChange={handleChange}
              placeholder="e.g. Downtown, Colombo"
              className={`w-full px-3 py-2 rounded-lg border text-sm outline-none transition-all focus:ring-2 focus:ring-blue-500 ${
                errors.location ? 'border-red-400 bg-red-50' : 'border-slate-300'
              }`}
            />
            {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
          </div>

          {/* GPS Coordinates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
              <input
                name="latitude"
                value={form.latitude}
                onChange={handleChange}
                placeholder="e.g. 6.9271"
                type="number"
                step="any"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
              <input
                name="longitude"
                value={form.longitude}
                onChange={handleChange}
                placeholder="e.g. 79.8612"
                type="number"
                step="any"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Optional notes about the asset..."
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
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

export default function InfrastructureAssets() {
  const [assets, setAssets] = useState<Asset[]>([
    { id: 'AST-001', name: 'Main St Water Pipe', type: 'Water', condition: 'Poor', location: 'Downtown' },
    { id: 'AST-002', name: 'Oak Ave Streetlight', type: 'Electrical', condition: 'Good', location: 'Northside' },
    { id: 'AST-003', name: 'Central Park Pathway', type: 'Civil', condition: 'Fair', location: 'City Center' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const handleRegister = (data: AssetFormData) => {
    const newId = `AST-${String(assets.length + 1).padStart(3, '0')}`;
    setAssets((prev) => [
      ...prev,
      { id: newId, name: data.name, type: data.type, condition: data.condition, location: data.location },
    ]);
  };

  const filtered = assets.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {showModal && (
        <RegisterAssetModal onClose={() => setShowModal(false)} onSubmit={handleRegister} />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Infrastructure Assets</h1>
          <p className="text-slate-500 text-sm mt-1">Manage, register, and update municipal assets.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Register Asset
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 bg-slate-50">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search assets by name or ID..."
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm"
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
                <th className="p-4 text-sm font-semibold text-slate-600">Asset ID</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Name</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Type</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Condition</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Location</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-sm">
                    No assets found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 text-sm font-medium text-slate-900">{asset.id}</td>
                    <td className="p-4 text-sm text-slate-700">{asset.name}</td>
                    <td className="p-4 text-sm text-slate-600">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                        {asset.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                          asset.condition === 'Good'
                            ? 'bg-emerald-100 text-emerald-700'
                            : asset.condition === 'Fair'
                            ? 'bg-amber-100 text-amber-700'
                            : asset.condition === 'Critical'
                            ? 'bg-red-200 text-red-800'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {asset.condition}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">{asset.location}</td>
                    <td className="p-4 text-sm">
                      <button className="text-blue-600 hover:text-blue-800 font-medium">Edit</button>
                    </td>
                  </tr>
                ))
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
