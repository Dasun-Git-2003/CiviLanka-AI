// backend/tests/safetyAuditAgent.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const safetyAuditAgent = require('../modules/member4_operations_audit/services/safetyAuditAgent');

describe('SafetyAuditAgent - Municipal Compliance Audits', () => {
  it('should PASS when GPS offset is <= 50m and before/after photos are provided', async () => {
    const validOrder = {
      id: 901,
      title: 'Storm Drain Cover Replacement',
      location_lat: 6.9271,
      location_lng: 79.8612,
      completion_lat: 6.92715, // ~6 meters away
      completion_lng: 79.86125,
      before_photo: 'https://example.com/before.jpg',
      after_photo: 'https://example.com/after.jpg',
      estimated_cost: 800,
      actual_cost: 800,
      is_arterial_road: false,
      approval_status: 'NOT_REQUIRED',
    };

    const audit = await safetyAuditAgent.auditWorkOrder(validOrder);
    assert.equal(audit.compliance, 'PASS');
    assert.equal(audit.violations_json.length, 0);
    assert.equal(audit.gps_verified, true);
    assert.ok(audit.gps_distance_meters <= 50);
  });

  it('should FAIL when completion GPS is > 50m from incident coordinates', async () => {
    const orderOffsite = {
      id: 902,
      title: 'Pothole Repair',
      location_lat: 6.9271,
      location_lng: 79.8612,
      completion_lat: 6.935, // ~900 meters away
      completion_lng: 79.865,
      before_photo: 'https://example.com/before.jpg',
      after_photo: 'https://example.com/after.jpg',
      estimated_cost: 950,
      actual_cost: 950,
      is_arterial_road: false,
      approval_status: 'NOT_REQUIRED',
    };

    const audit = await safetyAuditAgent.auditWorkOrder(orderOffsite);
    assert.equal(audit.compliance, 'FAILED');
    assert.equal(audit.gps_verified, false);
    assert.ok(audit.violations_json.some((v) => v.includes('GPS location violation')));
  });

  it('should FAIL when before/after photos are missing or identical', async () => {
    const orderDuplicatePhotos = {
      id: 903,
      title: 'Streetlight Cable Repair',
      location_lat: 6.9271,
      location_lng: 79.8612,
      completion_lat: 6.92711,
      completion_lng: 79.86121,
      before_photo: 'https://example.com/same.jpg',
      after_photo: 'https://example.com/same.jpg',
      estimated_cost: 850,
      actual_cost: 850,
      is_arterial_road: false,
      approval_status: 'NOT_REQUIRED',
    };

    const audit = await safetyAuditAgent.auditWorkOrder(orderDuplicatePhotos);
    assert.equal(audit.compliance, 'FAILED');
    assert.ok(audit.violations_json.some((v) => v.includes('identical or duplicate')));
  });

  it('should flag approval violation if job exceeded LKR 1000 without Director sign-off', async () => {
    const unapprovedMajorJob = {
      id: 904,
      title: 'Bridge Expansion Joint Seal',
      location_lat: 6.9271,
      location_lng: 79.8612,
      completion_lat: 6.92712,
      completion_lng: 79.86122,
      before_photo: 'https://example.com/before.jpg',
      after_photo: 'https://example.com/after.jpg',
      estimated_cost: 45000,
      actual_cost: 45000,
      is_arterial_road: true,
      approval_status: 'PENDING_APPROVAL', // Not yet signed off by Director
    };

    const audit = await safetyAuditAgent.auditWorkOrder(unapprovedMajorJob);
    assert.equal(audit.compliance, 'FAILED');
    assert.equal(audit.budget_threshold_passed, false);
    assert.ok(audit.violations_json.some((v) => v.includes('Director approval')));
  });
});
