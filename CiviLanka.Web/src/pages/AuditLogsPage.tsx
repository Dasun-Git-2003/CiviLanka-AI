import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Filter,
  Lock,
  Loader2,
  User,
} from 'lucide-react';
import { apiClient, getErrorMessage } from '../services/apiService';
import { authService } from '../services/authService';

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: string;
  action: string;
  entityName: string;
  entityId?: string;
  details?: string;
  ipAddress?: string;
  isSuccess: boolean;
}

export const AuditLogsPage: React.FC = () => {
  const currentUser = authService.getCurrentUser();
  const isDirector = currentUser?.role === 'PublicWorksDirector' || currentUser?.role?.toLowerCase()?.includes('director');

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get<AuditLog[]>('/api/audit');
      setLogs(res.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch =
        log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.entityName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesAction =
        actionFilter === 'ALL' ||
        log.action?.toLowerCase().includes(actionFilter.toLowerCase()) ||
        log.entityName?.toLowerCase().includes(actionFilter.toLowerCase());

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'SUCCESS' && log.isSuccess) ||
        (statusFilter === 'DENIED' && !log.isSuccess);

      return Boolean(matchesSearch && matchesAction && matchesStatus);
    });
  }, [logs, searchTerm, actionFilter, statusFilter]);

  return (
    <div className="space-y-6">
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Municipal Security & Audit Ledger</h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase ${
                isDirector
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-blue-700 border-blue-200'
              }`}
            >
              {isDirector ? 'Full System Ledger' : 'Operational Scope'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Immutable, cryptographically verifiable event stream of municipal actions, authorization
            decisions, and resource changes.
          </p>
        </div>

        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors shadow-2xs self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* ── Compliance Banner ────────────────────────────────────────────────── */}
      <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200 flex items-center justify-between gap-4 text-xs text-slate-700">
        <div className="flex items-center gap-3">
          <Lock className="w-5 h-5 text-slate-600 flex-shrink-0" />
          <div>
            <span className="font-bold text-slate-900">Immutable Audit Policy: </span>
            <span>
              All system entries are append-only. Under Municipal Transparency Standard §14-A, audit
              logs cannot be modified, reordered, or deleted by any administrative account.
            </span>
          </div>
        </div>
        <span className="font-mono text-[11px] font-bold text-slate-500 hidden md:inline">
          COMPLIANCE: ACTIVE
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by operator, action, or entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white placeholder-slate-400"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Actions</option>
            <option value="WorkOrder">Work Orders</option>
            <option value="Maintenance">Maintenance Records</option>
            <option value="Budget">Budget & Thresholds</option>
            <option value="User">User Management</option>
            <option value="Auth">Authentication</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs p-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESS">Success Only</option>
            <option value="DENIED">Denied / Failed</option>
          </select>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-cyan-600" />
            <span>Fetching municipal audit logs...</span>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-16 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No matching audit logs found</h4>
            <p className="text-xs text-slate-500">
              Try adjusting your search criteria or resetting filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Operator</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Entity Reference</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">IP / Channel</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{log.userName || log.userId}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                        {log.role}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900">{log.action}</td>
                    <td className="px-5 py-3 font-mono text-[11px] text-cyan-800">
                      {log.entityName} {log.entityId ? `[#${log.entityId.slice(0, 8)}]` : ''}
                    </td>
                    <td className="px-5 py-3">
                      {log.isSuccess ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>SUCCESS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                          <XCircle className="w-3 h-3" />
                          <span>DENIED</span>
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {log.ipAddress || 'Internal Loopback'}
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

export default AuditLogsPage;
