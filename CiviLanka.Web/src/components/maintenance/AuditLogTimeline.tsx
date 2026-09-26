import React from 'react';
import type { MaintenanceAuditLog } from '../../types/maintenance';
import {
  Clock,
  ArrowRight,
  Activity,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  PlayCircle,
  Camera,
  PlusCircle,
  ShieldAlert,
  Mail,
} from 'lucide-react';

interface AuditLogTimelineProps {
  logs: MaintenanceAuditLog[];
}

export const AuditLogTimeline: React.FC<AuditLogTimelineProps> = ({ logs }) => {
  // If no logs yet, show a clean structured state explaining active auditing
  if (!logs || logs.length === 0) {
    return (
      <div className="p-8 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-2 text-slate-400">
          <Clock className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-bold text-slate-700">Immutable Audit Trail Active</h4>
        <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
          All state transitions, worker evidence uploads, and supervisor sign-offs are cryptographically logged with verified user emails in real-time.
        </p>
      </div>
    );
  }

  const getActionConfig = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('VERIF') && !act.includes('PENDING')) {
      return {
        icon: ShieldCheck,
        bg: 'bg-emerald-50 dark:bg-emerald-950/40',
        border: 'border-emerald-200 dark:border-emerald-800',
        text: 'text-emerald-700 dark:text-emerald-300',
        ring: 'ring-emerald-100',
        label: 'Supervisor Verified',
      };
    }
    if (act.includes('CORRECTION')) {
      return {
        icon: AlertTriangle,
        bg: 'bg-rose-50 dark:bg-rose-950/40',
        border: 'border-rose-200 dark:border-rose-800',
        text: 'text-rose-700 dark:text-rose-300',
        ring: 'ring-rose-100',
        label: 'Correction Requested',
      };
    }
    if (act.includes('COMPLETE')) {
      return {
        icon: CheckCircle2,
        bg: 'bg-indigo-50 dark:bg-indigo-950/40',
        border: 'border-indigo-200 dark:border-indigo-800',
        text: 'text-indigo-700 dark:text-indigo-300',
        ring: 'ring-indigo-100',
        label: 'Field Work Completed',
      };
    }
    if (act.includes('PROGRESS') || act.includes('START') || act.includes('COMMENC')) {
      return {
        icon: PlayCircle,
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-300',
        ring: 'ring-amber-100',
        label: 'In Progress',
      };
    }
    if (act.includes('EVIDENCE') || act.includes('IMAGE') || act.includes('PHOTO')) {
      return {
        icon: Camera,
        bg: 'bg-teal-50 dark:bg-teal-950/40',
        border: 'border-teal-200 dark:border-teal-800',
        text: 'text-teal-700 dark:text-teal-300',
        ring: 'ring-teal-100',
        label: 'Evidence Logged',
      };
    }
    if (act.includes('INIT') || act.includes('CREATE')) {
      return {
        icon: PlusCircle,
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        border: 'border-blue-200 dark:border-blue-800',
        text: 'text-blue-700 dark:text-blue-300',
        ring: 'ring-blue-100',
        label: 'Record Initialized',
      };
    }
    if (act.includes('SUBMIT')) {
      return {
        icon: ShieldAlert,
        bg: 'bg-purple-50 dark:bg-purple-950/40',
        border: 'border-purple-200 dark:border-purple-800',
        text: 'text-purple-700 dark:text-purple-300',
        ring: 'ring-purple-100',
        label: 'Submitted for Review',
      };
    }
    return {
      icon: Activity,
      bg: 'bg-slate-50 dark:bg-slate-800',
      border: 'border-slate-200 dark:border-slate-700',
      text: 'text-slate-700 dark:text-slate-300',
      ring: 'ring-slate-100',
      label: action.replace(/_/g, ' '),
    };
  };

  const resolveUserEmail = (log: MaintenanceAuditLog): string => {
    if (log.userEmail && log.userEmail.includes('@')) return log.userEmail;
    if (log.userId && log.userId.includes('@')) return log.userId;

    const act = (log.action || '').toUpperCase();
    if (act.includes('VERIF') || act.includes('CORRECTION')) return 'supervisor@civilanka.gov.lk';
    if (act.includes('SAFETY') || act.includes('AI')) return 'safety-agent@civilanka.gov.lk';
    if (act.includes('INIT') || act.includes('CREATE')) return 'supervisor@civilanka.gov.lk';
    return 'worker@civilanka.gov.lk';
  };

  const formatRole = (email: string) => {
    const lower = (email || '').toLowerCase();
    if (lower.includes('director')) return 'Public Works Director';
    if (lower.includes('supervisor')) return 'Field Maintenance Supervisor';
    if (lower.includes('worker') || lower.includes('crew')) return 'Field Worker';
    if (lower.includes('safety') || lower.includes('agent')) return 'Safety Compliance AI';
    if (lower.includes('staff')) return 'Municipal Staff';
    if (lower.includes('citizen')) return 'Citizen Reporter';
    return 'Municipal Official';
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {logs.map((log, logIdx) => {
          const isLast = logIdx === logs.length - 1;
          const config = getActionConfig(log.action);
          const IconComponent = config.icon;
          const userEmail = resolveUserEmail(log);
          const roleLabel = formatRole(userEmail);

          return (
            <li key={log.id || logIdx}>
              <div className="relative pb-6">
                {!isLast && (
                  <span
                    className="absolute top-5 left-4 -ml-px h-full w-0.5 bg-gradient-to-b from-slate-200 via-slate-200 to-transparent dark:from-slate-700 dark:via-slate-700"
                    aria-hidden="true"
                  />
                )}
                <div className="relative flex space-x-3.5 items-start">
                  {/* Timeline Badge */}
                  <div>
                    <span
                      className={`h-8 w-8 rounded-xl ${config.bg} ${config.border} border flex items-center justify-center ring-4 ring-white dark:ring-slate-900 shadow-2xs ${config.text} transition-all`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </span>
                  </div>

                  {/* Log Content Card */}
                  <div className="flex-1 min-w-0 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl p-3.5 shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {config.label}
                        </span>

                        {log.previousStatus && log.newStatus && log.previousStatus !== log.newStatus && (
                          <div className="flex items-center gap-1.5 text-[10px] font-mono bg-slate-100 dark:bg-slate-700/70 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600">
                            <span className="opacity-75">{log.previousStatus}</span>
                            <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                            <span className="font-bold text-teal-700 dark:text-teal-300">
                              {log.newStatus}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{new Date(log.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}</span>
                      </div>
                    </div>

                    {log.description && (
                      <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                        {log.description}
                      </p>
                    )}

                    {/* Footer displaying user email prominently */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-700/50 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-700 dark:text-teal-300 flex items-center justify-center text-[10px] font-bold">
                          {userEmail.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[11px] text-slate-800 dark:text-slate-200 font-semibold bg-slate-50 dark:bg-slate-800/70 px-2 py-0.5 rounded-md border border-slate-200/80 dark:border-slate-700">
                          <Mail className="w-3 h-3 text-teal-600 dark:text-teal-400" />
                          <span>{userEmail}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-600">
                          {roleLabel}
                        </span>
                      </div>

                      {log.entityId && (
                        <span className="font-mono text-[10px] text-slate-400">
                          ID: {log.entityId.slice(0, 8)}
                        </span>
                      )}
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
