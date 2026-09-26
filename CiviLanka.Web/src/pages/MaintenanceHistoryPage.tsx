import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  Search,
} from 'lucide-react';
import { maintenanceService } from '../services/maintenanceService';
import type { MaintenanceRecord } from '../types/maintenance';
import { VerificationStatusBadge } from '../components/maintenance/MaintenanceStatusBadge';
import { ComplianceBadge } from '../components/maintenance/ComplianceBadge';

export const MaintenanceHistoryPage: React.FC = () => {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await maintenanceService.getAll();
        // filter verified or completed
        const historical = data.filter(
          (r) => r.verificationStatus === 'VERIFIED' || r.status === 'VERIFIED' || r.status === 'COMPLETED'
        );
        setRecords(historical);
      } catch (err: any) {
        setError(err.message || 'Failed to load historical records.');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filtered = records.filter(
    (r) =>
      !searchTerm ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.workOrderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.workOrderTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.performedBy?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalLabour = records.reduce((acc, r) => acc + (r.labourHours || 0), 0);
  const totalCost = records.reduce((acc, r) => acc + (r.actualCost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Historical Archives</span>
            <span>&bull;</span>
            <span className="font-semibold text-teal-600">Audit Repository</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-teal-600" />
            Maintenance History &amp; Audits
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Verified field maintenance records, audit trails, and municipal labor expenditure archives
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-2xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Historical Labour</span>
            <span className="text-sm font-bold text-slate-800">{totalLabour.toFixed(1)} Hours</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Expenditure</span>
            <span className="text-sm font-bold text-slate-800">LKR {totalCost.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search completed maintenance archives..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
          />
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading archive records...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 bg-rose-50 border-b border-rose-200">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            <History className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No historical maintenance records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">Record ID</th>
                  <th className="px-5 py-3.5">Work Order &amp; Hazard</th>
                  <th className="px-5 py-3.5">Crew &amp; Supervisor</th>
                  <th className="px-5 py-3.5">Verified Status</th>
                  <th className="px-5 py-3.5">Safety Compliance</th>
                  <th className="px-5 py-3.5">Expenditure</th>
                  <th className="px-5 py-3.5 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">
                      #{rec.id.slice(0, 8)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-900">{rec.workOrderTitle || rec.description}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <span className="text-teal-700 font-medium">{rec.workOrderNumber || 'WO'}</span>
                        {rec.location && <span>&bull; {rec.location}</span>}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-slate-800">Crew: {rec.performedBy}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Verified by: {rec.verifiedBy || 'Supervisor'}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <VerificationStatusBadge status={rec.verificationStatus} />
                    </td>
                    <td className="px-5 py-4">
                      {rec.latestSafetyAnalysis ? (
                        <ComplianceBadge status={rec.latestSafetyAnalysis.complianceStatus} />
                      ) : (
                        <span className="text-[11px] text-slate-400">Passed Pre-check</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-slate-800">LKR {rec.actualCost.toLocaleString()}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{rec.labourHours} hrs</div>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/maintenance/${rec.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                      >
                        Audit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
