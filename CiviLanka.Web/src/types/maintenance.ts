export type MaintenanceStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED'
  | 'REQUIRES_CORRECTION'
  | 'CANCELLED';

export type VerificationStatus =
  | 'UNVERIFIED'
  | 'VERIFICATION_PENDING'
  | 'VERIFIED'
  | 'REQUIRES_CORRECTION';

export type SafetyRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ComplianceStatus = 'PASS' | 'REQUIRES_REVIEW' | 'FAILED';

export interface SafetyAnalysisResponse {
  id: string;
  maintenanceRecordId: string;
  workOrderId: string;
  agentName: string;
  safetyRiskLevel: SafetyRiskLevel;
  complianceStatus: ComplianceStatus;
  confidence: number;
  identifiedRisks: string[];
  missingRequirements: string[];
  requiredSafetyActions: string[];
  recommendation: string;
  reason: string;
  createdAt: string;
}

export interface MaintenanceAuditLog {
  id: string;
  maintenanceRecordId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  previousStatus?: string;
  newStatus?: string;
  description: string;
}

export interface MaintenanceRecord {
  id: string;
  workOrderId: string;
  workOrderNumber?: string;
  workOrderTitle?: string;
  workOrderPriority?: string;
  workOrderSeverity?: string;
  workOrderStatus?: string;
  estimatedCost?: number;
  location?: string;
  hazardCategory?: string;
  hazardTicket?: string;
  assignedCrew?: string;

  assetId?: string;
  assetName?: string;
  assetType?: string;
  assetCondition?: string;

  performedBy: string;
  maintenanceType: string;
  description: string;

  workStartedAt?: string;
  workCompletedAt?: string;
  status: MaintenanceStatus;

  materialsUsed?: string;
  equipmentUsed?: string;
  labourHours: number;
  actualCost: number;

  beforeImageUrl?: string;
  afterImageUrl?: string;
  safetyChecklist?: string;
  workerNotes?: string;
  completionNotes?: string;

  verificationStatus: VerificationStatus;
  verifiedBy?: string;
  verifiedAt?: string;
  verificationNotes?: string;

  createdAt: string;
  updatedAt: string;

  latestSafetyAnalysis?: SafetyAnalysisResponse;
  auditLogCount: number;
  auditLogs?: MaintenanceAuditLog[];
}

export interface CreateMaintenanceRecordRequest {
  workOrderId: string;
  assetId?: string;
  maintenanceType: string;
  description: string;
  materialsUsed?: string;
  equipmentUsed?: string;
  labourHours: number;
  actualCost: number;
  safetyChecklist?: string;
  workerNotes?: string;
}

export interface UpdateMaintenanceRecordRequest {
  maintenanceType?: string;
  description?: string;
  workStartedAt?: string;
  workCompletedAt?: string;
  status?: string;
  materialsUsed?: string;
  equipmentUsed?: string;
  labourHours?: number;
  actualCost?: number;
  beforeImageUrl?: string;
  afterImageUrl?: string;
  safetyChecklist?: string;
  workerNotes?: string;
  completionNotes?: string;
}

export interface UpdateMaintenanceStatusRequest {
  status: MaintenanceStatus;
  notes?: string;
}

export interface VerifyMaintenanceRequest {
  notes?: string;
}

export interface RequestCorrectionRequest {
  requiredCorrections: string;
  notes?: string;
}
