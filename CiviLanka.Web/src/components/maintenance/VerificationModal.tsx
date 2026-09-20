import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, X, CheckCircle2 } from 'lucide-react';
import { maintenanceService } from '../../services/maintenanceService';
import type { MaintenanceRecord } from '../../types/maintenance';

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: MaintenanceRecord;
  mode: 'verify' | 'correction';
  onSuccess: (updated: MaintenanceRecord) => void;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  record,
  mode,
  onSuccess,
}) => {
  const [notes, setNotes] = useState('');
  const [requiredCorrections, setRequiredCorrections] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isVerify = mode === 'verify';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      let updated: MaintenanceRecord;
      if (isVerify) {
        updated = await maintenanceService.verify(record.id, { notes });
      } else {
        if (!requiredCorrections.trim()) {
          setError('Required corrections description cannot be empty.');
          setSubmitting(false);
          return;
        }
        updated = await maintenanceService.requestCorrection(record.id, {
          requiredCorrections,
          notes,
        });
      }

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Operation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                isVerify ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
              }`}
            >
              {isVerify ? <ShieldCheck className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isVerify ? 'Supervisor Verification Approval' : 'Request Field Remediation'}
              </h3>
              <p className="text-xs text-slate-500">
                Record #{record.id.slice(0, 8)} &bull; WO: {record.workOrderNumber || 'N/A'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {isVerify ? (
            <div className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg text-xs text-emerald-800 leading-relaxed">
              <strong>Verification Standard:</strong> Approving this record confirms that photographic
              evidence matches the work order specifications and municipal safety standards have been met.
              This will transition the maintenance record to <span className="font-semibold">VERIFIED</span> and update
              the parent work order.
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Required Corrective Actions <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={requiredCorrections}
                onChange={(e) => setRequiredCorrections(e.target.value)}
                placeholder="Specify what the field worker or contractor must fix (e.g., surface compaction deficient, missing asphalt seal, cleanup needed)..."
                className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Supervisor Notes &amp; Observations
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal supervisor notes or sign-off remarks..."
              className="w-full text-xs p-3 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-lg shadow-xs transition-colors disabled:opacity-50 ${
                isVerify
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isVerify ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {submitting
                ? 'Processing...'
                : isVerify
                ? 'Sign-Off & Approve Verification'
                : 'Send Correction Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
