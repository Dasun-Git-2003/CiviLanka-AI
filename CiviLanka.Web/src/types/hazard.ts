export interface HazardAIAnalysisDto {
  id: string;
  category?: string;
  severity: string;
  riskLevel: string;
  priority: string;
  confidence: number;
  reason: string;
  modelName: string;
  createdAt: string;
}

export interface HazardDto {
  id: string;
  ticketNumber: string;
  citizenId: string;
  citizenName?: string;
  category: string;
  description: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  imageUrl?: string;
  status: string;
  severity?: string;
  priority?: string;
  riskLevel?: string;
  createdAt: string;
  updatedAt?: string;
  isCancelled?: boolean;
  latestAIAnalysis?: HazardAIAnalysisDto;
  linkedWorkOrderId?: string;
  linkedWorkOrderNumber?: string;
  linkedWorkOrderStatus?: string;
  reviewNotes?: string;
}

export interface ReviewHazardPayload {
  action: 'APPROVE' | 'REJECT';
  reviewNotes?: string;
  category?: string;
  priority?: string;
  severity?: string;
}
