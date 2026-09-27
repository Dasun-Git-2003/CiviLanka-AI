import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Wrench,
  Download,
  Search,
  Filter,
  RefreshCw,
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertTriangle,
  ExternalLink,
  DollarSign,
  Layers,
  Building2,
} from 'lucide-react';
import { maintenanceService } from '../services/maintenanceService';
import type { MaintenanceRecord } from '../types/maintenance';
import { MaintenanceStatusBadge } from '../components/maintenance/MaintenanceStatusBadge';

export default function RepairHistory() {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');

  const fetchRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await maintenanceService.getAll();
      setRecords(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load repair and maintenance history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Filtered dataset
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      // Search text
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = r.id.toLowerCase().includes(q);
        const matchesWo = r.workOrderNumber?.toLowerCase().includes(q) || false;
        const matchesTitle = r.workOrderTitle?.toLowerCase().includes(q) || false;
        const matchesAsset =
          r.assetName?.toLowerCase().includes(q) ||
          r.assetId?.toLowerCase().includes(q) ||
          false;
        const matchesDesc = r.description?.toLowerCase().includes(q) || false;
        const matchesCrew =
          r.assignedCrew?.toLowerCase().includes(q) ||
          r.performedBy?.toLowerCase().includes(q) ||
          false;

        if (!matchesId && !matchesWo && !matchesTitle && !matchesAsset && !matchesDesc && !matchesCrew) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'ALL') {
        if (r.status?.toUpperCase() !== selectedStatus.toUpperCase()) {
          return false;
        }
      }

      // Type filter
      if (selectedType !== 'ALL') {
        if (r.maintenanceType?.toLowerCase() !== selectedType.toLowerCase()) {
          return false;
        }
      }

      return true;
    });
  }, [records, searchQuery, selectedStatus, selectedType]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    const totalCount = records.length;
    const verifiedCount = records.filter(
      (r) => r.status === 'VERIFIED' || r.status === 'COMPLETED'
    ).length;
    const inProgressCount = records.filter(
      (r) => r.status === 'IN_PROGRESS' || r.status === 'ASSIGNED'
    ).length;
    const totalExpenditure = records.reduce(
      (sum, r) => sum + (r.actualCost || r.estimatedCost || 0),
      0
    );

    return { totalCount, verifiedCount, inProgressCount, totalExpenditure };
  }, [records]);

  // Export CSV Handler
  const handleExportCSV = () => {
    if (!filteredRecords.length) return;

    const headers = [
      'Record ID',
      'Work Order #',
      'Title / Description',
      'Asset ID',
      'Asset Name',
      'Maintenance Type',
      'Status',
      'Date Completed / Started',
      'Contractor / Crew',
      'Labor Hours',
      'Actual Cost (LKR)',
      'Estimated Cost (LKR)',
      'Verification Status',
      'Verified By',
    ];

    const rows = filteredRecords.map((r) => [
      r.id,
      r.workOrderNumber || '',
      `"${(r.workOrderTitle || r.description || '').replace(/"/g, '""')}"`,
      r.assetId || '',
      `"${(r.assetName || '').replace(/"/g, '""')}"`,
      r.maintenanceType || 'Corrective',
      r.status,
      r.workCompletedAt || r.workStartedAt || r.createdAt,
      `"${(r.assignedCrew || r.performedBy || '').replace(/"/g, '""')}"`,
      r.labourHours || 0,
      r.actualCost || 0,
      r.estimatedCost || 0,
      r.verificationStatus || '',
      r.verifiedBy || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `CiviLanka_Repair_History_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Wrench className="w-6 h-6 text-amber-500" />
            Repair &amp; Maintenance History
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Real-time municipal audit log of all completed, verified, and in-progress infrastructure maintenance.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchRecords}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh History"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={filteredRecords.length === 0}
            className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4 text-amber-500" />
            Export CSV ({filteredRecords.length})
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Repairs
            </span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {metrics.totalCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Municipal infrastructure logs</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Verified &amp; Closed
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {metrics.verifiedCount}
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">Passed supervisor audit</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
              In-Progress
            </span>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <PlayCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-2">
            {metrics.inProgressCount}
          </div>
          <div className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">Active field execution</div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
              Total Expenditure
            </span>
            <div className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-2 font-mono">
            LKR {metrics.totalExpenditure.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Cumulative recorded cost</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by ID, WO number, asset, crew, or keyword..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Status:</span>
          </div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="VERIFIED">Verified</option>
            <option value="COMPLETED">Completed</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="VERIFICATION_PENDING">Pending Verification</option>
            <option value="ASSIGNED">Assigned</option>
          </select>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 ml-1">
            <span>Type:</span>
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          >
            <option value="ALL">All Types</option>
            <option value="Corrective">Corrective</option>
            <option value="Preventive">Preventive</option>
            <option value="Emergency">Emergency</option>
            <option value="Routine">Routine</option>
            <option value="Scheduled">Scheduled</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchRecords}
            className="px-3 py-1 bg-white dark:bg-slate-900 border border-rose-300 rounded-lg font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/60"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400">Loading live repair and maintenance records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <Wrench className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No repair records found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              {searchQuery || selectedStatus !== 'ALL' || selectedType !== 'ALL'
                ? 'No repair entries match your search criteria. Try resetting the filters above.'
                : 'No maintenance operations have been logged yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="p-4">Record ID / WO</th>
                  <th className="p-4">Asset / Scope</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Contractor / Crew</th>
                  <th className="p-4">Cost (LKR)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredRecords.map((record) => {
                  const displayCost = record.actualCost || record.estimatedCost || 0;
                  const displayDate = record.workCompletedAt || record.workStartedAt || record.createdAt;

                  return (
                    <tr
                      key={record.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Record ID / Linked WO */}
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            #{record.id.slice(0, 8)}
                          </span>
                          {record.workOrderNumber && (
                            <span className="inline-flex items-center gap-1 font-mono text-[10px] text-teal-600 dark:text-teal-400 font-semibold">
                              <Layers className="w-3 h-3" />
                              {record.workOrderNumber}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Asset & Location */}
                      <td className="p-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {record.assetName || record.workOrderTitle || 'General Municipal Asset'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          {record.assetId && (
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                              {record.assetId}
                            </span>
                          )}
                          {record.location && (
                            <span className="truncate max-w-[200px]" title={record.location}>
                              {record.location}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Maintenance Type */}
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                            record.maintenanceType?.toLowerCase().includes('emergency')
                              ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/60'
                              : record.maintenanceType?.toLowerCase().includes('preventive') || record.maintenanceType?.toLowerCase().includes('scheduled')
                              ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60'
                          }`}
                        >
                          {record.maintenanceType || 'Corrective'}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                          <span>{formatDate(displayDate)}</span>
                        </div>
                        {record.labourHours > 0 && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {record.labourHours} hrs logged
                          </div>
                        )}
                      </td>

                      {/* Contractor / Assigned Crew */}
                      <td className="p-4 text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="font-medium truncate max-w-[180px]" title={record.assignedCrew || record.performedBy}>
                            {record.assignedCrew || record.performedBy || 'Municipal Field Team'}
                          </span>
                        </div>
                      </td>

                      {/* Cost */}
                      <td className="p-4 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        LKR {displayCost.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                      </td>

                      {/* Status */}
                      <td className="p-4 whitespace-nowrap">
                        <MaintenanceStatusBadge status={record.status} size="sm" />
                      </td>

                      {/* Action */}
                      <td className="p-4 text-right whitespace-nowrap">
                        <Link
                          to={`/maintenance/${record.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-teal-50 dark:bg-slate-800 dark:hover:bg-teal-950/40 text-slate-700 hover:text-teal-700 dark:text-slate-200 dark:hover:text-teal-300 font-semibold text-[11px] transition-colors border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-700"
                        >
                          <span>Details</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
