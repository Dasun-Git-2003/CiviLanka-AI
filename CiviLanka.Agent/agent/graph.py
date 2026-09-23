import os
from typing import Optional

from langchain_core.messages import AIMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from .prompts import (
    ESTIMATOR_PROMPT,
    GENERAL_QA_PROMPT,
    GRADER_PROMPT,
    REWRITE_PROMPT,
    ROUTER_PROMPT,
)
from .retriever import get_api_key, hybrid_search, search_formatted
from .state import (
    AgentState,
    CostEstimateOutput,
    IntentClassification,
    LaborAndPlantItem,
    MaterialItem,
    RetrievalGrade,
)

CHAT_MODEL = os.getenv("CHAT_MODEL", "gemini-2.5-flash")
MAX_RETRIES = 2


def get_chat_llm() -> Optional[ChatGoogleGenerativeAI]:
    api_key = get_api_key()
    if not api_key or "YOUR_" in api_key:
        return None
    return ChatGoogleGenerativeAI(
        model=CHAT_MODEL,
        google_api_key=api_key,
        temperature=0.1,
        timeout=60,
        max_retries=3,
    )


# ── Node 1: Router ────────────────────────────────────────────────────────────
def router_node(state: AgentState) -> dict:
    llm = get_chat_llm()
    hazard_type = state.get("hazard_type") or "Infrastructure Defect"
    asset_type = state.get("asset_type") or "Municipal Asset"
    desc = state.get("damage_description") or ""

    if llm is not None:
        try:
            structured_router = llm.with_structured_output(IntentClassification)
            prompt = ROUTER_PROMPT.format(
                asset_name=state.get("asset_name", ""),
                asset_type=asset_type,
                hazard_type=hazard_type,
                severity=state.get("severity", "Medium"),
                location=state.get("location", "Colombo"),
                damage_description=desc,
            )
            res: IntentClassification = structured_router.invoke(prompt)
            intent = res.intent
            query = f"{hazard_type} {asset_type} {res.domain} repair BSR rate Sri Lanka"
        except Exception:
            intent = "estimate"
            query = f"{hazard_type} {asset_type} repair BSR rate Sri Lanka"
    else:
        intent = "estimate"
        query = f"{hazard_type} {asset_type} repair BSR rate Sri Lanka"

    return {
        "intent": intent,
        "search_query": query.strip(),
        "retries": 0,
    }


# ── Node 2: Retrieve (Hybrid Search Chroma + BM25 + RRF) ──────────────────────
def retrieve_node(state: AgentState) -> dict:
    query = state.get("search_query") or f"{state.get('hazard_type')} {state.get('asset_type')}"
    docs = search_formatted(query, k=4)
    return {"retrieved_docs": docs}


# ── Node 3: Grade Relevance ───────────────────────────────────────────────────
def grade_node(state: AgentState) -> dict:
    llm = get_chat_llm()
    docs = state.get("retrieved_docs", "")
    retries = state.get("retries", 0)

    # If offline or no docs returned, evaluate directly
    if llm is None:
        is_relevant = bool(docs and "No relevant" not in docs)
        return {"is_relevant": is_relevant}

    try:
        structured_grader = llm.with_structured_output(RetrievalGrade)
        prompt = GRADER_PROMPT.format(
            hazard_type=state.get("hazard_type", ""),
            severity=state.get("severity", ""),
            asset_name=state.get("asset_name", ""),
            asset_type=state.get("asset_type", ""),
            damage_description=state.get("damage_description", ""),
            docs=docs,
        )
        grade_res: RetrievalGrade = structured_grader.invoke(prompt)
        return {"is_relevant": grade_res.relevant}
    except Exception:
        return {"is_relevant": True}


# ── Conditional Edge: Decide whether to answer or rewrite ────────────────────
def decide_route(state: AgentState) -> str:
    intent = state.get("intent", "estimate")
    if intent == "question":
        return "answer_question"

    is_relevant = state.get("is_relevant", True)
    retries = state.get("retries", 0)

    if is_relevant or retries >= MAX_RETRIES:
        return "estimate_cost"
    return "rewrite_query"


# ── Node 4: Rewrite Search Query ──────────────────────────────────────────────
def rewrite_node(state: AgentState) -> dict:
    llm = get_chat_llm()
    cur_query = state.get("search_query", "")
    retries = state.get("retries", 0)

    new_query = cur_query
    if llm is not None:
        try:
            prompt = REWRITE_PROMPT.format(
                query=cur_query,
                hazard_type=state.get("hazard_type", ""),
                asset_name=state.get("asset_name", ""),
                asset_type=state.get("asset_type", ""),
                damage_description=state.get("damage_description", ""),
                missing="Specific Sri Lanka CIDA/BSR material and unit rates in LKR",
            )
            res = llm.invoke(prompt)
            new_query = res.content.strip()
        except Exception:
            new_query = f"{state.get('hazard_type')} {state.get('asset_type')} CIDA BSR rate"

    return {
        "search_query": new_query,
        "retries": retries + 1,
    }


# ── Node 5: Estimate Cost & Materials ─────────────────────────────────────────
def estimate_cost_node(state: AgentState) -> dict:
    llm = get_chat_llm()
    docs = state.get("retrieved_docs", "")
    asset_name = state.get("asset_name", "Municipal Asset")
    asset_type = state.get("asset_type", "Civil")
    hazard_type = state.get("hazard_type", "Defect")
    severity = state.get("severity", "Medium")
    desc = state.get("damage_description", "")
    location = state.get("location", "Colombo")

    if llm is not None:
        try:
            structured_estimator = llm.with_structured_output(CostEstimateOutput)
            prompt = ESTIMATOR_PROMPT.format(
                asset_name=asset_name,
                asset_type=asset_type,
                location=location,
                hazard_type=hazard_type,
                severity=severity,
                damage_description=desc,
                docs=docs,
            )
            estimate: CostEstimateOutput = structured_estimator.invoke(prompt)
            estimate_dict = estimate.model_dump()
            final_text = (
                f"### Cost & Material Estimate: {asset_name}\n\n"
                f"**Summary**: {estimate.summary}\n\n"
                f"**Category**: {estimate.infrastructure_category} | **Severity**: {estimate.severity} | "
                f"**Duration**: {estimate.estimated_duration_days} days\n\n"
                f"**Total Budget**: **LKR {estimate.total_estimated_cost_lkr:,.2f}**\n\n"
                f"**Recommended Contractor**: {estimate.recommended_contractor_specialization}\n\n"
                f"**Technical Notes**: {estimate.technical_notes}"
            )
            return {
                "estimate": estimate_dict,
                "final_response": final_text,
                "messages": [AIMessage(content=final_text)],
            }
        except Exception as ex:
            print(f"[Estimator Node Warning] LLM generation error: {ex}")

    # Fallback rule-based estimator if offline or model call failed
    fallback_estimate = _generate_rule_based_estimate(
        asset_name=asset_name,
        asset_type=asset_type,
        hazard_type=hazard_type,
        severity=severity,
        desc=desc,
        location=location,
    )
    final_text = (
        f"### Cost & Material Estimate (Rule-Based Fallback): {asset_name}\n\n"
        f"**Summary**: {fallback_estimate['summary']}\n\n"
        f"**Total Estimated Cost**: **LKR {fallback_estimate['total_estimated_cost_lkr']:,.2f}**\n\n"
        f"**Duration**: {fallback_estimate['estimated_duration_days']} days | "
        f"**Contractor**: {fallback_estimate['recommended_contractor_specialization']}"
    )
    return {
        "estimate": fallback_estimate,
        "final_response": final_text,
        "messages": [AIMessage(content=final_text)],
    }


# ── Node 6: Answer General Question ───────────────────────────────────────────
def answer_question_node(state: AgentState) -> dict:
    llm = get_chat_llm()
    docs = state.get("retrieved_docs", "")
    question = state.get("damage_description") or state.get("search_query")

    if llm is not None:
        try:
            prompt = GENERAL_QA_PROMPT.format(docs=docs, question=question)
            res = llm.invoke(prompt)
            answer = res.content
        except Exception as ex:
            answer = f"Error generating answer: {ex}"
    else:
        answer = (
            "Google Gemini API key is not configured in CiviLanka.Agent/.env.\n\n"
            "Retrieved Sri Lanka BSR References:\n" + docs
        )

    return {
        "final_response": answer,
        "messages": [AIMessage(content=answer)],
    }


def _generate_rule_based_estimate(
    asset_name: str,
    asset_type: str,
    hazard_type: str,
    severity: str,
    desc: str,
    location: str,
) -> dict:
    """Deterministic fallback estimate grounded in Sri Lanka BSR rates."""
    t = asset_type.lower()
    is_crit = severity.lower() == "critical"

    if "water" in t or "pipe" in hazard_type.lower():
        materials = [
            {"item_name": "110mm uPVC Pipe Class 1000 (10 Bar)", "unit": "m", "quantity": 6.0, "unit_cost_lkr": 4850.0, "total_cost_lkr": 29100.0},
            {"item_name": "Mechanical Repair Clamp SS304 (110mm)", "unit": "unit", "quantity": 2.0, "unit_cost_lkr": 16500.0, "total_cost_lkr": 33000.0},
            {"item_name": "Selected river sand pipe bedding (150mm surround)", "unit": "m³", "quantity": 3.0, "unit_cost_lkr": 5800.0, "total_cost_lkr": 17400.0},
            {"item_name": "Aggregate Base Course (ABC) trench backfill & compaction", "unit": "m³", "quantity": 4.0, "unit_cost_lkr": 4200.0, "total_cost_lkr": 16800.0},
        ]
        labor = [
            {"role_or_machine": "JCB 3DX Backhoe Excavator hire", "days": 1.0 if not is_crit else 2.0, "daily_rate_lkr": 38000.0, "total_cost_lkr": 38000.0 if not is_crit else 76000.0},
            {"role_or_machine": "Skilled Pipe Fitter / Plumber", "days": 2.0, "daily_rate_lkr": 4800.0, "total_cost_lkr": 9600.0},
            {"role_or_machine": "Unskilled General Laborers (2 workmen)", "days": 4.0, "daily_rate_lkr": 3200.0, "total_cost_lkr": 12800.0},
        ]
        trade = "Water & Plumbing"
        days = 2 if not is_crit else 1
    elif "road" in t or "pothole" in hazard_type.lower():
        materials = [
            {"item_name": "Bitumen Emulsion Tack Coat (CSS-1h)", "unit": "m²", "quantity": 15.0, "unit_cost_lkr": 450.0, "total_cost_lkr": 6750.0},
            {"item_name": "Hot-mix asphalt wearing course (50mm compacted)", "unit": "m²", "quantity": 15.0, "unit_cost_lkr": 11200.0, "total_cost_lkr": 168000.0},
            {"item_name": "Aggregate Base Course (ABC 0-37.5mm)", "unit": "m³", "quantity": 2.0, "unit_cost_lkr": 4600.0, "total_cost_lkr": 9200.0},
        ]
        labor = [
            {"role_or_machine": "5-ton Tandem Vibratory Asphalt Roller hire", "days": 1.0, "daily_rate_lkr": 28000.0, "total_cost_lkr": 28000.0},
            {"role_or_machine": "Walk-behind asphalt floor saw cutter", "days": 1.0, "daily_rate_lkr": 6500.0, "total_cost_lkr": 6500.0},
            {"role_or_machine": "Skilled Asphalt Paving Operator", "days": 1.0, "daily_rate_lkr": 4500.0, "total_cost_lkr": 4500.0},
            {"role_or_machine": "Semi-skilled workmen (3 crew)", "days": 3.0, "daily_rate_lkr": 3600.0, "total_cost_lkr": 10800.0},
        ]
        trade = "Roads & Bridges"
        days = 2
    else:
        materials = [
            {"item_name": "Reinforced precast concrete slab (Grade 30)", "unit": "unit", "quantity": 3.0, "unit_cost_lkr": 6800.0, "total_cost_lkr": 20400.0},
            {"item_name": "Cement & sand mortar 1:4 repair mix", "unit": "m³", "quantity": 1.5, "unit_cost_lkr": 16500.0, "total_cost_lkr": 24750.0},
        ]
        labor = [
            {"role_or_machine": "Skilled Mason", "days": 2.0, "daily_rate_lkr": 4500.0, "total_cost_lkr": 9000.0},
            {"role_or_machine": "Unskilled Construction Laborers", "days": 4.0, "daily_rate_lkr": 3200.0, "total_cost_lkr": 12800.0},
        ]
        trade = "Civil"
        days = 3

    subtotal_materials = sum(m["total_cost_lkr"] for m in materials)
    subtotal_labor = sum(l["total_cost_lkr"] for l in labor)
    safety = 12000.0
    contingency_pct = 20.0 if is_crit else 10.0
    base_sum = subtotal_materials + subtotal_labor + safety
    contingency = (base_sum * contingency_pct) / 100.0
    total = base_sum + contingency

    return {
        "summary": f"Standard municipal rehabilitation for {hazard_type} on {asset_name} ({asset_type}) at {location}.",
        "infrastructure_category": asset_type,
        "severity": severity,
        "materials": materials,
        "labor_and_equipment": labor,
        "safety_and_preliminaries_lkr": safety,
        "contingency_percentage": contingency_pct,
        "contingency_cost_lkr": contingency,
        "total_estimated_cost_lkr": total,
        "estimated_duration_days": days,
        "recommended_contractor_specialization": trade,
        "technical_notes": "Repairs must conform to CIDA BSR standards with mandatory compaction and pressure testing prior to backfill.",
        "cited_sources": ["sri_lanka_bsr_rates", "municipal_repair_specs"],
    }


def create_cost_estimator_graph():
    """Builds and compiles the stateful LangGraph Agentic RAG workflow."""
    builder = StateGraph(AgentState)

    builder.add_node("router", router_node)
    builder.add_node("retrieve", retrieve_node)
    builder.add_node("grade", grade_node)
    builder.add_node("rewrite", rewrite_node)
    builder.add_node("estimate_cost", estimate_cost_node)
    builder.add_node("answer_question", answer_question_node)

    builder.add_edge(START, "router")
    builder.add_edge("router", "retrieve")
    builder.add_edge("retrieve", "grade")

    builder.add_conditional_edges(
        "grade",
        decide_route,
        {
            "estimate_cost": "estimate_cost",
            "rewrite_query": "rewrite",
            "answer_question": "answer_question",
        },
    )

    builder.add_edge("rewrite", "retrieve")
    builder.add_edge("estimate_cost", END)
    builder.add_edge("answer_question", END)

    checkpointer = InMemorySaver()
    return builder.compile(checkpointer=checkpointer)

