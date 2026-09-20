import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  ExternalLink,
  ShieldCheck,
  User,
  MapPin,
  Trash2,
  Calendar,
  Layers,
  PlayCircle,
} from 'lucide-react';
import { maintenanceService } from '../services/maintenanceService';
import type { MaintenanceRecord } from '../types/maintenance';
import { MaintenanceStatusBadge, VerificationStatusBadge } from '../components/maintenance/MaintenanceStatusBadge';
import { SafetyRiskBadge } from '../components/maintenance/SafetyRiskBadge';
import { AISafetyAnalysisCard } from '../components/maintenance/AISafetyAnalysisCard';
import { SafetyChecklistPanel } from '../components/maintenance/SafetyChecklistPanel';
import { EvidenceUploadModal } from '../components/maintenance/EvidenceUploadModal';
import { VerificationModal } from '../components/maintenance/VerificationModal';
import { AuditLogTimeline } from '../components/maintenance/AuditLogTimeline';

export const MaintenanceDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<MaintenanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Evidence upload modal state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState<'before' | 'after'>('before');

  // Verification modal state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyMode, setVerifyMode] = useState<'verify' | 'correction'>('verify');

  // Updating status inline state
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadRecord = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await maintenanceService.getById(id);
      setRecord(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch maintenance record.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecord();
  }, [id]);

  const handleStatusChange = async (newStatus: any, notes?: string) => {
    if (!record) return;
    try {
      setStatusUpdating(true);
      const updated = await maintenanceService.updateStatus(record.id, {
        status: newStatus,
        notes: notes || `Status transitioned to ${newStatus}`,
      });
      setRecord(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSaveChecklist = async (serialized: string) => {
    if (!record) return;
    const updated = await maintenanceService.update(record.id, {
      safetyChecklist: serialized,
    });
    setRecord(updated);
  };

  const handleEvidenceUploaded = (url: string) => {
    if (!record) return;
    if (uploadType === 'before') {
      setRecord({ ...record, beforeImageUrl: url });
    } else {
      setRecord({ ...record, afterImageUrl: url });
    }
    loadRecord();
  };

  const handleSoftDelete = async () => {
    if (!record) return;
    if (!window.confirm('Are you sure you want to cancel this maintenance operation?')) return;
    try {
      await maintenanceService.softDelete(record.id);
      navigate('/maintenance');
    } catch (err: any) {
      alert(err.message || 'Failed to cancel maintenance.');
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-slate-500">
        <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Loading maintenance record details...
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="p-8 max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">Record Not Found</h2>
        <p className="text-xs text-slate-500">{error || 'Unable to locate maintenance record.'}</p>
        <Link
          to="/maintenance"
          className="inline-flex items-center gap-1 px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Maintenance Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Breadcrumbs & Nav */}
      <div className="flex items-center justify-between">
        <Link
          to="/maintenance"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Maintenance Dashboard
        </Link>
        <div className="flex items-center gap-2">
          {record.status !== 'CANCELLED' && record.verificationStatus !== 'VERIFIED' && (
            <button
              onClick={handleSoftDelete}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Cancel Record
            </button>
          )}
        </div>
      </div>

      {/* Main Record Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold">
                MNT-{record.id.slice(0, 8).toUpperCase()}
              </span>
              <MaintenanceStatusBadge status={record.status} size="md" />
              <VerificationStatusBadge status={record.verificationStatus} />
              {record.latestSafetyAnalysis && (
                <SafetyRiskBadge level={record.latestSafetyAnalysis.safetyRiskLevel} />
              )}
            </div>

            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {record.workOrderTitle || record.description}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
              <div className="flex items-center gap-1 text-teal-700 font-semibold">
                <Layers className="w-3.5 h-3.5 text-teal-600" />
                <Link
                  to={`/work-orders/${record.workOrderId}`}
                  className="hover:underline flex items-center gap-0.5"
                >
                  {record.workOrderNumber || 'Linked Work Order'}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {record.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{record.location}</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Crew: {record.performedBy || 'Unassigned'}</span>
              </div>

              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Created {new Date(record.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Status Transition Actions */}
          <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
            {record.status === 'PENDING' && (
              <button
                onClick={() => handleStatusChange('ASSIGNED', 'Field worker assigned')}
                disabled={statusUpdating}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs"
              >
                Assign Crew
              </button>
            )}

            {record.status === 'ASSIGNED' && (
              <button
                onClick={() => handleStatusChange('IN_PROGRESS', 'Crew commenced field work')}
                disabled={statusUpdating}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <PlayCircle className="w-3.5 h-3.5" /> Start Work
              </button>
            )}

            {record.status === 'IN_PROGRESS' && (
              <button
                onClick={() => handleStatusChange('COMPLETED', 'Field physical repairs completed')}
                disabled={statusUpdating}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Field Completed
              </button>
            )}

            {record.status === 'COMPLETED' && (
              <button
                onClick={() =>
                  handleStatusChange(
                    'VERIFICATION_PENDING',
                    'Worker submitted for supervisor verification'
                  )
                }
                disabled={statusUpdating}
                className="px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Submit For Verification
              </button>
            )}

            {(record.status === 'VERIFICATION_PENDING' || record.verificationStatus === 'VERIFICATION_PENDING') && (
              <>
                <button
                  onClick={() => {
                    setVerifyMode('verify');
                    setVerifyModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Sign-Off &amp; Verify
                </button>
                <button
                  onClick={() => {
                    setVerifyMode('correction');
                    setVerifyModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Request Correction
                </button>
              </>
            )}

            {record.status === 'REQUIRES_CORRECTION' && (
              <button
                onClick={() => handleStatusChange('IN_PROGRESS', 'Worker resumed work to resolve corrections')}
                disabled={statusUpdating}
                className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs flex items-center gap-1.5"
              >
                <PlayCircle className="w-3.5 h-3.5" /> Resume Work on Corrections
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Photographic Evidence (Side-by-Side Before & After) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-teal-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Photographic Evidence Verification
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Mandatory dual photographic verification required before supervisor sign-off
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before Photo */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col">
            <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Before Maintenance
              </span>
              <button
                onClick={() => {
                  setUploadType('before');
                  setUploadModalOpen(true);
                }}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                {record.beforeImageUrl ? 'Replace Photo' : 'Upload Before Photo'}
              </button>
            </div>
            <div className="h-64 flex items-center justify-center p-2">
              {record.beforeImageUrl ? (
                <img
                  src={record.beforeImageUrl}
                  alt="Before Maintenance"
                  className="max-h-full max-w-full object-contain rounded-lg shadow-2xs"
                />
              ) : (
                <div className="text-center text-slate-400 p-6">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No initial site photo uploaded</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Click above to upload before-repair evidence</p>
                </div>
              )}
            </div>
          </div>

          {/* After Photo */}
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col">
            <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                After Maintenance (Completion)
              </span>
              <button
                onClick={() => {
                  setUploadType('after');
                  setUploadModalOpen(true);
                }}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold inline-flex items-center gap-1"
              >
                <Camera className="w-3.5 h-3.5" />
                {record.afterImageUrl ? 'Replace Photo' : 'Upload After Photo'}
              </button>
            </div>
            <div className="h-64 flex items-center justify-center p-2">
              {record.afterImageUrl ? (
                <img
                  src={record.afterImageUrl}
                  alt="After Maintenance"
                  className="max-h-full max-w-full object-contain rounded-lg shadow-2xs"
                />
              ) : (
                <div className="text-center text-slate-400 p-6">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">No completion photo uploaded</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Required to pass safety &amp; compliance verification</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI Safety & Compliance Agent Card */}
      <AISafetyAnalysisCard
        maintenanceId={record.id}
        analysis={record.latestSafetyAnalysis}
        onAnalysisUpdated={(newAnalysis) => {
          setRecord({
            ...record,
            latestSafetyAnalysis: newAnalysis,
          });
        }}
        canTriggerAudit={record.status !== 'CANCELLED'}
      />

      {/* Safety Checklist Panel */}
      <SafetyChecklistPanel
        initialChecklist={record.safetyChecklist}
        readOnly={record.verificationStatus === 'VERIFIED' || record.status === 'CANCELLED'}
        onSave={handleSaveChecklist}
      />

      {/* Operational Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Logistics & Resources Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-600" />
            Field Operations &amp; Resource Logs
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium">Maintenance Type</span>
              <div className="text-sm font-bold text-slate-800 mt-0.5">{record.maintenanceType}</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium">Labour Logged</span>
              <div className="text-sm font-bold text-slate-800 mt-0.5">{record.labourHours} Hours</div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium">Actual Incurred Cost</span>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                LKR {record.actualCost.toLocaleString()}
              </div>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-400 font-medium">Estimated Work Order Cost</span>
              <div className="text-sm font-bold text-slate-800 mt-0.5">
                {record.estimatedCost ? `LKR ${record.estimatedCost.toLocaleString()}` : 'N/A'}
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <span className="text-xs font-semibold text-slate-600">Materials Applied:</span>
              <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
                {record.materialsUsed || 'None documented.'}
              </p>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-600">Machinery / Equipment Deployed:</span>
              <p className="text-xs text-slate-800 bg-slate-50 p-2.5 rounded-lg border border-slate-100 mt-1">
                {record.equipmentUsed || 'Standard hand tools.'}
              </p>
            </div>
          </div>
        </div>

        {/* Worker & Supervisor Observations */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <User className="w-4 h-4 text-teal-600" />
            Field Worker &amp; Sign-Off Observations
          </h3>

          <div className="space-y-3">
            <div>
              <span className="text-xs font-semibold text-slate-600">Field Worker Observations:</span>
              <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1 leading-relaxed">
                {record.workerNotes || 'No specific field worker notes recorded.'}
              </p>
            </div>

            <div>
              <span className="text-xs font-semibold text-slate-600">Completion Notes:</span>
              <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1 leading-relaxed">
                {record.completionNotes || 'Work completed in accordance with municipal guidelines.'}
              </p>
            </div>

            {record.verificationNotes && (
              <div>
                <span className="text-xs font-semibold text-emerald-800">Supervisor Verification Notes:</span>
                <p className="text-xs text-emerald-900 bg-emerald-50/70 p-3 rounded-lg border border-emerald-200 mt-1 leading-relaxed">
                  {record.verificationNotes}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Operational Audit Log Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-600" />
            Operational Audit Trail
          </h3>
          <span className="text-xs text-slate-400">
            Immutable log of state transitions &amp; compliance checks
          </span>
        </div>
        <AuditLogTimeline logs={record.auditLogs || []} />
      </div>

      {/* Modals */}
      <EvidenceUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        maintenanceId={record.id}
        imageType={uploadType}
        onUploaded={handleEvidenceUploaded}
      />

      <VerificationModal
        isOpen={verifyModalOpen}
        onClose={() => setVerifyModalOpen(false)}
        record={record}
        mode={verifyMode}
        onSuccess={(updated) => setRecord(updated)}
      />
    </div>
  );
};
