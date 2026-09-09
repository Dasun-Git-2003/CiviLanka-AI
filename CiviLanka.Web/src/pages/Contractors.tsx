import { UserPlus, Star, MapPin, Phone } from 'lucide-react';

export default function Contractors() {
  const contractors = [
    { id: 1, name: 'Acme Civil Works', spec: 'Roads & Bridges', rating: 4.8, location: 'City Center', phone: '011-234-5678', available: true },
    { id: 2, name: 'ElectroFix Pro', spec: 'Electrical', rating: 4.5, location: 'North District', phone: '011-987-6543', available: false },
    { id: 3, name: 'AquaFlow Utilities', spec: 'Water & Plumbing', rating: 4.9, location: 'South District', phone: '011-555-1234', available: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contractor Management</h1>
          <p className="text-slate-500 text-sm mt-1">Directory of specialized municipal contractors.</p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm">
          <UserPlus className="w-4 h-4" />
          Add Contractor
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {contractors.map((contractor) => (
          <div key={contractor.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-bold text-lg text-slate-900">{contractor.name}</h3>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                  contractor.available ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                }`}>
                  {contractor.available ? 'Available' : 'Busy'}
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="font-medium px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">{contractor.spec}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span className="font-medium text-slate-900">{contractor.rating}</span>
                  <span className="text-slate-400 text-xs">(Based on 24 jobs)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {contractor.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Phone className="w-4 h-4 text-slate-400" />
                  {contractor.phone}
                </div>
              </div>
            </div>
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex gap-3">
              <button className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                View Profile
              </button>
              <button className="flex-1 bg-primary-50 text-primary-700 border border-primary-200 py-2 rounded-lg text-sm font-medium hover:bg-primary-100 transition-colors">
                Assign Work
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

