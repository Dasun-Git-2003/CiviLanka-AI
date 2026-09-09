import { Calendar, Wrench, Download } from 'lucide-react';

export default function RepairHistory() {
  const records = [
    { id: 'REP-1024', assetId: 'AST-001', assetName: 'Main St Water Pipe', type: 'Emergency', date: '2023-10-15', cost: '$4,250', contractor: 'AquaFlow Utilities', status: 'Completed' },
    { id: 'REP-1023', assetId: 'AST-042', assetName: 'Park Lighting', type: 'Routine', date: '2023-10-10', cost: '$850', contractor: 'ElectroFix Pro', status: 'Completed' },
    { id: 'REP-1022', assetId: 'AST-018', assetName: 'Bridge Expansion Joint', type: 'Scheduled', date: '2023-09-28', cost: '$12,400', contractor: 'Acme Civil Works', status: 'Completed' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Repair & Maintenance History</h1>
          <p className="text-slate-500 text-sm mt-1">Log of all completed maintenance work and associated costs.</p>
        </div>
        <button className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-50 transition-colors shadow-sm">
          <Download className="w-4 h-4" />
          Export Report
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-4 text-sm font-semibold text-slate-600">Record ID</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Asset</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Type</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Date</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Contractor</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Cost</th>
                <th className="p-4 text-sm font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 text-sm font-medium text-slate-900 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-slate-400" />
                    {record.id}
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-medium text-slate-900">{record.assetName}</div>
                    <div className="text-xs text-slate-500">{record.assetId}</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${
                      record.type === 'Emergency' ? 'bg-red-50 text-red-700 border border-red-100' :
                      record.type === 'Routine' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      'bg-purple-50 text-purple-700 border border-purple-100'
                    }`}>
                      {record.type}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400" />
                      {record.date}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-700">{record.contractor}</td>
                  <td className="p-4 text-sm font-medium text-slate-900">{record.cost}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      {record.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

