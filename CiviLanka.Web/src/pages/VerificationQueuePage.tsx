import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Camera,
  Layers,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { maintenanceService } from '../services/maintenanceService';
import type { MaintenanceRecord } from '../types/maintenance';
import { MaintenanceStatusBadge } from '../components/maintenance/MaintenanceStatusBadge';
import { ComplianceBadge } from '../components/maintenance/ComplianceBadge';
import { VerificationModal } from '../components/maintenance/VerificationModal';

export const VerificationQueuePage: React.FC = () => {
  const [queue, setQueue] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedRecord, setSelectedRecord] = useState<MaintenanceRecord | null>(null);
  const [modalMode, setModalMode] = useState<'verify' | 'correction'>('verify');
  const [modalOpen, setModalOpen] = useState(false);

  const loadQueue = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await maintenanceService.getVerificationQueue();
      setQueue(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load verification queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, []);

  const handleOpenAction = (record: MaintenanceRecord, mode: 'verify' | 'correction') => {
    setSelectedRecord(record);
    setModalMode(mode);
    setModalOpen(true);
  };

  const handleVerificationSuccess = (updated: MaintenanceRecord) => {
    setQueue((prev) => prev.filter((r) => r.id !== updated.id));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>Supervisor Console</span>
            <span>&bull;</span>
            <span className="font-semibold text-purple-600">Dual Verification Queue</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-purple-600" />
            Maintenance Verification Queue
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Supervisor review portal for physically completed jobs requiring photographic sign-off and AI compliance audit
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            {queue.length} Awaiting Approval
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Queue List */}
      {loading ? (
        <div className="p-16 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
          <div className="w-8 h-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          Scanning verification pending maintenance items...
        </div>
      ) : queue.length === 0 ? (
        <div className="p-16 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Verification Queue is Empty</h3>
          <p className="max-w-md mx-auto text-slate-500">
            All submitted field maintenance works have been audited and verified by supervisors.
          </p>
          <Link
            to="/maintenance"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold shadow-xs"
          >
            <span>View All Maintenance Records</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {queue.map((rec) => (
            <div
              key={rec.id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-purple-200 transition-colors"
            >
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Info Block (Cols 1-5) */}
                <div className="lg:col-span-5 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold">
                      #{rec.id.slice(0, 8)}
                    </span>
                    <MaintenanceStatusBadge status={rec.status} size="sm" />
                    {rec.latestSafetyAnalysis && (
                      <ComplianceBadge status={rec.latestSafetyAnalysis.complianceStatus} />
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900">
                    {rec.workOrderTitle || rec.description}
                  </h3>

                  <div className="text-xs text-slate-500 space-y-1">
                    <div className="flex items-center gap-1 text-teal-700 font-semibold">
                      <Layers className="w-3.5 h-3.5 text-teal-600" />
                      <span>{rec.workOrderNumber || 'Linked WO'}</span>
                      {rec.hazardCategory && <span>&bull; {rec.hazardCategory}</span>}
                    </div>
                    {rec.location && <div>Location: {rec.location}</div>}
                    <div>
                      Executed by: <span className="font-semibold text-slate-700">{rec.performedBy}</span> &bull; {rec.labourHours} hrs &bull; LKR {rec.actualCost.toLocaleString()}
                    </div>
                  </div>

                  {rec.workerNotes && (
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-600 italic">
                      &ldquo;{rec.workerNotes}&rdquo;
                    </div>
                  )}
                </div>

                {/* Evidence Thumbnails (Cols 6-8) */}
                <div className="lg:col-span-4 flex items-center gap-4">
                  <div className="flex-1 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      Before
                    </span>
                    <div className="h-24 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                      {rec.beforeImageUrl ? (
                        <img
                          src={rec.beforeImageUrl}
                          alt="Before"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5" /> Missing
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 text-center">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                      After
                    </span>
                    <div className="h-24 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                      {rec.afterImageUrl ? (
                        <img
                          src={rec.afterImageUrl}
                          alt="After"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5" /> Missing
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Supervisor Action Buttons (Cols 9-12) */}
                <div className="lg:col-span-3 flex flex-col sm:flex-row lg:flex-col gap-2.5 justify-center">
                  <button
                    onClick={() => handleOpenAction(rec, 'verify')}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Approve &amp; Verify</span>
                  </button>

                  <button
                    onClick={() => handleOpenAction(rec, 'correction')}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Request Correction</span>
                  </button>

                  <Link
                    to={`/maintenance/${rec.id}`}
                    className="w-full inline-flex items-center justify-center gap-1 px-4 py-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Full Audit View</span>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Verification Dialog Modal */}
      {selectedRecord && (
        <VerificationModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          record={selectedRecord}
          mode={modalMode}
          onSuccess={handleVerificationSuccess}
        />
      )}
    </div>
  );
};
