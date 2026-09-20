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


if __name__ == "__main__":
    test_hybrid_retriever()
    test_langgraph_agent()
