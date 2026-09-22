"""CiviLanka.Agent — FastAPI HTTP Service
Serves the Sri Lanka Municipal Infrastructure Cost & Material Estimator Agent.

Run via:
    uvicorn main:app --reload --port 8001
"""

from ingest import ingest_documents
from agent.retriever import format_docs, hybrid_search, search_formatted
from agent.graph import create_cost_estimator_graph
from agent.hazard_graph import run_hazard_agent
from agent.dispatch_graph import run_dispatch_agent
from agent.audit_graph import run_safety_audit_agent
from agent.asset_risk_graph import run_asset_risk_agent

import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Load environment
AGENT_DIR = Path(__file__).resolve().parent
load_dotenv(AGENT_DIR / ".env")
load_dotenv(AGENT_DIR.parent / ".env")


app = FastAPI(
    title="CiviLanka.Agent — Unified Sri Lanka Municipal AI Agents API",
    version="2.0.0",
    description=(
        "Production AI Agent Service for CiviLanka:\n"
        "- Member 1: Citizen Hazard Classification & SLA Triage Agent\n"
        "- Member 2: Infrastructure Cost Estimator & Asset Degradation Risk Agent\n"
        "- Member 3: Dispatch & Priority Maintenance Route Clustering Agent\n"
        "- Member 4: Municipal Safety & Regulatory Compliance Audit Agent\n"
        "Powered by Chroma Vector Search + BM25 Hybrid RAG (Reciprocal Rank Fusion) and LangGraph."
    ),
)

# Enable CORS for React frontend (Vite port 5173, etc.)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Compile LangGraph workflow
graph = create_cost_estimator_graph()


# ── Pydantic Request / Response Schemas ─────────────────────────────────────────

class EstimateRequest(BaseModel):
    hazard_type: str = Field(..., example="Pipe Burst",
                             description="Category or defect type (e.g. Pipe Burst, Pothole, Blocked Drain)")
    severity: str = Field(default="Medium", example="Critical",
                          description="Assigned severity: Critical, Poor, Moderate, Low")
    asset_name: str = Field(..., example="Main St Water Pipe",
                            description="Name of the infrastructure asset")
    asset_type: str = Field(default="Water", example="Water",
                            description="Asset type: Water, Roads & Bridges, Drainage, Electrical, Civil")
    damage_description: str = Field(..., example="Severe underground water rupture near Galle Road junction flooding the road foundation.",
                                    description="Detailed damage description")
    location: str = Field(default="Colombo", example="Colombo 03",
                          description="Municipal area / location in Sri Lanka")
    thread_id: Optional[str] = Field(
        default=None, description="Optional conversation thread ID for LangGraph memory")


class AskRequest(BaseModel):
    question: str = Field(..., example="What is the standard CIDA BSR rate for 110mm uPVC pipe supply in Sri Lanka?",
                          description="Engineering or maintenance query")
    thread_id: Optional[str] = Field(
        default=None, description="Optional conversation thread ID")


class HazardClassifyRequest(BaseModel):
    title: str = Field(..., example="Deep pothole causing accidents near school", description="Report title")
    description: str = Field(..., example="Severe crater-sized pothole on Galle Road outside St. Thomas College, breaking vehicle axles.", description="Detailed incident description")
    location: str = Field(default="Colombo", example="Galle Road, Mount Lavinia", description="Reported location")
    image_url: Optional[str] = Field(default=None, description="Citizen uploaded photo URL")
    thread_id: Optional[str] = Field(default=None, description="Optional conversation thread ID")


class DispatchOptimizeRequest(BaseModel):
    hazards: List[Dict[str, Any]] = Field(..., description="Array of active hazards to prioritize and cluster")
    contractors: Optional[List[Dict[str, Any]]] = Field(default=None, description="Optional fleet of registered contractors or municipal maintenance units")
    thread_id: Optional[str] = Field(default=None, description="Optional conversation thread ID")


class SafetyAuditRequest(BaseModel):
    work_order: Dict[str, Any] = Field(..., description="Work order record to audit for fiscal, GPS, photo, and safety compliance")
    thread_id: Optional[str] = Field(default=None, description="Optional conversation thread ID")


class AssetRiskRequest(BaseModel):
    asset: Dict[str, Any] = Field(..., description="Asset record with category, age, location, and condition parameters")
    thread_id: Optional[str] = Field(default=None, description="Optional conversation thread ID")


class SearchHitResponse(BaseModel):
    source: str
    content: str


# ── API Endpoints ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health_check():
    """Service health and environment status."""
    api_key = os.getenv("GOOGLE_API_KEY", "") or os.getenv("GEMINI_API_KEY", "")
    has_key = bool(api_key and "YOUR_" not in api_key)
    return {
        "status": "online",
        "service": "CiviLanka.Agent (Unified Municipal AI Agent Service)",
        "modules": [
            "Member 1: Citizen Hazard Classification & SLA Triage Agent",
            "Member 2: Infrastructure Cost & Material Estimator Agent",
            "Member 2 Companion: Asset Degradation & Predictive Risk Agent",
            "Member 3: Dispatch & Route Clustering Agent",
            "Member 4: Municipal Safety & Compliance Audit Agent",
        ],
        "gemini_api_key_configured": has_key,
        "chat_model": os.getenv("CHAT_MODEL", "gemini-2.5-flash"),
        "embedding_model": os.getenv("EMBEDDING_MODEL", "gemini-embedding-001"),
        "retrieval_mode": "Hybrid (Chroma Vector + BM25 with Reciprocal Rank Fusion)" if has_key else "BM25 Keyword Search (Offline Mode)",
    }



@app.get("/api/agent/search", response_model=List[SearchHitResponse], tags=["Retriever"])
def search_knowledge_base(
    query: str = Query(...,
                       description="Search query to run against Sri Lanka BSR knowledge base"),
    k: int = Query(default=4, ge=1, le=10,
                   description="Number of top fused hits to return"),
):
    """
    Direct hybrid search against Sri Lanka infrastructure BSR & municipal specifications.
    Combines BM25 and Vector Search fused with Reciprocal Rank Fusion (RRF).
    """
    docs = hybrid_search(query, k=k)
    return [
        SearchHitResponse(
            source=d.metadata.get("source", "sri_lanka_bsr"),
            content=d.page_content.strip(),
        )
        for d in docs
    ]


@app.post("/api/agent/estimate", tags=["Agentic RAG"])
def estimate_repair_cost(request: EstimateRequest):
    """
    Run the stateful LangGraph Agentic RAG workflow to generate an authoritative
    bill of quantities, materials list, equipment days, labor mandays, and total cost in LKR.
    """
    thread_id = request.thread_id or str(uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "messages": [],
        "hazard_type": request.hazard_type,
        "severity": request.severity,
        "asset_name": request.asset_name,
        "asset_type": request.asset_type,
        "damage_description": request.damage_description,
        "location": request.location,
        "search_query": "",
        "retrieved_docs": "",
        "retries": 0,
        "intent": "estimate",
        "is_relevant": False,
        "estimate": None,
        "final_response": "",
    }

    try:
        final_state = graph.invoke(initial_state, config=config)
        return {
            "thread_id": thread_id,
            "asset_name": request.asset_name,
            "hazard_type": request.hazard_type,
            "severity": request.severity,
            "estimate": final_state.get("estimate"),
            "final_response": final_state.get("final_response"),
            "retries_count": final_state.get("retries", 0),
            "retrieved_docs_preview": final_state.get("retrieved_docs", "")[:500] + "...",
        }
    except Exception as ex:
        raise HTTPException(
            status_code=500, detail=f"Agent execution error: {str(ex)}")


@app.post("/api/agent/ask", tags=["Agentic RAG"])
def ask_infrastructure_assistant(request: AskRequest):
    """
    Interactive Q&A with the Sri Lanka municipal engineering knowledge base.
    """
    thread_id = request.thread_id or str(uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    initial_state = {
        "messages": [],
        "hazard_type": "General Inquiry",
        "severity": "Low",
        "asset_name": "Municipal Inquiry",
        "asset_type": "Civil",
        "damage_description": request.question,
        "location": "Sri Lanka",
        "search_query": request.question,
        "retrieved_docs": "",
        "retries": 0,
        "intent": "question",
        "is_relevant": True,
        "estimate": None,
        "final_response": "",
    }

    try:
        final_state = graph.invoke(initial_state, config=config)
        return {
            "thread_id": thread_id,
            "question": request.question,
            "answer": final_state.get("final_response"),
        }
    except Exception as ex:
        raise HTTPException(
            status_code=500, detail=f"Assistant execution error: {str(ex)}")


@app.post("/api/agent/ingest", tags=["Ingest"])
def trigger_ingest():
    """(Re)build the local Chroma vector database from markdown files in data/."""
    try:
        count = ingest_documents()
        return {
            "status": "success",
            "message": f"Successfully indexed {count} document chunks into ChromaDB.",
            "chunks_count": count,
        }
    except Exception as ex:
        raise HTTPException(
            status_code=500, detail=f"Ingestion failed: {str(ex)}")


@app.post("/api/agent/hazard/classify", tags=["Member 1: Citizen Hazard & SLA Triage"])
def classify_hazard_endpoint(request: HazardClassifyRequest):
    """
    Member 1: Evaluates a citizen hazard report, classifies category and municipal department,
    calibrates SLA resolution window, calculates urgency score, and flags environmental risks.
    """
    try:
        res = run_hazard_agent(
            title=request.title,
            description=request.description,
            location=request.location,
            image_url=request.image_url,
            thread_id=request.thread_id or str(uuid4()),
        )
        return res
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Hazard triage agent error: {str(ex)}")


@app.post("/api/agent/dispatch/optimize", tags=["Member 3: Dispatch & Route Optimization"])
def optimize_dispatch_endpoint(request: DispatchOptimizeRequest):
    """
    Member 3: Prioritizes active hazards, forms geographic route clusters along major corridors,
    determines visit sequences, and matches contractor fleet/municipal crews.
    """
    try:
        res = run_dispatch_agent(
            hazards=request.hazards,
            contractors=request.contractors,
            thread_id=request.thread_id or str(uuid4()),
        )
        return res
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Dispatch optimization agent error: {str(ex)}")


@app.post("/api/agent/safety/audit", tags=["Member 4: Safety & Regulatory Compliance Audit"])
def audit_work_order_endpoint(request: SafetyAuditRequest):
    """
    Member 4: Audits completed work orders against municipal fiscal thresholds (CIDA/CMC),
    mandatory before/after photo evidence, 150m GPS geofencing, and safety protocols.
    """
    try:
        res = run_safety_audit_agent(
            work_order=request.work_order,
            thread_id=request.thread_id or str(uuid4()),
        )
        return res
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Safety audit agent error: {str(ex)}")


@app.post("/api/agent/asset/analyze-risk", tags=["Member 2 Companion: Asset Degradation & Risk"])
def analyze_asset_risk_endpoint(request: AssetRiskRequest):
    """
    Member 2 Companion: Calculates structural health index (0-100), condition tier (1-4),
    Colombo environmental degradation multipliers (coastal salinity, monsoon waterlogging),
    and remaining useful life (RUL) with 72-hour emergency inspection triggers.
    """
    try:
        res = run_asset_risk_agent(
            asset=request.asset,
            thread_id=request.thread_id or str(uuid4()),
        )
        return res
    except Exception as ex:
        raise HTTPException(status_code=500, detail=f"Asset risk agent error: {str(ex)}")


@app.get("/api/agent/agents", tags=["Agent Registry"])
def get_available_agents():
    """Returns the catalog of all specialized municipal AI agents running in CiviLanka."""
    return {
        "agents": [
            {
                "id": "member-1-hazard-triage",
                "name": "Citizen Hazard Classification & SLA Triage Agent",
                "member": "Member 1",
                "endpoint": "/api/agent/hazard/classify",
                "description": "Categorizes municipal defects, assigns CMC/RDA/NWSDB authority, calibrates SLA (2h-168h), and scores urgency.",
            },
            {
                "id": "member-2-cost-estimator",
                "name": "Infrastructure Asset Registry & Cost Estimator Agent",
                "member": "Member 2",
                "endpoint": "/api/agent/estimate",
                "description": "Calculates itemized BSR material quantities, equipment days, labor mandays, and total LKR repair budget.",
            },
            {
                "id": "member-2-asset-degradation",
                "name": "Infrastructure Degradation & Predictive Risk Agent",
                "member": "Member 2 Companion",
                "endpoint": "/api/agent/asset/analyze-risk",
                "description": "Models structural health index, environmental degradation multipliers, remaining useful life, and 72-hour inspection alerts.",
            },
            {
                "id": "member-3-dispatch-clustering",
                "name": "Dispatch & Priority Maintenance Route Clustering Agent",
                "member": "Member 3",
                "endpoint": "/api/agent/dispatch/optimize",
                "description": "Prioritizes hazards, groups nearby sites into corridor routes, sequences stops, and matches contractor trades.",
            },
            {
                "id": "member-4-safety-audit",
                "name": "Municipal Safety & Regulatory Compliance Audit Agent",
                "member": "Member 4",
                "endpoint": "/api/agent/safety/audit",
                "description": "Enforces fiscal spending thresholds, validates before/after photos, checks 150m GPS tolerance, and verifies safety protocols.",
            },
        ]
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    print(f"Starting CiviLanka.Agent on http://127.0.0.1:{port}")
    uvicorn.run("main:app", host="127.0.0.1", port=port, reload=True)
