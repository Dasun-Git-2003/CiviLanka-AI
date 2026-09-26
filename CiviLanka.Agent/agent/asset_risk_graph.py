import json
import os
from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from .graph import get_chat_llm
from .prompts import ASSET_RISK_PROMPT
from .retriever import search_formatted
from .state import AssetRiskOutput, AssetRiskState


def retrieve_asset_specs_node(state: AssetRiskState) -> dict:
    docs = search_formatted("asset degradation useful lifespan Colombo coastal salinity monsoon vibration", k=3)
    return {"retrieved_specs": docs}


def analyze_asset_risk_node(state: AssetRiskState) -> dict:
    llm = get_chat_llm()
    asset_json = state.get("asset_json", "{}")
    docs = state.get("retrieved_specs", "")

    if llm is not None:
        try:
            structured_analyzer = llm.with_structured_output(AssetRiskOutput)
            prompt = ASSET_RISK_PROMPT.format(
                asset_json=asset_json,
                docs=docs,
            )
            output: AssetRiskOutput = structured_analyzer.invoke(prompt)
            data = output.model_dump()

            tier_badge = {
                1: "🟢 Tier 1 (Good)",
                2: "🟡 Tier 2 (Fair)",
                3: "🟠 Tier 3 (Poor)",
                4: "🔴 Tier 4 (Critical / Structural Failure Risk)",
            }.get(output.current_condition_tier, f"Tier {output.current_condition_tier}")

            final_text = (
                f"### Infrastructure Asset Risk & Degradation: {output.asset_name}\n\n"
                f"- **Condition Tier**: **{tier_badge}**\n"
                f"- **Health Index Score**: **{output.health_index_score:.1f} / 100.0**\n"
                f"- **Degradation Acceleration Multiplier**: **{output.degradation_multiplier:.2f}x**\n"
                f"- **Remaining Useful Life**: **{output.estimated_remaining_useful_life_years:.1f} years**\n"
                f"- **Emergency 72-Hour Inspection**: {'🚨 REQUIRED IMMEDIATELY' if output.immediate_inspection_needed else 'Not Required'}\n"
                f"- **Recommended Intervention**: {output.recommended_action}\n"
                f"- **Servicing Cadence**: {output.preventive_maintenance_cadence}\n\n"
                f"**Risk Narrative**: {output.risk_narrative}\n\n"
                f"**Environmental Vulnerabilities**:\n" + "\n".join([f"- {v}" for v in output.environmental_vulnerabilities])
            )
            return {
                "risk_output": data,
                "final_response": final_text,
                "messages": [AIMessage(content=final_text)],
            }
        except Exception as ex:
            print(f"[Asset Risk Warning] LLM call failed: {ex}")

    # Fallback deterministic degradation model
    fallback = _fallback_asset_risk(asset_json)
    tier_badge = {
        1: "🟢 Tier 1 (Good)",
        2: "🟡 Tier 2 (Fair)",
        3: "🟠 Tier 3 (Poor)",
        4: "🔴 Tier 4 (Critical)",
    }.get(fallback["current_condition_tier"], f"Tier {fallback['current_condition_tier']}")

    final_text = (
        f"### Infrastructure Asset Risk & Degradation (Rule-Based Fallback): {fallback['asset_name']}\n\n"
        f"- **Condition Tier**: **{tier_badge}**\n"
        f"- **Health Index Score**: **{fallback['health_index_score']:.1f} / 100.0**\n"
        f"- **Remaining Useful Life**: **{fallback['estimated_remaining_useful_life_years']:.1f} years**\n"
        f"- **Action**: {fallback['recommended_action']}\n"
    )
    return {
        "risk_output": fallback,
        "final_response": final_text,
        "messages": [AIMessage(content=final_text)],
    }


def _fallback_asset_risk(asset_json: str) -> dict:
    try:
        a = json.loads(asset_json) if isinstance(asset_json, str) else asset_json
    except Exception:
        a = {}

    aid = str(a.get("id") or a.get("assetId") or "AST-01")
    name = a.get("name") or a.get("title") or "Municipal Asset"
    cat = a.get("category") or a.get("assetType") or "Roads & Bridges"
    loc = (a.get("location") or a.get("address") or "").lower()

    # Calculate multiplier based on Colombo environment
    multiplier = 1.0
    vulnerabilities = []

    if any(k in loc for k in ["galle", "marine", "kollupitiya", "bambalapitiya", "wellawatte", "sea", "coast"]):
        multiplier *= 1.6
        vulnerabilities.append("Coastal Saline Atmosphere (<1.5km from ocean)")

    if any(k in loc for k in ["canal", "basin", "kolonnawa", "flood", "low-lying", "sluice"]):
        multiplier *= 1.7
        vulnerabilities.append("Monsoon Canal Inundation / High Water Table")

    if any(k in loc for k in ["baseline", "port", "junction", "kandy"]):
        multiplier *= 1.5
        vulnerabilities.append("High Heavy Vehicle / Axle Load Vibration Corridor")

    # Base design life in years
    design_life = 30.0
    if "bridge" in cat.lower() or "sluice" in name.lower():
        design_life = 60.0
    elif "asphalt" in cat.lower() or "road" in cat.lower():
        design_life = 15.0
    elif "culvert" in name.lower() or "drain" in cat.lower():
        design_life = 40.0

    # Age estimation
    age = float(a.get("ageYears") or a.get("age_years") or 8.0)
    effective_age = age * multiplier

    # Health score calculation
    raw_health = max(5.0, 100.0 - (effective_age / design_life) * 100.0)
    health_score = round(min(100.0, raw_health), 1)

    # Condition Tier mapping
    if health_score >= 80.0:
        tier = 1
        action = "Routine preventive maintenance and annual visual inspection."
        cadence = "Annual standard review"
    elif health_score >= 60.0:
        tier = 2
        action = "Preventive crack sealing, surface protective coating, and desiltation."
        cadence = "Bi-annual review"
    elif health_score >= 40.0:
        tier = 3
        action = "Major structural rehabilitation and targeted component replacement."
        cadence = "Quarterly mandatory engineering audit"
    else:
        tier = 4
        action = "Emergency containment, structural reinforcement, or complete reconstruction."
        cadence = "Bi-weekly monitoring"

    rul = max(0.5, (design_life - effective_age) / multiplier)
    immediate_inspection = (tier == 4 or health_score < 40.0)

    narrative = (
        f"Asset {name} exhibits an accelerated degradation factor of {multiplier:.2f}x under Sri Lankan urban conditions. "
        f"With an estimated effective age of {effective_age:.1f} years against a {design_life:.0f}-year design life, "
        f"health index stands at {health_score:.1f}/100. {'Immediate 72-hour engineering inspection is required to avoid structural failure.' if immediate_inspection else 'Condition is manageable with planned preventive maintenance.'}"
    )

    return {
        "asset_id": aid,
        "asset_name": name,
        "asset_category": cat,
        "current_condition_tier": tier,
        "health_index_score": health_score,
        "degradation_multiplier": round(multiplier, 2),
        "estimated_remaining_useful_life_years": round(rul, 1),
        "immediate_inspection_needed": immediate_inspection,
        "recommended_action": action,
        "environmental_vulnerabilities": vulnerabilities or ["Standard Colombo Urban Exposure"],
        "preventive_maintenance_cadence": cadence,
        "risk_narrative": narrative,
    }


def build_asset_risk_graph():
    builder = StateGraph(AssetRiskState)
    builder.add_node("retrieve", retrieve_asset_specs_node)
    builder.add_node("analyze", analyze_asset_risk_node)

    builder.add_edge(START, "retrieve")
    builder.add_edge("retrieve", "analyze")
    builder.add_edge("analyze", END)

    memory = InMemorySaver()
    return builder.compile(checkpointer=memory)


_asset_risk_agent_app = None


def get_asset_risk_agent():
    global _asset_risk_agent_app
    if _asset_risk_agent_app is None:
        _asset_risk_agent_app = build_asset_risk_graph()
    return _asset_risk_agent_app


def run_asset_risk_agent(asset: Any, thread_id: str = "default_asset_risk") -> dict:
    app = get_asset_risk_agent()
    a_str = json.dumps(asset) if not isinstance(asset, str) else asset

    initial_state = {
        "messages": [HumanMessage(content=f"Analyze asset degradation risk.")],
        "asset_json": a_str,
        "retrieved_specs": "",
        "risk_output": None,
        "final_response": "",
    }
    config = {"configurable": {"thread_id": thread_id}}
    final_state = app.invoke(initial_state, config=config)
    return {
        "risk_output": final_state.get("risk_output"),
        "final_response": final_state.get("final_response"),
    }
