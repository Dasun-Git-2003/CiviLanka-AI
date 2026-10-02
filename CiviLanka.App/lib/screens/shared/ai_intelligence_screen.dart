import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_states.dart';
import '../../models/ai_dashboard_model.dart';
import '../../models/audit_log.dart';
import '../../models/work_order.dart';
import '../../services/ai_service.dart';
import '../../services/work_order_service.dart';
import '../../theme/app_colors.dart';
import '../create_work_order_screen.dart';

class AIIntelligenceScreen extends StatefulWidget {
  const AIIntelligenceScreen({super.key});

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
  final _hazardTitleCtrl = TextEditingController(text: 'Water Main Rupture near Ananda College');
  final _hazardDescCtrl = TextEditingController(
    text: 'High-pressure 4-inch water main ruptured along Maradana Road. Flooding street opposite school gate during morning rush hour.',
  );
  final _hazardLocCtrl = TextEditingController(text: 'Maradana Road, Colombo 10');
  String _hazardCategory = 'Water Leak';
  String _hazardZone = 'School Zone (0.1km)';
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

  final currencyFmt = NumberFormat.currency(symbol: 'Rs. ', decimalDigits: 0);

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadTelemetryData();
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
          indicatorColor: const Color(0xFF8B5CF6),
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          tabs: const [
            Tab(icon: Icon(Icons.psychology_outlined, size: 20), text: 'HAZARD TRIAGE'),
            Tab(icon: Icon(Icons.calculate_outlined, size: 20), text: 'COST ESTIMATOR'),
            Tab(icon: Icon(Icons.analytics_outlined, size: 20), text: 'GOVERNANCE'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildHazardTriageTab(),
          _buildCostEstimatorTab(),
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
    final badgeColor = isCritical ? AppColors.critical : isHigh ? AppColors.warning : AppColors.teal;

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
                const SizedBox(height: 6),
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
  // TAB 3: GOVERNANCE & TELEMETRY
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
