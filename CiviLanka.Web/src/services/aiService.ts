import { apiClient, getErrorMessage } from './apiService';

export interface HazardClassificationResult {
  category: string;
  severity: string;
  riskLevel: string;
  priority: string;
  confidence: number;
  reason: string;
  recommendedAction: string;
  recommendedCrewSize: number;
  estimatedResponseHours: number;
  modelName: string;
  status: string;
  timestamp: string;
}

export interface AssetRiskResult {
  riskLevel: string;
  riskScore: number;
  confidence: number;
  conditionAssessment: string;
  failureLikelihood: string;
  reason: string;
  recommendedInspectionFrequency: string;
  recommendedAction: string;
  urgency: string;
  modelName: string;
  status: string;
  timestamp: string;
}

export interface MaterialItemEstimate {
  name: string;
  quantity: number;
  unit: string;
  estimatedUnitCost: number;
  totalCost: number;
}

export interface EquipmentItemEstimate {
  name: string;
  quantity: number;
}

export interface CostEstimateResult {
  estimatedCost: number;
  currency: string;
  materialCost: number;
  labourCost: number;
  equipmentCost: number;
  estimatedLabourHours: number;
  recommendedCrewSize: number;
  estimatedDurationHours: number;
  confidence: number;
  materials: MaterialItemEstimate[];
  equipment: EquipmentItemEstimate[];
  reason: string;
  recommendation?: string;
  requiresSupervisorApproval: boolean;
  requiresDirectorApproval: boolean;
  modelName: string;
  status: string;
  timestamp: string;
}

export interface SafetyComplianceResult {
  safetyRiskLevel: string;
  complianceStatus: string;
  confidence: number;
  identifiedRisks: string[];
  missingRequirements: string[];
  requiredSafetyActions: string[];
  recommendation: string;
  reason: string;
  requiresHumanReview: boolean;
  modelName: string;
  timestamp: string;
}

export interface AIWorkflowResult {
  workflowId: string;
  hazardId: string;
  hazardTicket: string;
  status: string;
  classification?: HazardClassificationResult;
  assetRisk?: AssetRiskResult;
  costEstimate?: CostEstimateResult;
  safetyCompliance?: SafetyComplianceResult;
  workflowSummary: string;
  requiresSupervisorApproval: boolean;
  requiresDirectorApproval: boolean;
  requiresHumanSafetyReview: boolean;
  overallConfidence: number;
  executedAt: string;
  warnings: string[];
}

export interface RankedHazardItem {
  hazardId: string;
  ticketNumber: string;
  dispatchRank: number;
  priorityScore: number;
  urgencyTier: string;
  reason: string;
}

export interface RouteCluster {
  clusterName: string;
  corridor: string;
  estimatedDistanceKm: number;
  estimatedTravelTimeMinutes: number;
  hazardTickets: string[];
  recommendedSequence: string[];
}

export interface SuggestedContractorAssignment {
  contractorId?: number;
  contractorName: string;
  specialization: string;
  recommendedCrewSize: number;
  assignmentRationale: string;
}

export interface DispatchPriorityResult {
  overallOptimizationScore: number;
  rankedHazards: RankedHazardItem[];
  routeClusters: RouteCluster[];
  suggestedAssignment: SuggestedContractorAssignment;
  tradeoffAnalysis: string;
  confidence: number;
  modelName: string;
  status: string;
  timestamp: string;
}

export interface DispatchPriorityRequestDto {
  hazardIds?: string[];
  targetCorridor?: string;
  preferredSpecialization?: string;
}

export interface SafetyAuditViolation {
  ruleCode: string;
  severity: string;
  description: string;
  remedialAction: string;
}

export interface MunicipalSafetyAuditResult {
  complianceStatus: string;
  complianceScore: number;
  safetyRulesPassed: boolean;
  budgetThresholdsApproved: boolean;
  completionEvidenceVerified: boolean;
  gpsVerificationPassed: boolean;
  violations: SafetyAuditViolation[];
  auditFindings: string;
  recommendation: string;
  requiresDirectorEscalation: boolean;
  confidence: number;
  modelName: string;
  status: string;
  timestamp: string;
}

export interface AIDashboardStats {
  totalInferences: number;
  averageConfidence: number;
  highRiskCount: number;
  pendingReviewCount: number;
  overrideCount: number;
  classifiedHazardsCount: number;
  assessedAssetsCount: number;
  estimatedWorkOrdersCount: number;
  auditedMaintenanceRecordsCount: number;
}

export interface AIOverrideRequestDto {
  targetEntityType: 'Hazard' | 'WorkOrder' | 'MaintenanceRecord' | 'Asset';
  targetEntityId: string;
  fieldOverridden: string;
  originalAIValue: string;
  newHumanValue: string;
  overrideReason: string;
}

export const aiService = {
  // ── Hazard Agent ──────────────────────────────────────────
  async analyzeHazard(hazardId: string): Promise<HazardClassificationResult> {
    try {
      const response = await apiClient.post<HazardClassificationResult>(`/api/ai/hazards/${hazardId}/analyze`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async getHazardAnalysis(hazardId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/ai/hazards/${hazardId}/analysis`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Asset Agent ───────────────────────────────────────────
  async analyzeAssetRisk(assetId: string): Promise<AssetRiskResult> {
    try {
      const response = await apiClient.post<AssetRiskResult>(`/api/ai/assets/${assetId}/analyze-risk`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async getAssetRiskAnalysis(assetId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/ai/assets/${assetId}/risk-analysis`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Cost & Material Estimator Agent ───────────────────────
  async estimateWorkOrder(workOrderId: string): Promise<CostEstimateResult> {
    try {
      const response = await apiClient.post<CostEstimateResult>(`/api/ai/workorders/${workOrderId}/estimate`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async getWorkOrderEstimate(workOrderId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/ai/workorders/${workOrderId}/estimate`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Safety & Compliance Agent ─────────────────────────────
  async analyzeSafety(maintenanceRecordId: string, stage: string = 'BeforeMaintenance'): Promise<SafetyComplianceResult> {
    try {
      const response = await apiClient.post<SafetyComplianceResult>(
        `/api/ai/maintenance/${maintenanceRecordId}/safety-analysis?stage=${encodeURIComponent(stage)}`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async getSafetyAnalysis(maintenanceRecordId: string): Promise<any> {
    try {
      const response = await apiClient.get(`/api/ai/maintenance/${maintenanceRecordId}/safety-analysis`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Full Multi-Agent Workflow ─────────────────────────────
  async runFullAssessment(hazardId: string): Promise<AIWorkflowResult> {
    try {
      const response = await apiClient.post<AIWorkflowResult>(`/api/ai/workflows/hazard/${hazardId}/full-assessment`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Human-in-the-Loop Override ───────────────────────────
  async overrideAI(request: AIOverrideRequestDto): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>('/api/ai/override', request);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Dispatch & Priority Agent ─────────────────────────────
  async optimizeDispatchAndRoute(dto?: DispatchPriorityRequestDto): Promise<DispatchPriorityResult> {
    try {
      const response = await apiClient.post<DispatchPriorityResult>('/api/ai/dispatch/optimize', dto || {});
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Municipal Safety & Audit Agent ────────────────────────
  async auditWorkOrderSafety(workOrderId: string): Promise<MunicipalSafetyAuditResult> {
    try {
      const response = await apiClient.post<MunicipalSafetyAuditResult>(`/api/ai/workorders/${workOrderId}/safety-audit`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // ── Live Telemetry Dashboard ──────────────────────────────
  async getDashboardStats(): Promise<AIDashboardStats> {
    try {
      const response = await apiClient.get<AIDashboardStats>('/api/ai/dashboard');
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};
