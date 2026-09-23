import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Building2, ArrowRight } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import type { WorkOrder } from '../types/workOrder';

interface WorkOrderCardProps {
  workOrder: WorkOrder;
}

export const WorkOrderCard: React.FC<WorkOrderCardProps> = ({ workOrder }) => {
  const formatLKR = (amount?: number) => {
    if (!amount) return 'Pending Est.';
    return `Rs. ${amount.toLocaleString('en-LK')}`;
  };

  const formattedDate = new Date(workOrder.createdAt).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <Link
      to={`/work-orders/${workOrder.id}`}
      className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
            {workOrder.workOrderNumber}
          </span>
          <h3 className="text-sm font-bold text-slate-900 mt-1.5 group-hover:text-indigo-600 transition-colors line-clamp-1">
            {workOrder.title}
          </h3>
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <PriorityBadge priority={workOrder.priority} />
          <StatusBadge status={workOrder.status} size="sm" />
        </div>
      </div>

      <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">{workOrder.description}</p>

      {/* Meta info */}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5 truncate">
          <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">{workOrder.assetName || 'Unassigned Asset'}</span>
        </div>

        <div className="flex items-center gap-1.5 truncate">
          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span className="truncate">{workOrder.hazardAddress || 'Municipal Zone'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
          <span>{formattedDate}</span>
        </div>

        <div className="text-right font-mono font-semibold text-slate-900 truncate">
          {formatLKR(workOrder.estimatedCost)}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-end text-xs font-semibold text-indigo-600 group-hover:translate-x-0.5 transition-transform">
        <span>View Details</span>
        <ArrowRight className="w-3.5 h-3.5 ml-1" />
      </div>
    </Link>
  );
};
