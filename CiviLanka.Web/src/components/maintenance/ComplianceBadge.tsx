import React from 'react';
import type { ComplianceStatus } from '../../types/maintenance';
import { CheckCircle2, AlertTriangle, XOctagon } from 'lucide-react';

interface ComplianceBadgeProps {
  status: ComplianceStatus | string;
}

export const ComplianceBadge: React.FC<ComplianceBadgeProps> = ({ status }) => {
  switch (status?.toUpperCase()) {
    case 'PASS':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          COMPLIANCE: PASS
        </span>
      );
    case 'REQUIRES_REVIEW':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          REQUIRES REVIEW
        </span>
      );
    case 'FAILED':
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-300">
          <XOctagon className="w-4 h-4 text-rose-600" />
          COMPLIANCE: FAILED
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          {status || 'Pending Analysis'}
        </span>
      );
  }
};
