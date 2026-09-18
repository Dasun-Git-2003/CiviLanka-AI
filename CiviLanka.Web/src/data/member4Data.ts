// CiviLanka.Web/src/data/member4Data.ts
// Member 4 Data layer for Maintenance Operations, Budgets, and Municipal Safety Audits

export interface WorkOrder {
  id: number;
  hazard_id: number;
  asset_id: number;
  title: string;
  description: string;
  hazard_category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | 'CRITICAL';
  estimated_cost: number;
  actual_cost: number;
  is_arterial_road: boolean;
  road_name: string;
  location_lat: number;
  location_lng: number;
  assigned_crew: string | null;
  assigned_worker: string | null;
  status:
    | 'AI_PROPOSED'
    | 'PENDING_APPROVAL'
    | 'APPROVED'
    | 'ASSIGNED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'VERIFIED'
    | 'CLOSED';
  ai_recommendation: string;
  approval_status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approver_name: string | null;
  approval_date: string | null;
  materials_json: string[];
  before_photo: string | null;
  after_photo: string | null;
  completion_notes: string | null;
  completion_lat: number | null;
  completion_lng: number | null;
  created_at: string;
}

export interface BudgetLog {
  id: number;
  work_order_id: number;
  allocated_budget: number;
  estimated_cost: number;
  actual_cost: number;
  approved_amount: number;
  remaining_budget: number;
  approver: string;
  approval_date: string;
  status: 'ACTIVE' | 'RECONCILED' | 'EXCEEDED';
  notes: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  work_order_id: number;
  compliance_status: 'PASS' | 'FAILED';
  approval_required: boolean;
  safety_rules_passed: boolean;
  budget_threshold_passed: boolean;
  gps_verified: boolean;
  gps_distance_meters: number | null;
  before_photo_url: string | null;
  after_photo_url: string | null;
  materials_verified: boolean;
  violations_json: string[];
  ai_reasoning: string;
  audited_at: string;
}

export const INITIAL_WORK_ORDERS: WorkOrder[] = [
  {
    id: 101,
    hazard_id: 102,
    asset_id: 401,
    title: 'Burst Water Main - School Zone',
    description: 'High pressure 200mm main line fracture leaking potable water adjacent to school perimeter.',
    hazard_category: 'WATER_LEAK',
    priority: 'URGENT',
    estimated_cost: 250000,
    actual_cost: 0,
    is_arterial_road: false,
    road_name: "St. Anthony's Lane, Colombo 03",
    location_lat: 6.9082,
    location_lng: 79.8524,
    assigned_crew: null,
    assigned_worker: null,
    status: 'AI_PROPOSED',
    ai_recommendation: 'Immediate pressure isolation required. Cost exceeds LKR 1,000 threshold. Escalate to Public Works Director.',
    approval_status: 'PENDING',
    approver_name: null,
    approval_date: null,
    materials_json: ['20m pipe', '4 connectors', '2 valves'],
    before_photo: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=600&auto=format&fit=crop&q=80',
    after_photo: null,
    completion_notes: null,
    completion_lat: null,
    completion_lng: null,
    created_at: '2026-09-18T06:00:00Z',
  },
  {
    id: 102,
    hazard_id: 103,
    asset_id: 402,
    title: 'Major Pavement Subsidence - A2 Corridor',
    description: 'Severe depression and subgrade erosion posing rollover risk to heavy buses.',
    hazard_category: 'ROAD_DAMAGE',
    priority: 'CRITICAL',
    estimated_cost: 185000,
    actual_cost: 0,
    is_arterial_road: true,
    road_name: 'Galle Road (A2) Arterial, Kollupitiya',
    location_lat: 6.9147,
    location_lng: 79.851,
    assigned_crew: null,
    assigned_worker: null,
    status: 'PENDING_APPROVAL',
    ai_recommendation: 'Critical arterial corridor with heavy peak transit. Mandatory Director sign-off under Human Approval Rule.',
    approval_status: 'PENDING',
    approver_name: null,
    approval_date: null,
    materials_json: ['8T Hot Asphalt', '12m geotextile', 'Sub-base aggregate'],
    before_photo: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
    after_photo: null,
    completion_notes: null,
    completion_lat: null,
    completion_lng: null,
    created_at: '2026-09-18T07:15:00Z',
  },
  {
    id: 103,
    hazard_id: 104,
    asset_id: 403,
    title: 'Stormwater Culvert Blockage',
    description: 'Debris and sediment choke causing localized street inundation during monsoon downpours.',
    hazard_category: 'DRAINAGE',
    priority: 'HIGH',
    estimated_cost: 45000,
    actual_cost: 0,
    is_arterial_road: false,
    road_name: 'Duplication Road, Colombo 04',
    location_lat: 6.892,
    location_lng: 79.8567,
    assigned_crew: null,
    assigned_worker: null,
    status: 'APPROVED',
    ai_recommendation: 'Deploy vacuum desilting unit. Approved by Director.',
    approval_status: 'APPROVED',
    approver_name: 'Dr. Anura Bandara (Director, Public Works)',
    approval_date: '2026-09-18T08:30:00Z',
    materials_json: ['Jetting nozzle', 'Heavy silt bags'],
    before_photo: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=600&auto=format&fit=crop&q=80',
    after_photo: null,
    completion_notes: null,
    completion_lat: null,
    completion_lng: null,
    created_at: '2026-09-17T11:00:00Z',
  },
  {
    id: 104,
    hazard_id: 105,
    asset_id: 404,
    title: 'Faulty Municipal Streetlight Junction Box',
    description: 'Exposed wiring and blown thermal fuse on lighting pole #L-114.',
    hazard_category: 'ELECTRICAL',
    priority: 'MEDIUM',
    estimated_cost: 850,
    actual_cost: 0,
    is_arterial_road: false,
    road_name: 'Park Road, Colombo 05',
    location_lat: 6.8856,
    location_lng: 79.8654,
    assigned_crew: 'Crew #3 (Electrical)',
    assigned_worker: 'Sunil Wickrama',
    status: 'ASSIGNED',
    ai_recommendation: 'Low cost repair (< LKR 1,000, non-arterial). Auto-approved under routine policy.',
    approval_status: 'APPROVED',
    approver_name: 'System Auto-Approved',
    approval_date: '2026-09-18T09:00:00Z',
    materials_json: ['Thermal fuse 16A', 'Weatherproof junction box'],
    before_photo: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=600&auto=format&fit=crop&q=80',
    after_photo: null,
    completion_notes: null,
    completion_lat: null,
    completion_lng: null,
    created_at: '2026-09-18T09:00:00Z',
  },
  {
    id: 105,
    hazard_id: 106,
    asset_id: 405,
    title: 'Deep Pothole Patching - Havelock Junction',
    description: '35cm deep road cavity damaging vehicle rims and causing swerving.',
    hazard_category: 'ROAD_DAMAGE',
    priority: 'HIGH',
    estimated_cost: 35000,
    actual_cost: 15000,
    is_arterial_road: true,
    road_name: 'Havelock Road, Colombo 05',
    location_lat: 6.8812,
    location_lng: 79.8643,
    assigned_crew: 'Crew #1 (Road Works)',
    assigned_worker: 'Kamal Perera',
    status: 'IN_PROGRESS',
    ai_recommendation: 'Field team deployed. Work actively underway with safety cones erected.',
    approval_status: 'APPROVED',
    approver_name: 'Dr. Anura Bandara (Director, Public Works)',
    approval_date: '2026-09-18T07:45:00Z',
    materials_json: ['Cold mix bitumen 250kg', 'Tack coat primer 20L'],
    before_photo: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
    after_photo: null,
    completion_notes: null,
    completion_lat: null,
    completion_lng: null,
    created_at: '2026-09-18T07:30:00Z',
  },
  {
    id: 106,
    hazard_id: 107,
    asset_id: 406,
    title: 'Sewage Manhole Ring Replacement',
    description: 'Cracked ductile iron frame rattling loose under transit.',
    hazard_category: 'SANITATION',
    priority: 'URGENT',
    estimated_cost: 12000,
    actual_cost: 12500,
    is_arterial_road: false,
    road_name: 'Baseline Road, Dematagoda',
    location_lat: 6.9324,
    location_lng: 79.8789,
    assigned_crew: 'Crew #2 (Civil Maintenance)',
    assigned_worker: 'Nihal Jayasinghe',
    status: 'COMPLETED',
    ai_recommendation: 'Repairs completed by field worker. Before & after photographic evidence uploaded. Pending Safety & Audit Agent.',
    approval_status: 'APPROVED',
    approver_name: 'Dr. Anura Bandara (Director, Public Works)',
    approval_date: '2026-09-17T14:00:00Z',
    materials_json: ['Ductile iron ring 600mm', 'High-early concrete 2 bags'],
    before_photo: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=600&auto=format&fit=crop&q=80',
    after_photo: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=600&auto=format&fit=crop&q=80',
    completion_notes: 'Frame leveled flush with roadway. Quick-curing mortar applied.',
    completion_lat: 6.93242,
    completion_lng: 79.87891,
    created_at: '2026-09-17T12:00:00Z',
  },
  {
    id: 107,
    hazard_id: 108,
    asset_id: 407,
    title: 'Crash Barrier Railing Section Realignment',
    description: 'Impacted crash barrier repaired with new galvanised beam sections.',
    hazard_category: 'ROAD_SAFETY',
    priority: 'MEDIUM',
    estimated_cost: 28000,
    actual_cost: 27200,
    is_arterial_road: true,
    road_name: 'New Kelani Bridge Road',
    location_lat: 6.9532,
    location_lng: 79.8791,
    assigned_crew: 'Crew #1 (Road Works)',
    assigned_worker: 'Kamal Perera',
    status: 'VERIFIED',
    ai_recommendation: 'Audit verified: GPS deviation 14.2m (PASS), Before/After evidence verified (PASS), Budget within limits (PASS).',
    approval_status: 'APPROVED',
    approver_name: 'Dr. Anura Bandara (Director, Public Works)',
    approval_date: '2026-09-16T09:00:00Z',
    materials_json: ['W-beam steel railing 4m', 'Post bolts x8'],
    before_photo: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=600&auto=format&fit=crop&q=80',
    after_photo: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=600&auto=format&fit=crop&q=80',
    completion_notes: 'Damaged guard rail replaced and tension tested.',
    completion_lat: 6.95322,
    completion_lng: 79.87915,
    created_at: '2026-09-16T08:00:00Z',
  },
  {
    id: 108,
    hazard_id: 109,
    asset_id: 408,
    title: 'Storm Drain Grate Re-welding',
    description: 'Loose steel grating re-anchored and welded.',
    hazard_category: 'DRAINAGE',
    priority: 'LOW',
    estimated_cost: 4500,
    actual_cost: 4500,
    is_arterial_road: false,
    road_name: 'Main Street, Pettah',
    location_lat: 6.9372,
    location_lng: 79.8521,
    assigned_crew: 'Crew #2 (Civil Maintenance)',
    assigned_worker: 'Nihal Jayasinghe',
    status: 'CLOSED',
    ai_recommendation: 'Lifecycle complete. Final budget reconciled.',
    approval_status: 'APPROVED',
    approver_name: 'System Auto-Approved',
    approval_date: '2026-09-15T10:00:00Z',
    materials_json: ['Welding rods E6013', 'Anchor bolts M12'],
    before_photo: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=600&auto=format&fit=crop&q=80',
    after_photo: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=600&auto=format&fit=crop&q=80',
    completion_notes: 'Grate welded securely. Passed load check.',
    completion_lat: 6.93721,
    completion_lng: 79.85213,
    created_at: '2026-09-15T08:00:00Z',
  },
  {
    id: 109,
    hazard_id: 110,
    asset_id: 409,
    title: 'Tree Canopy Trimming - Power Line Clearance',
    description: 'Overhanging boughs threatening overhead low-voltage distribution feeder.',
    hazard_category: 'ENVIRONMENTAL',
    priority: 'HIGH',
    estimated_cost: 32000,
    actual_cost: 48000,
    is_arterial_road: false,
    road_name: 'Cotta Road, Borella',
    location_lat: 6.915,
    location_lng: 79.883,
    assigned_crew: 'Crew #4 (Forestry & Trimming)',
    assigned_worker: 'Sunil Wickrama',
    status: 'COMPLETED',
    ai_recommendation: 'Work completed with apparent location discrepancy. Flagged for audit review.',
    approval_status: 'APPROVED',
    approver_name: 'Dr. Anura Bandara (Director, Public Works)',
    approval_date: '2026-09-17T09:00:00Z',
    materials_json: ['Chainsaw bar lube', 'Chipper truck fuel'],
    before_photo: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=600&auto=format&fit=crop&q=80',
    after_photo: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=600&auto=format&fit=crop&q=80',
    completion_notes: 'Branches cleared. However crew completed work on adjoining district.',
    completion_lat: 6.935, // 2.3km away! Violates GPS tolerance
    completion_lng: 79.889,
    created_at: '2026-09-17T08:00:00Z',
  },
];

export const INITIAL_BUDGET_LOGS: BudgetLog[] = [
  {
    id: 1,
    work_order_id: 103,
    allocated_budget: 50000.0,
    estimated_cost: 45000.0,
    actual_cost: 0.0,
    approved_amount: 45000.0,
    remaining_budget: 5000.0,
    approver: 'Dr. Anura Bandara (Director, Public Works)',
    approval_date: '2026-09-18T08:30:00Z',
    status: 'ACTIVE',
    notes: 'Approved under Q3 Monsoon Drainage Emergency Reserve.',
    created_at: '2026-09-18T08:30:00Z',
  },
  {
    id: 2,
    work_order_id: 104,
    allocated_budget: 1000.0,
    estimated_cost: 850.0,
    actual_cost: 0.0,
    approved_amount: 850.0,
    remaining_budget: 150.0,
    approver: 'System Auto-Approved',
    approval_date: '2026-09-18T09:00:00Z',
    status: 'ACTIVE',
    notes: 'Routine small electrical fix auto-authorized.',
    created_at: '2026-09-18T09:00:00Z',
  },
  {
    id: 3,
    work_order_id: 105,
    allocated_budget: 40000.0,
    estimated_cost: 35000.0,
    actual_cost: 15000.0,
    approved_amount: 35000.0,
    remaining_budget: 5000.0,
    approver: 'Dr. Anura Bandara (Director, Public Works)',
    approval_date: '2026-09-18T07:45:00Z',
    status: 'ACTIVE',
    notes: 'Mandatory human approval given for arterial road repair.',
    created_at: '2026-09-18T07:45:00Z',
  },
  {
    id: 4,
    work_order_id: 106,
    allocated_budget: 15000.0,
    estimated_cost: 12000.0,
    actual_cost: 12500.0,
    approved_amount: 12000.0,
    remaining_budget: 2500.0,
    approver: 'Dr. Anura Bandara (Director, Public Works)',
    approval_date: '2026-09-17T14:00:00Z',
    status: 'ACTIVE',
    notes: 'Sanitation infrastructure maintenance fund.',
    created_at: '2026-09-17T14:00:00Z',
  },
  {
    id: 5,
    work_order_id: 107,
    allocated_budget: 30000.0,
    estimated_cost: 28000.0,
    actual_cost: 27200.0,
    approved_amount: 28000.0,
    remaining_budget: 2800.0,
    approver: 'Dr. Anura Bandara (Director, Public Works)',
    approval_date: '2026-09-16T09:00:00Z',
    status: 'ACTIVE',
    notes: 'Kelani bridge corridor arterial guardrail safety allocation.',
    created_at: '2026-09-16T09:00:00Z',
  },
  {
    id: 6,
    work_order_id: 108,
    allocated_budget: 5000.0,
    estimated_cost: 4500.0,
    actual_cost: 4500.0,
    approved_amount: 4500.0,
    remaining_budget: 500.0,
    approver: 'System Auto-Approved',
    approval_date: '2026-09-15T10:00:00Z',
    status: 'RECONCILED',
    notes: 'Job complete and reconciled. Remaining budget returned to general fund.',
    created_at: '2026-09-15T10:00:00Z',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 1,
    work_order_id: 107,
    compliance_status: 'PASS',
    approval_required: true,
    safety_rules_passed: true,
    budget_threshold_passed: true,
    gps_verified: true,
    gps_distance_meters: 14.2,
    before_photo_url: 'https://images.unsplash.com/photo-1542013936693-884638332954?w=600&auto=format&fit=crop&q=80',
    after_photo_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=600&auto=format&fit=crop&q=80',
    materials_verified: true,
    violations_json: [],
    ai_reasoning:
      'Safety verification completed successfully. GPS proximity within acceptable tolerance (14.2m <= 50m). Clear before/after photographic evidence confirms replacement of damaged guardrail. Actual expenditure (LKR 27,200) remained below approved limit (LKR 28,000).',
    audited_at: '2026-09-17T15:45:00Z',
  },
  {
    id: 2,
    work_order_id: 108,
    compliance_status: 'PASS',
    approval_required: false,
    safety_rules_passed: true,
    budget_threshold_passed: true,
    gps_verified: true,
    gps_distance_meters: 6.8,
    before_photo_url: 'https://images.unsplash.com/photo-1506784365847-bbad939e9335?w=600&auto=format&fit=crop&q=80',
    after_photo_url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?w=600&auto=format&fit=crop&q=80',
    materials_verified: true,
    violations_json: [],
    ai_reasoning:
      'All routine municipal safety criteria satisfied. Drain grating securely anchored. GPS matched perfectly at 6.8 meters.',
    audited_at: '2026-09-16T11:30:00Z',
  },
];
