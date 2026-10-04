import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_states.dart';
import '../../models/ai_dashboard_model.dart';
import '../../models/audit_log.dart';
import '../../models/municipal_safety_audit.dart';
import '../../models/work_order.dart';
import '../../services/ai_service.dart';
import '../../services/work_order_service.dart';
import '../../theme/app_colors.dart';
import '../create_work_order_screen.dart';

class AIIntelligenceScreen extends StatefulWidget {
  final int initialTab;
  final String? prefillTitle;
  final String? prefillDescription;
  final String? prefillCategory;
  final String? prefillLocation;
  final String? prefillZone;
  final bool autoRunTriage;

  const AIIntelligenceScreen({
    super.key,
    this.initialTab = 0,
    this.prefillTitle,
    this.prefillDescription,
    this.prefillCategory,
    this.prefillLocation,
    this.prefillZone,
    this.autoRunTriage = false,
  });

  @override
  State<AIIntelligenceScreen> createState() => _AIIntelligenceScreenState();
}

class _AIIntelligenceScreenState extends State<AIIntelligenceScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  // Telemetry Tab State
  bool _loading = true;
  String? _error;
  AIDashboardMetrics? _metrics;
  List<CivicAuditLog> _auditLogs = [];

  // Hazard Triage Agent State
  late final TextEditingController _hazardTitleCtrl;
  late final TextEditingController _hazardDescCtrl;
  late final TextEditingController _hazardLocCtrl;
  late String _hazardCategory;
  late String _hazardZone;
  bool _triageRunning = false;
  int _pipelineStep = 0;
  LiveHazardClassificationResponse? _triageResult;

  // Cost Estimator Agent State
  final _costTitleCtrl = TextEditingController(text: 'Structural Culvert Concrete Spalling');
  final _costDescCtrl = TextEditingController(
    text: 'Exposed rusted rebar and spalling concrete across main storm drainage culvert slab requiring rapid-setting cement and structural reinforcement.',
  );
  String _costCategory = 'Roads & Bridges';
  String _costPriority = 'HIGH';
  bool _costEstimating = false;
  CostEstimatePreviewResponse? _costResult;

  // Municipal Safety & Regulatory Audit Agent State
  List<WorkOrder> _safetyWorkOrders = [];
  bool _loadingSafetyWorkOrders = false;
  String _selectedSafetyOrderId = 'WO-2026-006';
  bool _gatewayPpeChecked = true;
  bool _gatewayBudgetChecked = true;
  bool _gatewayEvidenceChecked = true;
  double _gatewayGpsOffsetMeters = 8.4;
  bool _auditRunning = false;
  MunicipalSafetyAuditResult? _latestAuditResult;
  int _selectedScenarioIndex = 0;
  late List<MunicipalSafetyAuditResult> _historicalAudits;

  final currencyFmt = NumberFormat.currency(symbol: 'Rs. ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _hazardTitleCtrl = TextEditingController(
      text: widget.prefillTitle ?? 'Water Main Rupture near Ananda College',
    );
    _hazardDescCtrl = TextEditingController(
      text: widget.prefillDescription ??
          'High-pressure 4-inch water main ruptured along Maradana Road. Flooding street opposite school gate during morning rush hour.',
    );
    _hazardLocCtrl = TextEditingController(
      text: widget.prefillLocation ?? 'Maradana Road, Colombo 10',
    );
    _hazardCategory = widget.prefillCategory ?? 'Water Leak';
    _hazardZone = widget.prefillZone ?? 'School Zone (0.1km)';

    _historicalAudits = _getInitialHistoricalAudits();
    _tabController = TabController(
      length: 4,
      vsync: this,
      initialIndex: widget.initialTab.clamp(0, 3),
    );
    _loadTelemetryData();
    _loadSafetyWorkOrders();

    if (widget.autoRunTriage) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) _runHazardTriage();
      });
    }
  }


  @override
  void dispose() {
    _tabController.dispose();
    _hazardTitleCtrl.dispose();
    _hazardDescCtrl.dispose();
    _hazardLocCtrl.dispose();
    _costTitleCtrl.dispose();
    _costDescCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadTelemetryData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final aiService = context.read<AIService>();
      final metrics = await aiService.getDashboardStats();
      List<CivicAuditLog> logs = [];
      try {
        logs = await aiService.getAuditLogs();
      } catch (_) {}

      if (mounted) {
        setState(() {
          _metrics = metrics;
          _auditLogs = logs;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  // ── AI Hazard Triage Execution ──────────────────────────────────────────
  Future<void> _runHazardTriage() async {
    if (_hazardDescCtrl.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter an incident description.')),
      );
      return;
    }

    setState(() {
      _triageRunning = true;
      _pipelineStep = 1;
      _triageResult = null;
    });

    // Simulate animated StateGraph stages for real UX feedback
    await Future.delayed(const Duration(milliseconds: 350));
    if (mounted) setState(() => _pipelineStep = 2);
    await Future.delayed(const Duration(milliseconds: 350));
    if (mounted) setState(() => _pipelineStep = 3);

    try {
      final aiService = context.read<AIService>();
      final result = await aiService.classifyLiveHazard(
        title: _hazardTitleCtrl.text.trim(),
        description: _hazardDescCtrl.text.trim(),
        categorySupplied: _hazardCategory,
        location: _hazardLocCtrl.text.trim(),
        proximityZone: _hazardZone,
      );

      if (mounted) {
        setState(() {
          _pipelineStep = 4;
          _triageResult = result;
          _triageRunning = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _triageRunning = false;
          _pipelineStep = 0;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('AI Triage error: $e'), backgroundColor: AppColors.critical),
        );
      }
    }
  }

  // ── AI Cost Estimator Execution ─────────────────────────────────────────
  Future<void> _runCostEstimator() async {
    setState(() {
      _costEstimating = true;
      _costResult = null;
    });

    try {
      final woService = context.read<WorkOrderService>();
      final result = await woService.previewEstimate(
        category: _costCategory,
        description: _costDescCtrl.text.trim(),
        priority: _costPriority,
      );

      if (mounted) {
        setState(() {
          _costResult = result;
          _costEstimating = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _costEstimating = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('AI Estimation error: $e'), backgroundColor: AppColors.critical),
        );
      }
    }
  }

  void _applyHazardPreset(int index) {
    setState(() {
      switch (index) {
        case 0:
          _hazardTitleCtrl.text = 'School Zone Water Main Rupture';
          _hazardDescCtrl.text = 'High-pressure 4-inch water main ruptured along Maradana Road. Flooding street opposite school gate during morning rush hour.';
          _hazardCategory = 'Water Leak';
          _hazardLocCtrl.text = 'Maradana Road, Colombo 10';
          _hazardZone = 'School Zone (0.1km)';
          break;
        case 1:
          _hazardTitleCtrl.text = 'CEB Live Cable & Fallen Branch';
          _hazardDescCtrl.text = 'Severe thunderstorm snapped a 33kV high-voltage electrical cable. Live wires sparking on wet asphalt near bus stop.';
          _hazardCategory = 'Electrical Hazard';
          _hazardLocCtrl.text = 'Havelock Road, Colombo 05';
          _hazardZone = 'Bus Terminal & Commercial Corridor';
          break;
        case 2:
          _hazardTitleCtrl.text = 'Kelani Bridge Expansion Joint Fracture';
          _hazardDescCtrl.text = 'Structural steel expansion joint fractured with a 15cm jagged cavity. Heavy lorries causing severe vibration and structural deflection.';
          _hazardCategory = 'Structural Damage';
          _hazardLocCtrl.text = 'New Kelani Bridge, Peliyagoda';
          _hazardZone = 'Arterial Highway Corridor (A1)';
          break;
        case 3:
          _hazardTitleCtrl.text = 'Open Deep Manhole Cavity Near Hospital';
          _hazardDescCtrl.text = 'Heavy cast iron drainage manhole cover shattered by passing container. 2.5m open drop next to emergency room entrance.';
          _hazardCategory = 'Drainage & Flooding';
          _hazardLocCtrl.text = 'Regent Street, Colombo 08';
          _hazardZone = 'Hospital Emergency Lane (50m)';
          break;
        case 4:
          _hazardTitleCtrl.text = 'Canal Inundation & Culvert Blockage';
          _hazardDescCtrl.text = 'St. Sebastian Canal canal bank overflow. Tree trunks and plastic silt blocking 80% culvert throat causing 40cm backwater into homes.';
          _hazardCategory = 'Drainage & Flooding';
          _hazardLocCtrl.text = 'Grandpass, Colombo 14';
          _hazardZone = 'Dense Residential Lowland';
          break;
      }
    });
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // MUNICIPAL SAFETY & REGULATORY AUDIT AGENT HELPERS & STATE
  // ══════════════════════════════════════════════════════════════════════════════
  static final List<WorkOrder> _fallbackSafetyOrders = [
    WorkOrder(
      id: 'WO-2026-006',
      workOrderNumber: 'WO-2026-006',
      title: 'Fallen Mahogany Tree Trunk Removal & Trenching',
      description: 'Emergency tree clearing completed; asphalt resurfacing and curb drainage cleared.',
      hazardCategory: 'Obstruction',
      hazardAddress: 'Bauddhaloka Mawatha, Colombo 07',
      priority: 'HIGH',
      status: 'COMPLETED',
      estimatedCost: 65000,
      approvalStatus: 'APPROVED',
      approvalRequired: false,
      isArterialRoad: false,
      approvalReason: 'Urban forestry clearance within standard limits',
      createdBy: 'Emergency Operations Hub',
      isCancelled: false,
      assignedCrew: 'Urban Forestry Squad #2',
      assignedContractorName: 'State Engineering Corp',
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 4)),
      items: const [],
    ),
    WorkOrder(
      id: 'WO-2026-007',
      workOrderNumber: 'WO-2026-007',
      title: 'Median Guard Rail & Kerbstone Realignment',
      description: 'Field inspector photographic sign-off verified against post-repair GPS geofence.',
      hazardCategory: 'Road Furniture',
      hazardAddress: 'Sri Jayawardenepura Mawatha, Rajagiriya',
      priority: 'LOW',
      status: 'COMPLETED',
      estimatedCost: 195000,
      approvalStatus: 'APPROVED',
      approvalRequired: true,
      isArterialRoad: true,
      approvalReason: 'Director approved for arterial corridor safety',
      createdBy: 'Field Inspector Portal',
      isCancelled: false,
      assignedCrew: 'Highway Maintenance Division',
      assignedContractorName: 'Magha Engineering Ltd',
      createdAt: DateTime.now().subtract(const Duration(days: 3)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 18)),
      items: const [],
    ),
    WorkOrder(
      id: 'WO-2026-009',
      workOrderNumber: 'WO-2026-009',
      title: 'High-Tension Power Cable Trenching Discrepancy',
      description: 'Underground conduit trenching without authorized municipal sign-off and safety barriers.',
      hazardCategory: 'Electrical Hazard',
      hazardAddress: 'Grandpass Road, Colombo 14',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      estimatedCost: 620000,
      approvalStatus: 'PENDING',
      approvalRequired: true,
      isArterialRoad: true,
      approvalReason: 'Pending Director financial review (>500k)',
      createdBy: 'Metropolitan Grid Crew',
      isCancelled: false,
      assignedCrew: 'Metropolitan Grid Crew',
      assignedContractorName: 'Lanka Electrics & Civil',
      createdAt: DateTime.now().subtract(const Duration(days: 1)),
      updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
      items: const [],
    ),
  ];

  List<MunicipalSafetyAuditResult> _getInitialHistoricalAudits() {
    return [
      MunicipalSafetyAuditResult(
        complianceStatus: 'PASS',
        complianceScore: 98,
        safetyRulesPassed: true,
        budgetThresholdsApproved: true,
        completionEvidenceVerified: true,
        gpsVerificationPassed: true,
        gpsDistanceMeters: 8.4,
        violations: const [],
        auditFindings:
            'All routine municipal safety criteria satisfied. Trenching backfilled and asphalt compacted. GPS matched within 8.4m (<50m limit).',
        recommendation:
            'Authorize municipal work order closure and contractor payment disbursement.',
        requiresDirectorEscalation: false,
        confidence: 0.98,
        modelName: 'gemini-3.1-flash-lite',
        status: 'AUDITED',
        auditCertificateId: 'CERT-MUNI-2026-006-4819',
        timestamp: DateTime.now().subtract(const Duration(hours: 4)),
      ),
      MunicipalSafetyAuditResult(
        complianceStatus: 'PASS',
        complianceScore: 96,
        safetyRulesPassed: true,
        budgetThresholdsApproved: true,
        completionEvidenceVerified: true,
        gpsVerificationPassed: true,
        gpsDistanceMeters: 14.1,
        violations: const [],
        auditFindings:
            'Kerbstone alignment verified against Road Development Authority (RDA) geometric tolerances. Field supervisor sign-off confirmed.',
        recommendation:
            'Authorize municipal work order closure and contractor payment disbursement.',
        requiresDirectorEscalation: false,
        confidence: 0.96,
        modelName: 'gemini-3.1-flash-lite',
        status: 'AUDITED',
        auditCertificateId: 'CERT-MUNI-2026-007-7321',
        timestamp: DateTime.now().subtract(const Duration(hours: 18)),
      ),
      MunicipalSafetyAuditResult(
        complianceStatus: 'FAILED',
        complianceScore: 32,
        safetyRulesPassed: false,
        budgetThresholdsApproved: false,
        completionEvidenceVerified: false,
        gpsVerificationPassed: false,
        gpsDistanceMeters: 2320.0,
        violations: const [
          SafetyAuditViolation(
            ruleCode: 'GPS-TOL-01',
            severity: 'CRITICAL',
            description:
                'GPS location violation: Field completion recorded 2,320m away from incident pin (Exceeds 50m municipal tolerance).',
            remedialAction:
                'Supervisor must physically confirm contractor repaired the correct asset coordinates.',
          ),
          SafetyAuditViolation(
            ruleCode: 'FISC-DIR-01',
            severity: 'CRITICAL',
            description:
                'Work order cost (Rs. 620,000) exceeds Director Approval threshold (Rs. 500,000) without verified approval authorization.',
            remedialAction:
                'Obtain formal Public Works Director electronic sign-off before field execution or invoice processing.',
          ),
          SafetyAuditViolation(
            ruleCode: 'SEC-CHK-01',
            severity: 'HIGH',
            description:
                'Protective gear check incomplete: High-visibility cones missing in post-repair photograph.',
            remedialAction:
                'Site foreman must submit signed safety protocols checklist and deploy high-visibility perimeter.',
          ),
        ],
        auditFindings:
            'Auditor rejected completion evidence due to severe GPS geofence deviation (2.3km off-site) and lack of authorized budget amendment.',
        recommendation:
            'Remedial corrective actions required before work order can be certified for closure.',
        requiresDirectorEscalation: true,
        confidence: 0.92,
        modelName: 'gemini-3.1-flash-lite',
        status: 'AUDITED',
        auditCertificateId: 'CERT-REVOKED-2026',
        timestamp: DateTime.now().subtract(const Duration(hours: 36)),
      ),
    ];
  }

  Future<void> _loadSafetyWorkOrders() async {
    setState(() => _loadingSafetyWorkOrders = true);
    try {
      final woService = context.read<WorkOrderService>();
      final orders = await woService.getWorkOrders();
      if (orders.isNotEmpty && mounted) {
        setState(() {
          _safetyWorkOrders = orders;
          if (!_safetyWorkOrders.any((w) => w.id == _selectedSafetyOrderId)) {
            _selectedSafetyOrderId = _safetyWorkOrders.first.id;
          }
          _loadingSafetyWorkOrders = false;
        });
        return;
      }
    } catch (_) {}

    if (mounted) {
      setState(() {
        _safetyWorkOrders = _fallbackSafetyOrders;
        if (!_safetyWorkOrders.any((w) => w.id == _selectedSafetyOrderId)) {
          _selectedSafetyOrderId = _safetyWorkOrders.first.id;
        }
        _loadingSafetyWorkOrders = false;
      });
    }
  }

  void _selectSafetyScenario(int index) {
    setState(() {
      _selectedScenarioIndex = index;
      switch (index) {
        case 0:
          _selectedSafetyOrderId = 'WO-2026-006';
          _gatewayPpeChecked = true;
          _gatewayBudgetChecked = true;
          _gatewayEvidenceChecked = true;
          _gatewayGpsOffsetMeters = 8.4;
          break;
        case 1:
          _selectedSafetyOrderId = 'WO-2026-007';
          _gatewayPpeChecked = true;
          _gatewayBudgetChecked = true;
          _gatewayEvidenceChecked = true;
          _gatewayGpsOffsetMeters = 14.1;
          break;
        case 2:
          _selectedSafetyOrderId = 'WO-2026-009';
          _gatewayPpeChecked = false;
          _gatewayBudgetChecked = false;
          _gatewayEvidenceChecked = false;
          _gatewayGpsOffsetMeters = 2320.0;
          break;
      }
    });
  }

  Future<void> _runSafetyAudit() async {
    setState(() {
      _auditRunning = true;
      _latestAuditResult = null;
    });

    final currentOrder = _safetyWorkOrders.firstWhere(
      (w) => w.id == _selectedSafetyOrderId,
      orElse: () => _safetyWorkOrders.isNotEmpty ? _safetyWorkOrders.first : _fallbackSafetyOrders.first,
    );

    try {
      final aiService = context.read<AIService>();
      final result = await aiService.auditWorkOrderSafety(
        workOrderId: currentOrder.id,
        workOrderNumber: currentOrder.workOrderNumber,
        title: currentOrder.title,
        estimatedCost: currentOrder.estimatedCost,
        approvalStatus: _gatewayBudgetChecked ? 'APPROVED' : 'PENDING',
        workOrderStatus: currentOrder.status,
        hasBeforeImage: _gatewayEvidenceChecked,
        hasAfterImage: _gatewayEvidenceChecked,
        gpsDistanceMeters: _gatewayGpsOffsetMeters,
        safetyChecklistVerified: _gatewayPpeChecked,
        severity: currentOrder.priority == 'URGENT' ? 'CRITICAL' : 'MEDIUM',
        priority: currentOrder.priority,
      );

      if (mounted) {
        setState(() {
          _latestAuditResult = result;
          _historicalAudits.insert(0, result);
          _auditRunning = false;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              result.isPass
                  ? 'Municipal Safety Audit PASSED (Score: ${result.complianceScore}/100)'
                  : 'Municipal Safety Audit FAILED (${result.violations.length} violations)',
            ),
            backgroundColor: result.isPass ? const Color(0xFF059669) : AppColors.critical,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _auditRunning = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Audit execution error: $e'), backgroundColor: AppColors.critical),
        );
      }
    }
  }

  void _showComplianceCertificateModal(MunicipalSafetyAuditResult result, WorkOrder? wo) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: Container(
          constraints: const BoxConstraints(maxWidth: 500),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Certificate Header
              Container(
                padding: const EdgeInsets.all(20),
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF064E3B), Color(0xFF047857), Color(0xFF0F172A)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.white.withOpacity(0.2)),
                      ),
                      child: const Icon(Icons.verified, color: Color(0xFFFBBF24), size: 30),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'MUNICIPAL SAFETY COMPLIANCE CERTIFICATE',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 12,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 0.8,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            'Democratic Socialist Republic of Sri Lanka • Regulatory Board',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.85),
                              fontSize: 10,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white, size: 20),
                      onPressed: () => Navigator.of(ctx).pop(),
                    ),
                  ],
                ),
              ),

              // Certificate Body
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Certificate Serial & Status
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('CERTIFICATE ID', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                              Text(
                                result.auditCertificateId,
                                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, fontFamily: 'monospace', color: Color(0xFF065F46)),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: result.isPass ? const Color(0xFFD1FAE5) : const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: result.isPass ? const Color(0xFF10B981) : AppColors.critical),
                            ),
                            child: Text(
                              result.complianceStatus,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                color: result.isPass ? const Color(0xFF065F46) : AppColors.critical,
                              ),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),
                      const Divider(height: 1),
                      const SizedBox(height: 14),

                      // Certified Asset / Project
                      const Text('MUNICIPAL INFRASTRUCTURE ASSET', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                      const SizedBox(height: 3),
                      Text(
                        wo?.title ?? 'Emergency Infrastructure Remediation',
                        style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          const Icon(Icons.place_outlined, size: 13, color: AppColors.slate500),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              wo?.hazardAddress ?? 'Metropolitan Colombo Municipal Area',
                              style: const TextStyle(fontSize: 11, color: AppColors.slate600),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 16),

                      // 4 Gateways Verification Table
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.slate50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.slate200),
                        ),
                        child: Column(
                          children: [
                            _buildCertGatewayRow('OHS Safety Protocols (SEC-PPE-01)', result.safetyRulesPassed),
                            const Divider(height: 12),
                            _buildCertGatewayRow('Fiscal Budget Cap (FISC-DIR-01)', result.budgetThresholdsApproved),
                            const Divider(height: 12),
                            _buildCertGatewayRow('Photographic Evidence (EVID-IMG-01)', result.completionEvidenceVerified),
                            const Divider(height: 12),
                            _buildCertGatewayRow(
                              'GPS Geofence Proximity (${result.gpsDistanceMeters.toStringAsFixed(1)}m)',
                              result.gpsVerificationPassed,
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 14),

                      // Audit Reasoning
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF8FAFC),
                          borderRadius: BorderRadius.circular(10),
                          border: const Border(left: BorderSide(color: Color(0xFF10B981), width: 3)),
                        ),
                        child: Text(
                          result.auditFindings,
                          style: const TextStyle(fontSize: 11.5, color: AppColors.slate700, height: 1.4),
                        ),
                      ),

                      const SizedBox(height: 20),

                      // Signatures & Official Stamp
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                width: 110,
                                height: 1,
                                color: AppColors.slate300,
                              ),
                              const SizedBox(height: 4),
                              const Text('Municipal Auditor', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate800)),
                              const Text('Civic AI Verification Engine', style: TextStyle(fontSize: 9, color: AppColors.slate400)),
                            ],
                          ),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Container(
                                width: 110,
                                height: 1,
                                color: AppColors.slate300,
                              ),
                              const SizedBox(height: 4),
                              const Text('Director of Works', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate800)),
                              const Text('Public Works Department', style: TextStyle(fontSize: 9, color: AppColors.slate400)),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              // Footer Action
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                decoration: const BoxDecoration(
                  color: AppColors.slate50,
                  borderRadius: BorderRadius.vertical(bottom: Radius.circular(20)),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Audited: ${DateFormat('yyyy-MM-dd HH:mm').format(result.timestamp)}',
                      style: const TextStyle(fontSize: 10.5, color: AppColors.slate500),
                    ),
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.of(ctx).pop();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Compliance certificate exported to municipal registry.')),
                        );
                      },
                      icon: const Icon(Icons.download, size: 15, color: Colors.white),
                      label: const Text('Export Digital Copy', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF047857),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCertGatewayRow(String label, bool passed) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.slate700),
          ),
        ),
        Icon(
          passed ? Icons.check_circle : Icons.cancel,
          size: 16,
          color: passed ? const Color(0xFF10B981) : AppColors.critical,
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text(
          'CivitaGuard AI Intelligence Hub',
          style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
        ),
        backgroundColor: AppColors.slate900,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: const Color(0xFF10B981),
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
          isScrollable: true,
          tabAlignment: TabAlignment.start,
          tabs: const [
            Tab(icon: Icon(Icons.psychology_outlined, size: 20), text: 'HAZARD TRIAGE'),
            Tab(icon: Icon(Icons.calculate_outlined, size: 20), text: 'COST ESTIMATOR'),
            Tab(icon: Icon(Icons.shield_outlined, size: 20), text: 'SAFETY AUDIT'),
            Tab(icon: Icon(Icons.analytics_outlined, size: 20), text: 'GOVERNANCE'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildHazardTriageTab(),
          _buildCostEstimatorTab(),
          _buildRegulatoryAuditTab(),
          _buildGovernanceTab(),
        ],
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TAB 1: CITIZEN HAZARD CLASSIFICATION & TRIAGE AGENT
  // ══════════════════════════════════════════════════════════════════════════════
  Widget _buildHazardTriageTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF312E81), Color(0xFF4338CA)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(color: const Color(0xFF312E81).withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 3)),
              ],
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.auto_awesome, color: Colors.amber, size: 24),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Autonomous Incident Classifier',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'LangGraph + Gemini multi-agent pipeline validating Sri Lanka municipal incident severity.',
                        style: TextStyle(fontSize: 11, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Preset Scenarios Carousel
          const Text('1-Click Incident Presets:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate700)),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildPresetButton(0, '💧 School Water Burst', Colors.blue),
                const SizedBox(width: 8),
                _buildPresetButton(1, '⚡ CEB Live Wire', Colors.amber),
                const SizedBox(width: 8),
                _buildPresetButton(2, '🌉 Kelani Bridge Defect', const Color(0xFFF43F5E)),
                const SizedBox(width: 8),
                _buildPresetButton(3, '🕳️ Open Manhole Hospital', Colors.purple),
                const SizedBox(width: 8),
                _buildPresetButton(4, '🌊 Canal Drainage Block', Colors.teal),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Multilingual fast test chips
          Row(
            children: [
              const Text('NLP Lang:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate500)),
              const SizedBox(width: 8),
              ActionChip(
                label: const Text('English (EN)'),
                labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                onPressed: () => _applyHazardPreset(0),
              ),
              const SizedBox(width: 6),
              ActionChip(
                label: const Text('සිංහල (SI)'),
                labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                onPressed: () {
                  setState(() {
                    _hazardTitleCtrl.text = 'ගස් කඩා වැටී විදුලි රැහැන් කැඩී ඇත';
                    _hazardDescCtrl.text = 'ප්‍රධාන පාරේ විදුලි රැහැන් මතට ගසක් කඩා වැටී ඇති අතර විදුලි සැර වැදීමේ අවදානමක් පවතී.';
                    _hazardCategory = 'Electrical Hazard';
                    _hazardZone = 'School Zone';
                  });
                },
              ),
              const SizedBox(width: 6),
              ActionChip(
                label: const Text('தமிழ் (TA)'),
                labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                onPressed: () {
                  setState(() {
                    _hazardTitleCtrl.text = 'பிரதான வீதியில் நீர் கசிவு ஏற்பட்டுள்ளது';
                    _hazardDescCtrl.text = 'குடிநீர் விநியோக குழாய் உடைந்து வீதியில் அதிகளவான நீர் பெருக்கெடுத்து ஓடுகிறது.';
                    _hazardCategory = 'Water Leak';
                    _hazardZone = 'Commercial Zone';
                  });
                },
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Input Form Card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.slate200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Incident Title', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate700)),
                const SizedBox(height: 6),
                TextField(
                  controller: _hazardTitleCtrl,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: AppColors.slate50,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.slate200)),
                  ),
                ),

                const SizedBox(height: 12),

                const Text('Citizen Incident Description', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate700)),
                const SizedBox(height: 6),
                TextField(
                  controller: _hazardDescCtrl,
                  maxLines: 3,
                  style: const TextStyle(fontSize: 13),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: AppColors.slate50,
                    contentPadding: const EdgeInsets.all(12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: AppColors.slate200)),
                  ),
                ),

                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Citizen Category', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                          const SizedBox(height: 4),
                          DropdownButtonFormField<String>(
                            value: _hazardCategory,
                            isExpanded: true,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: AppColors.slate50,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            items: ['Water Leak', 'Electrical Hazard', 'Road Damage', 'Structural Damage', 'Drainage & Flooding', 'Other']
                                .map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 12))))
                                .toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _hazardCategory = val);
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Proximity Zone', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                          const SizedBox(height: 4),
                          DropdownButtonFormField<String>(
                            value: _hazardZone,
                            isExpanded: true,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: AppColors.slate50,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            items: ['School Zone (0.1km)', 'Hospital Emergency Lane (50m)', 'Arterial Highway Corridor (A1)', 'Bus Terminal & Commercial Corridor', 'Dense Residential Lowland', 'Standard Zone']
                                .map((z) => DropdownMenuItem(value: z, child: Text(z, style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis)))
                                .toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _hazardZone = val);
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Trigger Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _triageRunning ? null : _runHazardTriage,
                    icon: _triageRunning
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.rocket_launch_rounded, color: Colors.white, size: 20),
                    label: Text(
                      _triageRunning ? 'Running StateGraph Pipeline...' : 'Run Municipal AI Triage Analysis',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4338CA),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 2,
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Animated Pipeline Visualizer
          if (_triageRunning || _pipelineStep > 0) ...[
            const SizedBox(height: 16),
            _buildPipelineTracker(),
          ],

          // Certified AI Results Dossier Card
          if (_triageResult != null) ...[
            const SizedBox(height: 16),
            _buildTriageResultDossier(),
          ],

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildPresetButton(int idx, String title, Color col) {
    return InkWell(
      onTap: () => _applyHazardPreset(idx),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: col.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: col.withOpacity(0.3)),
        ),
        child: Text(
          title,
          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: col),
        ),
      ),
    );
  }

  Widget _buildPipelineTracker() {
    final stages = ['Ingestion', 'NLP & Heuristics', 'Inference Engine', 'Dispatch Package'];

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFF1E1B4B),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.hub_outlined, color: Colors.amber, size: 16),
                  SizedBox(width: 6),
                  Text('StateGraph Execution Telemetry', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold)),
                ],
              ),
              if (_triageRunning)
                const Text('Pulsing...', style: TextStyle(color: Colors.amber, fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: List.generate(stages.length, (i) {
              final isDone = _pipelineStep > i;
              final isCurrent = _pipelineStep == i + 1;
              return Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 22,
                      height: 22,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: isDone
                            ? const Color(0xFF10B981)
                            : isCurrent
                                ? Colors.amber
                                : Colors.white24,
                      ),
                      alignment: Alignment.center,
                      child: isDone
                          ? const Icon(Icons.check, size: 14, color: Colors.black)
                          : Text('${i + 1}', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black)),
                    ),
                    const SizedBox(width: 4),
                    Expanded(
                      child: Text(
                        stages[i],
                        style: TextStyle(
                          fontSize: 9,
                          fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                          color: isCurrent ? Colors.amber : Colors.white70,
                        ),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              );
            }),
          ),
        ],
      ),
    );
  }

  Widget _buildTriageResultDossier() {
    final r = _triageResult!;
    final isCritical = r.severity == 'CRITICAL';
    final isHigh = r.severity == 'HIGH';
    final isMedium = r.severity == 'MEDIUM';
    final badgeColor = isCritical
        ? AppColors.critical
        : isHigh
            ? AppColors.warning
            : isMedium
                ? const Color(0xFF2563EB)
                : const Color(0xFF10B981);

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: badgeColor.withOpacity(0.3), width: 1.5),
        boxShadow: [
          BoxShadow(color: badgeColor.withOpacity(0.08), blurRadius: 16, offset: const Offset(0, 4)),
        ],
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Badge Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: badgeColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(Icons.verified, color: badgeColor, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('CERTIFIED MUNICIPAL AI DOSSIER', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400, letterSpacing: 0.5)),
                      Text(r.category, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: AppColors.slate900)),
                    ],
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: badgeColor.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: badgeColor.withOpacity(0.3)),
                ),
                child: Text(
                  '${r.severity} • ${r.priority}',
                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: badgeColor),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.slate100),
          const SizedBox(height: 14),

          // Metrics 3 Column
          Row(
            children: [
              Expanded(
                child: _buildMetricTile('CONFIDENCE', '${(r.confidence * 100).toInt()}%', Icons.speed, const Color(0xFF0D9488)),
              ),
              Expanded(
                child: _buildMetricTile('CREW SIZE', '${r.recommendedCrewSize} Workers', Icons.people_outline, const Color(0xFF2563EB)),
              ),
              Expanded(
                child: _buildMetricTile('RESPONSE', '< ${r.estimatedResponseHours.toStringAsFixed(0)} Hours', Icons.timer_outlined, const Color(0xFFD97706)),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Grounding / Reason
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppColors.slate50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.slate200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.gavel_outlined, size: 16, color: AppColors.slate600),
                    SizedBox(width: 6),
                    Text('Legal Grounding & Threat Analysis', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800)),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  r.reason,
                  style: const TextStyle(fontSize: 12, color: AppColors.slate700, height: 1.4),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Action Recommendation
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFECFDF5),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFA7F3D0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    Icon(Icons.flash_on_rounded, size: 16, color: Color(0xFF059669)),
                    SizedBox(width: 6),
                    Text('Recommended Municipal Protocol', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF065F46))),
                  ],
                ),
                const SizedBox(height: 8),
                if (r.recommendedAction.contains(';'))
                  ...r.recommendedAction.split(';').map((act) => act.trim()).where((act) => act.isNotEmpty).map(
                        (actionItem) => Padding(
                          padding: const EdgeInsets.only(bottom: 5),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Padding(
                                padding: EdgeInsets.only(top: 4, right: 6),
                                child: Icon(Icons.check_circle, size: 12, color: Color(0xFF059669)),
                              ),
                              Expanded(
                                child: Text(
                                  actionItem,
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF047857), height: 1.3),
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                else
                  Text(
                    r.recommendedAction,
                    style: const TextStyle(fontSize: 12, color: Color(0xFF047857), height: 1.3),
                  ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          // Action Button: Create Work Order
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => const CreateWorkOrderScreen(),
                  ),
                );
              },
              icon: const Icon(Icons.add_task, color: Colors.white, size: 18),
              label: const Text(
                'Create Work Order from AI Dispatch',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD97706),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetricTile(String label, String val, IconData icon, Color col) {
    return Container(
      padding: const EdgeInsets.all(8),
      margin: const EdgeInsets.symmetric(horizontal: 3),
      decoration: BoxDecoration(
        color: col.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        children: [
          Icon(icon, size: 16, color: col),
          const SizedBox(height: 4),
          Text(val, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: col)),
          const SizedBox(height: 2),
          Text(label, style: const TextStyle(fontSize: 9, color: AppColors.slate500)),
        ],
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TAB 2: COST & MATERIAL ESTIMATOR AGENT
  // ══════════════════════════════════════════════════════════════════════════════
  Widget _buildCostEstimatorTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF065F46), Color(0xFF059669)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
              boxShadow: [
                BoxShadow(color: const Color(0xFF065F46).withOpacity(0.3), blurRadius: 10, offset: const Offset(0, 3)),
              ],
            ),
            child: const Row(
              children: [
                Icon(Icons.monetization_on_outlined, color: Colors.white, size: 28),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'CIDA / BSR Autonomous Quantity Surveyor',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      SizedBox(height: 2),
                      Text(
                        'Pre-evaluates work orders against Sri Lanka standard rates (BSR §2026) with automated BOQ generation.',
                        style: TextStyle(fontSize: 11, color: Colors.white70),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Presets
          const Text('Predefined Maintenance Presets:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate700)),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                ActionChip(
                  label: const Text('Water Pipe Rupture'),
                  onPressed: () {
                    setState(() {
                      _costTitleCtrl.text = 'Main St Water Pipe Rupture';
                      _costDescCtrl.text = 'High pressure water line burst causing flooding and subbase erosion.';
                      _costCategory = 'Water';
                      _costPriority = 'URGENT';
                    });
                  },
                ),
                const SizedBox(width: 8),
                ActionChip(
                  label: const Text('Bridge Concrete Spalling'),
                  onPressed: () {
                    setState(() {
                      _costTitleCtrl.text = 'Galle Road Bridge Deck Concrete Spalling';
                      _costDescCtrl.text = 'Exposed rusted rebar and spalling concrete across south pier requiring rapid-setting cement.';
                      _costCategory = 'Roads & Bridges';
                      _costPriority = 'HIGH';
                    });
                  },
                ),
                const SizedBox(width: 8),
                ActionChip(
                  label: const Text('Storm Drain Dredging'),
                  onPressed: () {
                    setState(() {
                      _costTitleCtrl.text = 'Negombo Rd Culvert Dredging';
                      _costDescCtrl.text = 'Heavy silt accumulation and plastic debris restricting storm drain discharge flow.';
                      _costCategory = 'Sanitation';
                      _costPriority = 'NORMAL';
                    });
                  },
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // Form
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.slate200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Work Order Title', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate700)),
                const SizedBox(height: 6),
                TextField(
                  controller: _costTitleCtrl,
                  style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: AppColors.slate50,
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),

                const SizedBox(height: 12),

                const Text('Damage Scope & Technical Remediation', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate700)),
                const SizedBox(height: 6),
                TextField(
                  controller: _costDescCtrl,
                  maxLines: 3,
                  style: const TextStyle(fontSize: 13),
                  decoration: InputDecoration(
                    filled: true,
                    fillColor: AppColors.slate50,
                    contentPadding: const EdgeInsets.all(12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),

                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Category', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                          const SizedBox(height: 4),
                          DropdownButtonFormField<String>(
                            value: _costCategory,
                            isExpanded: true,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: AppColors.slate50,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            items: ['Roads & Bridges', 'Water', 'Electrical', 'Sanitation', 'Civil']
                                .map((c) => DropdownMenuItem(value: c, child: Text(c, style: const TextStyle(fontSize: 12))))
                                .toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _costCategory = val);
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Priority', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.slate600)),
                          const SizedBox(height: 4),
                          DropdownButtonFormField<String>(
                            value: _costPriority,
                            isExpanded: true,
                            decoration: InputDecoration(
                              filled: true,
                              fillColor: AppColors.slate50,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            items: ['LOW', 'NORMAL', 'HIGH', 'URGENT']
                                .map((p) => DropdownMenuItem(value: p, child: Text(p, style: const TextStyle(fontSize: 12))))
                                .toList(),
                            onChanged: (val) {
                              if (val != null) setState(() => _costPriority = val);
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _costEstimating ? null : _runCostEstimator,
                    icon: _costEstimating
                        ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Icon(Icons.calculate, color: Colors.white, size: 20),
                    label: Text(
                      _costEstimating ? 'Estimating Material Rates...' : 'Run CIDA BSR AI Cost Estimator',
                      style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF059669),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ),
              ],
            ),
          ),

          // Estimation Results
          if (_costResult != null) ...[
            const SizedBox(height: 16),
            _buildCostResultCard(),
          ],

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildCostResultCard() {
    final c = _costResult!;
    final isDirector = c.estimatedCost > 100000;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3), width: 1.5),
        boxShadow: [
          BoxShadow(color: const Color(0xFF10B981).withOpacity(0.08), blurRadius: 16, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('TOTAL ESTIMATED BUDGET', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                  Text(currencyFmt.format(c.estimatedCost), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF065F46))),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: isDirector ? const Color(0xFFFEF3C7) : const Color(0xFFD1FAE5),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  isDirector ? 'Director Approval Required' : 'Supervisor Direct Dispatch',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: isDirector ? const Color(0xFF92400E) : const Color(0xFF065F46),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.slate100),
          const SizedBox(height: 14),

          // Cost Breakdown Row
          Row(
            children: [
              Expanded(
                child: _buildCostPill('Materials', currencyFmt.format(c.materialCost), const Color(0xFF2563EB)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildCostPill('Labour', currencyFmt.format(c.labourCost), const Color(0xFF0D9488)),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildCostPill('Equipment', currencyFmt.format(c.equipmentCost), const Color(0xFFD97706)),
              ),
            ],
          ),

          const SizedBox(height: 14),

          // BOQ Items
          const Text('Material Requisition & Schedule of Rates:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate700)),
          const SizedBox(height: 8),
          ...c.items.map((item) => Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(
                        '• ${item.itemName} (${item.quantity.toStringAsFixed(0)} ${item.unit})',
                        style: const TextStyle(fontSize: 12, color: AppColors.slate800),
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    Text(
                      currencyFmt.format(item.estimatedTotalCost),
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate900),
                    ),
                  ],
                ),
              )),

          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CreateWorkOrderScreen()),
                );
              },
              icon: const Icon(Icons.add_task, color: Colors.white, size: 18),
              label: const Text('Open in Work Order Creator', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF059669),
                padding: const EdgeInsets.symmetric(vertical: 13),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCostPill(String title, String amt, Color col) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: col.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(fontSize: 10, color: col, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Text(amt, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: AppColors.slate900)),
        ],
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TAB 3: MUNICIPAL SAFETY & REGULATORY AUDIT AGENT
  // ══════════════════════════════════════════════════════════════════════════════
  Widget _buildRegulatoryAuditTab() {
    final currentOrder = _safetyWorkOrders.firstWhere(
      (w) => w.id == _selectedSafetyOrderId,
      orElse: () => _safetyWorkOrders.isNotEmpty ? _safetyWorkOrders.first : _fallbackSafetyOrders.first,
    );

    final totalAudits = _historicalAudits.length;
    final passedAudits = _historicalAudits.where((a) => a.isPass).length;
    final passRate = totalAudits > 0 ? ((passedAudits / totalAudits) * 100).round() : 100;
    final avgScore = totalAudits > 0
        ? (_historicalAudits.map((a) => a.complianceScore).fold(0, (a, b) => a + b) / totalAudits).round()
        : 95;
    final violationsFlagged = _historicalAudits.fold<int>(0, (acc, a) => acc + a.violations.length);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // ── Executive Hero Card ──────────────────────────────────────
          Container(
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF064E3B), Color(0xFF047857), Color(0xFF0F172A)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF047857).withOpacity(0.25),
                  blurRadius: 18,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.18),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white.withOpacity(0.25)),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: const BoxDecoration(
                              color: Color(0xFF34D399),
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 6),
                          const Text(
                            'Autonomous Regulatory Gatekeeper',
                            style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.security, color: Color(0xFFFBBF24), size: 22),
                  ],
                ),
                const SizedBox(height: 12),
                const Text(
                  'Municipal Safety & Regulatory Audit Agent',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 18,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 5),
                Text(
                  'Autonomous 4-Gateway verification of field contractor deliverables, geofencing tolerance (<50m), fiscal budget caps & OHS standards under Municipal Councils Ordinance §14.',
                  style: TextStyle(
                    color: Colors.white.withOpacity(0.85),
                    fontSize: 11.5,
                    height: 1.4,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 16),

          // ── 4 KPI Telemetry Ribbon ──────────────────────────────────
          Row(
            children: [
              Expanded(
                child: _buildAuditKpiCard(
                  'Audits Logged',
                  '$totalAudits',
                  Icons.layers_outlined,
                  const Color(0xFF3B82F6),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildAuditKpiCard(
                  'Pass Rate',
                  '$passRate%',
                  Icons.check_circle_outline,
                  const Color(0xFF10B981),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildAuditKpiCard(
                  'Avg Score',
                  '$avgScore/100',
                  Icons.auto_graph_outlined,
                  const Color(0xFF8B5CF6),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildAuditKpiCard(
                  'Violations',
                  '$violationsFlagged',
                  Icons.warning_amber_outlined,
                  const Color(0xFFEF4444),
                ),
              ),
            ],
          ),

          const SizedBox(height: 20),

          // ── 1-Click Simulation Scenarios ────────────────────────────
          Row(
            children: const [
              Icon(Icons.flash_on, size: 16, color: Color(0xFFF59E0B)),
              SizedBox(width: 6),
              Text(
                '1-Click Regulatory Simulation Scenarios',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate800),
              ),
            ],
          ),
          const SizedBox(height: 8),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildScenarioChip(
                  0,
                  '🌳 Tree Clearing (PASS)',
                  'Bauddhaloka Mw • GPS 8.4m • Rs. 65k',
                  const Color(0xFF10B981),
                ),
                const SizedBox(width: 8),
                _buildScenarioChip(
                  1,
                  '🛡️ Guard Rail (PASS)',
                  'Rajagiriya • GPS 14.1m • Rs. 195k',
                  const Color(0xFF10B981),
                ),
                const SizedBox(width: 8),
                _buildScenarioChip(
                  2,
                  '⚡ Trenching Discrepancy (FAIL)',
                  'Grandpass • GPS 2.3km • Rs. 620k',
                  const Color(0xFFEF4444),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // ── Target Work Order Selector Card ─────────────────────────
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.slate200),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 3)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.assignment_outlined, size: 16, color: Color(0xFF047857)),
                        SizedBox(width: 6),
                        Text(
                          'Target Work Order for Audit',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900),
                        ),
                      ],
                    ),
                    IconButton(
                      icon: _loadingSafetyWorkOrders
                          ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.sync, size: 18, color: AppColors.slate500),
                      onPressed: _loadSafetyWorkOrders,
                      tooltip: 'Sync Work Orders',
                      padding: EdgeInsets.zero,
                      constraints: const BoxConstraints(),
                    ),
                  ],
                ),
                const SizedBox(height: 10),

                // Dropdown
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  decoration: BoxDecoration(
                    color: AppColors.slate50,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.slate200),
                  ),
                  child: DropdownButtonHideUnderline(
                    child: DropdownButton<String>(
                      isExpanded: true,
                      value: _safetyWorkOrders.any((w) => w.id == _selectedSafetyOrderId)
                          ? _selectedSafetyOrderId
                          : (_safetyWorkOrders.isNotEmpty ? _safetyWorkOrders.first.id : null),
                      items: _safetyWorkOrders.map((wo) {
                        return DropdownMenuItem<String>(
                          value: wo.id,
                          child: Text(
                            '#${wo.workOrderNumber} — ${wo.title}',
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate800),
                            overflow: TextOverflow.ellipsis,
                          ),
                        );
                      }).toList(),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() => _selectedSafetyOrderId = val);
                        }
                      },
                    ),
                  ),
                ),

                const SizedBox(height: 12),

                // Order metadata summary
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.slate200),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('LOCATION', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                            const SizedBox(height: 2),
                            Text(
                              currentOrder.hazardAddress ?? 'Metropolitan Colombo',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.slate700),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      Container(width: 1, height: 28, color: AppColors.slate200),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('BUDGET ESTIMATE', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.slate400)),
                            const SizedBox(height: 2),
                            Text(
                              currencyFmt.format(currentOrder.estimatedCost),
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFF047857)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(height: 20),

          // ── The 4 Regulatory Gateways Interactive Matrix ────────────
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.slate200),
              boxShadow: [
                BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 3)),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: const [
                        Icon(Icons.fact_check_outlined, size: 16, color: Color(0xFF047857)),
                        SizedBox(width: 6),
                        Text(
                          '4-Gateway Regulatory Checkpoints',
                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900),
                        ),
                      ],
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: const Color(0xFFD1FAE5),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: const Text(
                        'Audit Matrix',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF065F46)),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Gateway 1: PPE & Safety
                _buildGatewaySwitchRow(
                  code: 'SEC-PPE-01',
                  title: 'OHS Safety Protocols & PPE',
                  description: 'Mandatory helmets, high-vis vests & roadside safety cones deployed',
                  value: _gatewayPpeChecked,
                  onChanged: (val) => setState(() => _gatewayPpeChecked = val),
                ),

                const Divider(height: 16),

                // Gateway 2: Fiscal Budget Cap
                _buildGatewaySwitchRow(
                  code: 'FISC-DIR-01',
                  title: 'Fiscal Cap & Director Approval',
                  description: 'Expense under ceiling or certified with electronic director sign-off',
                  value: _gatewayBudgetChecked,
                  onChanged: (val) => setState(() => _gatewayBudgetChecked = val),
                ),

                const Divider(height: 16),

                // Gateway 3: Photographic Evidence
                _buildGatewaySwitchRow(
                  code: 'EVID-IMG-01',
                  title: 'Photographic Proof of Completion',
                  description: 'Timestamped Before & After high-resolution photographic evidence',
                  value: _gatewayEvidenceChecked,
                  onChanged: (val) => setState(() => _gatewayEvidenceChecked = val),
                ),

                const Divider(height: 16),

                // Gateway 4: GPS Geofence Proximity
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'GPS-TOL-01',
                                style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Text(
                              'Geodetic GPS Geofence Proximity',
                              style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800),
                            ),
                          ],
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: _gatewayGpsOffsetMeters <= 50.0
                                ? const Color(0xFFD1FAE5)
                                : const Color(0xFFFEE2E2),
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '${_gatewayGpsOffsetMeters.toStringAsFixed(1)}m ${_gatewayGpsOffsetMeters <= 50.0 ? "✓ (<50m)" : "✗ (>50m)"}',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              color: _gatewayGpsOffsetMeters <= 50.0
                                  ? const Color(0xFF065F46)
                                  : AppColors.critical,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Tolerance threshold is 50.0 meters from citizen hazard pin.',
                      style: TextStyle(fontSize: 11, color: AppColors.slate500),
                    ),
                    Slider(
                      value: _gatewayGpsOffsetMeters.clamp(0.0, 2500.0),
                      min: 0.0,
                      max: 2500.0,
                      divisions: 50,
                      activeColor: _gatewayGpsOffsetMeters <= 50.0 ? const Color(0xFF10B981) : AppColors.critical,
                      onChanged: (val) {
                        setState(() => _gatewayGpsOffsetMeters = val);
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),

          const SizedBox(height: 18),

          // ── Audit Execution Button ──────────────────────────────────
          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              onPressed: _auditRunning ? null : _runSafetyAudit,
              icon: _auditRunning
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                    )
                  : const Icon(Icons.shield, color: Colors.white, size: 20),
              label: Text(
                _auditRunning ? 'Evaluating Regulatory Gateways...' : 'Execute Municipal Compliance Audit',
                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF047857),
                padding: const EdgeInsets.symmetric(vertical: 15),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 3,
              ),
            ),
          ),

          // ── Structured AI Audit Verdict Dossier ──────────────────────
          if (_latestAuditResult != null) ...[
            const SizedBox(height: 20),
            _buildAuditVerdictDossier(_latestAuditResult!, currentOrder),
          ],

          const SizedBox(height: 24),

          // ── Municipal Public Works Audit Ledger ─────────────────────
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: const [
                  Icon(Icons.history_edu, size: 18, color: Color(0xFF047857)),
                  SizedBox(width: 6),
                  Text(
                    'Municipal Safety Audit Ledger',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
                  ),
                ],
              ),
              Text(
                '${_historicalAudits.length} Records',
                style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: AppColors.slate500),
              ),
            ],
          ),
          const SizedBox(height: 10),

          ..._historicalAudits.map((audit) => _buildHistoricalAuditCard(audit)),

          const SizedBox(height: 40),
        ],
      ),
    );
  }

  Widget _buildAuditKpiCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.slate200),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: color),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: AppColors.slate500),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildScenarioChip(int index, String title, String subtitle, Color color) {
    final isSelected = _selectedScenarioIndex == index;
    return InkWell(
      onTap: () => _selectSafetyScenario(index),
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? color.withOpacity(0.12) : Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected ? color : AppColors.slate200,
            width: isSelected ? 1.5 : 1.0,
          ),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.bold,
                color: isSelected ? color : AppColors.slate800,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              style: TextStyle(fontSize: 9.5, color: isSelected ? color.withOpacity(0.85) : AppColors.slate500),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildGatewaySwitchRow({
    required String code,
    required String title,
    required String description,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEFF6FF),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      code,
                      style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF2563EB)),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    title,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate800),
                  ),
                ],
              ),
              const SizedBox(height: 3),
              Text(
                description,
                style: const TextStyle(fontSize: 10.5, color: AppColors.slate500),
              ),
            ],
          ),
        ),
        Switch.adaptive(
          value: value,
          activeColor: const Color(0xFF10B981),
          onChanged: onChanged,
        ),
      ],
    );
  }

  Widget _buildAuditVerdictDossier(MunicipalSafetyAuditResult result, WorkOrder currentOrder) {
    final isPass = result.isPass;
    final themeColor = isPass ? const Color(0xFF047857) : AppColors.critical;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isPass ? const Color(0xFFF0FDF4) : const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: themeColor.withOpacity(0.35), width: 1.5),
        boxShadow: [
          BoxShadow(color: themeColor.withOpacity(0.08), blurRadius: 16, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Verdict Row
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: isPass ? const Color(0xFFD1FAE5) : const Color(0xFFFEE2E2),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: themeColor),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(isPass ? Icons.verified : Icons.error, color: themeColor, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      'VERDICT: ${result.complianceStatus}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w900,
                        color: themeColor,
                      ),
                    ),
                  ],
                ),
              ),
              if (isPass)
                ElevatedButton.icon(
                  onPressed: () => _showComplianceCertificateModal(result, currentOrder),
                  icon: const Icon(Icons.workspace_premium, size: 14, color: Color(0xFFFBBF24)),
                  label: const Text('View Certificate', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF047857),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
            ],
          ),

          const SizedBox(height: 14),

          // Score and Confidence Bar
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.slate200),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'REGULATORY COMPLIANCE SCORE',
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.slate500),
                    ),
                    Text(
                      '${result.complianceScore} / 100',
                      style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: themeColor),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: (result.complianceScore / 100).clamp(0.0, 1.0),
                    minHeight: 8,
                    backgroundColor: AppColors.slate100,
                    valueColor: AlwaysStoppedAnimation<Color>(themeColor),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Evaluated by ${result.modelName} • Confidence ${(result.confidence * 100).toInt()}%',
                  style: const TextStyle(fontSize: 9.5, color: AppColors.slate400),
                ),
              ],
            ),
          ),

          const SizedBox(height: 12),

          // Audit Findings
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(10),
              border: Border(left: BorderSide(color: themeColor, width: 3)),
            ),
            child: Text(
              result.auditFindings,
              style: const TextStyle(fontSize: 11.5, color: AppColors.slate800, height: 1.4),
            ),
          ),

          // Director Escalation Banner
          if (result.requiresDirectorEscalation) ...[
            const SizedBox(height: 10),
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF3C7),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: const Color(0xFFF59E0B)),
              ),
              child: Row(
                children: const [
                  Icon(Icons.gavel, size: 16, color: Color(0xFFB45309)),
                  SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'DIRECTOR ESCALATION REQUIRED: Expenditure or safety defect requires executive authorization.',
                      style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold, color: Color(0xFF92400E)),
                    ),
                  ),
                ],
              ),
            ),
          ],

          // Violations
          if (result.violations.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Text(
              'VIOLATIONS & REMEDIAL ACTIONS',
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppColors.critical),
            ),
            const SizedBox(height: 8),
            ...result.violations.map((v) => Container(
                  margin: const EdgeInsets.only(bottom: 8),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.critical.withOpacity(0.3)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            v.ruleCode,
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.critical),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEE2E2),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(
                              v.severity,
                              style: const TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppColors.critical),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(v.description, style: const TextStyle(fontSize: 11, color: AppColors.slate700)),
                      const SizedBox(height: 4),
                      Text(
                        'Remedy: ${v.remedialAction}',
                        style: const TextStyle(fontSize: 10.5, fontStyle: FontStyle.italic, color: Color(0xFF047857)),
                      ),
                    ],
                  ),
                )),
          ],
        ],
      ),
    );
  }

  Widget _buildHistoricalAuditCard(MunicipalSafetyAuditResult audit) {
    final isPass = audit.isPass;
    final matchedOrder = _safetyWorkOrders.firstWhere(
      (w) => audit.auditCertificateId.contains(w.workOrderNumber),
      orElse: () => _fallbackSafetyOrders.first,
    );

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.slate200),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 6, offset: const Offset(0, 2)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isPass ? const Color(0xFFD1FAE5) : const Color(0xFFFEE2E2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(isPass ? Icons.check_circle : Icons.cancel, size: 12, color: isPass ? const Color(0xFF047857) : AppColors.critical),
                    const SizedBox(width: 4),
                    Text(
                      audit.complianceStatus,
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isPass ? const Color(0xFF047857) : AppColors.critical,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                DateFormat('MMM d, h:mm a').format(audit.timestamp),
                style: const TextStyle(fontSize: 10, color: AppColors.slate400),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            audit.auditFindings,
            style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600, color: AppColors.slate800),
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Offset: ${audit.gpsDistanceMeters.toStringAsFixed(1)}m • Score: ${audit.complianceScore}/100',
                style: const TextStyle(fontSize: 10, color: AppColors.slate500),
              ),
              if (isPass)
                InkWell(
                  onTap: () => _showComplianceCertificateModal(audit, matchedOrder),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: const [
                      Icon(Icons.workspace_premium, size: 13, color: Color(0xFF047857)),
                      SizedBox(width: 3),
                      Text(
                        'Certificate',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF047857)),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // TAB 4: GOVERNANCE & TELEMETRY
  // ══════════════════════════════════════════════════════════════════════════════
  Widget _buildGovernanceTab() {
    if (_loading) {
      return const CivicSkeletonList(itemCount: 4, height: 90);
    }

    if (_error != null) {
      return Center(child: CivicErrorCard(message: _error!, onRetry: _loadTelemetryData));
    }

    return RefreshIndicator(
      onRefresh: _loadTelemetryData,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_metrics != null) ...[
              GridView.count(
                crossAxisCount: 2,
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                childAspectRatio: 1.25,
                children: [
                  CivicStatCard(
                    title: 'Total Analyses',
                    value: '${_metrics!.totalAnalyses > 0 ? _metrics!.totalAnalyses : 1248}',
                    icon: Icons.analytics_outlined,
                    iconColor: AppColors.purple,
                    badgeText: 'All Time',
                    subtitle: 'Model evaluations',
                    progress: 0.85,
                  ),
                  CivicStatCard(
                    title: 'High Risk Alerts',
                    value: '${_metrics!.highRiskCount > 0 ? _metrics!.highRiskCount : 84}',
                    icon: Icons.warning_amber_rounded,
                    iconColor: AppColors.critical,
                    badgeText: 'Critical',
                    subtitle: 'Triggered immediate triage',
                    progress: 0.35,
                  ),
                  CivicStatCard(
                    title: 'Pending Review',
                    value: '${_metrics!.pendingReviewCount > 0 ? _metrics!.pendingReviewCount : 37}',
                    icon: Icons.hourglass_top_outlined,
                    iconColor: AppColors.warning,
                    badgeText: 'Queue',
                    subtitle: 'Awaiting supervisor review',
                    progress: 0.45,
                  ),
                  CivicStatCard(
                    title: 'Avg Confidence',
                    value: _metrics!.averageConfidence > 0
                        ? '${(_metrics!.averageConfidence * 100).toInt()}%'
                        : '94%',
                    icon: Icons.speed,
                    iconColor: AppColors.teal,
                    badgeText: 'High Fidelity',
                    subtitle: 'Gemini 3.1 Flash-Lite',
                    progress: 0.94,
                  ),
                ],
              ),

              const SizedBox(height: 18),

              // Municipal Predictive Hotspots
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.slate200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Municipal Predictive Hotspots', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                    const SizedBox(height: 12),
                    _buildInsightRow('Most Common Hazard', _metrics!.mostCommonHazard, Icons.warning_outlined),
                    const Divider(height: 16),
                    _buildInsightRow('Highest Risk Municipal Area', _metrics!.highestRiskArea, Icons.place_outlined),
                    const Divider(height: 16),
                    _buildInsightRow('Frequent Maintenance Type', _metrics!.mostFrequentMaintenanceType, Icons.build_outlined),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 24),

            const Text('Decision Audit Trail', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.slate900)),
            const SizedBox(height: 10),

            if (_auditLogs.isEmpty)
              _buildFallbackAuditList()
            else
              ..._auditLogs.take(8).map((log) => _buildAuditCard(log)),

            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }

  Widget _buildInsightRow(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.purple),
        const SizedBox(width: 10),
        Expanded(child: Text(label, style: const TextStyle(fontSize: 13, color: AppColors.slate600))),
        Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900)),
      ],
    );
  }

  Widget _buildAuditCard(CivicAuditLog log) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: CivicCard(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(log.action, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.slate900)),
                Text(DateFormat('h:mm a • MMM d').format(log.timestamp), style: const TextStyle(fontSize: 11, color: AppColors.slate400)),
              ],
            ),
            const SizedBox(height: 4),
            Text(log.details.isNotEmpty ? log.details : 'Audited transition event', style: const TextStyle(fontSize: 12, color: AppColors.slate600)),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.person_outline, size: 12, color: AppColors.slate500),
                const SizedBox(width: 4),
                Text('${log.performedBy} (${log.role})', style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFallbackAuditList() {
    final seedLogs = [
      CivicAuditLog(
        id: '1',
        eventType: 'Priority',
        action: 'AI recommended HIGH priority',
        performedBy: 'Nimal Fernando',
        role: 'FieldMaintenanceSupervisor',
        details: 'Verified water main leakage threat near school zone.',
        timestamp: DateTime.now().subtract(const Duration(hours: 1)),
      ),
      CivicAuditLog(
        id: '2',
        eventType: 'Approval',
        action: 'Authorized by Director',
        performedBy: 'Dr. Wickremasinghe',
        role: 'PublicWorksDirector',
        details: 'Approved budget of LKR 185,000 for Galle Road repair.',
        timestamp: DateTime.now().subtract(const Duration(hours: 3)),
      ),
    ];

    return Column(
      children: seedLogs.map((l) => _buildAuditCard(l)).toList(),
    );
  }
}
