import json
import math
import os
from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, HumanMessage
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph

from .graph import get_chat_llm
from .prompts import MUNICIPAL_SAFETY_AUDIT_PROMPT
from .retriever import search_formatted
from .state import (
    MunicipalSafetyAuditOutput,
    SafetyAuditState,
    SafetyAuditViolationItem,
)


def retrieve_audit_rules_node(state: SafetyAuditState) -> dict:
    docs = search_formatted("municipal audit safety compliance fiscal threshold approval photo GPS tolerance Colombo", k=3)
    return {"retrieved_rules": docs}


def audit_work_order_node(state: SafetyAuditState) -> dict:
    llm = get_chat_llm()
    wo_json = state.get("work_order_json", "{}")
    docs = state.get("retrieved_rules", "")

    if llm is not None:
        try:
            structured_auditor = llm.with_structured_output(MunicipalSafetyAuditOutput)
            prompt = MUNICIPAL_SAFETY_AUDIT_PROMPT.format(
                work_order_json=wo_json,
                docs=docs,
            )
            audit_res: MunicipalSafetyAuditOutput = structured_auditor.invoke(prompt)
            data = audit_res.model_dump()

            status_badge = {
                "PASS": "✅ PASS",
                "FAILED": "❌ FAILED",
                "CONDITIONAL_APPROVAL": "⚠️ CONDITIONAL APPROVAL",
            }.get(audit_res.compliance_status, audit_res.compliance_status)

            final_text = (
                f"### Municipal Safety & Compliance Audit: Work Order {audit_res.work_order_id}\n\n"
                f"- **Audit Status**: **{status_badge}**\n"
                f"- **Total Audited Cost**: LKR {audit_res.total_cost_lkr:,.2f}\n"
                f"- **Approval Tier Required**: {audit_res.approval_tier_required} "
                f"({'Authorized' if audit_res.is_approval_present else 'MISSING'})\n"
                f"- **GPS Verification**: {'Within 150m Tolerance' if audit_res.gps_verification_passed else 'MISMATCH (>150m)'}\n"
                f"- **Photo Evidence**: {'Complete (Before & After)' if audit_res.evidence_verification_passed else 'MISSING'}\n"
                f"- **Safety Protocols**: {'Compliant' if audit_res.safety_protocol_passed else 'Violations Detected'}\n\n"
                f"**Executive Audit Summary**: {audit_res.audit_summary}\n\n"
            )

            if audit_res.violations:
                final_text += "#### Detected Violations & Required Remediation:\n"
                for v in audit_res.violations:
                    icon = "🛑" if v.severity == "BLOCKING" else "⚠️"
                    final_text += (
                        f"- {icon} **[{v.rule_id}] {v.rule_name}** ({v.severity})\n"
                        f"  Finding: {v.description}\n"
                        f"  Remediation: {v.remediation_step}\n"
                    )
            else:
                final_text += "✅ **No compliance violations detected. Work order verified for invoice settlement.**\n"

            return {
                "audit_output": data,
                "final_response": final_text,
                "messages": [AIMessage(content=final_text)],
            }
        except Exception as ex:
            print(f"[Safety Audit Warning] LLM call failed: {ex}")

    # Fallback deterministic regulatory audit
    fallback = _fallback_municipal_audit(wo_json)
    status_badge = {
        "PASS": "✅ PASS",
        "FAILED": "❌ FAILED",
        "CONDITIONAL_APPROVAL": "⚠️ CONDITIONAL APPROVAL",
    }.get(fallback["compliance_status"], fallback["compliance_status"])

    final_text = (
        f"### Municipal Safety & Compliance Audit (Rule-Based Fallback): {fallback['work_order_id']}\n\n"
        f"- **Audit Status**: **{status_badge}**\n"
        f"- **Cost**: LKR {fallback['total_cost_lkr']:,.2f}\n"
        f"- **Summary**: {fallback['audit_summary']}\n"
    )
    return {
        "audit_output": fallback,
        "final_response": final_text,
        "messages": [AIMessage(content=final_text)],
    }


def _haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000  # radius of Earth in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c


def _fallback_municipal_audit(wo_json: str) -> dict:
    try:
        wo = json.loads(wo_json) if isinstance(wo_json, str) else wo_json
    except Exception:
        wo = {}

    wo_id = str(wo.get("id") or wo.get("workOrderId") or "WO-AUDIT")
    cost = float(wo.get("totalCost") or wo.get("actualCost") or wo.get("estimatedCost") or 0.0)

    violations = []
    regulations = ["CMC Financial Regulations 2021", "CIDA SP-102 Quality Specification"]

    # 1. Fiscal authorization check
    approver = (wo.get("approvedBy") or wo.get("supervisorApproval") or "").lower()
    if cost >= 500000:
        approval_tier = "Municipal Tender Board"
        if not approver or "tender" not in approver:
            violations.append({
                "rule_id": "FISC-DIR-01",
                "rule_name": "Tender Board Approval Requirement (> LKR 500,000)",
                "severity": "BLOCKING",
                "description": f"Work order cost of LKR {cost:,.2f} exceeds LKR 500,000 threshold but lacks Tender Board resolution.",
                "remediation_step": "Submit work order docket to Municipal Standing Committee / Tender Board for formal ratifying resolution.",
            })
            is_approved = False
        else:
            is_approved = True
    elif cost >= 100000:
        approval_tier = "Municipal Director / Chief Engineer"
        if not approver or not any(k in approver for k in ["director", "chief", "engineer", "super"]):
            violations.append({
                "rule_id": "FISC-SUP-01",
                "rule_name": "Director Authorization Requirement (LKR 100,000 - 500,000)",
                "severity": "BLOCKING",
                "description": f"Work order cost of LKR {cost:,.2f} requires Municipal Director written authorization.",
                "remediation_step": "Obtain signed authorization form from Zonal Chief Engineer or Municipal Director.",
            })
            is_approved = False
        else:
            is_approved = True
    else:
        approval_tier = "Zonal Municipal Supervisor"
        is_approved = bool(approver) or True

    # 2. Evidence verification (before/after photos)
    before_img = wo.get("beforeImageUrl") or wo.get("beforeImage") or wo.get("before_image")
    after_img = wo.get("afterImageUrl") or wo.get("afterImage") or wo.get("after_image") or wo.get("completionPhoto")

    evidence_passed = True
    if not before_img:
        violations.append({
            "rule_id": "EVID-IMG-01",
            "rule_name": "Initial Defect Photographic Evidence Mandatory",
            "severity": "BLOCKING",
            "description": "No pre-repair photograph recorded on work order docket.",
            "remediation_step": "Attach initial citizen or inspection hazard photo to the docket before billing.",
        })
        evidence_passed = False

    if not after_img:
        violations.append({
            "rule_id": "EVID-IMG-02",
            "rule_name": "Completed Restoration Photographic Evidence Mandatory",
            "severity": "BLOCKING",
            "description": "No post-repair completion photograph uploaded by contractor crew.",
            "remediation_step": "Contractor must upload geotagged photo of finished site showing restored asphalt or utility line.",
        })
        evidence_passed = False

    # 3. GPS tolerance verification (150m)
    gps_passed = True
    h_lat = float(wo.get("hazardLatitude") or wo.get("originLat") or 0.0)
    h_lng = float(wo.get("hazardLongitude") or wo.get("originLng") or 0.0)
    c_lat = float(wo.get("completionLatitude") or wo.get("contractorLat") or 0.0)
    c_lng = float(wo.get("completionLongitude") or wo.get("contractorLng") or 0.0)

    if h_lat and c_lat:
        dist_m = _haversine_distance_meters(h_lat, h_lng, c_lat, c_lng)
        if dist_m > 150.0:
            gps_passed = False
            violations.append({
                "rule_id": "GPS-TOL-01",
                "rule_name": "Geo-Fencing 150-Meter Proximity Tolerance",
                "severity": "BLOCKING",
                "description": f"Completion coordinates are {dist_m:.1f} meters away from hazard origin, exceeding 150m tolerance.",
                "remediation_step": "Zonal supervisor must conduct manual site inspection to verify work performed at correct municipal location.",
            })

    # 4. Safety protocol check
    safety_checklist = wo.get("safetyChecklistPassed") or wo.get("safetyCompliant")
    safety_passed = True
    if safety_checklist is False:
        safety_passed = False
        violations.append({
            "rule_id": "SEC-CHK-01",
            "rule_name": "Roadside PPE & Traffic Barricade Verification",
            "severity": "WARNING",
            "description": "Safety audit flagged missing high-visibility vests or insufficient warning cones during work execution.",
            "remediation_step": "Issue safety notice to contractor; ensure next inspection has supervisor compliance sign-off.",
        })

    # Overall outcome
    has_blocking = any(v["severity"] == "BLOCKING" for v in violations)
    has_warning = any(v["severity"] == "WARNING" for v in violations)

    if has_blocking:
        status = "FAILED"
        summary = f"Work Order {wo_id} rejected with {len([v for v in violations if v['severity'] == 'BLOCKING'])} blocking compliance violation(s)."
    elif has_warning:
        status = "CONDITIONAL_APPROVAL"
        summary = f"Work Order {wo_id} granted conditional approval subject to safety warning remediation."
    else:
        status = "PASS"
        summary = f"Work Order {wo_id} strictly complies with CMC fiscal, photographic, GPS, and safety standards."

    return {
        "compliance_status": status,
        "work_order_id": wo_id,
        "total_cost_lkr": cost,
        "approval_tier_required": approval_tier,
        "is_approval_present": is_approved,
        "violations": violations,
        "gps_verification_passed": gps_passed,
        "evidence_verification_passed": evidence_passed,
        "safety_protocol_passed": safety_passed,
        "audit_summary": summary,
        "cited_regulations": regulations,
    }


def build_audit_graph():
    builder = StateGraph(SafetyAuditState)
    builder.add_node("retrieve", retrieve_audit_rules_node)
    builder.add_node("audit", audit_work_order_node)

    builder.add_edge(START, "retrieve")
    builder.add_edge("retrieve", "audit")
    builder.add_edge("audit", END)

    memory = InMemorySaver()
    return builder.compile(checkpointer=memory)


_audit_agent_app = None


def get_audit_agent():
    global _audit_agent_app
    if _audit_agent_app is None:
        _audit_agent_app = build_audit_graph()
    return _audit_agent_app


def run_safety_audit_agent(work_order: Any, thread_id: str = "default_audit") -> dict:
    app = get_audit_agent()
    wo_str = json.dumps(work_order) if not isinstance(work_order, str) else work_order

    initial_state = {
        "messages": [HumanMessage(content=f"Audit work order compliance.")],
        "work_order_json": wo_str,
        "retrieved_rules": "",
        "audit_output": None,
        "final_response": "",
    }
    config = {"configurable": {"thread_id": thread_id}}
    final_state = app.invoke(initial_state, config=config)
    return {
        "audit_output": final_state.get("audit_output"),
        "final_response": final_state.get("final_response"),
    }
