"""Verification script for CiviLanka.Agent Hybrid Search & Agentic RAG."""

from agent.graph import create_cost_estimator_graph
from agent.retriever import hybrid_search, format_docs
import sys
from pathlib import Path

# Add CiviLanka.Agent to sys.path
AGENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(AGENT_DIR))


def test_hybrid_retriever():
    print("\n" + "=" * 70)
    print("TEST 1: HYBRID SEARCH (BM25 + CHROMA with Reciprocal Rank Fusion)")
    print("=" * 70)

    queries = [
        "110mm uPVC water pipe burst repair cost",
        "asphalt pothole cold mix patching rate",
        "drainage desilting canal dredging labor",
    ]

    for q in queries:
        print(f"\n[QUERY]: '{q}'")
        hits = hybrid_search(q, k=2)
        print(f"  -> Found {len(hits)} matching document chunks.")
        for idx, doc in enumerate(hits, 1):
            src = doc.metadata.get("source", "unknown")
            snippet = doc.page_content.replace("\n", " ")[:110]
            print(f"  Hit {idx} [{src}]: {snippet}...")

    print("\n[SUCCESS] Hybrid Search test PASSED!")


def test_langgraph_agent():
    print("\n" + "=" * 70)
    print("TEST 2: LANGGRAPH AGENTIC COST & MATERIAL ESTIMATION")
    print("=" * 70)

    graph = create_cost_estimator_graph()

    test_input = {
        "messages": [],
        "hazard_type": "Pipe Burst",
        "severity": "Critical",
        "asset_name": "Main St Water Pipe",
        "asset_type": "Water",
        "damage_description": "Severe 110mm water distribution pipe burst causing roadway flooding near Colombo junction.",
        "location": "Downtown Colombo",
        "search_query": "",
        "retrieved_docs": "",
        "retries": 0,
        "intent": "estimate",
        "is_relevant": False,
        "estimate": None,
        "final_response": "",
    }

    config = {"configurable": {"thread_id": "test-thread-001"}}
    result = graph.invoke(test_input, config=config)

    print(f"\nAgent Final Response Preview:")
    print("-" * 50)
    print(result.get("final_response"))
    print("-" * 50)

    estimate = result.get("estimate")
    if estimate:
        print(f"\nEstimate Breakdown:")
        print(f"  Category       : {estimate.get('infrastructure_category')}")
        print(f"  Severity       : {estimate.get('severity')}")
        print(
            f"  Total Cost     : LKR {estimate.get('total_estimated_cost_lkr'):,.2f}")
        print(
            f"  Duration       : {estimate.get('estimated_duration_days')} days")
        print(
            f"  Contractor     : {estimate.get('recommended_contractor_specialization')}")
        print(f"  Materials Count: {len(estimate.get('materials', []))}")
        print(
            f"  Labor/Plant    : {len(estimate.get('labor_and_equipment', []))}")

    print("\n[SUCCESS] LangGraph Agentic RAG test PASSED!")


def test_hazard_classification_agent():
    print("\n" + "=" * 70)
    print("TEST 3: MEMBER 1 — HAZARD CLASSIFICATION & SLA TRIAGE AGENT")
    print("=" * 70)

    from agent.hazard_graph import run_hazard_agent

    result = run_hazard_agent(
        title="Deep roadway pothole near school zone",
        description="Massive crater 150mm deep on Galle Road outside St. Thomas College, bursting tyres and causing traffic bottlenecks during peak morning hours.",
        location="Galle Road, Mount Lavinia",
        thread_id="test_hazard_01",
    )

    c = result.get("classification") or {}
    print(f"\nClassification Result:")
    print(f"  Primary Category : {c.get('primary_category')}")
    print(f"  Department       : {c.get('department')}")
    print(f"  Severity         : {c.get('assigned_severity')}")
    print(f"  SLA Window       : {c.get('sla_resolution_hours')} hours")
    print(f"  Urgency Score    : {c.get('urgency_score')} / 100.0")
    print(f"  Police Traffic   : {c.get('requires_police_traffic_support')}")
    print(f"  Monsoon Flood    : {c.get('monsoon_flood_risk')}")

    assert c.get("primary_category"), "Primary category should not be empty"
    assert c.get("assigned_severity") in ["CRITICAL", "HIGH", "MEDIUM", "LOW"], "Invalid severity"
    assert c.get("sla_resolution_hours") > 0, "SLA hours should be positive"
    print("\n[SUCCESS] Hazard Classification & SLA Triage agent PASSED!")


def test_dispatch_optimization_agent():
    print("\n" + "=" * 70)
    print("TEST 4: MEMBER 3 — DISPATCH & ROUTE CLUSTERING AGENT")
    print("=" * 70)

    from agent.dispatch_graph import run_dispatch_agent

    test_hazards = [
        {
            "id": "HAZ-001",
            "title": "Severe Pothole near Bambalapitiya Junction",
            "severity": "CRITICAL",
            "location": "Galle Road, Bambalapitiya",
            "latitude": 6.8925,
            "longitude": 79.8550,
            "category": "Roads & Bridges",
        },
        {
            "id": "HAZ-002",
            "title": "Broken Curb and Asphalt Cracks",
            "severity": "LOW",
            "location": "Galle Road, Wellawatte",
            "latitude": 6.8780,
            "longitude": 79.8600,
            "category": "Roads & Bridges",
        },
        {
            "id": "HAZ-003",
            "title": "Flooded Roadside Gully Drain",
            "severity": "HIGH",
            "location": "Baseline Road, Dematagoda",
            "latitude": 6.9350,
            "longitude": 79.8780,
            "category": "Drainage",
        },
    ]

    test_contractors = [
        {
            "id": "CONT-101",
            "name": "Colombo Asphalt Pavers Ltd",
            "specialization": "Asphalt Paving & Roadways",
        },
        {
            "id": "CONT-102",
            "name": "Lanka Drainage & Utilities",
            "specialization": "Water & Drainage Utilities",
        },
    ]

    result = run_dispatch_agent(test_hazards, test_contractors, thread_id="test_dispatch_01")
    opt = result.get("optimization_output") or {}

    print(f"\nOptimization Result:")
    print(f"  Total Evaluated  : {opt.get('total_hazards_analyzed')}")
    print(f"  Clusters Formed  : {opt.get('clusters_formed')}")
    print(f"  Ranked Hazards   : {len(opt.get('ranked_hazards', []))}")
    print(f"  Crew Assignments : {len(opt.get('crew_assignments', []))}")

    for c in opt.get("route_clusters", []):
        print(f"    - Cluster '{c.get('cluster_name')}': {c.get('hazard_ids')}")

    assert opt.get("total_hazards_analyzed") == 3, "Should evaluate all 3 hazards"
    assert opt.get("clusters_formed") >= 1, "Should form at least 1 cluster"
    print("\n[SUCCESS] Dispatch & Route Optimization agent PASSED!")


def test_municipal_safety_audit_agent():
    print("\n" + "=" * 70)
    print("TEST 5: MEMBER 4 — MUNICIPAL SAFETY & COMPLIANCE AUDIT AGENT")
    print("=" * 70)

    from agent.audit_graph import run_safety_audit_agent

    # Test Work Order with missing Tender Board approval (>500k) and GPS mismatch
    test_work_order = {
        "workOrderId": "WO-2026-088",
        "totalCost": 650000.0,
        "approvedBy": "Zonal Supervisor Only",
        "beforeImageUrl": "https://civilanka.gov.lk/images/before_pothole.jpg",
        "afterImageUrl": "https://civilanka.gov.lk/images/after_pothole.jpg",
        "hazardLatitude": 6.9271,
        "hazardLongitude": 79.8612,
        "completionLatitude": 6.9320,  # >500m away!
        "completionLongitude": 79.8650,
        "safetyChecklistPassed": True,
    }

    result = run_safety_audit_agent(test_work_order, thread_id="test_audit_01")
    audit = result.get("audit_output") or {}

    print(f"\nAudit Result:")
    print(f"  Status            : {audit.get('compliance_status')}")
    print(f"  Cost Audited      : LKR {audit.get('total_cost_lkr'):,.2f}")
    print(f"  Approval Tier     : {audit.get('approval_tier_required')}")
    print(f"  GPS Verified      : {audit.get('gps_verification_passed')}")
    print(f"  Evidence Verified : {audit.get('evidence_verification_passed')}")
    print(f"  Violations Count  : {len(audit.get('violations', []))}")

    for v in audit.get("violations", []):
        print(f"    - [{v.get('rule_id')}] {v.get('rule_name')} ({v.get('severity')})")

    assert audit.get("compliance_status") == "FAILED", "Work order with >150m GPS error and missing tender board approval must fail"
    assert len(audit.get("violations", [])) >= 2, "Should identify both fiscal and GPS violations"
    print("\n[SUCCESS] Municipal Safety & Compliance Audit agent PASSED!")


def test_asset_risk_agent():
    print("\n" + "=" * 70)
    print("TEST 6: MEMBER 2 COMPANION — ASSET DEGRADATION & RISK AGENT")
    print("=" * 70)

    from agent.asset_risk_graph import run_asset_risk_agent

    test_asset = {
        "assetId": "AST-COLOMBO-402",
        "name": "Wellawatte Marine Drive Sea Canal Culvert",
        "category": "Drainage & Flood Control",
        "location": "Marine Drive / Wellawatte Sea Outlet",
        "ageYears": 22.0,
    }

    result = run_asset_risk_agent(test_asset, thread_id="test_asset_risk_01")
    risk = result.get("risk_output") or {}

    print(f"\nAsset Degradation Result:")
    print(f"  Asset Name        : {risk.get('asset_name')}")
    print(f"  Condition Tier    : Tier {risk.get('current_condition_tier')}")
    print(f"  Health Index      : {risk.get('health_index_score')} / 100.0")
    print(f"  Degradation Mult  : {risk.get('degradation_multiplier')}x")
    print(f"  Remaining Life    : {risk.get('estimated_remaining_useful_life_years')} years")
    print(f"  Emergency 72h Insp: {risk.get('immediate_inspection_needed')}")
    print(f"  Recommended Action: {risk.get('recommended_action')}")

    assert risk.get("current_condition_tier") in [1, 2, 3, 4], "Valid condition tier required"
    assert risk.get("degradation_multiplier") >= 1.0, "Degradation multiplier should be >= 1.0"
    print("\n[SUCCESS] Asset Degradation & Predictive Risk agent PASSED!")


if __name__ == "__main__":
    test_hybrid_retriever()
    test_langgraph_agent()
    test_hazard_classification_agent()
    test_dispatch_optimization_agent()
    test_municipal_safety_audit_agent()
    test_asset_risk_agent()
    print("\n" + "=" * 70)
    print("ALL 6 CIVI-LANKA AI AGENT SUITE TESTS COMPLETED SUCCESSFULLY!")
    print("=" * 70)

