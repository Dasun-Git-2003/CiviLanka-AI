import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Activity, AlertTriangle, MapPin,
  Navigation, X, Loader2, ExternalLink, RefreshCw,
  Building2, Eye, Camera, ShieldAlert, Sparkles, Search, Copy, Check
} from 'lucide-react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMapsLibrary,
  useMap,
} from '@vis.gl/react-google-maps';
import { apiClient, getErrorMessage } from '../services/apiService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MarkerPointType = 'hazard' | 'asset';

export interface MapMarkerItem {
  id: string;
  pointType: MarkerPointType;
  lat: number;
  lng: number;
  title: string;
  category?: string;
  status?: string;
  severity?: string;
  riskLevel?: string;
  priority?: string;
  ticketNumber?: string;
  address?: string;
  description?: string;
  imageUrl?: string;
  condition: 'poor' | 'fair' | 'good';
  createdAt?: string;
  assetType?: string;
}

interface HazardApiDto {
  id: string;
  ticketNumber: string;
  citizenId?: string;
  citizenName?: string;
  category: string;
  description: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  imageUrl?: string;
  status: string;
  severity?: string;
  riskLevel?: string;
  priority?: string;
  createdAt: string;
}

interface AssetApiDto {
  id: string;
  name: string;
  type: string;
  status: string;
  location: string;
  latitude: number;
  longitude: number;
  description?: string;
  latestCondition?: string;
}

type LiveLocation = { lat: number; lng: number } | null;

// ─── Directions Renderer ──────────────────────────────────────────────────────

function DirectionsLayer({
  origin,
  destination,
  onResult,
}: {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  onResult: (info: { distance: string; duration: string } | null, error: string | null) => void;
}) {
  const map = useMap();
  const routesLib = useMapsLibrary('routes');
  const rendererRef = useRef<google.maps.DirectionsRenderer | null>(null);

  // Create renderer once
  useEffect(() => {
    if (!routesLib || !map) return;
    const renderer = new routesLib.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: {
        strokeColor: '#2563EB',
        strokeWeight: 5,
        strokeOpacity: 0.9,
      },
    });
    renderer.setMap(map);
    rendererRef.current = renderer;
    return () => {
      renderer.setMap(null);
      rendererRef.current = null;
    };
  }, [routesLib, map]);

  // Compute route
  useEffect(() => {
    if (!routesLib || !rendererRef.current) return;

    const service = new routesLib.DirectionsService();
    service.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          rendererRef.current!.setDirections(result);
          const leg = result.routes[0]?.legs[0];
          onResult(
            leg ? { distance: leg.distance?.text ?? '', duration: leg.duration?.text ?? '' } : null,
            null
          );
        } else {
          console.error('[Directions] Failed:', status);
          onResult(null, status);
        }
      }
    );
  }, [routesLib, origin, destination, onResult]);

  return null;
}

// ─── Live Location Dot ────────────────────────────────────────────────────────

function LiveDot() {
  return (
    <div className="relative flex items-center justify-center">
      <span className="absolute w-10 h-10 rounded-full bg-blue-400 opacity-30 animate-ping" />
      <span className="w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg block" />
    </div>
  );
}

// ─── Map Inner ────────────────────────────────────────────────────────────────

function MapInner({
  markers,
  liveLocation,
  locationError,
  selectedMarker,
  onMarkerSelect,
  routeTarget,
  onRouteResult,
  focusTarget,
}: {
  markers: MapMarkerItem[];
  liveLocation: LiveLocation;
  locationError: string | null;
  selectedMarker: MapMarkerItem | null;
  onMarkerSelect: (marker: MapMarkerItem | null) => void;
  routeTarget: MapMarkerItem | null;
  onRouteResult: (info: { distance: string; duration: string } | null, error: string | null) => void;
  focusTarget: { lat: number; lng: number } | null;
}) {
  const map = useMap();

  // Smooth pan to focused pin when changed
  useEffect(() => {
    if (!map || !focusTarget) return;
    map.panTo(focusTarget);
    map.setZoom(15);
  }, [map, focusTarget]);

  const handleMarkerClick = useCallback(
    (item: MapMarkerItem) => {
      onMarkerSelect(item);
    },
    [onMarkerSelect]
  );

  return (
    <Map
      defaultZoom={13}
      defaultCenter={{ lat: 6.9271, lng: 79.8612 }}
      mapId="DEMO_MAP_ID"
      style={{ width: '100%', height: '100%' }}
      onClick={() => onMarkerSelect(null)}
    >
      {/* Live location of current user */}
      {liveLocation && (
        <AdvancedMarker position={liveLocation} title="Your live location" zIndex={30}>
          <LiveDot />
        </AdvancedMarker>
      )}

      {/* Markers (Citizen Hazards & Municipal Assets) */}
      {markers.map((item) => {
        const isSelected = selectedMarker?.id === item.id;
        const isHazard = item.pointType === 'hazard';

        // Choose color based on condition and type
        const bgColor = isHazard
          ? item.condition === 'poor'
            ? '#DC2626' // Red: Critical / High
            : item.condition === 'fair'
            ? '#D97706' // Amber: Medium
            : '#059669' // Emerald: Low / Resolved
          : item.condition === 'poor'
          ? '#EF4444'
          : item.condition === 'fair'
          ? '#F59E0B'
          : '#10B981';

        const scale = isSelected ? 1.35 : isHazard ? 1.1 : 0.95;
        const zIndex = isSelected ? 25 : isHazard ? 15 : 5;

        return (
          <AdvancedMarker
            key={`${item.pointType}-${item.id}`}
            position={{ lat: item.lat, lng: item.lng }}
            title={item.title}
            zIndex={zIndex}
            onClick={() => handleMarkerClick(item)}
          >
            <div className="relative group cursor-pointer">
              {/* Highlight halo for selected pin */}
              {isSelected && (
                <span className="absolute -inset-1 rounded-full bg-blue-500/30 animate-ping pointer-events-none" />
              )}
              <Pin
                background={bgColor}
                borderColor="#FFFFFF"
                glyphColor="#FFFFFF"
                scale={scale}
              />
              {/* Urgent hazard badge */}
              {isHazard && item.condition === 'poor' && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center text-[9px] font-black text-slate-900 shadow-sm">
                  !
                </span>
              )}
            </div>
          </AdvancedMarker>
        );
      })}

      {/* Directions polyline */}
      {routeTarget && liveLocation && (
        <DirectionsLayer
          origin={liveLocation}
          destination={{ lat: routeTarget.lat, lng: routeTarget.lng }}
          onResult={onRouteResult}
        />
      )}

      {/* Location error banner */}
      {locationError && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2 rounded-full shadow-md pointer-events-none whitespace-nowrap flex items-center gap-2">
          <MapPin className="w-3.5 h-3.5 text-amber-600" />
          <span>{locationError} — live location required for interactive map directions</span>
        </div>
      )}
    </Map>
  );
}

// ─── Category Formatter Helper ────────────────────────────────────────────────

function formatCategory(cat?: string): string {
  if (!cat) return 'Municipal Hazard';
  return cat.replace(/([A-Z])/g, ' $1').trim();
}

// ─── Default Fallback Assets (Colombo Infrastructure) ─────────────────────────

const DEFAULT_FALLBACK_ASSETS: AssetApiDto[] = [
  { id: 'AST-001', name: 'Main St Water Pipe', type: 'Water', status: 'Active', location: 'Downtown, Colombo', latitude: 6.9271, longitude: 79.8612, latestCondition: 'Poor', description: 'Primary water supply pipe running along Main Street.' },
  { id: 'AST-002', name: 'Oak Ave Streetlight Grid', type: 'Electrical', status: 'Active', location: 'Fort, Colombo', latitude: 6.9310, longitude: 79.8450, latestCondition: 'Good', description: 'LED smart streetlight array connected to central grid.' },
  { id: 'AST-003', name: 'Central Park Pathway', type: 'Road', status: 'Active', location: 'Cinnamon Gardens', latitude: 6.9050, longitude: 79.8510, latestCondition: 'Fair', description: 'Pedestrian and cycle pathway requiring resurfacing.' },
  { id: 'AST-004', name: 'Galle Rd Bridge Viaduct', type: 'Bridge', status: 'Under Inspection', location: 'Kollupitiya', latitude: 6.9180, longitude: 79.8580, latestCondition: 'Poor', description: 'Expansion joints wear detected during routine structural analysis.' },
  { id: 'AST-005', name: 'Negombo Rd Storm Drain', type: 'Drainage', status: 'Active', location: 'Peliyagoda', latitude: 6.9400, longitude: 79.8530, latestCondition: 'Fair', description: 'High capacity culvert for monsoon flood mitigation.' },
];

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [searchParams] = useSearchParams();
  const focusParam = searchParams.get('focus') || searchParams.get('id');

  // Markers state
  const [hazards, setHazards] = useState<HazardApiDto[]>([]);
  const [assets, setAssets] = useState<AssetApiDto[]>(DEFAULT_FALLBACK_ASSETS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Filtering states
  const [layerFilter, setLayerFilter] = useState<'all' | 'hazard' | 'asset'>('all');
  const [conditionFilter, setConditionFilter] = useState<'all' | 'poor' | 'fair' | 'good'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected marker & focus
  const [selectedMarker, setSelectedMarker] = useState<MapMarkerItem | null>(null);
  const [focusTarget, setFocusTarget] = useState<{ lat: number; lng: number } | null>(null);
  const [copiedCoords, setCopiedCoords] = useState(false);

  // Lightbox for photo evidence
  const [activeLightboxImg, setActiveLightboxImg] = useState<string | null>(null);

  // Routing state
  const [routeTarget, setRouteTarget] = useState<MapMarkerItem | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance: string; duration: string } | null>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Live Location
  const [liveLocation, setLiveLocation] = useState<LiveLocation>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const mapApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  // ── 1. Fetch Hazards & Assets from Backend ──────────────────────────────────
  const fetchMapData = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    else setLoading(true);
    setFetchError(null);

    try {
      // 1. Fetch live hazards for map
      const hazardPromise = apiClient
        .get<HazardApiDto[]>('/api/hazards/map')
        .then((res) => res.data)
        .catch((err) => {
          console.warn('[Dashboard] Hazards map fetch warning:', err);
          return [] as HazardApiDto[];
        });

      // 2. Fetch assets
      const assetPromise = apiClient
        .get<AssetApiDto[]>('/api/assets')
        .then((res) => (res.data && res.data.length > 0 ? res.data : DEFAULT_FALLBACK_ASSETS))
        .catch((err) => {
          console.warn('[Dashboard] Assets fetch warning, using defaults:', err);
          return DEFAULT_FALLBACK_ASSETS;
        });

      const [hazardData, assetData] = await Promise.all([hazardPromise, assetPromise]);
      setHazards(hazardData);
      setAssets(assetData);
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (err) {
      setFetchError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  // ── 2. Unified Markers List ────────────────────────────────────────────────
  const allMarkers = useMemo<MapMarkerItem[]>(() => {
    const list: MapMarkerItem[] = [];

    // Map hazard reports
    hazards.forEach((h) => {
      if (typeof h.latitude === 'number' && typeof h.longitude === 'number') {
        const sev = (h.severity || '').toUpperCase();
        const stat = (h.status || '').toLowerCase();
        const isResolved = stat === 'resolved' || stat === 'closed';

        let condition: 'poor' | 'fair' | 'good' = 'fair';
        if (isResolved) {
          condition = 'good';
        } else if (sev === 'CRITICAL' || sev === 'HIGH') {
          condition = 'poor';
        } else if (sev === 'LOW') {
          condition = 'good';
        } else {
          condition = 'fair';
        }

        list.push({
          id: h.id,
          pointType: 'hazard',
          lat: h.latitude,
          lng: h.longitude,
          title: `${h.ticketNumber} — ${formatCategory(h.category)}`,
          category: h.category,
          status: h.status,
          severity: h.severity || 'MEDIUM',
          riskLevel: h.riskLevel,
          priority: h.priority,
          ticketNumber: h.ticketNumber,
          address: h.address,
          description: h.description,
          imageUrl: h.imageUrl,
          condition,
          createdAt: h.createdAt,
        });
      }
    });

    // Map infrastructure assets
    assets.forEach((a) => {
      if (typeof a.latitude === 'number' && typeof a.longitude === 'number') {
        const cond = (a.latestCondition || '').toLowerCase();
        const condition: 'poor' | 'fair' | 'good' =
          cond === 'poor' ? 'poor' : cond === 'fair' ? 'fair' : 'good';

        list.push({
          id: a.id,
          pointType: 'asset',
          lat: a.latitude,
          lng: a.longitude,
          title: a.name,
          address: a.location,
          description: a.description,
          condition,
          assetType: a.type,
          status: a.status,
        });
      }
    });

    return list;
  }, [hazards, assets]);

  // ── 3. Handle Direct URL Focus (?focus=CG-2026-...) ─────────────────────────
  useEffect(() => {
    if (!focusParam || allMarkers.length === 0) return;

    const query = focusParam.trim().toLowerCase();
    const found = allMarkers.find(
      (m) =>
        m.ticketNumber?.toLowerCase() === query ||
        m.id.toLowerCase() === query ||
        m.title.toLowerCase().includes(query)
    );

    if (found) {
      setSelectedMarker(found);
      setFocusTarget({ lat: found.lat, lng: found.lng });
    }
  }, [focusParam, allMarkers]);

  // ── 4. Filtered Markers ────────────────────────────────────────────────────
  const filteredMarkers = useMemo(() => {
    return allMarkers.filter((m) => {
      // Layer filter
      if (layerFilter !== 'all' && m.pointType !== layerFilter) return false;

      // Condition filter
      if (conditionFilter !== 'all' && m.condition !== conditionFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTicket = m.ticketNumber?.toLowerCase().includes(q);
        const matchesTitle = m.title.toLowerCase().includes(q);
        const matchesCategory = m.category?.toLowerCase().includes(q);
        const matchesAddress = m.address?.toLowerCase().includes(q);
        const matchesDesc = m.description?.toLowerCase().includes(q);
        return matchesTicket || matchesTitle || matchesCategory || matchesAddress || matchesDesc;
      }

      return true;
    });
  }, [allMarkers, layerFilter, conditionFilter, searchQuery]);

  // ── 5. User Geolocation ────────────────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by browser');
      return;
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(null);
      },
      (err) => {
        setLocationError(
          err.code === err.PERMISSION_DENIED ? 'Location access denied' : 'Unable to get GPS location'
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, []);

  // ── 6. Routing Handlers ───────────────────────────────────────────────────
  const handleMarkerSelect = useCallback((item: MapMarkerItem | null) => {
    setSelectedMarker(item);
    if (item) {
      setFocusTarget({ lat: item.lat, lng: item.lng });
    }
  }, []);

  const handleGetDirections = () => {
    if (!selectedMarker) return;
    setRouteTarget(selectedMarker);
    setRouteInfo(null);
    setRouteError(null);
    setRouteLoading(true);
  };

  const handleRouteResult = useCallback(
    (info: { distance: string; duration: string } | null, error: string | null) => {
      setRouteLoading(false);
      setRouteInfo(info);
      setRouteError(error);
    },
    []
  );

  const clearRoute = () => {
    setRouteTarget(null);
    setRouteInfo(null);
    setRouteError(null);
    setRouteLoading(false);
  };

  // Google Maps External URL
  const googleMapsUrl = (m: MapMarkerItem) => {
    const dest = `${m.lat},${m.lng}`;
    if (liveLocation) {
      return `https://www.google.com/maps/dir/${liveLocation.lat},${liveLocation.lng}/${dest}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${dest}`;
  };

  const copyCoordinates = (lat: number, lng: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  // ── 7. Statistics Counters ────────────────────────────────────────────────
  const totalHazardCount = hazards.length;
  const criticalHazardCount = hazards.filter(
    (h) => (h.severity || '').toUpperCase() === 'CRITICAL' || (h.severity || '').toUpperCase() === 'HIGH'
  ).length;
  const totalAssetCount = assets.length;
  const repairNeededCount = allMarkers.filter((m) => m.condition === 'poor').length;

  return (
    <div className="space-y-6">
      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">City GIS Infrastructure Map</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live GIS
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">
            Real-time interactive map plotting active citizen hazard reports and municipal infrastructure assets.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchMapData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
            title="Refresh map pins with latest database records"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh Pins'}</span>
            {lastUpdated && <span className="text-[10px] text-slate-400 font-normal">({lastUpdated})</span>}
          </button>

          <Link
            to="/citizen"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold transition-all shadow-xs"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Report Hazard</span>
          </Link>
        </div>
      </div>

      {/* ── Metric Summary Cards ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{allMarkers.length}</div>
            <div className="text-xs font-medium text-slate-500">Total Active Map Pins</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-cyan-50 border border-cyan-100 flex items-center justify-center text-cyan-700 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{totalHazardCount}</div>
            <div className="text-xs font-medium text-slate-500">Citizen Hazard Reports</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{criticalHazardCount}</div>
            <div className="text-xs font-medium text-slate-500">Critical / Urgent Hazards</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 shadow-xs">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900">{repairNeededCount}</div>
            <div className="text-xs font-medium text-slate-500">Repair Attention Needed</div>
          </div>
        </div>
      </div>

      {/* ── Error Banner if API Fails ────────────────────────────────────────── */}
      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Failed to load live pins: {fetchError}</span>
          </div>
          <button
            onClick={() => fetchMapData(true)}
            className="px-3 py-1 bg-white border border-red-200 rounded-lg text-red-700 hover:bg-red-50 font-semibold"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Main Map Card & Inspector Panel ─────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
        {/* Layer Filters & Search Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-100">
          {/* Layer Selector Chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Layer:</span>
            <button
              onClick={() => setLayerFilter('all')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                layerFilter === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}
            >
              <span>All Pins</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${layerFilter === 'all' ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                {allMarkers.length}
              </span>
            </button>

            <button
              onClick={() => setLayerFilter('hazard')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                layerFilter === 'hazard'
                  ? 'bg-cyan-700 text-white border-cyan-700 shadow-xs'
                  : 'bg-white text-cyan-800 border-cyan-200 hover:border-cyan-400'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Citizen Reports</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${layerFilter === 'hazard' ? 'bg-white/20' : 'bg-cyan-50 text-cyan-800'}`}>
                {totalHazardCount}
              </span>
            </button>

            <button
              onClick={() => setLayerFilter('asset')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                layerFilter === 'asset'
                  ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                  : 'bg-white text-blue-700 border-blue-200 hover:border-blue-400'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Assets Registry</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${layerFilter === 'asset' ? 'bg-white/20' : 'bg-blue-50 text-blue-700'}`}>
                {totalAssetCount}
              </span>
            </button>
          </div>

          {/* Condition / Urgency Chips & Search */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-1">Condition:</span>
            {([
              { key: 'all',  label: 'All',           dot: 'bg-slate-400',   color: 'text-slate-700' },
              { key: 'poor', label: 'Critical / Poor', dot: 'bg-red-500',    color: 'text-red-700' },
              { key: 'fair', label: 'Moderate',      dot: 'bg-amber-400',  color: 'text-amber-700' },
              { key: 'good', label: 'Good / Safe',   dot: 'bg-emerald-500', color: 'text-emerald-700' },
            ] as const).map((c) => (
              <button
                key={c.key}
                onClick={() => setConditionFilter(c.key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${
                  conditionFilter === c.key
                    ? 'bg-slate-100 border-slate-400 text-slate-900 font-bold shadow-2xs'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                {c.label}
              </button>
            ))}

            {/* Quick Search */}
            <div className="relative ml-auto sm:ml-2">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search pins or tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-52"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Showing Count Indicator */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-2">
            <span>
              Showing <strong>{filteredMarkers.length}</strong> of {allMarkers.length} markers on Colombo map
            </span>
            {focusParam && (
              <span className="inline-flex items-center gap-1 text-[11px] bg-cyan-50 border border-cyan-200 text-cyan-800 px-2 py-0.5 rounded-full font-semibold">
                <Sparkles className="w-3 h-3 text-cyan-600" />
                Focused: {focusParam}
              </span>
            )}
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600" /> Urgent Repair / Critical</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Medium / Moderate</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-600" /> Good / Resolved</span>
          </div>
        </div>

        {/* ── Map Canvas & Inspector Panel Grid ────────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Map Container */}
          <div className="flex-1 rounded-2xl border border-slate-200 overflow-hidden relative shadow-inner" style={{ height: '560px' }}>
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
                <p className="text-sm font-semibold text-slate-700">Loading live Colombo GIS map coordinates...</p>
                <p className="text-xs text-slate-400">Fetching citizen reports and municipal asset pins</p>
              </div>
            ) : mapApiKey ? (
              <APIProvider apiKey={mapApiKey}>
                <MapInner
                  markers={filteredMarkers}
                  liveLocation={liveLocation}
                  locationError={locationError}
                  selectedMarker={selectedMarker}
                  onMarkerSelect={handleMarkerSelect}
                  routeTarget={routeTarget}
                  onRouteResult={handleRouteResult}
                  focusTarget={focusTarget}
                />
              </APIProvider>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 p-6 text-center">
                <MapPin className="w-12 h-12 text-slate-400 mb-3" />
                <h3 className="font-semibold text-slate-700 text-lg mb-1">Google Maps API Key Required</h3>
                <p className="max-w-md text-sm">
                  Add <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">VITE_GOOGLE_MAPS_API_KEY</code> to your <code className="bg-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">.env</code> file to enable Google Maps tiles.
                </p>
              </div>
            )}
          </div>

          {/* Side Panel / Marker Inspector */}
          <div className="w-full lg:w-80 flex flex-col gap-3">
            {/* Empty Selection Prompt */}
            {!selectedMarker && !routeTarget && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 text-slate-400 space-y-3 min-h-[300px]">
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-2xs text-cyan-600">
                  <MapPin className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700">Select any Map Marker</p>
                  <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
                    Click a pin on the map to inspect citizen hazard reports, attached photographic evidence, triage status, and generate driving navigation.
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-200 w-full text-left space-y-1.5 text-[11px] text-slate-500">
                  <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">Quick Tips:</div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Red pins indicate critical or urgent road hazards.</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-600" />
                    <span>Newly reported citizen tickets appear instantly.</span>
                  </div>
                </div>
              </div>
            )}

            {/* Selected Marker Details Card */}
            {selectedMarker && !routeTarget && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white animate-in fade-in">
                {/* Header with Type & Status */}
                <div className={`${selectedMarker.pointType === 'hazard' ? 'bg-cyan-900' : 'bg-slate-900'} px-4 py-3.5 text-white`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {selectedMarker.pointType === 'hazard' ? (
                        <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0" />
                      ) : (
                        <Building2 className="w-4 h-4 text-blue-400 shrink-0" />
                      )}
                      <span className="font-mono text-xs font-bold text-cyan-200">
                        {selectedMarker.ticketNumber || selectedMarker.id}
                      </span>
                    </div>
                    <button
                      onClick={() => setSelectedMarker(null)}
                      className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-sm font-bold text-white mt-1 line-clamp-1">{selectedMarker.title}</p>
                </div>

                {/* Body Details */}
                <div className="p-4 space-y-3.5 max-h-[460px] overflow-y-auto">
                  {/* Badges row */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {selectedMarker.severity && (
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        selectedMarker.severity === 'CRITICAL' || selectedMarker.severity === 'HIGH'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : selectedMarker.severity === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {selectedMarker.severity} Severity
                      </span>
                    )}
                    {selectedMarker.status && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {selectedMarker.status}
                      </span>
                    )}
                    {selectedMarker.pointType === 'hazard' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
                        Citizen Submission
                      </span>
                    )}
                  </div>

                  {/* Photographic Evidence */}
                  {selectedMarker.imageUrl && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                        <Camera className="w-3.5 h-3.5 text-cyan-600" />
                        <span>Photographic Evidence</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {selectedMarker.imageUrl
                          .split(',')
                          .filter(Boolean)
                          .map((imgUrl, i) => {
                            const cleanUrl = imgUrl.trim();
                            const resolvedUrl = cleanUrl.startsWith('http')
                              ? cleanUrl
                              : `http://localhost:5000${cleanUrl}`;

                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => setActiveLightboxImg(resolvedUrl)}
                                className="group relative h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-2xs hover:border-cyan-500 transition-all cursor-zoom-in"
                              >
                                <img
                                  src={resolvedUrl}
                                  alt="Report Photo"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye className="w-4 h-4" />
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {selectedMarker.description && (
                    <div className="space-y-0.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</div>
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                        {selectedMarker.description}
                      </p>
                    </div>
                  )}

                  {/* Address & GPS */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</div>
                    {selectedMarker.address && (
                      <p className="text-xs text-slate-700 font-medium line-clamp-2">
                        {selectedMarker.address}
                      </p>
                    )}
                    <div className="flex items-center justify-between text-xs font-mono text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                      <span>{selectedMarker.lat.toFixed(5)}° N, {selectedMarker.lng.toFixed(5)}° E</span>
                      <button
                        onClick={() => copyCoordinates(selectedMarker.lat, selectedMarker.lng)}
                        className="text-slate-400 hover:text-slate-700 inline-flex items-center gap-1"
                        title="Copy coordinates"
                      >
                        {copiedCoords ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 space-y-2">
                    <a
                      href={googleMapsUrl(selectedMarker)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-xs"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Navigate via Google Maps</span>
                      <ExternalLink className="w-3 h-3 text-blue-200 ml-0.5" />
                    </a>

                    <button
                      onClick={handleGetDirections}
                      disabled={!liveLocation}
                      className="w-full flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all"
                    >
                      <Navigation className="w-3.5 h-3.5 text-blue-600" />
                      <span>Calculate In-App Route</span>
                    </button>

                    {!liveLocation && (
                      <p className="text-[10px] text-slate-400 text-center">
                        Enable browser GPS location to calculate live route.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Active Route Details Card */}
            {routeTarget && (
              <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm bg-white animate-in fade-in">
                <div className="bg-blue-600 px-4 py-3 flex items-center justify-between text-white">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-white" />
                    <p className="font-bold text-xs uppercase tracking-wider">Driving Directions</p>
                  </div>
                  <button onClick={clearRoute} className="p-1 text-blue-200 hover:text-white rounded-lg transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="text-xs text-slate-500">
                    <div className="font-semibold text-slate-700 mb-0.5">Target Destination:</div>
                    <div className="font-bold text-slate-900 line-clamp-1">{routeTarget.title}</div>
                  </div>

                  {routeLoading && (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Calculating optimal driving route...</span>
                    </div>
                  )}

                  {routeInfo && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Distance</div>
                        <div className="text-base font-extrabold text-slate-900">{routeInfo.distance}</div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                        <div className="text-[10px] uppercase font-bold text-blue-600 mb-0.5">Est. Time</div>
                        <div className="text-base font-extrabold text-blue-700">{routeInfo.duration}</div>
                      </div>
                    </div>
                  )}

                  {routeError && (
                    <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
                      <p className="font-bold">Directions Error ({routeError})</p>
                      <p className="text-[11px] text-red-600">
                        Ensure Google Cloud Directions API is enabled on your API key.
                      </p>
                    </div>
                  )}

                  <a
                    href={googleMapsUrl(routeTarget)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Google Maps App</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Photo Lightbox Modal ────────────────────────────────────────────── */}
      {activeLightboxImg && (
        <div
          onClick={() => setActiveLightboxImg(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[85vh] bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-2xl flex flex-col"
          >
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between text-xs font-bold">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Hazard Photographic Evidence</span>
              </div>
              <button
                onClick={() => setActiveLightboxImg(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-2 bg-slate-100 flex items-center justify-center overflow-auto max-h-[75vh]">
              <img
                src={activeLightboxImg}
                alt="Enlarged Hazard Evidence"
                className="max-h-[70vh] max-w-full rounded-lg object-contain shadow-md"
              />
            </div>
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-600">
              <span>Captured by citizen and verified on GIS registry</span>
              <a
                href={activeLightboxImg}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-700 hover:underline font-semibold flex items-center gap-1"
              >
                <span>Open Original Image</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
