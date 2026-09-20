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
