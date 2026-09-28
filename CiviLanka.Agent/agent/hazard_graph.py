import json
import os
from typing import Optional

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from .graph import get_chat_llm
from .prompts import HAZARD_CLASSIFIER_PROMPT
from .retriever import search_formatted
from .state import HazardClassificationOutput, HazardState


def retrieve_hazard_rules_node(state: HazardState) -> dict:
    title = state.get("title", "")
    desc = state.get("description", "")
    query = f"{title} {desc} hazard classification SLA severity department Colombo"
    docs = search_formatted(query, k=3)
    return {"retrieved_rules": docs}


def classify_hazard_node(state: HazardState) -> dict:
    llm = get_chat_llm()
    title = state.get("title", "")
    desc = state.get("description", "")
    loc = state.get("location", "Colombo")
    category_supplied = state.get("category_supplied") or "Other"
    metadata = state.get("metadata") or "Standard municipal corridor telemetry"
    img = state.get("image_url") or "None"
    docs = state.get("retrieved_rules", "")

    if llm is not None:
        try:
            json_prompt = (
                HAZARD_CLASSIFIER_PROMPT.format(
                    title=title,
                    description=desc,
                    category_supplied=category_supplied,
                    location=loc,
                    metadata=metadata,
                    image_url=img,
                    docs=docs,
                )
                + "\n\nProvide your response as strictly valid JSON matching this schema with NO markdown code fences and NO conversational preamble:\n"
                + "{\n"
                + '  "primary_category": "string (e.g. Water Main Burst, Pothole & Asphalt Failure, Fallen Tree, Broken Traffic Signal)",\n'
                + '  "department": "string (e.g. NWSDB, CMC Engineering Department, CEB, Disaster Management Centre)",\n'
                + '  "assigned_severity": "CRITICAL" | "HIGH" | "MEDIUM" | "LOW",\n'
                + '  "urgency_score": 0.0 to 100.0,\n'
                + '  "sla_resolution_hours": integer (e.g. 4, 12, 24, 48),\n'
                + '  "safety_risk_summary": "detailed explanation of hazards, school proximity, student/pedestrian risks",\n'
                + '  "immediate_actions": ["action 1", "action 2"],\n'
                + '  "crew_sizing": "string",\n'
                + '  "requires_police_traffic_support": true,\n'
                + '  "monsoon_flood_risk": false,\n'
                + '  "environmental_factors": ["School Zone"],\n'
                + '  "confidence_score": 0.95\n'
                + "}"
            )
            res = llm.invoke(json_prompt)
            raw_text = res.content[0]["text"] if isinstance(res.content, list) and len(res.content) > 0 and "text" in res.content[0] else str(res.content)
            clean_text = raw_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]

            parsed_data = json.loads(clean_text.strip())
            classification = HazardClassificationOutput(**parsed_data)
            data = classification.model_dump()
            final_text = (
                f"### Hazard Classification & SLA Triage: {title}\n\n"
                f"- **Primary Category**: {classification.primary_category}\n"
                f"- **Assigned Authority**: {classification.department}\n"
                f"- **Calibrated Severity**: **{classification.assigned_severity}**\n"
                f"- **SLA Window**: **{classification.sla_resolution_hours} hours**\n"
                f"- **Urgency Score**: {classification.urgency_score:.1f} / 100.0\n"
                f"- **Crew Sizing**: {classification.crew_sizing}\n"
                f"- **Police Traffic Support**: {'Required (Arterial Corridor)' if classification.requires_police_traffic_support else 'Not Required'}\n"
                f"- **Monsoon Flood Risk**: {'Yes (High Hazard)' if classification.monsoon_flood_risk else 'No'}\n\n"
                f"**Safety Risk Summary**: {classification.safety_risk_summary}\n\n"
                f"**Immediate Actions**: \n" + "\n".join([f"- {a}" for a in classification.immediate_actions])
            )
            return {
                "classification": data,
                "final_response": final_text,
                "messages": [AIMessage(content=final_text)],
            }
        except Exception as ex:
            print(f"[Hazard Classifier Warning] LangGraph LLM call failed: {ex}")

    # Deterministic rule-based fallback
    fallback = _fallback_hazard_classification(title, desc, loc, category_supplied, metadata)
    final_text = (
        f"### Hazard Classification & SLA Triage: {title}\n\n"
        f"- **Primary Category**: {fallback['primary_category']}\n"
        f"- **Assigned Authority**: {fallback['department']}\n"
        f"- **Calibrated Severity**: **{fallback['assigned_severity']}**\n"
        f"- **SLA Window**: **{fallback['sla_resolution_hours']} hours**\n"
        f"- **Urgency Score**: {fallback['urgency_score']:.1f} / 100.0\n"
        f"- **Safety Risk**: {fallback['safety_risk_summary']}"
    )
    return {
        "classification": fallback,
        "final_response": final_text,
        "messages": [AIMessage(content=final_text)],
    }


def _fallback_hazard_classification(title: str, desc: str, loc: str, cat_supplied: str = "Other", meta: str = "") -> dict:
    t = (title + " " + desc + " " + loc + " " + cat_supplied + " " + meta).lower()

    is_school_zone = any(k in t for k in ["school", "college", "kindergarten", "hospital", "clinic", "preschool", "පාසල"])
    is_water_leak = any(k in t for k in ["pipe", "water", "burst", "leak", "nwsdb", "tap", "flushing"])

    # Department & Category Detection
    if is_water_leak:
        cat = "Water Main Burst & Distribution Failure"
        dept = "NWSDB (National Water Supply & Drainage Board)"
    elif any(k in t for k in ["drain", "canal", "overflow", "culvert", "clog", "monsoon", "flood"]):
        cat = "Drain Blockage & Stormwater Inundation"
        dept = "CMC Drainage & Flood Control Division"
    elif any(k in t for k in ["wire", "light", "transformer", "pole", "ceb", "electric"]):
        cat = "Street Lighting & Electrical Hazard"
        dept = "CEB / CMC Electrical Division"
    elif any(k in t for k in ["tree", "branch", "collapse"]):
        cat = "Fallen Tree & Roadway Obstruction"
        dept = "Disaster Management Unit & CMC Lands Division"
    elif any(k in t for k in ["manhole", "cover missing", "open chamber"]):
        cat = "Open Manhole & Pedestrian Cavity"
        dept = "CMC Engineering Department"
    elif any(k in t for k in ["bridge", "crack", "structural", "flyover"]):
        cat = "Structural Bridge & Pavement Failure"
        dept = "CMC Engineering Department / RDA"
    else:
        cat = "Pothole & Asphalt Pavement Defect"
        dept = "CMC Engineering Department / RDA"

    # Severity & SLA calibration with School Zone / Sensitive Area Multiplier
    if any(k in t for k in ["manhole", "live wire", "bridge", "sinkhole", "critical"]):
        sev = "CRITICAL"
        sla = 4
        base_urgency = 88.0
    elif is_water_leak and is_school_zone:
        sev = "HIGH"
        sla = 12
        base_urgency = 78.0
    elif any(k in t for k in ["arterial", "bus route", "heavy", "flood", "high", "galle road", "baseline"]):
        sev = "HIGH"
        sla = 24
        base_urgency = 68.0
    elif is_school_zone:
        sev = "HIGH"
        sla = 24
        base_urgency = 65.0
    elif any(k in t for k in ["moderate", "medium", "pothole"]):
        sev = "MEDIUM"
        sla = 48
        base_urgency = 45.0
    else:
        sev = "MEDIUM"
        sla = 48
        base_urgency = 40.0

    if is_school_zone:
        base_urgency += 15.0
    if any(k in t for k in ["galle rd", "galle road", "baseline", "kandy", "high level", "pettah"]):
        base_urgency += 15.0

    urgency = min(100.0, base_urgency)
    is_arterial = any(k in t for k in ["galle", "baseline", "high level", "kandy"])
    is_flood = any(k in t for k in ["monsoon", "drain", "canal", "flood", "overflow"])

    risk_desc = (
        f"Identified {sev} risk in sensitive zone ({'School / Hospital' if is_school_zone else 'Urban Corridor'}). "
        f"Substantial hazard to pedestrian and student transit."
    )

    return {
        "primary_category": cat,
        "department": dept,
        "assigned_severity": sev,
        "urgency_score": round(urgency, 1),
        "sla_resolution_hours": sla,
        "safety_risk_summary": risk_desc,
        "immediate_actions": [
            "Deploy reflective high-visibility safety cones and hazard tape",
            "Notify municipal zonal engineer for dispatch",
            "Contact utility emergency hotline (NWSDB/CEB)" if (is_water_leak or "electric" in t) else "Isolate pedestrian walkway"
        ],
        "crew_sizing": "Emergency Quick-Response Crew (2-person + utility van)" if sev in ["CRITICAL", "HIGH"] else "Routine Maintenance Crew",
        "requires_police_traffic_support": is_arterial or is_school_zone,
        "monsoon_flood_risk": is_flood,
        "environmental_factors": [k for k in ["School Zone", "Hospital Zone", "Arterial Corridor", "Monsoon Saturated"] if k in t or (k == "School Zone" and is_school_zone)],
        "confidence_score": 0.95,
    }


def build_hazard_graph():
    builder = StateGraph(HazardState)
    builder.add_node("retrieve", retrieve_hazard_rules_node)
    builder.add_node("classify", classify_hazard_node)

    builder.add_edge(START, "retrieve")
    builder.add_edge("retrieve", "classify")
    builder.add_edge("classify", END)

    memory = InMemorySaver()
    return builder.compile(checkpointer=memory)


_hazard_agent_app = None


def get_hazard_agent():
    global _hazard_agent_app
    if _hazard_agent_app is None:
        _hazard_agent_app = build_hazard_graph()
    return _hazard_agent_app


def run_hazard_agent(
    title: str, 
    description: str, 
    location: str = "Colombo", 
    category_supplied: str = "Other",
    metadata: str = "",
    image_url: Optional[str] = None, 
    thread_id: str = "default_hazard"
) -> dict:
    app = get_hazard_agent()
    initial_state = {
        "messages": [HumanMessage(content=f"Classify hazard: {title} at {location} (Category: {category_supplied}). {description}")],
        "title": title,
        "description": description,
        "location": location,
        "category_supplied": category_supplied,
        "metadata": metadata,
        "image_url": image_url,
        "retrieved_rules": "",
        "classification": None,
        "final_response": "",
    }
    config = {"configurable": {"thread_id": thread_id}}
    final_state = app.invoke(initial_state, config=config)
    return {
        "classification": final_state.get("classification"),
        "final_response": final_state.get("final_response"),
    }
