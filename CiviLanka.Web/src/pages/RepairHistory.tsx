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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Repair &amp; Maintenance History</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Log of all completed maintenance work and associated costs.</p>
        </div>
        <button className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl font-medium flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer">
          <Download className="w-4 h-4 text-amber-500" />
          Export Report
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800">
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-gis">Record ID</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-gis">Asset</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-gis">Type</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-gis">Date</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-gis">Contractor</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-gis">Cost</th>
                <th className="p-4 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 font-gis">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2 font-mono">
                    <Wrench className="w-4 h-4 text-amber-500" />
                    {record.id}
                  </td>
                  <td className="p-4">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">{record.assetName}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">{record.assetId}</div>
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium border ${
                      record.type === 'Emergency' ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60' :
                      record.type === 'Routine' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60' :
                      'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                    }`}>
                      {record.type}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                      {record.date}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-700 dark:text-slate-300">{record.contractor}</td>
                  <td className="p-4 text-sm font-medium text-slate-900 dark:text-white font-mono">{record.cost}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
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

