-- ==============================================================================
-- CivitaGuard AI - Member 4 Database Schema
-- Focus: Maintenance Operations & Audit (BudgetLogs, AuditLogs, Work-Order Lifecycle)
-- Database: PostgreSQL
-- ==============================================================================

-- 1. Work Orders Table (Shared interface with Member 3, lifecycle managed by Member 4)
CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    hazard_id INTEGER NOT NULL,
    asset_id INTEGER,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    hazard_category VARCHAR(100) NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    estimated_cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    actual_cost NUMERIC(12, 2) DEFAULT 0.00,
    is_arterial_road BOOLEAN DEFAULT FALSE,
    road_name VARCHAR(200),
    location_lat NUMERIC(10, 7) NOT NULL,
    location_lng NUMERIC(10, 7) NOT NULL,
    assigned_crew VARCHAR(100),
    assigned_worker VARCHAR(100),
    -- Work-order lifecycle state machine:
    -- AI_PROPOSED -> PENDING_APPROVAL -> APPROVED -> ASSIGNED -> IN_PROGRESS -> COMPLETED -> VERIFIED -> CLOSED
    status VARCHAR(50) NOT NULL DEFAULT 'AI_PROPOSED',
    ai_recommendation TEXT,
    approval_status VARCHAR(50) DEFAULT 'PENDING',
    approver_name VARCHAR(100),
    approval_date TIMESTAMP WITH TIME ZONE,
    materials_json JSONB DEFAULT '[]'::jsonb,
    before_photo TEXT,
    after_photo TEXT,
    completion_notes TEXT,
    completion_lat NUMERIC(10, 7),
    completion_lng NUMERIC(10, 7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Budget Logs Table (Primary Owner: Member 4)
CREATE TABLE IF NOT EXISTS budget_logs (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
    allocated_budget NUMERIC(12, 2) NOT NULL,
    estimated_cost NUMERIC(12, 2) NOT NULL,
    actual_cost NUMERIC(12, 2) DEFAULT 0.00,
    approved_amount NUMERIC(12, 2) NOT NULL,
    remaining_budget NUMERIC(12, 2) NOT NULL,
    approver VARCHAR(100) NOT NULL,
    approval_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, RECONCILED, EXCEEDED
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Audit Logs Table (Primary Owner: Member 4)
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    work_order_id INTEGER REFERENCES work_orders(id) ON DELETE CASCADE,
    compliance_status VARCHAR(20) NOT NULL, -- 'PASS' or 'FAILED'
    approval_required BOOLEAN DEFAULT FALSE,
    safety_rules_passed BOOLEAN DEFAULT TRUE,
    budget_threshold_passed BOOLEAN DEFAULT TRUE,
    gps_verified BOOLEAN DEFAULT FALSE,
    gps_distance_meters NUMERIC(8, 2),
    before_photo_url TEXT,
    after_photo_url TEXT,
    materials_verified BOOLEAN DEFAULT TRUE,
    violations_json JSONB DEFAULT '[]'::jsonb,
    ai_reasoning TEXT,
    audited_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid querying & dashboard reporting
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_priority ON work_orders(priority);
CREATE INDEX IF NOT EXISTS idx_budget_logs_work_order ON budget_logs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_work_order ON audit_logs(work_order_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_compliance ON audit_logs(compliance_status);
