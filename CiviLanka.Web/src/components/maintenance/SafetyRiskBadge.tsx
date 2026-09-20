import React from 'react';
import type { SafetyRiskLevel } from '../../types/maintenance';
import { ShieldAlert, ShieldCheck, AlertCircle, Flame } from 'lucide-react';

interface SafetyRiskBadgeProps {
  level: SafetyRiskLevel | string;
  showIcon?: boolean;
}

export const SafetyRiskBadge: React.FC<SafetyRiskBadgeProps> = ({ level, showIcon = true }) => {
  switch (level?.toUpperCase()) {
    case 'LOW':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {showIcon && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
          Low Risk
        </span>
      );
    case 'MEDIUM':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          {showIcon && <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
          Medium Risk
        </span>
      );
    case 'HIGH':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
          {showIcon && <ShieldAlert className="w-3.5 h-3.5 text-orange-600" />}
          High Risk
        </span>
      );
    case 'CRITICAL':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-300 animate-pulse">
          {showIcon && <Flame className="w-3.5 h-3.5 text-rose-600" />}
          CRITICAL RISK
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
          {level || 'Unassessed'}
        </span>
      );
  }
};
