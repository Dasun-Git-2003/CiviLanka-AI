import { apiClient } from './apiService';
import type {
  Contractor,
  CreateContractorDto,
  UpdateContractorDto,
  CreateWorkAssignmentDto,
  WorkAssignment,
} from '../types/contractor';

export const contractorService = {
  getAll: async (params?: {
    specialization?: string;
    available?: boolean;
    search?: string;
  }): Promise<Contractor[]> => {
    const res = await apiClient.get<Contractor[]>('/api/contractors', { params });
    return res.data;
  },

  getById: async (id: number): Promise<Contractor> => {
    const res = await apiClient.get<Contractor>(`/api/contractors/${id}`);
    return res.data;
  },

  create: async (dto: CreateContractorDto): Promise<Contractor> => {
    const res = await apiClient.post<Contractor>('/api/contractors', dto);
    return res.data;
  },

  update: async (id: number, dto: UpdateContractorDto): Promise<Contractor> => {
    const res = await apiClient.put<Contractor>(`/api/contractors/${id}`, dto);
    return res.data;
  },

  toggleAvailability: async (contractor: Contractor): Promise<Contractor> => {
    const dto: UpdateContractorDto = {
      name: contractor.name,
      specialization: contractor.specialization,
      location: contractor.location,
      phone: contractor.phone,
      email: contractor.email,
      rating: contractor.rating,
      isAvailable: !contractor.isAvailable,
    };
    const res = await apiClient.put<Contractor>(`/api/contractors/${contractor.id}`, dto);
    return res.data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/api/contractors/${id}`);
  },

  assignWork: async (dto: CreateWorkAssignmentDto): Promise<WorkAssignment> => {
    const res = await apiClient.post<WorkAssignment>('/api/work-assignments', dto);
    return res.data;
  },

  getAssignments: async (params?: {
    contractorId?: number;
    assetId?: string;
    status?: string;
  }): Promise<WorkAssignment[]> => {
    const res = await apiClient.get<WorkAssignment[]>('/api/work-assignments', { params });
    return res.data;
  },
};
