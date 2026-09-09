import { Activity, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';

import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';

export default function Dashboard() {
  const stats = [
    { label: 'Total Assets', value: '1,245', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Active Repairs', value: '42', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Available Contractors', value: '18', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];

  // Example asset locations in Colombo, Sri Lanka
  const assets = [
    { id: 1, lat: 6.9271, lng: 79.8612, title: 'Main St Water Pipe', condition: 'poor' },
    { id: 2, lat: 6.9310, lng: 79.8450, title: 'Oak Ave Streetlight', condition: 'good' },
    { id: 3, lat: 6.9050, lng: 79.8510, title: 'Central Park Pathway', condition: 'fair' },
  ];

  const mapApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  return (
    <div className="space-y-6">
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

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-slate-500" />
          Asset GIS Map
          <span className="ml-auto flex items-center gap-3 text-xs font-normal text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span>Poor</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>Fair</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>Good</span>
          </span>
        </h2>
        <div className="rounded-lg border border-slate-200 overflow-hidden" style={{ height: '450px' }}>
          {mapApiKey ? (
            <APIProvider apiKey={mapApiKey}>
              <Map
                defaultZoom={13}
                defaultCenter={{ lat: 6.9271, lng: 79.8612 }}
                mapId="DEMO_MAP_ID"
                style={{ width: '100%', height: '100%' }}
              >
                {assets.map((asset) => (
                  <AdvancedMarker key={asset.id} position={{ lat: asset.lat, lng: asset.lng }} title={asset.title}>
                    <Pin
                      background={asset.condition === 'poor' ? '#EF4444' : asset.condition === 'fair' ? '#F59E0B' : '#10B981'}
                      borderColor={'#ffffff'}
                      glyphColor={'#ffffff'}
                    />
                  </AdvancedMarker>
                ))}
              </Map>
            </APIProvider>
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-slate-100 text-slate-500 p-6 text-center">
              <MapPin className="w-12 h-12 text-slate-400 mb-3" />
              <h3 className="font-semibold text-slate-700 text-lg mb-1">Google Maps API Key Required</h3>
              <p className="max-w-md text-sm">Please add your <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">VITE_GOOGLE_MAPS_API_KEY</code> to the <code className="bg-slate-200 px-1 py-0.5 rounded text-slate-700">.env</code> file in the CiviLanka.Web root folder.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

