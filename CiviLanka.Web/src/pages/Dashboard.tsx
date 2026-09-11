import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity, AlertTriangle, CheckCircle, MapPin,
  Navigation, X, Loader2, ExternalLink,
} from 'lucide-react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  useMapsLibrary,
  useMap,
} from '@vis.gl/react-google-maps';

// ─── Types ────────────────────────────────────────────────────────────────────

type AssetPoint = {
  id: number;
  lat: number;
  lng: number;
  title: string;
  condition: 'poor' | 'fair' | 'good';
};

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
    return () => { renderer.setMap(null); rendererRef.current = null; };
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
  assets,
  liveLocation,
  locationError,
  onAssetSelect,
  routeTarget,
  onRouteResult,
}: {
  assets: AssetPoint[];
  liveLocation: LiveLocation;
  locationError: string | null;
  onAssetSelect: (asset: AssetPoint | null) => void;
  routeTarget: AssetPoint | null;
  onRouteResult: (info: { distance: string; duration: string } | null, error: string | null) => void;
}) {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const handleMarkerClick = useCallback(
    (asset: AssetPoint, e: google.maps.MapMouseEvent) => {
      // Prevent bubbling to the Map's onClick
      e.stop?.();
      setSelectedId(asset.id);
      onAssetSelect(asset);
    },
    [onAssetSelect]
  );

  return (
    <Map
      defaultZoom={13}
      defaultCenter={{ lat: 6.9271, lng: 79.8612 }}
      mapId="DEMO_MAP_ID"
      style={{ width: '100%', height: '100%' }}
      onClick={() => { setSelectedId(null); onAssetSelect(null); }}
    >
      {/* Live location */}
      {liveLocation && (
        <AdvancedMarker position={liveLocation} title="Your location" zIndex={10}>
          <LiveDot />
        </AdvancedMarker>
      )}

      {/* Asset markers */}
      {assets.map((asset) => (
        <AdvancedMarker
          key={asset.id}
          position={{ lat: asset.lat, lng: asset.lng }}
          title={asset.title}
          zIndex={selectedId === asset.id ? 5 : 1}
          onClick={(e) => handleMarkerClick(asset, e)}
        >
          <Pin
            background={
              asset.condition === 'poor' ? '#EF4444' :
              asset.condition === 'fair' ? '#F59E0B' : '#10B981'
            }
            borderColor="#ffffff"
            glyphColor="#ffffff"
            scale={selectedId === asset.id ? 1.3 : 1.0}
          />
        </AdvancedMarker>
      ))}

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
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-amber-50 border border-amber-200 text-amber-700 text-xs px-4 py-2 rounded-full shadow pointer-events-none whitespace-nowrap">
          📍 {locationError} — live location required for directions
        </div>
      )}
    </Map>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const stats = [
    { label: 'Total Assets',           value: '1,245', icon: Activity,      color: 'text-blue-600',    bg: 'bg-blue-100'    },
    { label: 'Active Repairs',          value: '42',    icon: AlertTriangle, color: 'text-amber-600',   bg: 'bg-amber-100'   },
    { label: 'Available Contractors',   value: '18',    icon: CheckCircle,   color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];

  const assets: AssetPoint[] = [
    { id: 1, lat: 6.9271, lng: 79.8612, title: 'Main St Water Pipe',    condition: 'poor' },
    { id: 2, lat: 6.9310, lng: 79.8450, title: 'Oak Ave Streetlight',   condition: 'good' },
    { id: 3, lat: 6.9050, lng: 79.8510, title: 'Central Park Pathway',  condition: 'fair' },
    { id: 4, lat: 6.9180, lng: 79.8580, title: 'Galle Rd Bridge',       condition: 'poor' },
    { id: 5, lat: 6.9400, lng: 79.8530, title: 'Negombo Rd Drain',      condition: 'fair' },
  ];

  // Map filter
  const [activeFilter, setActiveFilter] = useState<'all' | 'poor' | 'fair' | 'good'>('all');
  const filteredAssets = activeFilter === 'all'
    ? assets
    : assets.filter((a) => a.condition === activeFilter);

  const mapApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';


  // Live location
  const [liveLocation, setLiveLocation] = useState<LiveLocation>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) { setLocationError('Geolocation not supported'); return; }
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setLiveLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocationError(null);
      },
      (err) => {
        setLocationError(err.code === err.PERMISSION_DENIED ? 'Location access denied' : 'Unable to get location');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
    return () => { if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current); };
  }, []);

  // Selected asset & routing
  const [selectedAsset, setSelectedAsset] = useState<AssetPoint | null>(null);
  const [routeTarget,   setRouteTarget]   = useState<AssetPoint | null>(null);
  const [routeInfo,     setRouteInfo]     = useState<{ distance: string; duration: string } | null>(null);
  const [routeError,    setRouteError]    = useState<string | null>(null);
  const [routeLoading,  setRouteLoading]  = useState(false);

  const handleAssetSelect = useCallback((asset: AssetPoint | null) => {
    setSelectedAsset(asset);
    // Don't clear the route when clicking a new asset
  }, []);

  const handleGetDirections = () => {
    if (!selectedAsset) return;
    setRouteTarget(selectedAsset);
    setRouteInfo(null);
    setRouteError(null);
    setRouteLoading(true);
    setSelectedAsset(null);
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

  // Google Maps fallback URL
  const googleMapsUrl = (asset: AssetPoint) => {
    const dest = `${asset.lat},${asset.lng}`;
    if (liveLocation) {
      return `https://www.google.com/maps/dir/${liveLocation.lat},${liveLocation.lng}/${dest}`;
    }
    return `https://www.google.com/maps/search/?api=1&query=${dest}`;
  };

  const condColor = (c: AssetPoint['condition']) =>
    c === 'poor' ? 'text-red-600 bg-red-50 border-red-200' :
    c === 'fair' ? 'text-amber-600 bg-amber-50 border-amber-200' :
    'text-emerald-600 bg-emerald-50 border-emerald-200';

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Infrastructure Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of municipal assets, contractors, and ongoing maintenance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-4 shadow-sm">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              <div className="text-sm font-medium text-slate-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Map card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {/* Map title + filter chips */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-slate-500" />
            Asset GIS Map
          </h2>

          {/* Filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            {([
              { key: 'all',  label: 'All Assets',       dot: 'bg-slate-400',    active: 'bg-slate-700 text-white border-slate-700',   idle: 'bg-white text-slate-600 border-slate-300 hover:border-slate-400' },
              { key: 'poor', label: 'Repair Needed',    dot: 'bg-red-500',      active: 'bg-red-600 text-white border-red-600',        idle: 'bg-white text-slate-600 border-slate-300 hover:border-red-300'   },
              { key: 'fair', label: 'Moderate',         dot: 'bg-amber-400',    active: 'bg-amber-500 text-white border-amber-500',    idle: 'bg-white text-slate-600 border-slate-300 hover:border-amber-300' },
              { key: 'good', label: 'Good Condition',   dot: 'bg-emerald-500',  active: 'bg-emerald-600 text-white border-emerald-600',idle: 'bg-white text-slate-600 border-slate-300 hover:border-emerald-300'},
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                  activeFilter === f.key ? f.active : f.idle
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeFilter === f.key ? 'bg-white' : f.dot}`} />
                {f.label}
                <span className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  activeFilter === f.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                }`}>
                  {f.key === 'all' ? assets.length : assets.filter((a) => a.condition === f.key).length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Active filter banner */}
        {activeFilter === 'poor' && (
          <div className="mb-3 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Showing <strong>{filteredAssets.length} repair site{filteredAssets.length !== 1 ? 's' : ''}</strong> — assets with Poor condition that require urgent attention.
          </div>
        )}

        <div className="flex gap-4">
          {/* Map */}
          <div className="flex-1 rounded-xl border border-slate-200 overflow-hidden" style={{ height: '500px' }}>
            {mapApiKey ? (
              <APIProvider apiKey={mapApiKey}>
                <MapInner
                  assets={filteredAssets}
                  liveLocation={liveLocation}
                  locationError={locationError}
                  onAssetSelect={handleAssetSelect}
                  routeTarget={routeTarget}
                  onRouteResult={handleRouteResult}
                />
              </APIProvider>
            ) : (
              <div className="h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 p-6 text-center">
                <MapPin className="w-12 h-12 text-slate-400 mb-3" />
                <h3 className="font-semibold text-slate-700 text-lg mb-1">Google Maps API Key Required</h3>
                <p className="max-w-md text-sm">Add <code className="bg-slate-200 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> to your <code className="bg-slate-200 px-1 rounded">.env</code> file and restart the server.</p>
              </div>
            )}
          </div>

          {/* Side panel */}
          <div className="w-64 flex flex-col gap-3">
            {/* Tip */}
            {!selectedAsset && !routeTarget && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-4 rounded-xl border-2 border-dashed border-slate-200 text-slate-400">
                <MapPin className="w-8 h-8 mb-2 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">Click a marker</p>
                <p className="text-xs mt-1">Select an asset pin on the map to view details and get directions to the repair site.</p>
              </div>
            )}

            {/* Asset info card */}
            {selectedAsset && !routeTarget && (
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-slate-800 px-4 py-3">
                  <p className="text-white font-semibold text-sm">{selectedAsset.title}</p>
                  <span className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${condColor(selectedAsset.condition)}`}>
                    {selectedAsset.condition} condition
                  </span>
                </div>
                <div className="p-4 space-y-3">
                  <div className="text-xs text-slate-500">
                    <div className="font-medium text-slate-700 mb-0.5">GPS Coordinates</div>
                    {selectedAsset.lat.toFixed(4)}, {selectedAsset.lng.toFixed(4)}
                  </div>

                  {/* Primary: always works, no billing needed */}
                  <a
                    href={googleMapsUrl(selectedAsset)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors shadow-sm"
                  >
                    <Navigation className="w-4 h-4" />
                    Navigate to Repair Site
                  </a>

                  {/* Secondary: in-app route (requires Directions API + billing) */}
                  <button
                    onClick={handleGetDirections}
                    disabled={!liveLocation}
                    className="w-full flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 text-sm font-medium py-2.5 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Show Route on Map
                  </button>

                  {!liveLocation && (
                    <p className="text-xs text-slate-400 text-center">
                      Enable browser location for map route.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Route info card */}
            {routeTarget && (
              <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="bg-blue-600 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-white" />
                    <p className="text-white font-semibold text-sm">Directions</p>
                  </div>
                  <button onClick={clearRoute} className="text-blue-200 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="text-xs text-slate-500">
                    <div className="font-medium text-slate-700 mb-0.5">Destination</div>
                    {routeTarget.title}
                  </div>

                  {routeLoading && (
                    <div className="flex items-center gap-2 text-sm text-slate-500 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      Calculating route…
                    </div>
                  )}

                  {routeInfo && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-500 mb-1">Distance</div>
                        <div className="text-lg font-bold text-slate-900">{routeInfo.distance}</div>
                      </div>
                      <div className="bg-blue-50 rounded-lg p-3 text-center">
                        <div className="text-xs text-slate-500 mb-1">Est. Time</div>
                        <div className="text-lg font-bold text-blue-700">{routeInfo.duration}</div>
                      </div>
                    </div>
                  )}

                  {routeError && (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                      <p className="font-medium">Could not load route ({routeError})</p>
                      <p>Make sure the <strong>Directions API</strong> is enabled in your Google Cloud Console.</p>
                    </div>
                  )}

                  <a
                    href={googleMapsUrl(routeTarget)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium py-2.5 rounded-lg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open in Google Maps
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
