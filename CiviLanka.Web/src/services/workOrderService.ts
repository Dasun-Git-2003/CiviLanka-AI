import { apiClient } from './apiService';
import type {
  WorkOrder,
  CreateWorkOrderInput,
  UpdateWorkOrderInput,
  CostEstimate,
  CostEstimateInput,
  SaveWorkOrderEstimateDto,
  CostEstimatePreviewResponse,
} from '../types/workOrder';

export const workOrderService = {
  // ── Work Order CRUD ──────────────────────────────────────────────────────────

  async getAll(): Promise<WorkOrder[]> {
    const res = await apiClient.get<WorkOrder[]>('/api/workorders');
    return res.data;
  },

  async getById(id: string): Promise<WorkOrder> {
    const res = await apiClient.get<WorkOrder>(`/api/workorders/${id}`);
    return res.data;
  },

  async getByStatus(status: string): Promise<WorkOrder[]> {
    const res = await apiClient.get<WorkOrder[]>(`/api/workorders/status/${status}`);
    return res.data;
  },

  async getPendingApproval(): Promise<WorkOrder[]> {
    const res = await apiClient.get<WorkOrder[]>('/api/workorders/pending-approval');
    return res.data;
  },

  async getByHazardId(hazardId: string): Promise<WorkOrder[]> {
    const res = await apiClient.get<WorkOrder[]>(`/api/workorders/hazard/${hazardId}`);
    return res.data;
  },

  async create(data: CreateWorkOrderInput): Promise<WorkOrder> {
    const res = await apiClient.post<WorkOrder>('/api/workorders', data);
    return res.data;
  },

  async update(id: string, data: UpdateWorkOrderInput): Promise<WorkOrder> {
    const res = await apiClient.put<WorkOrder>(`/api/workorders/${id}`, data);
    return res.data;
  },

  async cancel(id: string): Promise<void> {
    await apiClient.delete(`/api/workorders/${id}`);
  },

  async updateStatus(id: string, status: string, notes?: string): Promise<WorkOrder> {
    const res = await apiClient.put<WorkOrder>(`/api/workorders/${id}/status`, { status, notes });
    return res.data;
  },

  // ── AI Cost Estimation ───────────────────────────────────────────────────────

  async generateEstimate(id: string, overrideData?: CostEstimateInput): Promise<WorkOrder> {
    const res = await apiClient.post<WorkOrder>(`/api/workorders/${id}/estimate`, overrideData || {});
    return res.data;
  },

  async previewEstimate(input: CostEstimateInput): Promise<CostEstimatePreviewResponse> {
    const res = await apiClient.post<CostEstimatePreviewResponse>('/api/workorders/preview-estimate', input);
    return res.data;
  },

  async previewEstimateForWorkOrder(id: string, overrideData?: CostEstimateInput): Promise<CostEstimatePreviewResponse> {
    const res = await apiClient.post<CostEstimatePreviewResponse>(`/api/workorders/${id}/preview-estimate`, overrideData || {});
    return res.data;
  },

  async saveCustomEstimate(id: string, data: SaveWorkOrderEstimateDto): Promise<WorkOrder> {
    const res = await apiClient.put<WorkOrder>(`/api/workorders/${id}/estimate`, data);
    return res.data;
  },

  async getEstimate(id: string): Promise<CostEstimate> {
    const res = await apiClient.get<CostEstimate>(`/api/workorders/${id}/estimate`);
    return res.data;
  },

  // ── Director Approval ────────────────────────────────────────────────────────

  async approve(id: string, notes?: string): Promise<WorkOrder> {
    const res = await apiClient.post<WorkOrder>(`/api/workorders/${id}/approve`, { notes });
    return res.data;
  },

  async reject(id: string, notes?: string): Promise<WorkOrder> {
    const res = await apiClient.post<WorkOrder>(`/api/workorders/${id}/reject`, { notes });
    return res.data;
  },

  // ── Integrations with Member 1 & 2 ──────────────────────────────────────────

  async getHazards(): Promise<any[]> {
    try {
      const res = await apiClient.get<any[]>('/api/hazards');
      return res.data;
    } catch {
      return [];
    }
  },

  async getAssets(): Promise<any[]> {
    try {
      const res = await apiClient.get<any[]>('/api/assets');
      return res.data;
    } catch {
      return [];
    }
  },

  async getContractors(): Promise<any[]> {
    try {
      const res = await apiClient.get<any[]>('/api/contractors');
      return res.data;
    } catch {
      return [];
    }
  },
};
