import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Smartphone,
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertTriangle,
  Camera,
  Layers,
  MapPin,
  ExternalLink,
  ChevronRight,
  Shield,
  Users,
} from 'lucide-react';
import { maintenanceService } from '../services/maintenanceService';
import type { MaintenanceRecord } from '../types/maintenance';
import { MaintenanceStatusBadge } from '../components/maintenance/MaintenanceStatusBadge';
import { SafetyRiskBadge } from '../components/maintenance/SafetyRiskBadge';
import { authService } from '../services/authService';

export const FieldWorkerPortal: React.FC = () => {
  const [assignments, setAssignments] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = authService.getCurrentUser();

  const loadAssignments = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await maintenanceService.getMyAssignments();
      setAssignments(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load worker assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssignments();
  }, []);

  const activeJobs = assignments.filter(
    (r) => r.status === 'ASSIGNED' || r.status === 'IN_PROGRESS' || r.status === 'REQUIRES_CORRECTION'
  );
  const completedJobs = assignments.filter(
    (r) => r.status === 'COMPLETED' || r.status === 'VERIFICATION_PENDING' || r.status === 'VERIFIED'
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Banner Header */}
      <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-cyan-700 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-teal-100 text-xs font-semibold uppercase tracking-wider">
              <Smartphone className="w-4 h-4" />
              <span>Mobile Field Operations Terminal</span>
            </div>
            <h1 className="text-xl font-black tracking-tight">
              Welcome back, {user?.fullName || 'Field Specialist'}
            </h1>
            <p className="text-xs text-teal-100/90">
              Manage your daily work assignments, field safety protocols, and evidence submissions.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-white/10 backdrop-blur-xs px-4 py-2.5 rounded-xl border border-white/20">
            <div className="text-right">
              <div className="text-2xl font-black">{activeJobs.length}</div>
              <div className="text-[10px] uppercase font-bold text-teal-100 tracking-wider">Active Tasks</div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Tasks Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <PlayCircle className="w-4 h-4 text-teal-600" />
            Active Field Assignments ({activeJobs.length})
          </h2>
          <span className="text-xs text-slate-400">Immediate action required</span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Syncing worker assignments...
          </div>
        ) : activeJobs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            No active assignments pending. All assigned tasks have been executed or verified!
          </div>
        ) : (
          <div className="space-y-3">
            {activeJobs.map((job) => (
              <div
                key={job.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-teal-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                        #{job.id.slice(0, 8)}
                      </span>
                      <MaintenanceStatusBadge status={job.status} size="sm" />
                      {job.latestSafetyAnalysis && (
                        <SafetyRiskBadge level={job.latestSafetyAnalysis.safetyRiskLevel} />
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">
                      {job.workOrderTitle || job.description}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                      <div className="flex items-center gap-1 text-teal-700 font-semibold">
                        <Layers className="w-3.5 h-3.5 text-teal-600" />
                        <span>{job.workOrderNumber || 'Linked WO'}</span>
                      </div>
                      {job.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.location}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{job.labourHours} hrs logged</span>
                      </div>
                      {job.assignedCrew && (
                        <div className="flex items-center gap-1 text-slate-500">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          <span>{job.assignedCrew}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress checklist indicator */}
                    <div className="flex items-center gap-3 pt-1 text-[11px]">
                      <span
                        className={`flex items-center gap-1 ${
                          job.beforeImageUrl ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5" /> Before Photo{' '}
                        {job.beforeImageUrl ? '✓' : '✗'}
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          job.afterImageUrl ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        <Camera className="w-3.5 h-3.5" /> After Photo{' '}
                        {job.afterImageUrl ? '✓' : '✗'}
                      </span>
                      <span
                        className={`flex items-center gap-1 ${
                          job.safetyChecklist ? 'text-emerald-700 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" /> Safety Checklist{' '}
                        {job.safetyChecklist ? '✓' : '✗'}
                      </span>
                    </div>

                    {job.status === 'REQUIRES_CORRECTION' && (
                      <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-800">
                        <strong>Supervisor Correction Requested:</strong> Re-examine work and remediate deficiencies before resubmitting.
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:self-center">
                    <Link
                      to={`/maintenance/${job.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <span>Open Task</span>
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed & Historical Submissions Section */}
      {completedJobs.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Recently Submitted &amp; Verified ({completedJobs.length})
            </h2>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
            {completedJobs.map((job) => (
              <div
                key={job.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-500 font-semibold">
                      #{job.id.slice(0, 8)}
                    </span>
                    <MaintenanceStatusBadge status={job.status} size="sm" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">
                    {job.workOrderTitle || job.description}
                  </h4>
                  <div className="text-[11px] text-slate-400">
                    {job.location} &bull; Completed {new Date(job.updatedAt).toLocaleDateString()}
                  </div>
                </div>

                <Link
                  to={`/maintenance/${job.id}`}
                  className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-100"
                >
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
