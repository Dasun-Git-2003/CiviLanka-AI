import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const getStatusConfig = (s: string) => {
    switch (s) {
      case 'AI_GENERATED':
        return { label: 'AI Generated', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' };
      case 'PENDING_APPROVAL':
        return { label: 'Pending Approval', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' };
      case 'APPROVED':
        return { label: 'Approved', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' };
      case 'REJECTED':
        return { label: 'Rejected', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' };
      case 'ASSIGNED':
        return { label: 'Assigned', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' };
      case 'SCHEDULED':
        return { label: 'Scheduled', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' };
      case 'IN_PROGRESS':
        return { label: 'In Progress', bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' };
      case 'COMPLETED':
        return { label: 'Completed', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200' };
      case 'VERIFIED':
        return { label: 'Verified', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' };
      case 'CLOSED':
        return { label: 'Closed', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
      case 'CANCELLED':
        return { label: 'Cancelled', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' };
      default:
        return { label: s, bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' };
    }
  };

  const config = getStatusConfig(status);
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs font-semibold' : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center rounded-full border ${config.bg} ${config.text} ${config.border} ${sizeClasses}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-75" />
      {config.label}
    </span>
  );
};
