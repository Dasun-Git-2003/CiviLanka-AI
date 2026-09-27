export interface AssetInspection {
  id: number;
  assetId: string;
  assetName?: string;
  inspectionDate: string;
  condition: 'Good' | 'Moderate' | 'Poor' | 'Critical' | string;
  issuesFound?: string;
  notes?: string;
  inspectorName?: string;
  createdAt: string;
}

export interface InfrastructureAsset {
  id: string;
  name: string;
  type: string;
  status: string;
  location: string;
  installationDate?: string;
  latitude: number;
  longitude: number;
  description?: string;
  createdAt: string;
  updatedAt?: string;
  latestCondition?: 'Good' | 'Moderate' | 'Poor' | 'Critical' | string;
  lastInspectedDate?: string;
  inspectionCount: number;
  inspections: AssetInspection[];
}

export interface CreateAssetDto {
  id?: string;
  name: string;
  type: string;
  status: string;
  location: string;
  installationDate?: string;
  latitude: number;
  longitude: number;
  description?: string;
}

export interface UpdateAssetDto {
  name: string;
  type: string;
  status: string;
  location: string;
  installationDate?: string;
  latitude: number;
  longitude: number;
  description?: string;
}

export interface CreateInspectionDto {
  inspectionDate: string;
  condition: string;
  issuesFound?: string;
  notes?: string;
  inspectorName?: string;
}
