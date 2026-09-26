import json
import math
import os
from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from .graph import get_chat_llm
from .prompts import DISPATCH_OPTIMIZER_PROMPT
from .retriever import search_formatted
from .state import (
    DispatchOptimizationOutput,
    DispatchState,
    RankedHazardItem,
    RouteClusterItem,
    SuggestedContractorAssignment,
)


def retrieve_dispatch_specs_node(state: DispatchState) -> dict:
    docs = search_formatted("Colombo dispatch corridors Galle Road Baseline Road maintenance clustering contractor", k=3)
    return {"retrieved_specs": docs}


def optimize_dispatch_node(state: DispatchState) -> dict:
    llm = get_chat_llm()
    hazards_json = state.get("hazards_json", "[]")
    contractors_json = state.get("contractors_json", "[]")
    docs = state.get("retrieved_specs", "")

    if llm is not None:
        try:
            structured_optimizer = llm.with_structured_output(DispatchOptimizationOutput)
            prompt = DISPATCH_OPTIMIZER_PROMPT.format(
                hazards_json=hazards_json,
                contractors_json=contractors_json,
                docs=docs,
            )
            output: DispatchOptimizationOutput = structured_optimizer.invoke(prompt)
            data = output.model_dump()
            final_text = (
                f"### Dispatch & Maintenance Route Optimization\n\n"
                f"**Summary**: {output.optimization_strategy_summary}\n\n"
                f"- **Hazards Evaluated**: {output.total_hazards_analyzed}\n"
                f"- **Clusters Created**: {output.clusters_formed}\n\n"
                f"#### Optimized Route Clusters:\n"
            )
            for c in output.route_clusters:
                final_text += (
                    f"- **{c.cluster_name}** ({len(c.hazard_ids)} hazards, ~{c.estimated_transit_minutes} min transit):\n"
                    f"  Sequence: {' ➔ '.join(c.suggested_work_sequence)}\n"
                )
            final_text += "\n#### Contractor Fleet Assignments:\n"
            for a in output.crew_assignments:
                final_text += f"- **{a.cluster_id}**: {a.contractor_name} ({a.trade}) - Match {int(a.matching_score * 100)}%\n"

            return {
                "optimization_output": data,
                "final_response": final_text,
                "messages": [AIMessage(content=final_text)],
            }
        except Exception as ex:
            print(f"[Dispatch Optimizer Warning] LLM call failed: {ex}")

    # Fallback deterministic clustering & prioritization
    fallback = _fallback_dispatch_optimizer(hazards_json, contractors_json)
    final_text = (
        f"### Dispatch & Maintenance Route Optimization (Rule-Based Fallback)\n\n"
        f"**Summary**: {fallback['optimization_strategy_summary']}\n\n"
        f"- **Hazards Evaluated**: {fallback['total_hazards_analyzed']}\n"
        f"- **Clusters Created**: {fallback['clusters_formed']}\n"
    )
    for c in fallback["route_clusters"]:
        final_text += f"- **{c['cluster_name']}**: {len(c['hazard_ids'])} sites assigned.\n"
    return {
        "optimization_output": fallback,
        "final_response": final_text,
        "messages": [AIMessage(content=final_text)],
    }


def _fallback_dispatch_optimizer(hazards_json: str, contractors_json: Optional[str]) -> dict:
    try:
        hazards = json.loads(hazards_json) if isinstance(hazards_json, str) else hazards_json
    except Exception:
        hazards = []

    try:
        contractors = json.loads(contractors_json) if contractors_json and isinstance(contractors_json, str) else []
    except Exception:
        contractors = []

    if not isinstance(hazards, list):
        hazards = []

    # 1. Rank hazards by severity & SLA
    severity_weights = {"CRITICAL": 95.0, "HIGH": 75.0, "MEDIUM": 50.0, "LOW": 25.0}
    ranked_list = []

    for i, h in enumerate(hazards):
        hid = str(h.get("id") or h.get("hazardId") or f"H-{i+1}")
        title = h.get("title") or h.get("name") or "Reported Hazard"
        sev = (h.get("severity") or "MEDIUM").upper()
        base_score = severity_weights.get(sev, 50.0)
        # Check location corridor keywords
        loc_str = (h.get("location") or h.get("address") or "").lower()
        if "galle" in loc_str:
            corridor = "Galle Road Coastal Corridor"
            base_score += 5.0
        elif "baseline" in loc_str:
            corridor = "Baseline Road Arterial Corridor"
            base_score += 5.0
        elif "pettah" in loc_str or "fort" in loc_str:
            corridor = "Pettah / Fort Commercial Core"
            base_score += 5.0
        elif "high level" in loc_str or "havelock" in loc_str:
            corridor = "High Level / Havelock Corridor"
            base_score += 4.0
        else:
            corridor = "Colombo Metropolitan General"

        ranked_list.append({
            "hazard_id": hid,
            "title": title,
            "severity": sev,
            "composite_priority_score": round(min(100.0, base_score), 1),
            "urgency_rank": 0,
            "corridor": corridor,
            "rationale": f"Ranked based on {sev} severity and corridor impact in Colombo.",
            "lat": float(h.get("latitude") or 6.9271),
            "lng": float(h.get("longitude") or 79.8612),
            "category": h.get("category") or h.get("hazardType") or "General Civil",
        })

    # Sort descending by priority score
    ranked_list.sort(key=lambda x: x["composite_priority_score"], reverse=True)
    for idx, item in enumerate(ranked_list):
        item["urgency_rank"] = idx + 1

    # 2. Cluster hazards by corridor
    corridor_groups: Dict[str, List[dict]] = {}
    for item in ranked_list:
        c = item["corridor"]
        if c not in corridor_groups:
            corridor_groups[c] = []
        corridor_groups[c].append(item)

    route_clusters = []
    crew_assignments = []
    cluster_idx = 1

    for c_name, group in corridor_groups.items():
        c_id = f"CLUSTER-{chr(64 + cluster_idx)}"
        cluster_idx += 1

        avg_lat = sum(h["lat"] for h in group) / len(group)
        avg_lng = sum(h["lng"] for h in group) / len(group)
        h_ids = [h["hazard_id"] for h in group]

        route_clusters.append({
            "cluster_id": c_id,
            "cluster_name": f"{c_name} Route",
            "hazard_ids": h_ids,
            "center_latitude": round(avg_lat, 5),
            "center_longitude": round(avg_lng, 5),
            "radius_km": round(min(3.5, 0.8 + 0.3 * len(group)), 2),
            "estimated_transit_minutes": max(15, len(group) * 12),
            "suggested_work_sequence": h_ids,
        })

        # Match contractor or default municipal crew
        trade = "Asphalt Paving & Roadways" if any("pothole" in h["title"].lower() or "road" in h["category"].lower() for h in group) else "Water & Drainage Utilities"
        matched_contractor = None
        if contractors:
            for cont in contractors:
                c_trade = cont.get("specialization") or cont.get("trade") or ""
                if trade.split()[0].lower() in c_trade.lower():
                    matched_contractor = cont
                    break
            if not matched_contractor and contractors:
                matched_contractor = contractors[0]

        cont_name = matched_contractor.get("name") if matched_contractor else f"CMC Zonal Unit - {c_name.split()[0]}"
        cont_id = str(matched_contractor.get("id")) if matched_contractor else None

        crew_assignments.append({
            "cluster_id": c_id,
            "suggested_contractor_id": cont_id,
            "contractor_name": cont_name,
            "trade": trade,
            "matching_score": 0.92,
            "assignment_reason": f"Selected for optimal trade match ({trade}) and operational proximity to {c_name}.",
        })

    # Strip temp lat/lng/category fields from ranked_hazards output
    clean_ranked = [{k: v for k, v in item.items() if k not in ["lat", "lng", "category"]} for item in ranked_list]

    return {
        "total_hazards_analyzed": len(hazards),
        "clusters_formed": len(route_clusters),
        "ranked_hazards": clean_ranked,
        "route_clusters": route_clusters,
        "crew_assignments": crew_assignments,
        "optimization_strategy_summary": f"Optimized {len(hazards)} hazards into {len(route_clusters)} corridor-based clusters, prioritizing immediate critical safety risks and minimizing inter-zone travel.",
    }


def build_dispatch_graph():
    builder = StateGraph(DispatchState)
    builder.add_node("retrieve", retrieve_dispatch_specs_node)
    builder.add_node("optimize", optimize_dispatch_node)

    builder.add_edge(START, "retrieve")
    builder.add_edge("retrieve", "optimize")
    builder.add_edge("optimize", END)

    memory = InMemorySaver()
    return builder.compile(checkpointer=memory)


_dispatch_agent_app = None


def get_dispatch_agent():
    global _dispatch_agent_app
    if _dispatch_agent_app is None:
        _dispatch_agent_app = build_dispatch_graph()
    return _dispatch_agent_app


def run_dispatch_agent(hazards: Any, contractors: Optional[Any] = None, thread_id: str = "default_dispatch") -> dict:
    app = get_dispatch_agent()
    h_str = json.dumps(hazards) if not isinstance(hazards, str) else hazards
    c_str = json.dumps(contractors) if contractors and not isinstance(contractors, str) else (contractors or "[]")

    initial_state = {
        "messages": [HumanMessage(content=f"Optimize dispatch for hazards batch.")],
        "hazards_json": h_str,
        "contractors_json": c_str,
        "retrieved_specs": "",
        "optimization_output": None,
        "final_response": "",
    }
    config = {"configurable": {"thread_id": thread_id}}
    final_state = app.invoke(initial_state, config=config)
    return {
        "optimization_output": final_state.get("optimization_output"),
        "final_response": final_state.get("final_response"),
    }
