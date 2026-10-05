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
                + '  "primary_category": "string (e.g. Water Main Burst, Collapsed Retaining Wall, Damaged Traffic Signal, Flooded Underpass, Roadside Landslide, Broken Streetlight Pole, Large Pothole, Drainage Cover Collapse, Fallen Utility Pole, Oil Spill on Roadway, Other)",\n'
                + '  "department": "string (e.g. NWSDB, NBRO, RDA, CMC Fire Service, CEB, SLT-Mobitel, Sri Lanka Railways, Traffic Police HQ, CMC Engineering)",\n'
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
            # Guard: Preserve Drainage Problem and never reclassify to Water Leak
            cat_supp = (category_supplied or "").lower().replace(" ", "")
            desc_l = (description or "").lower()
            if "drain" in cat_supp or "culvert" in desc_l or "silt" in desc_l or "stormwater" in desc_l or "drain" in desc_l:
                prim_cat = parsed_data.get("primary_category", "")
                if "water" in prim_cat.lower() and "drain" not in prim_cat.lower():
                    parsed_data["primary_category"] = "Drainage Problem"
                    parsed_data["department"] = "CMC Drainage & Flood Control Division"

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

    # Keyword extractors for diverse municipal disaster scenarios
    is_school_zone = any(k in t for k in ["school", "college", "kindergarten", "hospital", "clinic", "preschool", "පාසල"])
    is_oil_spill = any(k in t for k in ["oil", "spill", "diesel", "slippery", "grease", "fuel leak", "traction", "skid"])
    is_gas_leak = any(k in t for k in ["gas leak", "lpg", "gas vapour", "mercaptan", "hissing gas"]) or ("gas" in t and "leak" in t)
    is_sinkhole = any(k in t for k in ["sinkhole", "subsidence", "subsurface cavity", "ground cavity", "road collapse", "ground collapse"]) and "pothole" not in t
    is_landslide = any(k in t for k in ["landslide", "embankment", "slope", "soil movement", "mud", "earth slip", "rocks and mud"])
    is_retaining_wall = any(k in t for k in ["retaining wall", "wall collapse", "wall partially collapsed", "unstable wall", "concrete debris"])
    is_flooded_underpass = any(k in t for k in ["underpass", "railway underpass", "subway", "60 cm", "vehicles are stranded", "deep water under"])
    is_traffic_signal = any(k in t for k in ["traffic signal", "traffic light", "signal pole", "traffic lights", "signals are completely non-functional"])
    is_drain_cover = any(k in t for k in ["drain cover", "storm-drain cover", "drainage cover", "open drainage pit", "open chamber"])
    is_missing_manhole = any(k in t for k in ["missing manhole", "stolen manhole"]) or ("manhole" in t and any(k in t for k in ["open", "uncovered", "missing cover"]))
    is_high_voltage = any(k in t for k in ["11kv", "33kv", "high voltage", "transformer fire", "snapped wire", "snapped power line"]) and any(k in t for k in ["spark", "live", "ground", "arcing"])
    is_utility_pole = any(k in t for k in ["utility pole", "wooden pole", "communication cable", "telecom pole", "telephone pole", "cables hanging"])
    is_street_light = not is_high_voltage and any(k in t for k in ["streetlight pole", "street light pole", "light pole", "leaning dangerously", "street bulb"])
    is_sewage = any(k in t for k in ["sewage", "wastewater", "blackwater", "effluent", "sewer line", "foul stench", "foul odor", "sewage overflow"])
    is_hazardous_waste = any(k in t for k in ["chemical", "toxic", "acid", "chemical drums", "hazardous waste", "illegal dumping"])
    is_guardrail = any(k in t for k in ["guardrail", "crash barrier", "w-beam", "parapet wall"]) or ("barrier" in t and "smashed" in t)
    is_walkway = any(k in t for k in ["footpath", "sidewalk collapse", "pedestrian walkway", "footbridge"]) or ("pavement" in t and "sunken" in t)
    is_coastal_erosion = any(k in t for k in ["coastal", "seawall", "revetment", "marine drive", "wave overtopping", "riprap"])
    is_drain = not is_sewage and any(k in t for k in ["drain", "canal", "overflow", "culvert", "clog", "silt", "stormwater", "drainage", "runoff", "monsoon", "flood", "කාණු"])
    is_water_leak = not is_drain and not is_sewage and any(k in t for k in ["water pipe", "water main", "pipe has burst", "pipe burst", "water burst", "burst pipe", "nwsdb", "නළ"])
    is_electric = any(k in t for k in ["wire", "light", "transformer", "pole", "ceb", "electric", "spark", "cable", "විදුලි"])
    is_tree = any(k in t for k in ["tree", "branch", "collapse", "ගස"])
    is_bridge = any(k in t for k in ["bridge", "crack", "structural", "flyover", "pillar", "beam", "abutment", "expansion joint", "scour"])
    is_road = any(k in t for k in ["pothole", "asphalt", "crater", "tarmac", "road damage", "pavement", "deteriorating"])

    is_supplied_other = cat_supplied.strip().lower() in ["other", "none", "unknown", ""]

    # 1. Category & Department Resolution
    if is_gas_leak:
        cat = "Gas or Combustible Vapour Leak"
        dept = "CMC Fire & Rescue Service / Litro-Laugfs Gas Emergency Unit"
    elif is_high_voltage:
        cat = "Exposed High-Voltage Cable"
        dept = "Ceylon Electricity Board (CEB) / LECO Emergency High-Voltage Unit"
    elif is_sinkhole:
        cat = "Sinkhole & Ground Subsidence"
        dept = "Road Development Authority (RDA) & Municipal Geotechnical Wing"
    elif is_oil_spill:
        cat = "Oil Spill & Hazardous Roadway Contaminant"
        dept = "CMC Fire Service Department / Disaster Management & Traffic Police"
    elif is_landslide:
        cat = "Roadside Landslide & Active Slope Instability"
        dept = "National Building Research Organisation (NBRO) & RDA Geotechnical Division"
    elif is_retaining_wall:
        cat = "Collapsed Retaining Wall & Structural Slope Hazard"
        dept = "Road Development Authority (RDA) & NBRO Geotechnical Wing"
    elif is_flooded_underpass:
        cat = "Flooded Railway Underpass & Submerged Transit Corridor"
        dept = "CMC Drainage & Flood Control Division & Sri Lanka Railways (SLR)"
    elif is_traffic_signal:
        cat = "Damaged Traffic Signal & Junction Electrical Hazard"
        dept = "CMC Traffic Engineering Division & Sri Lanka Traffic Police HQ"
    elif is_drain_cover:
        cat = "Open Storm Drain Cavity & Collapsed Cover"
        dept = "CMC Engineering Department (Drainage Works) & Zonal Depot"
    elif is_missing_manhole:
        cat = "Missing Manhole Cover"
        dept = "CMC Municipal Works / SLT / NWSDB Chamber Maintenance"
    elif is_hazardous_waste:
        cat = "Hazardous Chemical & Waste Dump"
        dept = "Central Environmental Authority (CEA) & CMC Waste Management"
    elif is_coastal_erosion:
        cat = "Coastal Erosion & Seawall Breach"
        dept = "Coast Conservation Department (CCD) & RDA Coastal Protection"
    elif is_sewage:
        cat = "Sewage & Wastewater Overflow"
        dept = "NWSDB Sewerage Operations & CMC Public Health Department"
    elif is_guardrail:
        cat = "Damaged Highway Guardrail"
        dept = "Road Development Authority (RDA) Expressway & Highway Safety"
    elif is_walkway:
        cat = "Pedestrian Walkway Collapse"
        dept = "CMC Engineering Department (Civil Works & Walkways)"
    elif is_street_light:
        cat = "Leaning Streetlight Pole & Live Overhead Electrical Hazard"
        dept = "CEB / CMC Electrical Division & Local Municipal Council"
    elif is_utility_pole:
        cat = "Fallen Utility Pole & Low-Hanging Telecommunication Cables"
        dept = "Sri Lanka Telecom (SLT-Mobitel) & CEB Utility Services"
    elif is_drain or "drain" in cat_supplied.lower():
        cat = "Drainage Problem" if "drain" in cat_supplied.lower() else "Drain Blockage & Stormwater Inundation"
        dept = "CMC Drainage & Flood Control Division"
    elif is_water_leak:
        cat = "Water Main Burst & Subsurface Sinkhole" if "sinkhole" in t or "major" in t else "Water Main Burst & Distribution Failure"
        dept = "NWSDB (National Water Supply & Drainage Board)"
    elif is_electric:
        cat = "Street Lighting & Electrical Hazard"
        dept = "CEB / CMC Electrical Division"
    elif is_tree:
        cat = "Fallen Tree & Roadway Obstruction"
        dept = "Disaster Management Unit & CMC Lands Division"
    elif is_bridge:
        cat = "Bridge Structural Damage"
        dept = "RDA National Bridge Maintenance & Rehabilitation Division"
    elif is_road:
        cat = "Severe Asphalt Crater & Carriageway Pothole Defect"
        dept = "CMC Engineering Department / RDA"
    elif is_supplied_other:
        cat = "Other"
        dept = "CMC Municipal Works & General Administration"
    else:
        cat = cat_supplied
        dept = "CMC Engineering Department / Municipal Administration"

    # 2. Dynamic 4-Tier Severity Calibration (CRITICAL, HIGH, MEDIUM, LOW)
    is_critical = (
        is_oil_spill or
        is_landslide or
        is_flooded_underpass or
        is_drain_cover or
        (is_traffic_signal and any(k in t for k in ["exposed", "live", "non-functional"])) or
        (is_street_light and any(k in t for k in ["active", "hanging", "exposed", "leaning"])) or
        (is_water_leak and any(k in t for k in ["sinkhole", "flooding two lanes", "trapped"])) or
        (is_retaining_wall and any(k in t for k in ["blocking", "debris", "collapse"])) or
        (is_bridge and "crack" in t) or
        any(k in t for k in ["electrocution", "sinkhole", "critical", "fatal", "danger to life", "hazard", "explosion"])
    )

    is_low = any(k in t for k in ["minor", "low", "cosmetic", "small", "paint", "notice", "clean", "trash", "slight", "bulb"])

    if is_critical:
        sev = "CRITICAL"
        sla = 2 if (is_oil_spill or is_flooded_underpass or is_traffic_signal or is_drain_cover or "sinkhole" in t) else 4
        base_urgency = 94.0
    elif is_school_zone or is_utility_pole or is_road or any(k in t for k in ["arterial", "bus route", "heavy", "high", "urgent", "galle road", "baseline", "parliament", "kandy", "high level"]):
        sev = "HIGH"
        sla = 8 if is_utility_pole else (12 if (is_water_leak or is_school_zone or is_road) else 24)
        base_urgency = 75.0
    elif is_low or (cat == "Other" and not any(k in t for k in ["heavy", "deep", "flood", "broken"])):
        sev = "LOW"
        sla = 72
        base_urgency = 25.0
    else:
        sev = "MEDIUM"
        sla = 48
        base_urgency = 50.0

    if is_school_zone:
        base_urgency += 15.0
    if any(k in t for k in ["galle", "baseline", "kandy", "high level", "parliament", "negombo", "rajagiriya", "borella", "kaduwela"]):
        base_urgency += 15.0

    urgency = min(100.0, base_urgency)
    is_arterial = any(k in t for k in ["galle", "baseline", "high level", "kandy", "parliament", "negombo", "kaduwela", "rajagiriya"])
    is_flood = is_drain or is_flooded_underpass or any(k in t for k in ["monsoon", "canal", "flood", "overflow"])

    risk_desc = (
        f"Calibrated {sev} priority municipal emergency ({cat}) along {'High-Density Arterial Transit Corridor' if is_arterial else 'Municipal Urban Corridor'}. "
        f"Direct threat to public transit velocity, vehicular safety, and pedestrian welfare requiring immediate multi-agency response."
    )

    # 3. Category-Tailored Operational Directives & Protocols
    if is_oil_spill:
        actions = [
            "Immediate traffic police lane diversion and deployment of high-visibility SLIPPERY ROAD illuminated trailers",
            "Dispatch CMC Fire Brigade & RDA bowsers to spread fine sand and sawdust absorbent across the 150m slick",
            "Apply bio-degradable chemical degreaser wash and conduct mechanical road sweeper clearance before reopening"
        ]
    elif is_landslide:
        actions = [
            "Deploy NBRO emergency geotechnical engineering team to inspect slip plane stability and crown cracks",
            "Erect concrete k-rail deflection barriers and establish 200m advance warning cordon",
            "Mobilize tracked backhoe excavator and tipper dump trucks for controlled mud and rock haulage"
        ]
    elif is_retaining_wall:
        actions = [
            "Cordon off affected carriageway lane with reflective crash barrels and install tilt monitoring targets",
            "Mobilize hydraulic breaker and heavy wheel loader to clear scattered concrete debris from road",
            "Deploy temporary steel structural shoring props to stabilize remaining wall segments under NBRO supervision"
        ]
    elif is_flooded_underpass:
        actions = [
            "Execute full barricading and physical closure of both underpass entry portals",
            "Deploy dual 6-inch high-capacity diesel centrifugal suction pump bowsers to evacuate trapped floodwaters",
            "Dispatch emergency breakdown tow trucks to winch out stranded vehicles and inspect stormwater sump valves"
        ]
    elif is_traffic_signal:
        actions = [
            "Immediately de-energize junction signal controller feed and cordon off exposed 230V live cable terminals",
            "Deploy traffic police officers for emergency manual point duty intersection management during rush hour",
            "Dispatch mobile variable-message signs and mobilize signal engineering crew with replacement mast"
        ]
    elif is_drain_cover:
        actions = [
            "Place heavy-duty galvanized checkered steel road plate across the open drainage pit",
            "Surround perimeter with red barrier mesh and high-intensity solar warning flashers",
            "Fabricate and install reinforced concrete / ductile iron cover (Class D400 rated) flush with sidewalk"
        ]
    elif is_street_light:
        actions = [
            "Remotely isolate street lighting feeder circuit via CEB substation and test exposed conductor terminals",
            "Establish 15-meter pedestrian sidewalk exclusion tape and guide foot traffic to opposite sidewalk",
            "Dispatch CEB hydraulic crane bucket truck to safely dismantle leaning mast and install replacement pole"
        ]
    elif is_utility_pole:
        actions = [
            "Perform non-contact voltage probe testing to verify zero electrical induction on fallen cables",
            "Raise and tie back hanging cable bundles to maintain 4.5m emergency vehicle clearance",
            "Dispatch telecommunications pole-digger truck and plant replacement spun concrete utility pole"
        ]
    elif is_water_leak:
        actions = [
            "Execute rapid isolation of upstream 300mm distribution sluice valve via NWSDB emergency depot",
            "Cordon off 30m sinkhole perimeter with reflective concrete barriers and divert traffic",
            "Mobilize dewatering suction bowsers and backhoe excavator for pipe clamping and sub-base reinstatement"
        ]
    elif is_electric:
        actions = [
            "Immediately de-energize circuit via CEB Colombo Control Room",
            "Cordon off 10-meter perimeter with non-conductive hazard tape",
            "Dispatch CEB high-voltage emergency crew with aerial bucket truck"
        ]
    elif is_drain:
        actions = [
            "Deploy municipal gully emptier / suction bowser to clear culvert choke",
            "Erect temporary pedestrian walkway ramps over flooded corridor",
            "Clear upstream trash rack and silt trap grates"
        ]
    elif is_tree:
        actions = [
            "Deploy chainsaw crew and aerial lift to clear roadway clearance envelope",
            "Cordon off active traffic lane in coordination with traffic police",
            "Liaise with CMC Lands Division for timber removal and green waste haulage"
        ]
    elif is_bridge:
        actions = [
            "Restrict heavy vehicle transit across affected bridge spans",
            "Notify RDA Bridge Design & Maintenance Division for structural load assessment",
            "Install deflection monitoring targets and safety perimeter"
        ]
    elif is_road:
        actions = [
            "Deploy illuminated chevron advance warning trailers and safety cones 75m upstream of the defect",
            "Mobilize rapid asphalt cold-mix crew to execute immediate emergency leveling within 2 hours",
            "Execute saw-cut perimeter milling, base course compaction, and hot-mix asphalt wearing course resurfacing"
        ]
    else:
        # Contextual actions for "Other" / general municipal issues
        actions = [
            "Log incident in Municipal Council Central Registry for zonal dispatch",
            "Dispatch Zonal Field Inspector to verify site conditions and evaluate intervention requirements",
            "Deploy standard municipal caution markers if pedestrian or vehicular traffic is affected"
        ]

    return {
        "primary_category": cat,
        "department": dept,
        "assigned_severity": sev,
        "urgency_score": round(urgency, 1),
        "sla_resolution_hours": sla,
        "safety_risk_summary": risk_desc,
        "immediate_actions": actions,
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
