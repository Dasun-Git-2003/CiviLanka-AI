from typing import Annotated, Any, List, Literal, Optional, TypedDict
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field


class MaterialItem(BaseModel):
    item_name: str = Field(
        description="Name and specification of material according to Sri Lanka BSR")
    unit: str = Field(
        description="Unit of measurement e.g. m, m², m³, unit, kg")
    quantity: float = Field(description="Estimated quantity needed for repair")
    unit_cost_lkr: float = Field(
        description="Unit rate in Sri Lankan Rupees (LKR)")
    total_cost_lkr: float = Field(
        description="Total cost for this material line item in LKR")


class LaborAndPlantItem(BaseModel):
    role_or_machine: str = Field(
        description="Labor trade or machinery type (e.g. Skilled Pipe Fitter, JCB Backhoe, Roller)")
    days: float = Field(
        description="Number of operational days or mandays required")
    daily_rate_lkr: float = Field(
        description="Daily rate in Sri Lankan Rupees (LKR) from BSR")
    total_cost_lkr: float = Field(
        description="Total cost for this labor or plant item in LKR")


class CostEstimateOutput(BaseModel):
    summary: str = Field(
        description="Executive summary of the repair scope and required interventions")
    infrastructure_category: str = Field(
        description="Category: Water, Roads & Bridges, Drainage, Electrical, Civil")
    severity: str = Field(
        description="Assigned severity: Critical, Poor, Moderate, Low")
    materials: List[MaterialItem] = Field(
        default_factory=list, description="Itemized materials list with BSR rates")
    labor_and_equipment: List[LaborAndPlantItem] = Field(
        default_factory=list, description="Itemized plant hire and labor")
    safety_and_preliminaries_lkr: float = Field(
        description="Traffic cones, barrier tape, safety signage, flagmen in LKR")
    contingency_percentage: float = Field(
        description="Contingency markup percentage (10% standard, 20% emergency)")
    contingency_cost_lkr: float = Field(
        description="Calculated contingency in LKR")
    total_estimated_cost_lkr: float = Field(
        description="Grand total estimated repair cost in Sri Lankan Rupees (LKR)")
    estimated_duration_days: int = Field(
        description="Estimated total turnaround time in calendar days")
    recommended_contractor_specialization: str = Field(
        description="Matching contractor trade e.g. Water & Plumbing, Roads & Bridges, Civil")
    technical_notes: str = Field(
        description="Engineering specifications, quality checks, and precautions based on CMC/RDA/NWSDB")
    cited_sources: List[str] = Field(
        default_factory=list, description="Citations to BSR and municipal spec documents")


class IntentClassification(BaseModel):
    intent: Literal["estimate", "question"] = Field(
        description="'estimate' if the request is to calculate repair cost, materials, or work order estimates; 'question' for general Q&A."
    )
    domain: str = Field(
        default="General",
        description="Identified domain e.g. Water, Roads, Electrical, Drainage, Civil"
    )


class RetrievalGrade(BaseModel):
    relevant: bool = Field(
        description="True if retrieved BSR documents provide sufficient material rates and technical specifications."
    )
    missing_information: Optional[str] = Field(
        default=None,
        description="What specific rate or specification is missing if not relevant."
    )


class AgentState(TypedDict):
    messages: Annotated[list, add_messages]
    hazard_type: str
    severity: str
    asset_name: str
    asset_type: str
    damage_description: str
    location: str
    search_query: str
    retrieved_docs: str
    retries: int
    intent: str
    is_relevant: bool
    estimate: Optional[dict]
    final_response: str


# =====================================================================
# MEMBER 1: HAZARD CLASSIFICATION & SLA TRIAGE SCHEMAS
# =====================================================================

class HazardClassificationOutput(BaseModel):
    primary_category: str = Field(
        description="Standardized category e.g. Pothole & Asphalt Failure, Water Main Burst, Drain Blockage, Street Lighting, Fallen Tree & Obstruction, Structural Damage, Open Manhole")
    department: str = Field(
        description="Responsible municipal authority: CMC Engineering, RDA (Road Development Authority), NWSDB (Water Board), CEB (Electricity Board), Disaster Management Centre")
    assigned_severity: Literal["CRITICAL", "HIGH", "MEDIUM", "LOW"] = Field(
        description="Calibrated severity based on Colombo hazard matrix")
    urgency_score: float = Field(
        description="Urgency score from 0.0 to 100.0 factoring in urban risk multipliers (proximity to schools/hospitals, arterial routes, monsoon saturation)")
    sla_resolution_hours: int = Field(
        description="Mandated SLA resolution window in hours: 2-4h (Critical), 12-24h (High), 48h (Medium), 168h (Low)")
    safety_risk_summary: str = Field(
        description="Engineering analysis of imminent public safety risks and hazard escalation potential")
    immediate_actions: List[str] = Field(
        default_factory=list,
        description="Actionable containment protocols (e.g. place reflective safety cones, deploy vacuum gully bowser, isolate main valve)")
    crew_sizing: str = Field(
        description="Recommended crew configuration (e.g. Emergency Quick-Response 2-person, Heavy Civil Maintenance 4-person + JCB)")
    requires_police_traffic_support: bool = Field(
        default=False,
        description="True if hazard obstructs A-Class arterial corridor (Galle Rd, Baseline Rd, Kandy Rd) or major junction requiring traffic diversion")
    monsoon_flood_risk: bool = Field(
        default=False,
        description="True if hazard involves blocked drainage or low-lying flood-prone zone during monsoon season")
    environmental_factors: List[str] = Field(
        default_factory=list,
        description="Environmental flags identified (e.g. Hospital Zone, School Zone, Coastal Salinity Corridor, Night Low-Visibility)")
    confidence_score: float = Field(
        default=0.95,
        description="Model confidence level in categorization and SLA calibration (0.0 - 1.0)")


class HazardState(TypedDict):
    messages: Annotated[list, add_messages]
    title: str
    description: str
    location: str
    image_url: Optional[str]
    retrieved_rules: str
    classification: Optional[dict]
    final_response: str


# =====================================================================
# MEMBER 3: DISPATCH & ROUTE CLUSTERING SCHEMAS
# =====================================================================

class RankedHazardItem(BaseModel):
    hazard_id: str = Field(description="Unique hazard identifier or reference ID")
    title: str = Field(description="Hazard title / summary")
    severity: str = Field(description="Hazard severity: CRITICAL, HIGH, MEDIUM, LOW")
    composite_priority_score: float = Field(
        description="0-100 composite priority score balancing urgency, distance, and repair impact")
    urgency_rank: int = Field(description="1-based priority ranking order")
    corridor: str = Field(
        description="Identified dispatch corridor (e.g. Galle Road Coastal, Baseline Arterial, Pettah Commercial, High Level)")
    rationale: str = Field(description="Specific justification for this rank and priority weighting")


class RouteClusterItem(BaseModel):
    cluster_id: str = Field(description="Identifier e.g. CLUSTER-A, CLUSTER-B")
    cluster_name: str = Field(description="Human-readable corridor cluster name")
    hazard_ids: List[str] = Field(default_factory=list, description="List of hazard IDs grouped in this route")
    center_latitude: float = Field(description="Cluster centroid latitude")
    center_longitude: float = Field(description="Cluster centroid longitude")
    radius_km: float = Field(description="Approximate cluster radius in kilometers")
    estimated_transit_minutes: int = Field(description="Estimated inter-site transit time in Colombo traffic")
    suggested_work_sequence: List[str] = Field(
        default_factory=list,
        description="Ordered sequence of hazard IDs or stops to minimize travel time and honor SLAs")


class SuggestedContractorAssignment(BaseModel):
    cluster_id: str = Field(description="Assigned route cluster ID")
    suggested_contractor_id: Optional[str] = Field(default=None, description="Matching contractor ID if provided")
    contractor_name: str = Field(description="Name of suggested contractor or municipal maintenance unit")
    trade: str = Field(description="Contractor specialization (e.g. Asphalt Paving, Water & Drainage, Electrical)")
    matching_score: float = Field(description="Matching score between 0.0 and 1.0 based on trade, capacity, and proximity")
    assignment_reason: str = Field(description="Detailed rationale for contractor and crew selection")


class DispatchOptimizationOutput(BaseModel):
    total_hazards_analyzed: int = Field(description="Number of hazards evaluated")
    clusters_formed: int = Field(description="Number of geographic clusters created")
    ranked_hazards: List[RankedHazardItem] = Field(default_factory=list, description="Hazards sorted by priority")
    route_clusters: List[RouteClusterItem] = Field(default_factory=list, description="Optimized maintenance route clusters")
    crew_assignments: List[SuggestedContractorAssignment] = Field(
        default_factory=list, description="Suggested contractor or crew assignments per cluster")
    optimization_strategy_summary: str = Field(
        description="Executive summary of dispatch strategy, trade-offs made between SLA deadlines and transit efficiency")


class DispatchState(TypedDict):
    messages: Annotated[list, add_messages]
    hazards_json: str
    contractors_json: Optional[str]
    retrieved_specs: str
    optimization_output: Optional[dict]
    final_response: str


# =====================================================================
# MEMBER 4: MUNICIPAL SAFETY & AUDIT AGENT SCHEMAS
# =====================================================================

class SafetyAuditViolationItem(BaseModel):
    rule_id: str = Field(description="Rule identifier e.g. FISC-SUP-01, FISC-DIR-01, EVID-IMG-01, GPS-TOL-01, SEC-CHK-01")
    rule_name: str = Field(description="Short human-readable rule title")
    severity: Literal["BLOCKING", "WARNING", "INFORMATIONAL"] = Field(
        description="BLOCKING rejects approval; WARNING permits conditional approval with supervisor sign-off")
    description: str = Field(description="Detailed finding and violation specifics")
    remediation_step: str = Field(description="Exact corrective action required by contractor or municipal officer")


class MunicipalSafetyAuditOutput(BaseModel):
    compliance_status: Literal["PASS", "FAILED", "CONDITIONAL_APPROVAL"] = Field(
        description="Overall regulatory audit outcome: PASS (all rules met), FAILED (blocking violations), CONDITIONAL_APPROVAL (minor non-blocking warnings)")
    work_order_id: str = Field(description="Work Order reference ID")
    total_cost_lkr: float = Field(description="Total work order cost audited in LKR")
    approval_tier_required: str = Field(
        description="Required governance tier: Zonal Supervisor (<100k), Municipal Director (100k-500k), Municipal Tender Board (>500k)")
    is_approval_present: bool = Field(description="True if documented authorization matches or exceeds required tier")
    violations: List[SafetyAuditViolationItem] = Field(
        default_factory=list, description="List of detected audit violations")
    gps_verification_passed: bool = Field(
        description="True if completion GPS is within 150m tolerance of logged hazard site")
    evidence_verification_passed: bool = Field(
        description="True if mandatory before-and-after photographic evidence is present and verified")
    safety_protocol_passed: bool = Field(
        description="True if PPE, trench shoring, and traffic barrier checks passed")
    audit_summary: str = Field(
        description="Executive compliance narrative detailing why work order was passed, flagged, or rejected")
    cited_regulations: List[str] = Field(
        default_factory=list, description="Citations to CMC, CIDA, and National Procurement Guidelines")


class SafetyAuditState(TypedDict):
    messages: Annotated[list, add_messages]
    work_order_json: str
    retrieved_rules: str
    audit_output: Optional[dict]
    final_response: str


# =====================================================================
# MEMBER 2 COMPANION: ASSET DEGRADATION & PREDICTIVE RISK SCHEMAS
# =====================================================================

class AssetRiskOutput(BaseModel):
    asset_id: str = Field(description="Unique asset identifier")
    asset_name: str = Field(description="Asset name e.g. Wellawatte Canal Sluice Gate 4, Galle Road KM 4.2 Culvert")
    asset_category: str = Field(description="Asset category: Roads & Bridges, Drainage & Flood Control, Water Supply, Electrical")
    current_condition_tier: int = Field(
        description="Condition tier 1 (Good), 2 (Fair), 3 (Poor), 4 (Critical / Structural Failure Imminent)")
    health_index_score: float = Field(
        description="Current health index from 0.0 (Failed) to 100.0 (Pristine)")
    degradation_multiplier: float = Field(
        description="Calculated degradation acceleration factor (1.0 = baseline, up to 2.8+ under coastal salinity and monsoon flood cycles)")
    estimated_remaining_useful_life_years: float = Field(
        description="Projected remaining useful life in years before replacement or major rehabilitation")
    immediate_inspection_needed: bool = Field(
        description="True if structural health score < 40 or condition tier is 3/4 requiring emergency inspection within 72 hours")
    recommended_action: str = Field(
        description="Recommended engineering intervention: Routine Maintenance, Preventive Resurfacing, Structural Reinforcement, Complete Reconstruction")
    environmental_vulnerabilities: List[str] = Field(
        default_factory=list,
        description="Identified stress factors (e.g. Coastal Saline Atmosphere, High Vibration Bus Corridor, Monsoon Canal Inundation)")
    preventive_maintenance_cadence: str = Field(
        description="Recommended inspection and servicing schedule (e.g. Bi-weekly during monsoon, Quarterly standard)")
    risk_narrative: str = Field(
        description="In-depth engineering explanation of structural risk trajectory and failure consequences")


class AssetRiskState(TypedDict):
    messages: Annotated[list, add_messages]
    asset_json: str
    retrieved_specs: str
    risk_output: Optional[dict]
    final_response: str
