import { Plus, Search, Filter } from 'lucide-react';

export default function InfrastructureAssets() {
  const assets = [
    { id: 'AST-001', name: 'Main St Water Pipe', type: 'Water', condition: 'Poor', location: 'Downtown' },
    { id: 'AST-002', name: 'Oak Ave Streetlight', type: 'Electrical', condition: 'Good', location: 'Northside' },
    { id: 'AST-003', name: 'Central Park Pathway', type: 'Civil', condition: 'Fair', location: 'City Center' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Infrastructure Assets</h1>
          <p className="text-slate-500 text-sm mt-1">Manage, register, and update municipal assets.</p>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm">
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
              placeholder="Search assets by name or ID..." 
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-100 font-medium text-slate-700 transition-colors bg-white">
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
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm font-medium text-slate-900">{asset.id}</td>
                  <td className="p-4 text-sm text-slate-700">{asset.name}</td>
                  <td className="p-4 text-sm text-slate-600">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                      {asset.type}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      asset.condition === 'Good' ? 'bg-emerald-100 text-emerald-700' :
                      asset.condition === 'Fair' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {asset.condition}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">{asset.location}</td>
                  <td className="p-4 text-sm">
                    <button className="text-primary-600 hover:text-primary-800 font-medium">Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-slate-200 text-sm text-slate-500 text-center bg-slate-50">
          Showing 3 of 1,245 assets
        </div>
      </div>
    </div>
  );
}

