import { Activity, AlertTriangle, CheckCircle, MapPin } from 'lucide-react';

export default function Dashboard() {
  const stats = [
    { label: 'Total Assets', value: '1,245', icon: Activity, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Active Repairs', value: '42', icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-100' },
    { label: 'Available Contractors', value: '18', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  ];

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

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col min-h-[400px]">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-slate-500" />
          Asset GIS Map
        </h2>
        <div className="flex-1 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center relative overflow-hidden">
          {/* Placeholder for actual map integration like react-leaflet or mapbox */}
          <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
          <div className="text-slate-500 font-medium flex flex-col items-center gap-2 relative z-10">
            <MapPin className="w-10 h-10 text-slate-400" />
            <p>GIS Map Integration Area</p>
            <p className="text-xs font-normal text-slate-400 max-w-sm text-center">
              (This space is reserved for the interactive Leaflet/OpenStreetMap widget to visualize asset locations and conditions.)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

