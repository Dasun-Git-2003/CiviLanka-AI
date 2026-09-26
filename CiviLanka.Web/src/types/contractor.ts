export interface WorkAssignment {
  id: number;
  contractorId: number;
  contractorName?: string;
  assetId?: string;
  assetName: string;
  assetType: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  notes?: string;
  status: 'Pending' | 'In Progress' | 'Done';
  estimatedCost?: number;
  actualCost?: number;
  createdAt: string;
  completedAt?: string;
}

export interface Contractor {
  id: number;
  name: string;
  specialization: string;
  location: string;
  phone: string;
  email?: string;
  rating: number;
  isAvailable: boolean;
  jobCount: number;
  createdAt: string;
  assignments: WorkAssignment[];
}

export interface CreateContractorDto {
  name: string;
  specialization: string;
  location: string;
  phone: string;
  email?: string;
}

export interface UpdateContractorDto {
  name: string;
  specialization: string;
  location: string;
  phone: string;
  email?: string;
  rating: number;
  isAvailable: boolean;
}

export interface CreateWorkAssignmentDto {
  contractorId: number;
  assetId?: string;
  assetName: string;
  assetType: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
  notes?: string;
  estimatedCost?: number;
}
