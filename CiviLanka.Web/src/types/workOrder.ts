export interface WorkOrderItem {
  id: string;
  itemType: 'Material' | 'Labour' | 'Equipment';
  itemName: string;
  quantity: number;
  unit: string;
  estimatedUnitCost: number;
  estimatedTotalCost: number;
}

export interface CostEstimate {
  id: string;
  estimatedCost: number;
  currency: string;
  materialCost: number;
  labourCost: number;
  equipmentCost: number;
  estimatedLabourHours: number;
  recommendedCrewSize: number;
  estimatedDurationHours: number;
  confidence: number;
  reason: string;
  modelName: string;
  createdAt: string;
}

export interface WorkOrderAIAnalysis {
  id: string;
  agentName: string;
  estimatedCost: number;
  recommendation: string;
  reason: string;
  confidence: number;
  createdAt: string;
}

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  hazardId?: string;
  hazardTicket?: string;
  hazardCategory?: string;
  hazardDescription?: string;
  hazardSeverity?: string;
  hazardPriority?: string;
  hazardLatitude?: number;
  hazardLongitude?: number;
  hazardAddress?: string;

  assetId?: string;
  assetName?: string;
  assetType?: string;
  assetCondition?: string;

  title: string;
  description: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  severity?: string;

  estimatedCost?: number;
  approvedBudget?: number;
  actualCost?: number;
  estimatedDurationHours?: number;
  recommendedCrewSize?: number;

  assignedContractorId?: number;
  assignedContractorName?: string;
  assignedCrew?: string;
  scheduledDate?: string;

  status:
    | 'AI_GENERATED'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'REJECTED'
    | 'ASSIGNED'
    | 'SCHEDULED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'VERIFIED'
    | 'CLOSED'
    | 'CANCELLED';

  approvalStatus: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
  approvalRequired: boolean;
  isArterialRoad?: boolean;
  approvalReason?: 'None' | 'ThresholdExceeded' | 'ArterialRoadRisk' | 'Both' | string;
  notes?: string;

  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isCancelled: boolean;

  items: WorkOrderItem[];
  latestCostEstimate?: CostEstimate;
  latestAIAnalysis?: WorkOrderAIAnalysis;
}

export interface CreateWorkOrderInput {
  hazardId?: string;
  assetId?: string;
  title: string;
  description: string;
  priority: string;
  estimatedCost?: number;
}

export interface UpdateWorkOrderInput {
  title?: string;
  description?: string;
  priority?: string;
  assignedContractorId?: number;
  assignedCrew?: string;
  scheduledDate?: string;
  estimatedCost?: number;
  approvedBudget?: number;
  actualCost?: number;
  status?: string;
  notes?: string;
}

export interface CostEstimateInput {
  hazardId?: string;
  assetId?: string;
  category?: string;
  description?: string;
  severity?: string;
  priority?: string;
}
