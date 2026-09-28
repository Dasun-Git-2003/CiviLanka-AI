import { apiClient, getErrorMessage } from './apiService';
import type {
  MaintenanceRecord,
  CreateMaintenanceRecordRequest,
  UpdateMaintenanceRecordRequest,
  UpdateMaintenanceStatusRequest,
  VerifyMaintenanceRequest,
  RequestCorrectionRequest,
  SafetyAnalysisResponse,
  MaintenanceAuditLog,
} from '../types/maintenance';

export const maintenanceService = {
  // 1. Get all maintenance records with optional filters
  getAll: async (params?: {
    status?: string;
    verificationStatus?: string;
    maintenanceType?: string;
    workOrderId?: string;
  }): Promise<MaintenanceRecord[]> => {
    try {
      const response = await apiClient.get<MaintenanceRecord[]>('/api/maintenance-records', {
        params,
      });
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 2. Get maintenance record by ID
  getById: async (id: string): Promise<MaintenanceRecord> => {
    try {
      const response = await apiClient.get<MaintenanceRecord>(`/api/maintenance-records/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 3. Get maintenance record by Work Order ID
  getByWorkOrderId: async (workOrderId: string): Promise<MaintenanceRecord> => {
    try {
      const response = await apiClient.get<MaintenanceRecord>(
        `/api/maintenance-records/work-order/${workOrderId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 3b. Get maintenance records by Asset ID (Repair History)
  getByAssetId: async (assetId: string): Promise<MaintenanceRecord[]> => {
    try {
      const response = await apiClient.get<MaintenanceRecord[]>(
        `/api/maintenance-records/asset/${assetId}`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 4. Get verification queue (records pending supervisor verification)
  getVerificationQueue: async (): Promise<MaintenanceRecord[]> => {
    try {
      const response = await apiClient.get<MaintenanceRecord[]>(
        '/api/maintenance-records/verification-queue'
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 5. Get assigned to current logged in worker
  getMyAssignments: async (): Promise<MaintenanceRecord[]> => {
    try {
      const response = await apiClient.get<MaintenanceRecord[]>('/api/maintenance-records/my-assigned');
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 6. Create new maintenance record
  create: async (data: CreateMaintenanceRecordRequest): Promise<MaintenanceRecord> => {
    try {
      const response = await apiClient.post<MaintenanceRecord>('/api/maintenance-records', data);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 7. Update maintenance record
  update: async (id: string, data: UpdateMaintenanceRecordRequest): Promise<MaintenanceRecord> => {
    try {
      const response = await apiClient.put<MaintenanceRecord>(`/api/maintenance-records/${id}`, data);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 8. Update status
  updateStatus: async (
    id: string,
    data: UpdateMaintenanceStatusRequest
  ): Promise<MaintenanceRecord> => {
    try {
      const response = await apiClient.patch<MaintenanceRecord>(
        `/api/maintenance-records/${id}/status`,
        data
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 9. Upload photographic evidence (before or after)
  uploadEvidence: async (
    id: string,
    imageType: 'before' | 'after',
    file: File
  ): Promise<{ imageUrl: string; message: string }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await apiClient.post<{ imageUrl: string; message: string }>(
        `/api/maintenance-records/${id}/evidence/${imageType}`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 10. Trigger AI Safety & Compliance Analysis
  runSafetyAnalysis: async (id: string): Promise<SafetyAnalysisResponse> => {
    try {
      const response = await apiClient.post<SafetyAnalysisResponse>(
        `/api/maintenance-records/${id}/safety-analysis`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 11. Get Safety Analyses history
  getSafetyAnalyses: async (id: string): Promise<SafetyAnalysisResponse[]> => {
    try {
      const response = await apiClient.get<SafetyAnalysisResponse[]>(
        `/api/maintenance-records/${id}/safety-analyses`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 12. Supervisor verify maintenance
  verify: async (id: string, data: VerifyMaintenanceRequest): Promise<MaintenanceRecord> => {
    try {
      const response = await apiClient.post<MaintenanceRecord>(
        `/api/maintenance-records/${id}/verify`,
        data
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 13. Supervisor request corrections
  requestCorrection: async (
    id: string,
    data: RequestCorrectionRequest
  ): Promise<MaintenanceRecord> => {
    try {
      const response = await apiClient.post<MaintenanceRecord>(
        `/api/maintenance-records/${id}/request-correction`,
        data
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 14. Soft delete / cancel
  softDelete: async (id: string): Promise<{ message: string }> => {
    try {
      const response = await apiClient.delete<{ message: string }>(`/api/maintenance-records/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  // 15. Get audit logs
  getAuditLogs: async (id: string): Promise<MaintenanceAuditLog[]> => {
    try {
      const response = await apiClient.get<MaintenanceAuditLog[]>(
        `/api/maintenance-records/${id}/audit-logs`
      );
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },
};
