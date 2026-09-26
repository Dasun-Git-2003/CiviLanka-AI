# Sri Lanka Municipal Safety & Regulatory Compliance Audit Standards

> **Regulatory Framework**: CIDA (Construction Industry Development Authority) Safety Regulations, CMC Municipal Works Enactment, National Audit Act No. 19 of 2018.

---

## 1. Statutory Fiscal Approval Thresholds

In accordance with Sri Lankan municipal financial regulations:

- **Rule `FISC-SUP-01`**: **Maintenance Supervisor Electronic Sign-Off**
  - **Threshold**: Any work order whose estimated or invoiced cost is **$\ge$ LKR 100,000**.
  - **Mandate**: Must possess explicit recorded supervisor approval prior to field dispatch or completion certification.
  - **Violation Severity**: HIGH.
  - **Remedial Action**: Review work order scope and secure Maintenance Supervisor sign-off.

- **Rule `FISC-DIR-01`**: **Public Works Director Executive Approval**
  - **Threshold**: Any capital or emergency repair whose cost is **$\ge$ LKR 500,000**.
  - **Mandate**: Requires formal electronic authorization from the Director of Public Works / Municipal Commissioner.
  - **Violation Severity**: CRITICAL.
  - **Remedial Action**: Escalate to Director of Works for formal capital expenditure authorization before invoice disbursement.

---

## 2. Photographic Evidence & Quality Assurance Standards

- **Rule `EVID-IMG-01`**: **Pre-Repair Site Condition Baseline**
  - **Mandate**: Field team or reporting officer must record a clear, daylight photographic baseline before any excavation, cutting, or repair commences.
  - **Violation Severity**: HIGH.
  - **Remedial Action**: Crew supervisor must upload dated baseline photographic evidence.

- **Rule `EVID-IMG-02`**: **Post-Repair Completion Verification**
  - **Mandate**: Contractor must upload verified post-repair photograph showing stabilized, clean site with completed asphalt compaction, backfill, or pipe joint restoration.
  - **Violation Severity**: CRITICAL. Work order cannot be closed without completion proof.
  - **Remedial Action**: Contractor must upload verifiable daytime photograph of the completed repair.

---

## 3. Geodetic GPS Geo-Fencing & Displacement Verification

- **Rule `GPS-TOL-01`**: **150-Meter Geodetic Tolerance Threshold**
  - **Mandate**: The field execution GPS coordinates (logged by contractor mobile device or supervisor terminal) must fall within **150.0 meters** Haversine distance of the reported asset coordinates.
  - **Threshold**:
    - $\le 150.0\text{ meters}$: `PASS` (Geodetically Verified).
    - $> 150.0\text{ meters}$: `VIOLATION` (Displacement Exceeded).
  - **Violation Severity**: HIGH.
  - **Remedial Action**: Municipal engineer must physically inspect coordinates to verify that the repair was performed on the correct municipal asset.

---

## 4. Occupational Safety, Health & PPE Checklist Rules

- **Rule `SEC-CHK-01`**: **Signed Safety Checklist for Emergency & Critical Hazards**
  - **Mandate**: For all hazards rated `CRITICAL` or `URGENT`, a signed digital site safety protocol checklist must be submitted.
  - **Mandatory Requirements**:
    1. High-visibility retroreflective safety vests for all site personnel.
    2. Upstream traffic warning cones (minimum 30m upstream on municipal roads, 50m on high-speed dual carriageways).
    3. Trench shoring protection for excavations deeper than 1.2 meters.
    4. Warning barrier tape surrounding open pits and manholes.
  - **Violation Severity**: HIGH.
  - **Remedial Action**: Site foreman must submit signed safety checklist verifying traffic control and PPE compliance.

---

## 5. Compliance Determination Criteria

- **PASS**:
  - Zero CRITICAL or HIGH rule violations.
  - Compliance Score = 100.
  - Direct authorization for work order closure and contractor payment release.
- **FAILED**:
  - One or more CRITICAL or HIGH rule violations.
  - Compliance Score = $\max(10, 100 - (\text{violations} \times 25))$.
  - Work order closure blocked until remedial action is logged and verified.
