import React, { useState, useEffect, useMemo } from 'react';
import {
  UserPlus,
  Star,
  MapPin,
  Phone,
  Mail,
  X,
  Building2,
  Briefcase,
  CheckCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  RotateCw,
  Edit2,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { contractorService } from '../services/contractorService';
import { assetService } from '../services/assetService';
import { authService } from '../services/authService';
import type { Contractor, CreateContractorDto, UpdateContractorDto, CreateWorkAssignmentDto } from '../types/contractor';
import type { InfrastructureAsset } from '../types/asset';
import { SHARED_ASSETS } from '../data/sharedAssets';

const SPECIALIZATIONS = [
  'All Specializations',
  'Roads & Bridges',
  'Electrical',
  'Water & Plumbing',
  'Sanitation',
  'Civil',
  'Telecom',
];

const PRIORITY_COLORS: Record<string, string> = {
  Low: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
  Medium: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  High: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  Critical: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
};

const STATUS_ICONS: Record<string, { icon: React.ElementType; cls: string }> = {
  Pending: { icon: Clock, cls: 'text-amber-500' },
  'In Progress': { icon: AlertCircle, cls: 'text-blue-500' },
  Done: { icon: CheckCircle, cls: 'text-emerald-500' },
};

export default function Contractors() {
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [assets, setAssets] = useState<InfrastructureAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedSpec, setSelectedSpec] = useState('All Specializations');
  const [availabilityFilter, setAvailabilityFilter] = useState<'ALL' | 'AVAILABLE' | 'BUSY'>('ALL');

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Contractor | null>(null);
  const [assignTarget, setAssignTarget] = useState<Contractor | null>(null);
  const [viewTarget, setViewTarget] = useState<Contractor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Contractor | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentUser = authService.getCurrentUser();
  const canDelete = currentUser?.role === 'PublicWorksDirector' || currentUser?.role === 'Director';

  // Load contractors and assets
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [contractorData, assetData] = await Promise.all([
        contractorService.getAll(),
        assetService.getAll().catch(() => []),
      ]);
      setContractors(contractorData);
      setAssets(assetData);
    } catch (err: any) {
      console.error('Failed to load contractors:', err);
      setError(err.message || 'Failed to load contractors directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered dataset
  const filteredContractors = useMemo(() => {
    return contractors.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.location.toLowerCase().includes(search.toLowerCase()) ||
        c.phone.toLowerCase().includes(search.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(search.toLowerCase()));

      const matchesSpec =
        selectedSpec === 'All Specializations' ||
        c.specialization.toLowerCase() === selectedSpec.toLowerCase();

      const matchesAvailability =
        availabilityFilter === 'ALL' ||
        (availabilityFilter === 'AVAILABLE' && c.isAvailable) ||
        (availabilityFilter === 'BUSY' && !c.isAvailable);

      return matchesSearch && matchesSpec && matchesAvailability;
    });
  }, [contractors, search, selectedSpec, availabilityFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = contractors.length;
    const available = contractors.filter((c) => c.isAvailable).length;
    const busy = total - available;
    const avgRating =
      total > 0
        ? (contractors.reduce((acc, c) => acc + (c.rating || 0), 0) / total).toFixed(1)
        : '0.0';
    return { total, available, busy, avgRating };
  }, [contractors]);

  // Handle Quick Availability Toggle
  const handleToggleAvailability = async (contractor: Contractor) => {
    try {
      const updated = await contractorService.toggleAvailability(contractor);
      setContractors((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err: any) {
      alert(err.message || 'Failed to update contractor availability.');
    }
  };

  // Handle Create Contractor
  const handleCreateContractor = async (dto: CreateContractorDto) => {
    try {
      const created = await contractorService.create(dto);
      setContractors((prev) => [...prev, created]);
      setShowAddModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to register contractor.');
    }
  };

  // Handle Update Contractor
  const handleUpdateContractor = async (id: number, dto: UpdateContractorDto) => {
    try {
      const updated = await contractorService.update(id, dto);
      setContractors((prev) => prev.map((c) => (c.id === id ? updated : c)));
      setEditTarget(null);
    } catch (err: any) {
      alert(err.message || 'Failed to update contractor.');
    }
  };

  // Handle Delete Contractor
  const handleDeleteContractor = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await contractorService.delete(deleteTarget.id);
      setContractors((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete contractor.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Assign Work
  const handleAssignWork = async (dto: CreateWorkAssignmentDto) => {
    try {
      await contractorService.assignWork(dto);
      // Refresh to get updated assignments and job counts
      await fetchData();
      setAssignTarget(null);
    } catch (err: any) {
      alert(err.message || 'Failed to assign work to contractor.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Contractor Management &amp; Directory
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Maintain authorized municipal contractors, specializations, ratings, and active repair dispatches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            title="Refresh directory"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg shadow-amber-500/20 active:scale-[0.98] cursor-pointer flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-slate-950" />
            <span>Register Contractor</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Total Contractors
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{metrics.total}</span>
            <span className="text-xs font-medium text-slate-400">Registered</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Available for Work
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{metrics.available}</span>
            <span className="text-xs font-medium text-emerald-600">Standby</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Busy on Projects
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-700 dark:text-amber-400">{metrics.busy}</span>
            <span className="text-xs font-medium text-amber-600">Dispatched</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            Average Rating
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{metrics.avgRating}</span>
            <span className="text-xs font-medium text-slate-400">/ 5.0 Stars</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company name, location, phone, or email..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setAvailabilityFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  availabilityFilter === 'ALL'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                All Status
              </button>
              <button
                onClick={() => setAvailabilityFilter('AVAILABLE')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  availabilityFilter === 'AVAILABLE'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Available
              </button>
              <button
                onClick={() => setAvailabilityFilter('BUSY')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  availabilityFilter === 'BUSY'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Busy
              </button>
            </div>
          </div>
        </div>

        {/* Specialization Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          {SPECIALIZATIONS.map((spec) => (
            <button
              key={spec}
              onClick={() => setSelectedSpec(spec)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedSpec === spec
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {spec}
            </button>
          ))}
        </div>
      </div>

      {/* Directory Grid */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading municipal contractor registry...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      ) : filteredContractors.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No contractors found</h3>
          <p className="text-xs text-slate-400">Try adjusting your search criteria or register a new contractor.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContractors.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700/60 transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-5 space-y-4">
                {/* Header: Name and Availability Badge */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-slate-400 font-bold">#{c.id}</span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                      {c.name}
                    </h3>
                  </div>

                  <button
                    onClick={() => handleToggleAvailability(c)}
                    title="Click to toggle availability"
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                      c.isAvailable
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                        : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${c.isAvailable ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    />
                    <span>{c.isAvailable ? 'Available' : 'Busy'}</span>
                  </button>
                </div>

                {/* Specialization Badge and Rating */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <span className="inline-flex items-center px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-lg text-xs font-bold border border-amber-200/80 dark:border-amber-800/60">
                    {c.specialization}
                  </span>

                  <div className="flex items-center gap-1 text-xs">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-900 dark:text-white">{c.rating.toFixed(1)}</span>
                    <span className="text-[11px] text-slate-400">({c.jobCount} jobs)</span>
                  </div>
                </div>

                {/* Contact Information & Location */}
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300 pt-1">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <span className="truncate">{c.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <a
                      href={`tel:${c.phone}`}
                      className="hover:text-amber-600 transition-colors font-medium"
                    >
                      {c.phone}
                    </a>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <a
                        href={`mailto:${c.email}`}
                        className="hover:text-amber-600 transition-colors truncate"
                      >
                        {c.email}
                      </a>
                    </div>
                  )}
                </div>

                {/* Active Assignments Indicator */}
                {c.assignments && c.assignments.length > 0 && (
                  <div className="flex items-center justify-between text-xs text-blue-700 dark:text-blue-300 font-medium bg-blue-50 dark:bg-blue-950/40 rounded-xl px-3 py-2 border border-blue-200/80 dark:border-blue-800/60">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                      <span>{c.assignments.length} assigned task{c.assignments.length > 1 ? 's' : ''}</span>
                    </div>
                    <span className="text-[10px] text-blue-500 font-bold uppercase">Active</span>
                  </div>
                )}
              </div>

              {/* Action Buttons Footer */}
              <div className="border-t border-slate-100 dark:border-slate-800 p-3 bg-slate-50/60 dark:bg-slate-950/50 flex items-center gap-2">
                <button
                  onClick={() => setViewTarget(c)}
                  className="flex-1 py-2 px-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer text-center"
                >
                  View Details
                </button>

                <button
                  onClick={() => setAssignTarget(c)}
                  className="flex-1 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer text-center"
                >
                  Assign Work
                </button>

                <button
                  onClick={() => setEditTarget(c)}
                  title="Edit contractor"
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {canDelete && (
                  <button
                    onClick={() => setDeleteTarget(c)}
                    title="Delete contractor (Director only)"
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── ADD CONTRACTOR MODAL ─── */}
      {showAddModal && (
        <AddContractorModal
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateContractor}
        />
      )}

      {/* ─── EDIT CONTRACTOR MODAL ─── */}
      {editTarget && (
        <EditContractorModal
          contractor={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={(dto) => handleUpdateContractor(editTarget.id, dto)}
        />
      )}

      {/* ─── ASSIGN WORK MODAL ─── */}
      {assignTarget && (
        <AssignWorkModal
          contractor={assignTarget}
          assets={assets.length > 0 ? assets : (SHARED_ASSETS as any)}
          onClose={() => setAssignTarget(null)}
          onSubmit={handleAssignWork}
        />
      )}

      {/* ─── VIEW CONTRACTOR PROFILE & HISTORY MODAL ─── */}
      {viewTarget && (
        <ViewProfileModal
          contractor={viewTarget}
          onClose={() => setViewTarget(null)}
          onAssignWork={() => {
            const target = viewTarget;
            setViewTarget(null);
            setAssignTarget(target);
          }}
          onEdit={() => {
            const target = viewTarget;
            setViewTarget(null);
            setEditTarget(target);
          }}
        />
      )}

      {/* ─── DELETE CONFIRMATION MODAL ─── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Delete Contractor?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <strong>{deleteTarget.name}</strong> from the municipal registry?
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="flex-1 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteContractor}
                disabled={isDeleting}
                className="flex-1 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ADD CONTRACTOR MODAL COMPONENT ───────────────────────────────────────────

function AddContractorModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (dto: CreateContractorDto) => Promise<void>;
}) {
  const [form, setForm] = useState<CreateContractorDto>({
    name: '',
    specialization: 'Roads & Bridges',
    location: '',
    phone: '',
    email: '',
  });
  const [errors, setErrors] = useState<Partial<CreateContractorDto>>({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: Partial<CreateContractorDto> = {};
    if (!form.name.trim()) e.name = 'Company name is required.';
    if (!form.location.trim()) e.location = 'Location is required.';
    if (!form.phone.trim()) e.phone = 'Phone number is required.';
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 dark:bg-amber-950/60 rounded-xl flex items-center justify-center text-amber-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Register Contractor</h2>
              <p className="text-xs text-slate-500">Add an authorized service provider to the registry.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Company / Contractor Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                setErrors({ ...errors, name: '' });
              }}
              placeholder="e.g. Lanka Civil Infrastructure Ltd"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Primary Specialization <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              {SPECIALIZATIONS.filter((s) => s !== 'All Specializations').map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Municipal Location / Operating District <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => {
                setForm({ ...form, location: e.target.value });
                setErrors({ ...errors, location: '' });
              }}
              placeholder="e.g. Colombo 05, Western Province"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            {errors.location && <p className="text-[11px] text-rose-500 mt-1">{errors.location}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => {
                  setForm({ ...form, phone: e.target.value });
                  setErrors({ ...errors, phone: '' });
                }}
                placeholder="011-234-5678"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              {errors.phone && <p className="text-[11px] text-rose-500 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="ops@contractor.lk"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
            >
              {submitting ? 'Registering...' : 'Register Contractor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── EDIT CONTRACTOR MODAL COMPONENT ──────────────────────────────────────────

function EditContractorModal({
  contractor,
  onClose,
  onSubmit,
}: {
  contractor: Contractor;
  onClose: () => void;
  onSubmit: (dto: UpdateContractorDto) => Promise<void>;
}) {
  const [form, setForm] = useState<UpdateContractorDto>({
    name: contractor.name,
    specialization: contractor.specialization,
    location: contractor.location,
    phone: contractor.phone,
    email: contractor.email || '',
    rating: contractor.rating,
    isAvailable: contractor.isAvailable,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await onSubmit(form);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-950/60 rounded-xl flex items-center justify-center text-blue-600">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Contractor</h2>
              <p className="text-xs text-slate-500">Update company profile, contact details, rating &amp; availability.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Company Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Specialization
            </label>
            <select
              value={form.specialization}
              onChange={(e) => setForm({ ...form, specialization: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              {SPECIALIZATIONS.filter((s) => s !== 'All Specializations').map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Location
            </label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email</label>
              <input
                type="email"
                value={form.email || ''}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-center">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Rating (0.0 to 5.0)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="5"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div className="pt-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isAvailable}
                  onChange={(e) => setForm({ ...form, isAvailable: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Currently Available
                </span>
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ASSIGN WORK MODAL COMPONENT ──────────────────────────────────────────────

function AssignWorkModal({
  contractor,
  assets,
  onClose,
  onSubmit,
}: {
  contractor: Contractor;
  assets: InfrastructureAsset[];
  onClose: () => void;
  onSubmit: (dto: CreateWorkAssignmentDto) => Promise<void>;
}) {
  const [selectedAssetId, setSelectedAssetId] = useState<string>(assets[0]?.id || '');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [estimatedCost, setEstimatedCost] = useState<number>(50000);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const selectedAsset = assets.find((a) => a.id === selectedAssetId) || assets[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) {
      alert('Please select an infrastructure asset.');
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit({
        contractorId: contractor.id,
        assetId: selectedAsset.id,
        assetName: selectedAsset.name,
        assetType: selectedAsset.type,
        priority,
        dueDate,
        estimatedCost: Number(estimatedCost),
        notes,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 dark:bg-amber-950/60 rounded-xl flex items-center justify-center text-amber-600">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Dispatch Work Assignment</h2>
              <p className="text-xs text-slate-500">
                To: <span className="font-semibold text-slate-700 dark:text-slate-300">{contractor.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Select Infrastructure Asset <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id} - {a.name} ({a.type} | {a.location})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Due Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Estimated Cost (LKR)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                Rs.
              </span>
              <input
                type="number"
                min="0"
                step="1000"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(parseFloat(e.target.value) || 0)}
                className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Repair Notes &amp; Scope of Work
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide repair specifics, special safety gear requirements, or traffic coordination instructions..."
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
            >
              {submitting ? 'Dispatching...' : 'Dispatch Repair Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── VIEW PROFILE & ASSIGNMENT HISTORY MODAL ──────────────────────────────────

function ViewProfileModal({
  contractor,
  onClose,
  onAssignWork,
  onEdit,
}: {
  contractor: Contractor;
  onClose: () => void;
  onAssignWork: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/60 rounded-xl flex items-center justify-center text-amber-600 font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{contractor.name}</h2>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    contractor.isAvailable
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                  }`}
                >
                  {contractor.isAvailable ? 'Available' : 'Busy'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Specialization: {contractor.specialization}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Key Contact & Profile Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Rating</span>
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span className="text-sm font-bold text-slate-900 dark:text-white">{contractor.rating.toFixed(1)}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Total Jobs</span>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{contractor.jobCount} completed</div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Location</span>
              <div className="text-xs font-semibold text-slate-900 dark:text-white truncate mt-0.5">{contractor.location}</div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Phone</span>
              <div className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5">{contractor.phone}</div>
            </div>
          </div>

          {/* Assignment & Repair History */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-amber-500" />
              <span>Municipal Work Assignment History ({contractor.assignments?.length || 0})</span>
            </h3>

            {!contractor.assignments || contractor.assignments.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                No past assignments recorded for this contractor.
              </div>
            ) : (
              <div className="space-y-2">
                {contractor.assignments.map((a) => {
                  const Icon = STATUS_ICONS[a.status]?.icon || Clock;
                  return (
                    <div
                      key={a.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-white">{a.assetName}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            {a.assetType}
                          </span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              PRIORITY_COLORS[a.priority] || PRIORITY_COLORS.Medium
                            }`}
                          >
                            {a.priority}
                          </span>
                        </div>

                        {a.notes && <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{a.notes}</p>}

                        <div className="flex items-center gap-4 text-[11px] text-slate-400">
                          <span>Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                          {a.estimatedCost && (
                            <span>Est: Rs. {Number(a.estimatedCost).toLocaleString('en-LK')}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            a.status === 'Done'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : a.status === 'In Progress'
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                              : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{a.status}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={onEdit}
            className="py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Edit Profile
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={onAssignWork}
              className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              Assign Work
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
