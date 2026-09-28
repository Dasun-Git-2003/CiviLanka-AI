import { apiClient } from './apiService';
import type {
  InfrastructureAsset,
  CreateAssetDto,
  UpdateAssetDto,
  AssetInspection,
  CreateInspectionDto,
} from '../types/asset';

export const assetService = {
  getAll: async (params?: {
    search?: string;
    type?: string;
    status?: string;
    condition?: string;
  }): Promise<InfrastructureAsset[]> => {
    const res = await apiClient.get<InfrastructureAsset[]>('/api/assets', { params });
    return res.data;
  },

  getById: async (id: string): Promise<InfrastructureAsset> => {
    const res = await apiClient.get<InfrastructureAsset>(`/api/assets/${id}`);
    return res.data;
  },

  create: async (dto: CreateAssetDto): Promise<InfrastructureAsset> => {
    const res = await apiClient.post<InfrastructureAsset>('/api/assets', dto);
    return res.data;
  },

  update: async (id: string, dto: UpdateAssetDto): Promise<InfrastructureAsset> => {
    const res = await apiClient.put<InfrastructureAsset>(`/api/assets/${id}`, dto);
    return res.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/assets/${id}`);
  },

  getInspections: async (assetId: string): Promise<AssetInspection[]> => {
    const res = await apiClient.get<AssetInspection[]>(`/api/assets/${assetId}/inspections`);
    return res.data;
  },

  recordInspection: async (assetId: string, dto: CreateInspectionDto): Promise<AssetInspection> => {
    const res = await apiClient.post<AssetInspection>(`/api/assets/${assetId}/inspections`, dto);
    return res.data;
  },
};
