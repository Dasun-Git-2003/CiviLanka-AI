// Shared asset data used across pages (Assets page + Contractor assignment)
// In production this would come from the API: GET /api/assets

export type SharedAsset = {
  id: string;
  name: string;
  type: string;
  condition: 'Good' | 'Moderate' | 'Poor' | 'Critical' | null;
  location: string;
  latitude: string;
  longitude: string;
};

export const SHARED_ASSETS: SharedAsset[] = [
  { id: 'AST-001', name: 'Main St Water Pipe',    type: 'Water',           condition: 'Poor',     location: 'Downtown, Colombo',    latitude: '6.9271', longitude: '79.8612' },
  { id: 'AST-002', name: 'Oak Ave Streetlight',   type: 'Electrical',      condition: 'Good',     location: 'Northside, Colombo',   latitude: '6.9310', longitude: '79.8450' },
  { id: 'AST-003', name: 'Central Park Pathway',  type: 'Civil',           condition: null,       location: 'City Center, Colombo', latitude: '6.9050', longitude: '79.8510' },
  { id: 'AST-004', name: 'Galle Rd Bridge',        type: 'Roads & Bridges', condition: 'Poor',     location: 'Colombo 03',           latitude: '6.9180', longitude: '79.8580' },
  { id: 'AST-005', name: 'Negombo Rd Drain',       type: 'Sanitation',      condition: 'Moderate', location: 'Wattala',              latitude: '6.9400', longitude: '79.8530' },
  { id: 'AST-006', name: 'Dehiwala Pump Station',  type: 'Water',           condition: 'Moderate', location: 'Dehiwala',             latitude: '6.8500', longitude: '79.8650' },
  { id: 'AST-007', name: 'Marine Drive Lighting',  type: 'Electrical',      condition: 'Good',     location: 'Colombo 03',           latitude: '6.9230', longitude: '79.8430' },
];

// Assets requiring repair (condition is Poor or Moderate)
export const REPAIR_ASSETS = SHARED_ASSETS.filter(
  (a) => a.condition === 'Poor' || a.condition === 'Moderate'
);

