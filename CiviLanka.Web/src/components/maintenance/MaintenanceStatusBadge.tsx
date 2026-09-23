import React from 'react';
import type { MaintenanceStatus, VerificationStatus } from '../../types/maintenance';
import { CheckCircle2, Clock, PlayCircle, AlertTriangle, ShieldCheck, XCircle, ArrowRight } from 'lucide-react';

interface StatusBadgeProps {
  status: MaintenanceStatus | string;
  size?: 'sm' | 'md' | 'lg';
}

export const MaintenanceStatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  switch (status?.toUpperCase()) {
    case 'PENDING':
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses[size]}`}>
          <Clock className="w-3 h-3 text-slate-500" />
          Pending
        </span>
      );
    case 'ASSIGNED':
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClasses[size]}`}>
          <ArrowRight className="w-3 h-3 text-blue-500" />
          Assigned
        </span>
      );
    case 'IN_PROGRESS':
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses[size]}`}>
          <PlayCircle className="w-3 h-3 text-amber-600 animate-pulse" />
          In Progress
        </span>
      );
    case 'COMPLETED':
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 ${sizeClasses[size]}`}>
          <CheckCircle2 className="w-3 h-3 text-indigo-600" />
          Completed
        </span>
      );
    case 'VERIFICATION_PENDING':
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${sizeClasses[size]}`}>
          <ShieldCheck className="w-3 h-3 text-purple-600" />
          Verification Pending
        </span>
      );
    case 'VERIFIED':
      return (
        <span className={`inline-flex items-center font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs ${sizeClasses[size]}`}>
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Verified
        </span>
      );
    case 'REQUIRES_CORRECTION':
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClasses[size]}`}>
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          Requires Correction
        </span>
      );
    case 'CANCELLED':
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-500 border border-slate-300 ${sizeClasses[size]}`}>
          <XCircle className="w-3 h-3 text-slate-400" />
          Cancelled
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-200 ${sizeClasses[size]}`}>
          {status || 'Unknown'}
        </span>
      );
  }
};

export const VerificationStatusBadge: React.FC<{ status: VerificationStatus | string }> = ({ status }) => {
  switch (status?.toUpperCase()) {
    case 'VERIFIED':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-300">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Pass
        </span>
      );
    case 'VERIFICATION_PENDING':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
          <Clock className="w-3 h-3 text-purple-500" /> Pending Review
        </span>
      );
    case 'REQUIRES_CORRECTION':
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3 h-3 text-rose-500" /> Needs Correction
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          Unverified
        </span>
      );
  }
};
