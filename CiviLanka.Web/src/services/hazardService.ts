import { apiClient } from './apiService';
import type { HazardDto, ReviewHazardPayload } from '../types/hazard';

export const hazardService = {
  getAll: async (): Promise<HazardDto[]> => {
    const res = await apiClient.get<HazardDto[]>('/api/hazards');
    return res.data;
  },

  getById: async (id: string): Promise<HazardDto> => {
    const res = await apiClient.get<HazardDto>(`/api/hazards/${id}`);
    return res.data;
  },

  reviewHazard: async (id: string, payload: ReviewHazardPayload): Promise<HazardDto> => {
    const res = await apiClient.post<HazardDto>(`/api/hazards/${id}/review`, payload);
    return res.data;
  },
};
