import React from 'react';
import type { MaintenanceAuditLog } from '../../types/maintenance';
import { Clock, User, ArrowRight, Activity } from 'lucide-react';

interface AuditLogTimelineProps {
  logs: MaintenanceAuditLog[];
}

export const AuditLogTimeline: React.FC<AuditLogTimelineProps> = ({ logs }) => {
  if (!logs || logs.length === 0) {
    return (
      <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
        No audit log events recorded yet.
      </div>
    );
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {logs.map((log, logIdx) => {
          const isLast = logIdx === logs.length - 1;
          return (
            <li key={log.id || logIdx}>
              <div className="relative pb-8">
                {!isLast && (
                  <span
                    className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-200"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3 items-start">
                  <div>
                    <span className="h-8 w-8 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center ring-4 ring-white text-teal-600">
                      <Activity className="w-4 h-4" />
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 bg-white border border-slate-200 rounded-lg p-3 shadow-2xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{log.action}</span>
                        {log.previousStatus && log.newStatus && (
                          <div className="flex items-center gap-1 text-[11px] font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                            <span>{log.previousStatus}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold">{log.newStatus}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    {log.description && (
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                        {log.description}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                      <User className="w-3 h-3" />
                      <span>{log.userId}</span>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
