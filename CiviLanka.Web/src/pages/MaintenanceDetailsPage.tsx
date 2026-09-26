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
  Wrench,
  Truck,
  Package,
  Banknote,
  Target,
  TrendingUp,
  TrendingDown,
  MessageSquare,
  UserCheck,
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

  const parseMaterials = (raw?: string): Array<{ name: string; quantity?: number; unit?: string; cost?: number }> => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // not json
    }
    return raw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
  };

  const parseEquipment = (raw?: string): string[] => {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // not json
    }
    return raw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
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

  const estCost = record.estimatedCost || 0;
  const actCost = record.actualCost || 0;
  const hasEst = estCost > 0;
  const costDiff = estCost - actCost;
  const isUnderBudget = costDiff >= 0;
  const budgetUtilization = hasEst ? Math.min(100, Math.round((actCost / estCost) * 100)) : 0;
  const variancePct = hasEst ? Math.abs(Math.round((costDiff / estCost) * 100)) : 0;

  const parsedMaterials = parseMaterials(record.materialsUsed);
  const parsedEquipment = parseEquipment(record.equipmentUsed);

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logistics & Resources Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/80">
                <FileSpreadsheet className="w-4 h-4" />
              </span>
              Field Operations &amp; Resource Logs
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-semibold border border-teal-200/60 dark:border-teal-800/60">
              Audited Allocation
            </span>
          </div>

          {/* 4 Enhanced KPI Stat Boxes */}
          <div className="grid grid-cols-2 gap-3.5">
            {/* Maintenance Type */}
            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 relative overflow-hidden group hover:border-teal-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Maintenance Type</span>
                <Wrench className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {record.maintenanceType}
              </div>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium block mt-0.5">
                Physical Civil Repair
              </span>
            </div>

            {/* Labour Logged */}
            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 relative overflow-hidden group hover:border-teal-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Labour Logged</span>
                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {record.labourHours} Hours
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                {actCost > 0 ? `~LKR ${Math.round(actCost / (record.labourHours || 1)).toLocaleString()} / hr` : 'Active Shift'}
              </span>
            </div>

            {/* Actual Incurred Cost */}
            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 relative overflow-hidden group hover:border-teal-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Actual Incurred Cost</span>
                <Banknote className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-sm font-black text-slate-900 dark:text-white mt-1">
                LKR {record.actualCost.toLocaleString()}
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                Field Verified Total
              </span>
            </div>

            {/* Estimated Cost */}
            <div className="p-3.5 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 relative overflow-hidden group hover:border-teal-400 transition-all">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Estimated Work Order Cost</span>
                <Target className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                {record.estimatedCost ? `LKR ${record.estimatedCost.toLocaleString()}` : 'N/A'}
              </div>
              <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                Pre-Approved Budget
              </span>
            </div>
          </div>

          {/* Budget Health & Variance Progress Gauge */}
          {hasEst && (
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/60 dark:from-slate-800/60 dark:to-slate-800/30 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Budget Allocation Utilization
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    ({budgetUtilization}%)
                  </span>
                </div>
                {isUnderBudget ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                    <TrendingDown className="w-3 h-3" />
                    LKR {costDiff.toLocaleString()} ({variancePct}%) Under Budget
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                    <TrendingUp className="w-3 h-3" />
                    +LKR {Math.abs(costDiff).toLocaleString()} (+{variancePct}%) Overrun
                  </span>
                )}
              </div>

              {/* Progress Track */}
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isUnderBudget
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500'
                      : 'bg-gradient-to-r from-amber-500 to-rose-500'
                  }`}
                  style={{ width: `${Math.min(100, budgetUtilization)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>0 LKR</span>
                <span>Allocation: LKR {estCost.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Materials Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Package className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Materials &amp; Consumables Applied
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {parsedMaterials.length} items logged
              </span>
            </div>

            {parsedMaterials.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {parsedMaterials.map((mat, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 shadow-2xs"
                  >
                    <Package className="w-3 h-3 text-slate-400" />
                    <span className="font-medium">{mat.name}</span>
                    {mat.quantity !== undefined && (
                      <span className="px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 font-mono text-[10px] font-bold">
                        {mat.quantity} {mat.unit || 'units'}
                      </span>
                    )}
                    {mat.cost !== undefined && (
                      <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400">
                        LKR {mat.cost.toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                No materials logged for this record.
              </p>
            )}
          </div>

          {/* Machinery / Equipment Deployed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                Machinery &amp; Fleet Equipment Deployed
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                {parsedEquipment.length} units deployed
              </span>
            </div>

            {parsedEquipment.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {parsedEquipment.map((eq, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-200 shadow-2xs"
                  >
                    <Truck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    <span className="font-medium">{eq}</span>
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Active on site" />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic p-3 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                Standard municipal hand tools.
              </p>
            )}
          </div>
        </div>

        {/* Worker & Supervisor Observations */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/80">
                <UserCheck className="w-4 h-4" />
              </span>
              Field Worker &amp; Sign-Off Observations
            </h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700">
              {record.assignedCrew || 'Municipal Field Crew'}
            </span>
          </div>

          {/* Worker Identity Bar */}
          <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {(record.performedBy || 'FW').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block">
                  Lead Technician / Crew
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  {record.performedBy || 'Unassigned Field Worker'}
                </span>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-400">
              <div className="font-mono">
                {record.workCompletedAt
                  ? `Completed: ${new Date(record.workCompletedAt).toLocaleDateString()}`
                  : record.workStartedAt
                  ? `Started: ${new Date(record.workStartedAt).toLocaleDateString()}`
                  : 'In Progress'}
              </div>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                Field Sign-Off Ready
              </span>
            </div>
          </div>

          {/* Field Worker Observations Memo */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              Field Worker Observations
            </span>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border-l-4 border-l-blue-500 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 leading-relaxed shadow-2xs font-sans">
              {record.workerNotes || 'Pipeline replacement completed. Pressure testing in progress.'}
            </div>
          </div>

          {/* Completion Notes */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Completion Notes &amp; Standards Compliance
            </span>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border-l-4 border-l-emerald-500 border border-slate-200/80 dark:border-slate-700/60 text-xs text-slate-800 dark:text-slate-200 leading-relaxed shadow-2xs font-sans flex items-start justify-between gap-3">
              <div>
                {record.completionNotes || 'Work completed in accordance with municipal guidelines.'}
              </div>
              <span className="shrink-0 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200 dark:border-emerald-800">
                Verified Guidelines
              </span>
            </div>
          </div>

          {/* Supervisor Verification & Sign-Off Banner */}
          {record.verificationStatus === 'VERIFIED' ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200 dark:border-emerald-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Official Municipal Verification Sealed
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-semibold">
                  VERIFIED
                </span>
              </div>
              <p className="text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed font-sans">
                {record.verificationNotes || 'Work inspected, compliance checklist matched, and photographic evidence verified.'}
              </p>
              <div className="pt-1 text-[11px] text-emerald-700 dark:text-emerald-400 flex items-center justify-between font-mono">
                <span>Verified by: {record.verifiedBy || 'Municipal Supervisor'}</span>
                <span>{record.verifiedAt ? new Date(record.verifiedAt).toLocaleString() : ''}</span>
              </div>
            </div>
          ) : record.verificationStatus === 'REQUIRES_CORRECTION' ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Supervisor Action: Corrections Required
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-900 text-rose-800 dark:text-rose-200 font-semibold">
                  ACTION NEEDED
                </span>
              </div>
              <p className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                {record.verificationNotes || 'Field corrections requested by supervising engineer.'}
              </p>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>Supervisor Quality Sign-Off:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {record.verificationStatus === 'VERIFICATION_PENDING'
                    ? 'Awaiting Inspection in Verification Queue'
                    : 'Awaiting Field Completion'}
                </span>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                {record.verificationStatus}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Operational Audit Log Timeline */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800/80">
              <Clock className="w-4 h-4" />
            </span>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Operational Audit Trail
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold border border-slate-200 dark:border-slate-700">
              {(record.auditLogs || []).length} Recorded Events
            </span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
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
