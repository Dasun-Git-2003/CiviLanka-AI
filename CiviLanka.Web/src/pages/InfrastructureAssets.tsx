import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Search,
  Filter,
  X,
  Building2,
  ClipboardCheck,
  MapPin as MapPinIcon,
  RotateCw,
  Edit2,
  Trash2,
  Wrench,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps';
import { assetService } from '../services/assetService';
import { maintenanceService } from '../services/maintenanceService';
import { contractorService } from '../services/contractorService';
import { authService } from '../services/authService';
import type {
  InfrastructureAsset,
  CreateAssetDto,
  UpdateAssetDto,
  CreateInspectionDto,
} from '../types/asset';
import type { MaintenanceRecord } from '../types/maintenance';
import type { WorkAssignment } from '../types/contractor';

// ─── Nominatim Autocomplete + Map Panner ──────────────────────────────────────

type NominatimResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

/** Dropdown search box — fetches suggestions from OpenStreetMap Nominatim */
function LocationSearchBox({
  value,
  onChange,
  onSelect,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  onSelect: (displayName: string, lat: string, lng: string) => void;
  error?: string;
}) {
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const search = async (q: string) => {
    if (q.trim().length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        q
      )}&format=json&limit=5&countrycodes=lk&addressdetails=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en', 'User-Agent': 'CiviLanka-App' },
      });
      const data: NominatimResult[] = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = (r: NominatimResult) => {
    const shortName = r.display_name.split(',').slice(0, 3).join(', ');
    onChange(shortName);
    onSelect(shortName, r.lat, r.lon);
    setSuggestions([]);
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const bdr = error ? 'border-red-400 bg-red-50' : 'border-slate-300 dark:border-slate-700';

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          value={value}
          onChange={handleInput}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Type a location in Sri Lanka to search…"
          className={`w-full pl-9 pr-8 py-2 rounded-xl border text-xs outline-none transition-all focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white dark:bg-slate-950 text-slate-900 dark:text-white ${bdr}`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute z-[200] mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-52 overflow-y-auto">
          {suggestions.map((s) => (
            <li key={s.place_id}>
              <button
                type="button"
                onClick={() => handleSelect(s)}
                className="w-full text-left px-4 py-2.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800 flex items-start gap-2 border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors cursor-pointer"
              >
                <MapPinIcon className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 line-clamp-2">{s.display_name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
    </div>
  );
}

/** Pans the Google Map to a target coordinate — must be inside <Map> */
function MapPanner({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo(target);
    map.setZoom(15);
  }, [map, target]);
  return null;
}

// ─── Constants & Styles ───────────────────────────────────────────────────────

const ASSET_TYPES = [
  'All Types',
  'Water',
  'Electrical',
  'Civil',
  'Roads & Bridges',
  'Sanitation',
  'Telecom',
];

const ASSET_STATUSES = ['Active', 'Under Maintenance', 'Inactive', 'Decommissioned'];

const CONDITIONS = ['Good', 'Moderate', 'Poor', 'Critical'];

const CONDITION_META: Record<
  string,
  { ring: string; text: string; dot: string; desc: string; badge: string }
> = {
  Good: {
    ring: 'ring-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    dot: 'bg-emerald-500',
    desc: 'Fully operational, no immediate repairs needed.',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
  Moderate: {
    ring: 'ring-amber-400 bg-amber-50 dark:bg-amber-950/40',
    text: 'text-amber-700 dark:text-amber-300',
    dot: 'bg-amber-400',
    desc: 'Minor wear; scheduled monitoring recommended.',
    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  Poor: {
    ring: 'ring-orange-400 bg-orange-50 dark:bg-orange-950/40',
    text: 'text-orange-700 dark:text-orange-300',
    dot: 'bg-orange-500',
    desc: 'Significant deterioration; maintenance required.',
    badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200 dark:border-orange-800',
  },
  Critical: {
    ring: 'ring-rose-600 bg-rose-50 dark:bg-rose-950/40',
    text: 'text-rose-700 dark:text-rose-300',
    dot: 'bg-rose-600',
    desc: 'Severe structural or safety hazard; immediate action required.',
    badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  },
};

function conditionBadge(condition?: string | null) {
  if (!condition) return 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700';
  return CONDITION_META[condition]?.badge ?? 'bg-slate-100 text-slate-600 border-slate-200';
}

function calculateAge(installationDate?: string | null): string {
  if (!installationDate) return 'Unknown age';
  const installed = new Date(installationDate);
  const now = new Date();
  const diffYears = (now.getTime() - installed.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (diffYears < 1) {
    const diffMonths = Math.max(1, Math.round(diffYears * 12));
    return `${diffMonths} mo old`;
  }
  return `${diffYears.toFixed(1)} yrs old`;
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function InfrastructureAssets() {
  const [assets, setAssets] = useState<InfrastructureAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('All Types');
  const [selectedCondition, setSelectedCondition] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [editTarget, setEditTarget] = useState<InfrastructureAsset | null>(null);
  const [inspectTarget, setInspectTarget] = useState<InfrastructureAsset | null>(null);
  const [detailsTarget, setDetailsTarget] = useState<InfrastructureAsset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InfrastructureAsset | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const currentUser = authService.getCurrentUser();
  const canDelete = currentUser?.role === 'PublicWorksDirector' || currentUser?.role === 'Director';

  const fetchAssets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await assetService.getAll();
      setAssets(data);
    } catch (err: any) {
      console.error('Failed to load infrastructure assets:', err);
      setError(err.message || 'Failed to load assets from municipal registry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return assets.filter((a) => {
      const matchesSearch =
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.id.toLowerCase().includes(search.toLowerCase()) ||
        a.location.toLowerCase().includes(search.toLowerCase()) ||
        (a.description && a.description.toLowerCase().includes(search.toLowerCase()));

      const matchesType =
        selectedType === 'All Types' || a.type.toLowerCase() === selectedType.toLowerCase();

      const matchesCondition =
        selectedCondition === 'ALL' ||
        (a.latestCondition &&
          a.latestCondition.toLowerCase() === selectedCondition.toLowerCase());

      const matchesStatus =
        selectedStatus === 'ALL' || a.status.toLowerCase() === selectedStatus.toLowerCase();

      return matchesSearch && matchesType && matchesCondition && matchesStatus;
    });
  }, [assets, search, selectedType, selectedCondition, selectedStatus]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const total = assets.length;
    const critical = assets.filter((a) => a.latestCondition === 'Critical').length;
    const poor = assets.filter((a) => a.latestCondition === 'Poor').length;
    const good = assets.filter((a) => a.latestCondition === 'Good').length;
    const underMaintenance = assets.filter((a) => a.status === 'Under Maintenance').length;
    return { total, critical, poor, good, underMaintenance };
  }, [assets]);

  // Handlers
  const handleRegister = async (dto: CreateAssetDto) => {
    try {
      const created = await assetService.create(dto);
      setAssets((prev) => [created, ...prev]);
      setShowRegisterModal(false);
    } catch (err: any) {
      alert(err.message || 'Failed to register asset.');
    }
  };

  const handleUpdate = async (id: string, dto: UpdateAssetDto) => {
    try {
      const updated = await assetService.update(id, dto);
      setAssets((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setEditTarget(null);
      if (detailsTarget?.id === id) {
        setDetailsTarget(updated);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update asset.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      await assetService.delete(deleteTarget.id);
      setAssets((prev) => prev.filter((a) => a.id !== deleteTarget.id));
      setDeleteTarget(null);
      if (detailsTarget?.id === deleteTarget.id) {
        setDetailsTarget(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete asset.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRecordInspection = async (assetId: string, dto: CreateInspectionDto) => {
    try {
      await assetService.recordInspection(assetId, dto);
      await fetchAssets();
      setInspectTarget(null);
      // If details modal is open, refresh it
      if (detailsTarget && detailsTarget.id === assetId) {
        const refreshed = await assetService.getById(assetId);
        setDetailsTarget(refreshed);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to record inspection.');
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
              Infrastructure Asset Registry &amp; Health
            </h1>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Track municipal assets, GIS locations, condition lifecycles, and physical repair histories.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAssets}
            title="Refresh assets"
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowRegisterModal(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md hover:shadow-lg shadow-amber-500/20 active:scale-[0.98] cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-slate-950" />
            <span>Register Asset</span>
          </button>
        </div>
      </div>

      {/* Aggregate KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Assets
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{metrics.total}</span>
            <span className="text-xs text-slate-400">Tracked</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Good Condition
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">{metrics.good}</span>
            <span className="text-xs text-emerald-600">Operational</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Maintenance
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600">{metrics.underMaintenance}</span>
            <span className="text-xs text-amber-600">In Service</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="text-[11px] font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            Poor Health
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-orange-600">{metrics.poor}</span>
            <span className="text-xs text-orange-600">Needs Repair</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs col-span-2 lg:col-span-1">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            Critical Risk
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-600">{metrics.critical}</span>
            <span className="text-xs text-rose-600">Immediate Action</span>
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
              placeholder="Search by asset name, ID, location, or description..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value="ALL">All Conditions</option>
              <option value="Good">Good Condition</option>
              <option value="Moderate">Moderate Condition</option>
              <option value="Poor">Poor Condition</option>
              <option value="Critical">Critical Condition</option>
            </select>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value="ALL">All Statuses</option>
              {ASSET_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Type Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          {ASSET_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors cursor-pointer ${
                selectedType === type
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Asset Map Overview (if coordinates present) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
            <MapPinIcon className="w-4 h-4 text-amber-500" />
            <span>GIS Municipal Asset Distribution Map</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {filteredAssets.filter((a) => a.latitude && a.longitude).length} mapped assets
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden" style={{ height: '260px' }}>
          <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
            <Map
              defaultZoom={11}
              defaultCenter={{ lat: 6.9271, lng: 79.8612 }}
              mapId="CIVILANKA_ASSETS_MAP"
              style={{ width: '100%', height: '100%' }}
            >
              {filteredAssets
                .filter((a) => a.latitude && a.longitude)
                .map((a) => {
                  const condition = a.latestCondition || 'Good';
                  const markerColor =
                    condition === 'Critical'
                      ? 'bg-rose-600'
                      : condition === 'Poor'
                      ? 'bg-orange-500'
                      : condition === 'Moderate'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500';

                  return (
                    <AdvancedMarker
                      key={a.id}
                      position={{ lat: a.latitude, lng: a.longitude }}
                      title={`${a.name} (${condition})`}
                      onClick={() => setDetailsTarget(a)}
                    >
                      <div className="flex flex-col items-center cursor-pointer group">
                        <div
                          className={`w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-white text-[9px] font-black ${markerColor}`}
                        >
                          {a.type[0]}
                        </div>
                        <div className="hidden group-hover:block bg-slate-900 text-white text-[10px] px-2 py-0.5 rounded shadow mt-1 whitespace-nowrap">
                          {a.name}
                        </div>
                      </div>
                    </AdvancedMarker>
                  );
                })}
            </Map>
          </APIProvider>
        </div>
      </div>

      {/* Asset Table / List */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Loading municipal assets...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl text-xs text-rose-700 dark:text-rose-300 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      ) : filteredAssets.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
          <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
          <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">No assets match criteria</h3>
          <p className="text-xs text-slate-400">Try adjusting your filters or register a new municipal asset.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Asset ID &amp; Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Age</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                {filteredAssets.map((asset) => {
                  const condition = asset.latestCondition || 'Good';
                  return (
                    <tr
                      key={asset.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono text-[10px] text-slate-400 font-bold">
                            {asset.id}
                          </span>
                          <div
                            onClick={() => setDetailsTarget(asset)}
                            className="font-bold text-slate-900 dark:text-white hover:text-amber-600 dark:hover:text-amber-400 cursor-pointer"
                          >
                            {asset.name}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-400">
                        {asset.type}
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${conditionBadge(
                            condition
                          )}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              CONDITION_META[condition]?.dot || 'bg-slate-400'
                            }`}
                          />
                          <span>{condition}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                            asset.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                              : asset.status === 'Under Maintenance'
                              ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {asset.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs truncate" title={asset.location}>
                        {asset.location}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        {calculateAge(asset.installationDate)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailsTarget(asset)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            Details &amp; Repairs
                          </button>

                          <button
                            onClick={() => setInspectTarget(asset)}
                            title="Record Condition Inspection"
                            className="p-1.5 rounded-lg text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors cursor-pointer"
                          >
                            <ClipboardCheck className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setEditTarget(asset)}
                            title="Edit Asset"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {canDelete && (
                            <button
                              onClick={() => setDeleteTarget(asset)}
                              title="Delete Asset (Director only)"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── REGISTER ASSET MODAL ─── */}
      {showRegisterModal && (
        <RegisterAssetModal
          onClose={() => setShowRegisterModal(false)}
          onSubmit={handleRegister}
        />
      )}

      {/* ─── EDIT ASSET MODAL ─── */}
      {editTarget && (
        <EditAssetModal
          asset={editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={(dto) => handleUpdate(editTarget.id, dto)}
        />
      )}

      {/* ─── RECORD INSPECTION MODAL ─── */}
      {inspectTarget && (
        <InspectionModal
          asset={inspectTarget}
          onClose={() => setInspectTarget(null)}
          onSubmit={(dto) => handleRecordInspection(inspectTarget.id, dto)}
        />
      )}

      {/* ─── ASSET DETAILS & REPAIR HISTORY MODAL ─── */}
      {detailsTarget && (
        <AssetDetailsModal
          asset={detailsTarget}
          onClose={() => setDetailsTarget(null)}
          onEdit={() => {
            const target = detailsTarget;
            setDetailsTarget(null);
            setEditTarget(target);
          }}
          onInspect={() => {
            const target = detailsTarget;
            setDetailsTarget(null);
            setInspectTarget(target);
          }}
        />
      )}

      {/* ─── DELETE ASSET CONFIRMATION MODAL ─── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Delete Asset?</h3>
              <p className="text-xs text-slate-500">
                Are you sure you want to remove <strong>{deleteTarget.id} ({deleteTarget.name})</strong> from the municipal registry?
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
                onClick={handleDelete}
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

// ─── REGISTER ASSET MODAL COMPONENT ───────────────────────────────────────────

function RegisterAssetModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: CreateAssetDto) => Promise<void>;
}) {
  const [form, setForm] = useState<CreateAssetDto>({
    name: '',
    type: 'Water',
    status: 'Active',
    location: '',
    installationDate: new Date().toISOString().split('T')[0],
    latitude: 6.9271,
    longitude: 79.8612,
    description: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [mapTarget, setMapTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = 'Asset name is required.';
    if (!form.location.trim()) e.location = 'Location is required.';
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-100 dark:bg-amber-950/60 rounded-xl flex items-center justify-center text-amber-600 font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Register Infrastructure Asset</h2>
              <p className="text-xs text-slate-500">Record a new physical municipal asset and its GIS location.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Asset Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                setErrors({ ...errors, name: '' });
              }}
              placeholder="e.g. Baseline Road Culvert Drainage System"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            {errors.name && <p className="text-[11px] text-rose-500 mt-1">{errors.name}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Asset Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                {ASSET_TYPES.filter((t) => t !== 'All Types').map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Operational Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                {ASSET_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Location Address <span className="text-rose-500">*</span>
            </label>
            <LocationSearchBox
              value={form.location}
              onChange={(val) => {
                setForm((p) => ({ ...p, location: val }));
                setErrors((e) => ({ ...e, location: '' }));
              }}
              onSelect={(shortName, lat, lon) => {
                const nlat = parseFloat(lat);
                const nlon = parseFloat(lon);
                setForm((p) => ({ ...p, location: shortName, latitude: nlat, longitude: nlon }));
                setMapTarget({ lat: nlat, lng: nlon });
              }}
              error={errors.location}
            />
          </div>

          {/* Interactive Map Picker */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Pin GIS Coordinates on Map
            </label>
            <div className="rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden" style={{ height: '180px' }}>
              <APIProvider apiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''}>
                <Map
                  defaultZoom={12}
                  defaultCenter={{ lat: 6.9271, lng: 79.8612 }}
                  mapId="ASSET_REGISTER_MAP"
                  style={{ width: '100%', height: '100%' }}
                  onClick={(e) => {
                    const lat = e.detail.latLng?.lat;
                    const lng = e.detail.latLng?.lng;
                    if (lat !== undefined && lng !== undefined) {
                      setForm((prev) => ({
                        ...prev,
                        latitude: parseFloat(lat.toFixed(6)),
                        longitude: parseFloat(lng.toFixed(6)),
                      }));
                      setMapTarget(null);
                    }
                  }}
                >
                  <MapPanner target={mapTarget} />
                  {form.latitude && form.longitude && (
                    <AdvancedMarker
                      position={{ lat: form.latitude, lng: form.longitude }}
                      title="Pinned Asset Location"
                    >
                      <div className="w-5 h-5 rounded-full bg-amber-500 border-2 border-white shadow-lg" />
                    </AdvancedMarker>
                  )}
                </Map>
              </APIProvider>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Coordinates: Lat <strong>{form.latitude}</strong>, Lng <strong>{form.longitude}</strong>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Installation Date
              </label>
              <input
                type="date"
                value={form.installationDate || ''}
                onChange={(e) => setForm({ ...form, installationDate: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Custom Asset ID (Optional)
              </label>
              <input
                type="text"
                value={form.id || ''}
                onChange={(e) => setForm({ ...form, id: e.target.value })}
                placeholder="Leave blank for auto AST-xxx"
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description &amp; Specifications
            </label>
            <textarea
              rows={2}
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Engineering specifications, materials, capacity, or manufacturer notes..."
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
              className="flex-1 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold transition-all shadow-xs"
            >
              {submitting ? 'Registering...' : 'Register Asset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── EDIT ASSET MODAL COMPONENT ───────────────────────────────────────────────

function EditAssetModal({
  asset,
  onClose,
  onSubmit,
}: {
  asset: InfrastructureAsset;
  onClose: () => void;
  onSubmit: (dto: UpdateAssetDto) => Promise<void>;
}) {
  const [form, setForm] = useState<UpdateAssetDto>({
    name: asset.name,
    type: asset.type,
    status: asset.status,
    location: asset.location,
    installationDate: asset.installationDate
      ? new Date(asset.installationDate).toISOString().split('T')[0]
      : '',
    latitude: asset.latitude,
    longitude: asset.longitude,
    description: asset.description || '',
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-950/60 rounded-xl flex items-center justify-center text-blue-600 font-bold">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Edit Asset #{asset.id}</h2>
              <p className="text-xs text-slate-500">Update asset metadata, status, and physical location.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Asset Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Asset Type
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                {ASSET_TYPES.filter((t) => t !== 'All Types').map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Operational Status
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                {ASSET_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Location Address
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
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Installation Date
            </label>
            <input
              type="date"
              value={form.installationDate || ''}
              onChange={(e) => setForm({ ...form, installationDate: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={form.description || ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
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

// ─── INSPECTION MODAL COMPONENT ───────────────────────────────────────────────

function InspectionModal({
  asset,
  onClose,
  onSubmit,
}: {
  asset: InfrastructureAsset;
  onClose: () => void;
  onSubmit: (dto: CreateInspectionDto) => Promise<void>;
}) {
  const [form, setForm] = useState<CreateInspectionDto>({
    inspectionDate: new Date().toISOString().split('T')[0],
    condition: 'Good',
    issuesFound: '',
    notes: '',
    inspectorName: authService.getCurrentUser()?.fullName || 'Municipal Engineer',
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
            <div className="w-9 h-9 bg-violet-100 dark:bg-violet-950/60 rounded-xl flex items-center justify-center text-violet-600 font-bold">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Record Condition Inspection</h2>
              <p className="text-xs text-slate-500">
                Asset: <span className="font-semibold text-slate-700 dark:text-slate-300">{asset.id} - {asset.name}</span>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Observed Physical Condition <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONDITIONS.map((cond) => {
                const selected = form.condition === cond;
                const meta = CONDITION_META[cond];
                return (
                  <button
                    type="button"
                    key={cond}
                    onClick={() => setForm({ ...form, condition: cond })}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selected
                        ? `${meta.ring} border-amber-500 shadow-xs font-bold`
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                      <span className={`text-xs ${selected ? meta.text : 'text-slate-700 dark:text-slate-300'}`}>
                        {cond}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Inspection Date
              </label>
              <input
                type="date"
                value={form.inspectionDate}
                onChange={(e) => setForm({ ...form, inspectionDate: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Inspector Name
              </label>
              <input
                type="text"
                value={form.inspectorName || ''}
                onChange={(e) => setForm({ ...form, inspectorName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Issues or Deficiencies Found
            </label>
            <input
              type="text"
              value={form.issuesFound || ''}
              onChange={(e) => setForm({ ...form, issuesFound: e.target.value })}
              placeholder="e.g. Concrete spalling, rust on structural flanges"
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Inspector Notes &amp; Recommendations
            </label>
            <textarea
              rows={3}
              value={form.notes || ''}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Detailed findings and recommended maintenance action..."
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
              className="flex-1 py-2 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-xs"
            >
              {submitting ? 'Saving...' : 'Save Inspection'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── ASSET DETAILS & REPAIR HISTORY MODAL COMPONENT ───────────────────────────

function AssetDetailsModal({
  asset,
  onClose,
  onEdit,
  onInspect,
}: {
  asset: InfrastructureAsset;
  onClose: () => void;
  onEdit: () => void;
  onInspect: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'details' | 'repairs'>('details');
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [assignments, setAssignments] = useState<WorkAssignment[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchRepairs = async () => {
      try {
        setLoadingHistory(true);
        const [mRecs, wAssignments] = await Promise.all([
          maintenanceService.getByAssetId(asset.id).catch(() => []),
          contractorService.getAssignments({ assetId: asset.id }).catch(() => []),
        ]);
        setMaintenanceRecords(mRecs);
        setAssignments(wAssignments);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchRepairs();
  }, [asset.id]);

  const condition = asset.latestCondition || 'Good';
  const meta = CONDITION_META[condition];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-950/60 rounded-xl flex items-center justify-center text-amber-600 font-bold">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-400">#{asset.id}</span>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{asset.name}</h2>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {asset.type} Asset • {asset.location}
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

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-6 bg-white dark:bg-slate-900 flex-shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'details'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Asset Health &amp; Condition</span>
          </button>
          <button
            onClick={() => setActiveTab('repairs')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'repairs'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>
              Repair History ({maintenanceRecords.length + assignments.length})
            </span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'details' ? (
            <>
              {/* Condition Banner */}
              <div
                className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                  condition === 'Critical'
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200'
                    : condition === 'Poor'
                    ? 'bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-900 text-orange-800 dark:text-orange-200'
                    : condition === 'Moderate'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200'
                    : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200'
                }`}
              >
                <ShieldAlert className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">Condition: {condition}</span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-white/60 dark:bg-black/40">
                      {asset.status}
                    </span>
                  </div>
                  <p className="text-xs opacity-90">{meta?.desc}</p>
                </div>
              </div>

              {/* Asset Technical Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Installation Age</span>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    {calculateAge(asset.installationDate)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {asset.installationDate
                      ? new Date(asset.installationDate).toLocaleDateString()
                      : 'Unknown date'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Inspections</span>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    {asset.inspections?.length || 0} recorded
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Last: {asset.lastInspectedDate ? new Date(asset.lastInspectedDate).toLocaleDateString() : 'Never'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">GIS Coordinates</span>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    {asset.latitude.toFixed(4)}, {asset.longitude.toFixed(4)}
                  </div>
                  <div className="text-[10px] text-slate-400">GPS Pinned</div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Asset Type</span>
                  <div className="text-xs font-bold text-slate-900 dark:text-white mt-0.5">
                    {asset.type}
                  </div>
                  <div className="text-[10px] text-slate-400">Municipal Infra</div>
                </div>
              </div>

              {asset.description && (
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Specifications &amp; Details</h4>
                  <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    {asset.description}
                  </p>
                </div>
              )}

              {/* Inspection History Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardCheck className="w-4 h-4 text-violet-500" />
                    <span>Physical Condition Inspection History ({asset.inspections?.length || 0})</span>
                  </h4>
                  <button
                    onClick={onInspect}
                    className="text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                  >
                    + Record Inspection
                  </button>
                </div>

                {!asset.inspections || asset.inspections.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    No physical inspections recorded yet. Click &quot;Record Inspection&quot; to log current health.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {asset.inspections.map((ins, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${conditionBadge(
                              ins.condition
                            )}`}
                          >
                            <span>{ins.condition}</span>
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(ins.inspectionDate).toLocaleDateString()}
                          </span>
                        </div>

                        {ins.issuesFound && (
                          <div className="text-xs text-rose-600 dark:text-rose-400 font-semibold">
                            Deficiencies: {ins.issuesFound}
                          </div>
                        )}

                        {ins.notes && (
                          <p className="text-xs text-slate-600 dark:text-slate-400">{ins.notes}</p>
                        )}

                        {ins.inspectorName && (
                          <div className="text-[10px] text-slate-400">
                            Inspected by: <span className="font-semibold text-slate-600 dark:text-slate-300">{ins.inspectorName}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* ─── REPAIR & MAINTENANCE HISTORY TAB ─── */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-amber-500" />
                  <span>Physical Repairs, Work Orders &amp; Maintenance Executions</span>
                </h4>
              </div>

              {loadingHistory ? (
                <div className="p-10 text-center text-xs text-slate-400">
                  <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Loading asset repair history...
                </div>
              ) : maintenanceRecords.length === 0 && assignments.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-1">
                  <Wrench className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-700 mb-1" />
                  <div className="font-semibold text-slate-600 dark:text-slate-300">No repair jobs on record</div>
                  <div>This asset has not yet undergone maintenance dispatches or corrective repairs.</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Field Operations & Maintenance Records */}
                  {maintenanceRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-teal-600">
                              {rec.workOrderNumber || `Record #${rec.id.slice(0, 8)}`}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                              {rec.maintenanceType}
                            </span>
                          </div>
                          <h5 className="font-bold text-xs text-slate-900 dark:text-white mt-1">
                            {rec.workOrderTitle || rec.description}
                          </h5>
                        </div>

                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            rec.status === 'VERIFIED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : rec.status === 'COMPLETED'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {rec.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Crew</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {rec.assignedCrew || rec.performedBy}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Hours Logged</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {rec.labourHours} hrs
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Actual Cost</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            Rs. {rec.actualCost.toLocaleString('en-LK')}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Recorded</span>
                          <span>{new Date(rec.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Contractor Work Assignments */}
                  {assignments.map((asgn) => (
                    <div
                      key={asgn.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Contractor Job
                          </span>
                          <span className="font-bold text-xs text-slate-900 dark:text-white">
                            {asgn.contractorName || `Contractor #${asgn.contractorId}`}
                          </span>
                        </div>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {asgn.status}
                        </span>
                      </div>

                      {asgn.notes && <p className="text-xs text-slate-500">{asgn.notes}</p>}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Due Date: {new Date(asgn.dueDate).toLocaleDateString()}</span>
                        {asgn.estimatedCost && (
                          <span>Est: Rs. {Number(asgn.estimatedCost).toLocaleString('en-LK')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            onClick={onEdit}
            className="py-2 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Edit Asset
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={onInspect}
              className="py-2 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>Record Inspection</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
