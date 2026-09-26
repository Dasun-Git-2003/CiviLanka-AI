# CivitaGuard AI - Team Merge & Git Integration Guide
**Author**: Member 4 (Maintenance Operations & Audit)  
**Branch**: `IT24610825_Maintenance-Operations-&-Audit+Audit-Agent`

---

## 1. Overview of Member 4's Deliverables
Member 4 owns the **post-dispatch operational lifecycle, municipal governance, budget enforcement, and autonomous safety auditing**:
- **Student ID**: IT24610825
- **Database Tables Owned**: `budget_logs`, `audit_logs` (and lifecycle management columns on `work_orders`).
- **AI Agent**: **Municipal Safety & Audit Agent** (`/api/agent/safety-audit`).
- **State Machine**: `AI_PROPOSED` &rarr; `PENDING_APPROVAL` &rarr; `APPROVED` &rarr; `ASSIGNED` &rarr; `IN_PROGRESS` &rarr; `COMPLETED` &rarr; `VERIFIED` &rarr; `CLOSED`.
- **Statutory Human Approval Rule**: Enforces Public Works Director approval when:
  1. Estimated repair cost exceeds **LKR 1,000** OR
  2. The work involves a **high-risk arterial road**.
- **Frontend Web**: Public Works Director React Dashboard (`CiviLanka.Web/`).
- **Frontend Mobile**: Field Worker Flutter App (`mobile_fieldworker_flutter/`) + Browser Web Simulator.

---

## 2. Git Branching Strategy & Push Instructions

### To Push Your Work to GitHub / Git Remote:
```bash
# 1. Verify current branch
git branch
# You should see: * IT24610825_Maintenance-Operations-&-Audit+Audit-Agent

# 2. Stage and commit all files
git add .
git commit -m "feat(member-4): Maintenance Operations, BudgetLogs, AuditLogs, Safety Agent, and Field Worker UIs"

# 3. Push to remote
git push origin IT24610825_Maintenance-Operations-&-Audit+Audit-Agent
```

### To Merge with Other Members:
1. Open a Pull Request from `feature/member-4-operations-audit` &rarr; `develop` (or `main`).
2. Because all Member 4 backend logic is isolated inside `backend/modules/member4_operations_audit/`, there are **ZERO merge conflicts** with Members 1, 2, and 3.

---

## 3. Database Schema Integration (PostgreSQL)

When merging your unified database:
1. Execute `backend/database/schema_member4.sql` in your team's PostgreSQL instance:
```bash
psql -U postgres -d civitaguard -f backend/database/schema_member4.sql
```
2. **Relationships with Teammates**:
   - Member 1's `hazards` table links to `work_orders.hazard_id`.
   - Member 2's `infrastructure_assets` table links to `work_orders.asset_id`.
   - Member 3's `work_orders` table is extended with lifecycle state management:
     - `status`: `AI_PROPOSED` &rarr; `PENDING_APPROVAL` &rarr; `APPROVED` &rarr; `ASSIGNED` &rarr; `IN_PROGRESS` &rarr; `COMPLETED` &rarr; `VERIFIED` &rarr; `CLOSED`
     - `before_photo`, `after_photo`, `completion_lat`, `completion_lng`, `materials_json`.
   - Member 4's `budget_logs` and `audit_logs` link to `work_orders.id`.

---

## 4. Backend API Integration (Express)

In your group's main `backend/server.js`, import and mount Member 4's routes:

```javascript
// Import Member 4 routes
const budgetRoutes = require('./modules/member4_operations_audit/routes/budgetRoutes');
const lifecycleRoutes = require('./modules/member4_operations_audit/routes/lifecycleRoutes');
const auditRoutes = require('./modules/member4_operations_audit/routes/auditRoutes');
const auditController = require('./modules/member4_operations_audit/controllers/auditController');

// Mount endpoints
app.use('/api/budgets', budgetRoutes);
app.use('/api/work-orders', lifecycleRoutes);
app.use('/api/audits', auditRoutes);

// AI Safety Agent endpoint (specification compliant)
app.post('/api/agent/safety-audit', auditController.evaluateAgentAudit);
```

---

## 5. Team Data Contracts & Handoffs

### Handoff from Member 3 &rarr; Member 4:
Member 3's **Dispatch & Priority Agent** creates an AI work order proposal (`POST /api/work-orders/:id/evaluate`):
- If `estimated_cost > 1000` OR `is_arterial_road === true`, Member 4's logic automatically routes to `PENDING_APPROVAL` and alerts the Director.
- If below threshold and non-arterial, auto-routes to `APPROVED`.

### Handoff from Member 4 &rarr; Field Worker (Flutter):
- Dispatched order moves to `ASSIGNED`.
- Worker presses "Start Work" &rarr; `IN_PROGRESS`.
- Worker uploads before/after photos and device GPS &rarr; `COMPLETED`.

### Handoff from Field Worker &rarr; Municipal Safety & Audit Agent:
- Member 4's Agent audits the submission:
  - GPS proximity check: `|hazard_gps - completion_gps| <= 50m`
  - Photos: before and after present & distinct
  - Budget: actual spend within 10% tolerance of approved funds.
- Output format:
```json
{
  "compliance": "PASS",
  "approval_required": true,
  "reason": "Estimated cost exceeds threshold"
}
```
- If `PASS`, ticket moves to `VERIFIED`.
- Director/Supervisor closes ticket &rarr; `CLOSED`, reconciling the budget log.

---

## 6. Running the Module Standalone
Member 4's module is completely self-contained and runnable immediately:
```bash
# Terminal 1: Backend
cd backend
npm install
npm start

# Terminal 2: React Director Dashboard
cd CiviLanka.Web
npm install
npm run dev
```
Open your browser at `http://localhost:5173` to access the Director Dashboard, Budget Management, Safety Audit Center, and Field Worker Mobile Simulator.

---

## 7. Running Automated Test Suite & Build Verification
```bash
# 1. Run Backend Automated Unit Tests (Node.js test runner)
cd backend
npm test
# Verifies SafetyAuditAgent GPS tolerance (<=50m), photo evidence, and statutory budget approval rules

# 2. Run Web Portal Type Check and Production Build
cd ../CiviLanka.Web
npm run build
# Verifies TypeScript compiler without errors and generates production bundle
```
