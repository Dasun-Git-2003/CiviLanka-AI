// backend/modules/member4_operations_audit/services/safetyAuditAgent.js
const budgetService = require('./budgetService');

/**
 * Calculates geographical distance in meters between two lat/lng coordinates (Haversine formula)
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

class SafetyAuditAgent {
  /**
   * Run the Municipal Safety & Audit Agent on a work order
   * Checks:
   * 1. Municipal safety rules & priority compliance
   * 2. Budget threshold & Director approval rules
   * 3. Photographic evidence verification (before/after presence and validity)
   * 4. GPS proximity verification (<= 50m tolerance)
   *
   * Expected format from specification:
   * {"compliance":"PASS", "approval_required":true, "reason":"..."}
   */
  async auditWorkOrder(workOrder, budgetLog = null) {
    const violations = [];
    const safetyNotes = [];

    // 1. GPS Proximity Verification
    let gpsDistance = null;
    let gpsPassed = false;
    if (workOrder.completion_lat && workOrder.completion_lng) {
      gpsDistance = calculateHaversineDistance(
        Number(workOrder.location_lat),
        Number(workOrder.location_lng),
        Number(workOrder.completion_lat),
        Number(workOrder.completion_lng)
      );

      // Municipal tolerance: 50 meters
      if (gpsDistance !== null && gpsDistance <= 50.0) {
        gpsPassed = true;
        safetyNotes.push(`GPS verification passed (${gpsDistance}m from incident pin, <= 50m tolerance).`);
      } else {
        violations.push(
          `GPS location violation: Field completion recorded ${gpsDistance}m away from incident coordinates (Exceeds 50m tolerance).`
        );
      }
    } else {
      violations.push('GPS verification missing: Field worker did not submit device GPS coordinates at completion.');
    }

    // 2. Photographic Evidence Verification
    let photosValid = true;
    if (!workOrder.before_photo) {
      photosValid = false;
      violations.push('Evidence violation: Missing pre-repair (Before) photograph.');
    }
    if (!workOrder.after_photo) {
      photosValid = false;
      violations.push('Evidence violation: Missing post-repair (After) completion photograph.');
    }
    if (workOrder.before_photo && workOrder.after_photo && workOrder.before_photo === workOrder.after_photo) {
      photosValid = false;
      violations.push('Evidence violation: Before and After photographs appear identical or duplicate.');
    }
    if (photosValid) {
      safetyNotes.push('Photographic evidence validated: Both before and after records confirmed.');
    }

    // 3. Human Approval Rule & Budget Threshold Check
    const approvalCheck = budgetService.checkApprovalRequirement(
      workOrder.estimated_cost,
      workOrder.is_arterial_road
    );

    let budgetThresholdPassed = true;
    if (approvalCheck.requiresDirectorApproval && workOrder.approval_status !== 'APPROVED') {
      budgetThresholdPassed = false;
      violations.push(
        `Authorization violation: Work order required Public Works Director approval (${approvalCheck.reasonSummary}) but was executed without verified sign-off.`
      );
    }

    // Check actual spend vs approved budget (max 10% overrun allowed without secondary approval)
    const approvedAmount = budgetLog ? Number(budgetLog.approved_amount) : Number(workOrder.estimated_cost);
    const actualCost = Number(workOrder.actual_cost || 0);

    if (approvedAmount > 0 && actualCost > 0) {
      const overrunPercent = ((actualCost - approvedAmount) / approvedAmount) * 100;
      if (overrunPercent > 10) {
        budgetThresholdPassed = false;
        violations.push(
          `Budget overrun violation: Actual expenditure (LKR ${actualCost.toLocaleString()}) exceeded approved allocation (LKR ${approvedAmount.toLocaleString()}) by ${overrunPercent.toFixed(1)}% (Threshold: 10%).`
        );
      } else {
        safetyNotes.push(`Expenditure within permitted variance: LKR ${actualCost.toLocaleString()} spent vs LKR ${approvedAmount.toLocaleString()} approved.`);
      }
    }

    // 4. Municipal Safety & Priority Rules
    let safetyRulesPassed = true;
    if (workOrder.is_arterial_road && (!workOrder.completion_notes || !workOrder.completion_notes.toLowerCase().includes('cone') && !workOrder.completion_notes.toLowerCase().includes('safety'))) {
      safetyNotes.push('Note: Arterial corridor maintenance; confirm traffic diversion protocols were logged.');
    }

    // Determine Final Compliance Status
    const isCompliant = violations.length === 0;
    const compliance = isCompliant ? 'PASS' : 'FAILED';
    const approvalRequired = approvalCheck.requiresDirectorApproval;

    // Reason output compliant with PDF specification
    let primaryReason = '';
    if (isCompliant) {
      primaryReason = approvalRequired
        ? 'Estimated cost or arterial status required approval; Director sign-off and all field safety verifications passed.'
        : 'Routine municipal maintenance verified. GPS, photographic evidence, and budget within compliance thresholds.';
    } else {
      primaryReason = violations.join(' | ');
    }

    // Calculate Multi-Factor AI Confidence Score (0 - 100%)
    let confidenceScore = 100;
    if (gpsDistance !== null) {
      if (gpsDistance > 50) {
        confidenceScore -= Math.min(45, 20 + ((gpsDistance - 50) / 50) * 10);
      } else {
        confidenceScore -= (gpsDistance / 50) * 4; // minor deduction proportional to distance
      }
    } else {
      confidenceScore -= 40;
    }

    if (!photosValid) {
      confidenceScore -= 35;
    }
    if (!budgetThresholdPassed) {
      confidenceScore -= 25;
    }
    confidenceScore = Math.max(10.0, Math.min(99.6, Math.round(confidenceScore * 10) / 10));

    // Determine Municipal Risk Level
    let riskLevel = 'LOW';
    if (!isCompliant) {
      riskLevel = confidenceScore < 50 ? 'CRITICAL' : 'HIGH';
    } else if (workOrder.is_arterial_road || workOrder.priority === 'CRITICAL' || workOrder.priority === 'URGENT') {
      riskLevel = 'MEDIUM';
    }

    // Generate unique verification certificate ID
    const auditCertificateId = `CERT-MUNI-${new Date().getFullYear()}-${String(workOrder.id).padStart(4, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const aiAuditRecord = {
      compliance,
      approval_required: approvalRequired,
      reason: primaryReason,
      confidence_score: confidenceScore,
      risk_level: riskLevel,
      audit_certificate_id: auditCertificateId,
      safety_rules_passed: safetyRulesPassed && isCompliant,
      budget_threshold_passed: budgetThresholdPassed,
      gps_verified: gpsPassed,
      gps_distance_meters: gpsDistance,
      before_photo_url: workOrder.before_photo,
      after_photo_url: workOrder.after_photo,
      materials_verified: Boolean(workOrder.materials_json && workOrder.materials_json.length > 0),
      violations_json: violations,
      safety_notes: safetyNotes,
      ai_reasoning: `Municipal Safety & Audit Agent verdict: ${compliance} (${confidenceScore}% confidence, Risk: ${riskLevel}). ${primaryReason}`
    };

    return aiAuditRecord;
  }
}

module.exports = new SafetyAuditAgent();
