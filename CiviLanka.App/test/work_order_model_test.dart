import 'package:flutter_test/flutter_test.dart';
import 'package:civilanka_app/models/work_order.dart';
import 'package:civilanka_app/models/user.dart';

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
  });
}
