import React from 'react';

interface PriorityBadgeProps {
  priority: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const getPriorityStyle = (p: string) => {
    switch (p.toUpperCase()) {
      case 'URGENT':
        return 'bg-red-50 text-red-700 border-red-200 ring-red-500/20';
      case 'HIGH':
        return 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20';
      case 'NORMAL':
        return 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20';
      case 'LOW':
        return 'bg-slate-50 text-slate-600 border-slate-200 ring-slate-500/20';
      default:
        return 'bg-slate-50 text-slate-600 border-slate-200 ring-slate-500/20';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ring-1 ${getPriorityStyle(
        priority
      )}`}
    >
      {priority.toUpperCase()}
    </span>
  );
};
