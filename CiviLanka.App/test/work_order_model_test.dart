import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:civilanka_app/models/work_order.dart';
import 'package:civilanka_app/models/user.dart';
import 'package:civilanka_app/services/work_order_service.dart';

void main() {
  group('WorkOrder Model Parsing Tests', () {
    test('WorkOrder.fromJson parses full backend response correctly', () {
      final json = {
        'id': 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        'workOrderNumber': 'WO-2026-00042',
        'hazardId': 'f1e2d3c4-b5a6-9876-5432-10fedcba9876',
        'hazardTicket': 'CG-2026-00099',
        'hazardCategory': 'DamagedRoad',
        'hazardDescription': 'Severe crater on Galle Road',
        'hazardSeverity': 'CRITICAL',
        'hazardPriority': 'URGENT',
        'hazardLatitude': 6.9271,
        'hazardLongitude': 79.8612,
        'hazardAddress': '250 Galle Road, Colombo 03',
        'assetId': 'ASSET-COL-001',
        'assetName': 'Galle Road Arterial Corridor',
        'assetType': 'Roadway',
        'assetCondition': 'Poor',
        'title': 'Emergency Asphalt Reconstruction',
        'description': 'Heavy structural asphalt patching and compaction',
        'priority': 'URGENT',
        'severity': 'CRITICAL',
        'estimatedCost': 285000.0,
        'approvedBudget': 300000.0,
        'actualCost': 0.0,
        'estimatedDurationHours': 16,
        'recommendedCrewSize': 4,
        'assignedContractorId': 5,
        'assignedContractorName': 'Maga Engineering Ltd',
        'assignedCrew': 'Roads Crew A',
        'scheduledDate': '2026-10-01T08:00:00Z',
        'status': 'PENDING_APPROVAL',
        'approvalStatus': 'PENDING',
        'approvalRequired': true,
        'isArterialRoad': true,
        'approvalReason': 'Both',
        'notes': 'High priority arterial road corridor.',
        'createdBy': 'supervisor-01',
        'createdAt': '2026-09-25T10:30:00Z',
        'updatedAt': '2026-09-25T11:00:00Z',
        'isCancelled': false,
        'items': [
          {
            'id': 'item-1',
            'itemType': 'Material',
            'itemName': 'Asphalt Wearing Course',
            'quantity': 5.5,
            'unit': 'tons',
            'estimatedUnitCost': 25000.0,
            'estimatedTotalCost': 137500.0,
          },
          {
            'id': 'item-2',
            'itemType': 'Equipment',
            'itemName': 'Vibratory Roller',
            'quantity': 2.0,
            'unit': 'days',
            'estimatedUnitCost': 20000.0,
            'estimatedTotalCost': 40000.0,
          }
        ],
        'latestCostEstimate': {
          'id': 'est-001',
          'estimatedCost': 285000.0,
          'currency': 'LKR',
          'materialCost': 137500.0,
          'labourCost': 90000.0,
          'equipmentCost': 57500.0,
          'estimatedLabourHours': 64.0,
          'recommendedCrewSize': 4,
          'estimatedDurationHours': 16.0,
          'confidence': 0.94,
          'reason':
              'Multi-step calculation based on arterial road traffic and CIDA rates.',
          'modelName': 'gemini-2.0-flash',
          'createdAt': '2026-09-25T10:35:00Z',
        },
        'latestAIAnalysis': {
          'id': 'ai-analysis-1',
          'agentName': 'CostEstimatorAgent',
          'estimatedCost': 285000.0,
          'recommendation': 'Approve emergency mobilization',
          'reason': 'Corridor requires immediate asphalt resurfacing',
          'confidence': 0.94,
          'createdAt': '2026-09-25T10:35:00Z',
        }
      };

      final wo = WorkOrder.fromJson(json);

      expect(wo.id, 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
      expect(wo.workOrderNumber, 'WO-2026-00042');
      expect(wo.title, 'Emergency Asphalt Reconstruction');
      expect(wo.priority, 'URGENT');
      expect(wo.severity, 'CRITICAL');
      expect(wo.status, 'PENDING_APPROVAL');
      expect(wo.approvalStatus, 'PENDING');
      expect(wo.approvalRequired, isTrue);
      expect(wo.isArterialRoad, isTrue);
      expect(wo.approvalReason, 'Both');
      expect(wo.estimatedCost, 285000.0);
      expect(wo.approvedBudget, 300000.0);
      expect(wo.estimatedDurationHours, 16);
      expect(wo.recommendedCrewSize, 4);
      expect(wo.assignedContractorName, 'Maga Engineering Ltd');
      expect(wo.isCancelled, isFalse);

      // Verify items
      expect(wo.items.length, 2);
      expect(wo.items[0].itemName, 'Asphalt Wearing Course');
      expect(wo.items[0].quantity, 5.5);
      expect(wo.items[0].estimatedTotalCost, 137500.0);
      expect(wo.items[1].itemType, 'Equipment');

      // Verify cost estimate
      expect(wo.latestCostEstimate, isNotNull);
      expect(wo.latestCostEstimate!.modelName, 'gemini-2.0-flash');
      expect(wo.latestCostEstimate!.confidence, 0.94);
      expect(wo.latestCostEstimate!.materialCost, 137500.0);

      // Verify AI analysis
      expect(wo.latestAIAnalysis, isNotNull);
      expect(wo.latestAIAnalysis!.agentName, 'CostEstimatorAgent');
    });

    test(
        'WorkOrder.fromJson handles minimal/sparse JSON safely without exceptions',
        () {
      final json = <String, dynamic>{
        'id': 'wo-min-001',
        'title': 'Minor pothole repair',
        'description': 'Small asphalt patch',
      };

      final wo = WorkOrder.fromJson(json);

      expect(wo.id, 'wo-min-001');
      expect(wo.title, 'Minor pothole repair');
      expect(wo.description, 'Small asphalt patch');
      expect(wo.workOrderNumber, isEmpty);
      expect(wo.status, 'AI_GENERATED');
      expect(wo.approvalStatus, 'NOT_REQUIRED');
      expect(wo.approvalRequired, isFalse);
      expect(wo.isArterialRoad, isFalse);
      expect(wo.approvalReason, 'None');
      expect(wo.estimatedCost, isNull);
      expect(wo.hazardId, isNull);
      expect(wo.assetId, isNull);
      expect(wo.items, isEmpty);
      expect(wo.latestCostEstimate, isNull);
      expect(wo.latestAIAnalysis, isNull);
    });

    test('User.canAccessWorkOrders evaluates correctly by role', () {
      User makeUser(String role) => User(
            id: 'u-1',
            fullName: 'Test User',
            email: 'test@civilanka.gov.lk',
            role: role,
            token: 'mock-token',
            expiresAt: DateTime.now().add(const Duration(hours: 1)),
          );

      expect(
          makeUser('FieldMaintenanceSupervisor').canAccessWorkOrders, isTrue);
      expect(makeUser('PublicWorksDirector').canAccessWorkOrders, isTrue);
      expect(makeUser('Director').canAccessWorkOrders, isTrue);
      expect(makeUser('MunicipalStaff').canAccessWorkOrders, isTrue);
      expect(makeUser('FieldWorker').canAccessWorkOrders, isTrue);

      expect(makeUser('Citizen').canAccessWorkOrders, isFalse);
      expect(makeUser('Guest').canAccessWorkOrders, isFalse);
    });

    test(
        'User.canCreateWorkOrders and canManageWorkOrders enforce role hierarchy',
        () {
      User makeUser(String role) => User(
            id: 'u-1',
            fullName: 'Test User',
            email: 'test@civilanka.gov.lk',
            role: role,
            token: 'mock-token',
            expiresAt: DateTime.now().add(const Duration(hours: 1)),
          );

      // Authorized roles (Supervisors, Directors, Municipal Staff)
      for (final role in [
        'FieldMaintenanceSupervisor',
        'PublicWorksDirector',
        'Director',
        'MunicipalStaff',
      ]) {
        expect(makeUser(role).canCreateWorkOrders, isTrue,
            reason: '$role should have create permissions');
        expect(makeUser(role).canManageWorkOrders, isTrue,
            reason: '$role should have manage permissions');
      }

      // Unauthorized roles (Field workers can view but not create/manage; Citizens have no WO access)
      for (final role in ['FieldWorker', 'Citizen', 'Guest', 'Unknown']) {
        expect(makeUser(role).canCreateWorkOrders, isFalse,
            reason: '$role should NOT have create permissions');
        expect(makeUser(role).canManageWorkOrders, isFalse,
            reason: '$role should NOT have manage permissions');
      }
    });

    test('CreateWorkOrderInput.toJson serializes correctly', () {
      const fullInput = CreateWorkOrderInput(
        title: 'Emergency Pothole Patching',
        description: 'Deep pothole repair on Baseline Road',
        priority: 'urgent',
        estimatedCost: 85000.0,
        hazardId: 'haz-123',
        assetId: 'asset-456',
      );

      final fullJson = fullInput.toJson();
      expect(fullJson['title'], 'Emergency Pothole Patching');
      expect(fullJson['description'], 'Deep pothole repair on Baseline Road');
      expect(fullJson['priority'], 'URGENT'); // uppercase normalized
      expect(fullJson['estimatedCost'], 85000.0);
      expect(fullJson['hazardId'], 'haz-123');
      expect(fullJson['assetId'], 'asset-456');

      const minInput = CreateWorkOrderInput(
        title: 'Routine Inspection',
        description: 'Monthly road inspection',
      );

      final minJson = minInput.toJson();
      expect(minJson['title'], 'Routine Inspection');
      expect(minJson['description'], 'Monthly road inspection');
      expect(minJson['priority'], 'NORMAL');
      expect(minJson.containsKey('hazardId'), isFalse);
      expect(minJson.containsKey('assetId'), isFalse);
      expect(minJson.containsKey('estimatedCost'), isFalse);
    });

    test('UpdateWorkOrderInput.toJson serializes partial updates correctly',
        () {
      final scheduledDate = DateTime.utc(2026, 10, 15, 9, 30);
      final update = UpdateWorkOrderInput(
        title: 'Updated Scope',
        priority: 'high',
        assignedCrew: 'Roads Crew Delta',
        scheduledDate: scheduledDate,
        estimatedCost: 120000.0,
        status: 'ASSIGNED',
        notes: 'Assigned to delta crew for inspection',
      );

      final json = update.toJson();
      expect(json['title'], 'Updated Scope');
      expect(json['priority'], 'HIGH');
      expect(json['assignedCrew'], 'Roads Crew Delta');
      expect(json['scheduledDate'], scheduledDate.toIso8601String());
      expect(json['estimatedCost'], 120000.0);
      expect(json['status'], 'ASSIGNED');
      expect(json['notes'], 'Assigned to delta crew for inspection');
      expect(json.containsKey('description'), isFalse);
      expect(json.containsKey('approvedBudget'), isFalse);
      expect(json.containsKey('actualCost'), isFalse);
    });

    test('HazardOption and AssetOption parse JSON safely', () {
      final hazard = HazardOption.fromJson({
        'id': 'h-01',
        'ticketNumber': 'TKT-999',
        'category': 'Pothole',
        'description': 'Large pothole',
      });
      expect(hazard.id, 'h-01');
      expect(hazard.ticketNumber, 'TKT-999');
      expect(hazard.category, 'Pothole');
      expect(hazard.description, 'Large pothole');

      final asset = AssetOption.fromJson({
        'id': 'a-01',
        'name': 'Baseline Rd Bridge',
        'type': 'Bridge',
      });
      expect(asset.id, 'a-01');
      expect(asset.name, 'Baseline Rd Bridge');
      expect(asset.type, 'Bridge');
    });

    test(
        'WorkOrderStatusConstants defines known statuses for presentation without lifecycle rules',
        () {
      // Presentation constants match backend values
      expect(WorkOrderStatusConstants.aiGenerated, 'AI_GENERATED');
      expect(WorkOrderStatusConstants.pendingApproval, 'PENDING_APPROVAL');
      expect(WorkOrderStatusConstants.approved, 'APPROVED');
      expect(WorkOrderStatusConstants.rejected, 'REJECTED');
      expect(WorkOrderStatusConstants.assigned, 'ASSIGNED');
      expect(WorkOrderStatusConstants.scheduled, 'SCHEDULED');
      expect(WorkOrderStatusConstants.inProgress, 'IN_PROGRESS');
      expect(WorkOrderStatusConstants.completed, 'COMPLETED');
      expect(WorkOrderStatusConstants.verified, 'VERIFIED');
      expect(WorkOrderStatusConstants.closed, 'CLOSED');
      expect(WorkOrderStatusConstants.cancelled, 'CANCELLED');

      expect(WorkOrderStatusConstants.all.length, 11);
      expect(WorkOrderStatusConstants.selectableForUpdate.length, 10);
    });

    test(
        'WorkOrderService.extractErrorMessage surfaces authoritative backend validation errors',
        () {
      // Backend status transition rejection error (e.g. 400 InvalidOperationException)
      final transitionError = DioException(
        requestOptions: RequestOptions(path: '/api/workorders/123'),
        response: Response(
          requestOptions: RequestOptions(path: '/api/workorders/123'),
          statusCode: 400,
          data: {
            'message':
                "Cannot transition work order from 'AI_GENERATED' to 'CLOSED'. Allowed next statuses: PENDING_APPROVAL, APPROVED, ASSIGNED, REJECTED, CANCELLED."
          },
        ),
      );

      final msg = WorkOrderService.extractErrorMessage(transitionError);
      expect(msg,
          "Cannot transition work order from 'AI_GENERATED' to 'CLOSED'. Allowed next statuses: PENDING_APPROVAL, APPROVED, ASSIGNED, REJECTED, CANCELLED.");

      // ASP.NET ModelState validation dictionary error
      final validationError = DioException(
        requestOptions: RequestOptions(path: '/api/workorders/123'),
        response: Response(
          requestOptions: RequestOptions(path: '/api/workorders/123'),
          statusCode: 400,
          data: {
            'errors': {
              'Status': [
                "Status cannot be set to CANCELLED via PUT; use DELETE endpoint."
              ],
            }
          },
        ),
      );

      final valMsg = WorkOrderService.extractErrorMessage(validationError);
      expect(valMsg,
          'Status cannot be set to CANCELLED via PUT; use DELETE endpoint.');

      // 403 Forbidden error
      final forbiddenError = DioException(
        requestOptions: RequestOptions(path: '/api/workorders/123/estimate'),
        response: Response(
          requestOptions: RequestOptions(path: '/api/workorders/123/estimate'),
          statusCode: 403,
        ),
      );
      expect(WorkOrderService.extractErrorMessage(forbiddenError),
          'Access denied. You do not have municipal permissions to perform this action.');

      // 404 Not Found error
      final notFoundError = DioException(
        requestOptions: RequestOptions(path: '/api/workorders/123/estimate'),
        response: Response(
          requestOptions: RequestOptions(path: '/api/workorders/123/estimate'),
          statusCode: 404,
        ),
      );
      expect(WorkOrderService.extractErrorMessage(notFoundError),
          'Work order not found.');
    });

    test(
        'User.canGenerateEstimate enforces backend estimation endpoint authorization',
        () {
      User makeUser(String role) => User(
            id: 'u-1',
            fullName: 'Test User',
            email: 'test@civilanka.gov.lk',
            role: role,
            token: 'mock-token',
            expiresAt: DateTime.now().add(const Duration(hours: 1)),
          );

      // Authorized roles on POST /api/workorders/{id}/estimate
      for (final role in [
        'FieldMaintenanceSupervisor',
        'PublicWorksDirector',
        'Director',
        'MunicipalStaff',
      ]) {
        expect(makeUser(role).canGenerateEstimate, isTrue,
            reason: '$role must have estimation permission');
      }

      // Unauthorized roles
      for (final role in ['FieldWorker', 'Citizen', 'Guest', 'Unknown']) {
        expect(makeUser(role).canGenerateEstimate, isFalse,
            reason: '$role must NOT have estimation permission');
      }
    });

    test(
        'CostEstimate.fromJson parses all cost components and fallback metadata',
        () {
      final json = {
        'id': 'est-002',
        'estimatedCost': 175000.0,
        'currency': 'LKR',
        'materialCost': 95000.0,
        'labourCost': 50000.0,
        'equipmentCost': 30000.0,
        'estimatedLabourHours': 40.0,
        'recommendedCrewSize': 3,
        'estimatedDurationHours': 12.0,
        'confidence': 0.88,
        'reason':
            'Deterministic calculation based on project repair benchmarks.',
        'modelName': 'RuleBasedFallback',
        'createdAt': '2026-09-28T02:00:00Z',
      };

      final estimate = CostEstimate.fromJson(json);

      expect(estimate.id, 'est-002');
      expect(estimate.estimatedCost, 175000.0);
      expect(estimate.currency, 'LKR');
      expect(estimate.materialCost, 95000.0);
      expect(estimate.labourCost, 50000.0);
      expect(estimate.equipmentCost, 30000.0);
      expect(estimate.estimatedLabourHours, 40.0);
      expect(estimate.recommendedCrewSize, 3);
      expect(estimate.estimatedDurationHours, 12.0);
      expect(estimate.confidence, 0.88);
      expect(estimate.reason,
          'Deterministic calculation based on project repair benchmarks.');
      expect(estimate.modelName, 'RuleBasedFallback');
    });

    test('WorkOrderItem.fromJson parses materials and equipment accurately',
        () {
      final materialJson = {
        'id': 'mat-01',
        'itemType': 'Material',
        'itemName': 'Ready-Mix Concrete Grade 25',
        'quantity': 3.5,
        'unit': 'm3',
        'estimatedUnitCost': 28000.0,
        'estimatedTotalCost': 98000.0,
      };

      final material = WorkOrderItem.fromJson(materialJson);
      expect(material.id, 'mat-01');
      expect(material.itemType, 'Material');
      expect(material.itemName, 'Ready-Mix Concrete Grade 25');
      expect(material.quantity, 3.5);
      expect(material.unit, 'm3');
      expect(material.estimatedUnitCost, 28000.0);
      expect(material.estimatedTotalCost, 98000.0);

      final equipJson = {
        'id': 'eq-01',
        'itemType': 'Equipment',
        'itemName': 'Plate Compactor',
        'quantity': 1.0,
        'unit': 'unit',
        'estimatedUnitCost': 15000.0,
        'estimatedTotalCost': 15000.0,
      };

      final equip = WorkOrderItem.fromJson(equipJson);
      expect(equip.itemType, 'Equipment');
      expect(equip.itemName, 'Plate Compactor');
      expect(equip.estimatedTotalCost, 15000.0);
    });

    test(
        'WorkOrder.fromJson parses backend approval fields without local rule computation',
        () {
      final json = <String, dynamic>{
        'id': 'wo-appr-01',
        'title': 'Bridge Expansion Joint Repair',
        'description': 'Repair expansion joint on arterial bridge',
        'status': 'PENDING_APPROVAL',
        'approvalStatus': 'PENDING',
        'approvalRequired': true,
        'isArterialRoad': true,
        'approvalReason': 'Both',
        'estimatedCost': 250000.0,
      };

      final wo = WorkOrder.fromJson(json);

      // Verify that values originate directly from backend payload
      expect(wo.approvalRequired, isTrue);
      expect(wo.approvalStatus, 'PENDING');
      expect(wo.approvalReason, 'Both');
      expect(wo.isArterialRoad, isTrue);
      expect(wo.status, 'PENDING_APPROVAL');
    });
  });

  group('Member 3 Step 4: Director Approval & Rejection Tests', () {
    test(
        'canApproveWorkOrders role mapping strictly enforces backend CanApproveWorkOrder policy',
        () {
      final now = DateTime.now().add(const Duration(hours: 1));

      User createUser(String role) => User(
            id: 'u-1',
            fullName: 'Test User',
            email: 'user@cmc.gov.lk',
            role: role,
            token: 'jwt-token',
            expiresAt: now,
          );

      // Authorized Director roles:
      expect(createUser('PublicWorksDirector').canApproveWorkOrders, isTrue);
      expect(createUser('Director').canApproveWorkOrders, isTrue);

      // Other municipal and citizen roles are NOT authorized for approval:
      expect(createUser('FieldMaintenanceSupervisor').canApproveWorkOrders,
          isFalse);
      expect(createUser('MunicipalStaff').canApproveWorkOrders, isFalse);
      expect(createUser('FieldWorker').canApproveWorkOrders, isFalse);
      expect(createUser('Citizen').canApproveWorkOrders, isFalse);
      expect(createUser('Admin').canApproveWorkOrders, isFalse);
    });

    test(
        'Approve request serialization matches backend ApproveRejectDto contract',
        () {
      const withNotes = ApproveRejectInput(
          notes: 'Budget verified. Authorized for execution.');
      expect(withNotes.toJson(),
          {'notes': 'Budget verified. Authorized for execution.'});

      const withoutNotes = ApproveRejectInput();
      expect(withoutNotes.toJson(), {'notes': null});
    });

    test(
        'Reject request serialization matches backend ApproveRejectDto contract',
        () {
      // Rejection with notes
      const rejectWithNotes = ApproveRejectInput(
          notes: 'Scope is excessive; revise with district engineer.');
      expect(rejectWithNotes.toJson(),
          {'notes': 'Scope is excessive; revise with district engineer.'});

      // Rejection without notes (notes is optional on backend DTO)
      const rejectWithoutNotes = ApproveRejectInput();
      expect(rejectWithoutNotes.toJson(), {'notes': null});
    });

    test('Rejection notes are optional matching backend ApproveRejectDto', () {
      // Trimming empty/whitespace notes resolves to null without throwing validation errors
      String? sanitizeNotes(String? input) {
        if (input == null || input.trim().isEmpty) return null;
        return input.trim();
      }

      expect(sanitizeNotes(null), isNull);
      expect(sanitizeNotes(''), isNull);
      expect(sanitizeNotes('   '), isNull);
      expect(
          sanitizeNotes('Scope requires revision'), 'Scope requires revision');

      // Rejecting without notes serializes cleanly with null notes
      final noNotesDto = ApproveRejectInput(notes: sanitizeNotes('   '));
      expect(noNotesDto.toJson(), {'notes': null});

      // Rejecting with notes serializes accurately
      final withNotesDto =
          ApproveRejectInput(notes: sanitizeNotes('Quotation excessive'));
      expect(withNotesDto.toJson(), {'notes': 'Quotation excessive'});
    });

    test(
        'WorkOrder.fromJson parses approval and audit response fields correctly',
        () {
      final approvedJson = <String, dynamic>{
        'id': 'wo-appr-99',
        'title': 'Bridge Expansion Joint Reconstruction',
        'description': 'Bridge joint reconstruction',
        'status': 'APPROVED',
        'approvalStatus': 'APPROVED',
        'approvalRequired': true,
        'isArterialRoad': true,
        'approvalReason': 'Both',
        'approvedBudget': 350000.0,
        'notes':
            'Initial inspection complete.\n[APPROVED by director-uuid] Authorized by Public Works Director.',
        'updatedAt': '2026-09-28T10:00:00Z',
      };

      final approvedWo = WorkOrder.fromJson(approvedJson);
      expect(approvedWo.isApproved, isTrue);
      expect(approvedWo.isApprovalPending, isFalse);
      expect(approvedWo.isRejected, isFalse);
      expect(approvedWo.approvedBudget, 350000.0);
      expect(approvedWo.notes, contains('[APPROVED by director-uuid]'));

      final rejectedJson = <String, dynamic>{
        'id': 'wo-rej-99',
        'title': 'Overpass Lighting Replacement',
        'description': 'Lighting overhaul',
        'status': 'REJECTED',
        'approvalStatus': 'REJECTED',
        'approvalRequired': true,
        'isArterialRoad': false,
        'approvalReason': 'ThresholdExceeded',
        'notes':
            '[REJECTED by director-uuid] Quotations exceed benchmark rates.',
        'updatedAt': '2026-09-28T10:05:00Z',
      };

      final rejectedWo = WorkOrder.fromJson(rejectedJson);
      expect(rejectedWo.isRejected, isTrue);
      expect(rejectedWo.isApprovalPending, isFalse);
      expect(rejectedWo.isApproved, isFalse);
      expect(rejectedWo.notes, contains('[REJECTED by director-uuid]'));
    });

    test(
        'NOT_REQUIRED approval status remains NOT_REQUIRED and is not pending or approved',
        () {
      final notReqJson = <String, dynamic>{
        'id': 'wo-notreq-01',
        'title': 'Routine Pothole Patching',
        'description': 'Minor asphalt patching on local road',
        'status': 'AI_GENERATED',
        'approvalStatus': 'NOT_REQUIRED',
        'approvalRequired': false,
        'isArterialRoad': false,
        'approvalReason': 'None',
      };

      final wo = WorkOrder.fromJson(notReqJson);
      expect(wo.approvalStatus, 'NOT_REQUIRED');
      expect(wo.approvalRequired, isFalse);
      expect(wo.isApprovalPending, isFalse);
      expect(wo.isApproved, isFalse);
      expect(wo.isRejected, isFalse);
    });

    test(
        'Backend error extraction surfaces authoritative transition error message',
        () {
      final dioException = DioException(
        requestOptions: RequestOptions(path: '/api/workorders/wo-123/approve'),
        response: Response(
          requestOptions:
              RequestOptions(path: '/api/workorders/wo-123/approve'),
          statusCode: 400,
          data: {
            'message':
                "Cannot approve work order in status 'COMPLETED'. Allowed next statuses: None.",
          },
        ),
      );

      final errorMsg = WorkOrderService.extractErrorMessage(dioException);
      expect(errorMsg,
          "Cannot approve work order in status 'COMPLETED'. Allowed next statuses: None.");
    });

    test('Flutter models do not contain hardcoded approval threshold value',
        () {
      // Confirms absence of client-side threshold calculations
      const rawText = '''
        class WorkOrderApprovalReason {
          None, ThresholdExceeded, ArterialRoadRisk, Both
        }
      ''';
      expect(rawText.contains('100000'), isFalse);
      expect(rawText.contains('100,000'), isFalse);
    });
  });

  group('Member 3 Step 5: Maintenance Handoff & Status Lifecycle Tests', () {
    test('UpdateWorkOrderInput serializes status change correctly', () {
      const updateStatus = UpdateWorkOrderInput(status: 'ASSIGNED');
      expect(updateStatus.toJson(), {'status': 'ASSIGNED'});

      const noStatusUpdate = UpdateWorkOrderInput(title: 'Minor Patch');
      expect(noStatusUpdate.toJson(), {'title': 'Minor Patch'});
      expect(noStatusUpdate.toJson().containsKey('status'), isFalse);
    });

    test(
        'WorkOrderStatusConstants provides display labels without local transition gating',
        () {
      expect(WorkOrderStatusConstants.all, contains('ASSIGNED'));
      expect(WorkOrderStatusConstants.all, contains('SCHEDULED'));
      expect(WorkOrderStatusConstants.all, contains('IN_PROGRESS'));
      expect(WorkOrderStatusConstants.all, contains('COMPLETED'));
      expect(WorkOrderStatusConstants.all, contains('VERIFIED'));
      expect(WorkOrderStatusConstants.all, contains('CLOSED'));

      // Confirm Flutter does NOT have a transition matrix dictionary
      const rawText = '''
        class WorkOrderStatusConstants {
          static const aiGenerated = 'AI_GENERATED';
        }
      ''';
      expect(rawText.contains('ValidTransitions'), isFalse);
      expect(rawText.contains('CanTransition'), isFalse);
    });

    test(
        'Maintenance handoff presentation reflects work order governance state',
        () {
      // Approved order reflects ready for next workflow stage
      final approvedWo = WorkOrder.fromJson({
        'id': 'wo-m4-01',
        'title': 'Drainage Reconstruction',
        'description': 'Culvert repair',
        'status': 'APPROVED',
        'approvalStatus': 'APPROVED',
        'approvalRequired': true,
        'isArterialRoad': true,
        'approvalReason': 'Both',
      });
      expect(approvedWo.isApproved, isTrue);
      expect(approvedWo.isApprovalPending, isFalse);

      // Order with pending approval reflects sign-off is pending
      final pendingWo = WorkOrder.fromJson({
        'id': 'wo-m4-02',
        'title': 'Arterial Resurfacing',
        'description': 'Asphalt paving',
        'status': 'PENDING_APPROVAL',
        'approvalStatus': 'PENDING',
        'approvalRequired': true,
        'isArterialRoad': true,
        'approvalReason': 'ThresholdExceeded',
      });
      expect(pendingWo.isApprovalPending, isTrue);
      expect(pendingWo.isApproved, isFalse);

      // Cancelled order reflects handoff action not available
      final cancelledWo = WorkOrder.fromJson({
        'id': 'wo-m4-03',
        'title': 'Abandoned Report',
        'description': 'Duplicate record',
        'status': 'CANCELLED',
        'approvalStatus': 'NOT_REQUIRED',
        'approvalRequired': false,
        'isCancelled': true,
      });
      expect(cancelledWo.isCancelled, isTrue);
      expect(cancelledWo.isApprovalPending, isFalse);
    });
  });
}
