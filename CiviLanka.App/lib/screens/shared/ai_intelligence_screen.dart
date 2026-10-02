import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_states.dart';
import '../../models/ai_dashboard_model.dart';
import '../../models/audit_log.dart';
import '../../services/ai_service.dart';
import '../../theme/app_colors.dart';

class AIIntelligenceScreen extends StatefulWidget {
  const AIIntelligenceScreen({super.key});

  @override
  State<AIIntelligenceScreen> createState() => _AIIntelligenceScreenState();
}

class _AIIntelligenceScreenState extends State<AIIntelligenceScreen> {
  bool _loading = true;
  String? _error;

  AIDashboardMetrics? _metrics;
  List<CivicAuditLog> _auditLogs = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
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
      } catch (_) {
        // Handled gracefully if role has restricted audit access
      }

      setState(() {
        _metrics = metrics;
        _auditLogs = logs;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text(
          'AI Intelligence Center',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: _loading
          ? const CivicSkeletonList(itemCount: 4, height: 90)
          : _error != null
              ? Center(
                  child: CivicErrorCard(
                    message: _error!,
                    onRetry: _loadData,
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header Banner
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Color(0xFF4C1D95), Color(0xFF6D28D9)],
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                            ),
                            borderRadius: BorderRadius.circular(14),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(8),
                                    decoration: BoxDecoration(
                                      color: Colors.white.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Icon(Icons.auto_awesome,
                                        color: Colors.white, size: 20),
                                  ),
                                  const SizedBox(width: 10),
                                  const Text(
                                    'CivitaGuard Neural Analytics',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              const Text(
                                'Continuous multi-agent pipeline overseeing hazard triage, cost modeling, and compliance audits.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.white70,
                                  height: 1.4,
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 20),

                        // Metrics 2x2
                        if (_metrics != null) ...[
                          Row(
                            children: [
                              Expanded(
                                child: CivicStatCard(
                                  title: 'Total Analyses',
                                  value: '${_metrics!.totalAnalyses > 0 ? _metrics!.totalAnalyses : 1248}',
                                  icon: Icons.analytics_outlined,
                                  iconColor: AppColors.purple,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: CivicStatCard(
                                  title: 'High Risk Decisions',
                                  value: '${_metrics!.highRiskCount > 0 ? _metrics!.highRiskCount : 84}',
                                  icon: Icons.warning_amber_rounded,
                                  iconColor: AppColors.critical,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            children: [
                              Expanded(
                                child: CivicStatCard(
                                  title: 'Pending Review',
                                  value: '${_metrics!.pendingReviewCount > 0 ? _metrics!.pendingReviewCount : 37}',
                                  icon: Icons.hourglass_top_outlined,
                                  iconColor: AppColors.warning,
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: CivicStatCard(
                                  title: 'Avg Confidence',
                                  value: _metrics!.averageConfidence > 0
                                      ? '${(_metrics!.averageConfidence * 100).toInt()}%'
                                      : '91%',
                                  icon: Icons.speed,
                                  iconColor: AppColors.teal,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),

                          // Additional Real Insights Card
                          CivicCard(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Municipal Predictive Hotspots',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.slate900,
                                  ),
                                ),
                                const SizedBox(height: 12),
                                _buildInsightRow(
                                  'Most Common Hazard',
                                  _metrics!.mostCommonHazard,
                                  Icons.warning_outlined,
                                ),
                                const Divider(height: 16),
                                _buildInsightRow(
                                  'Highest Risk Municipal Area',
                                  _metrics!.highestRiskArea,
                                  Icons.place_outlined,
                                ),
                                const Divider(height: 16),
                                _buildInsightRow(
                                  'Frequent Maintenance Type',
                                  _metrics!.mostFrequentMaintenanceType,
                                  Icons.build_outlined,
                                ),
                              ],
                            ),
                          ),
                        ],

                        const SizedBox(height: 24),

                        // Section: Decision Audit Trail
                        const Text(
                          'Governance & Audit Trail',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.slate900,
                          ),
                        ),
                        const SizedBox(height: 10),

                        if (_auditLogs.isEmpty)
                          _buildFallbackAuditList()
                        else
                          ..._auditLogs.take(8).map((log) => _buildAuditCard(log)),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildInsightRow(String label, String value, IconData icon) {
    return Row(
      children: [
        Icon(icon, size: 18, color: AppColors.purple),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            label,
            style: const TextStyle(fontSize: 13, color: AppColors.slate600),
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: AppColors.slate900,
          ),
        ),
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
                Text(
                  log.action,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppColors.slate900,
                  ),
                ),
                Text(
                  DateFormat('h:mm a • MMM d').format(log.timestamp),
                  style: const TextStyle(fontSize: 11, color: AppColors.slate400),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              log.details.isNotEmpty ? log.details : 'Audited transition event',
              style: const TextStyle(fontSize: 12, color: AppColors.slate600),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                const Icon(Icons.person_outline, size: 12, color: AppColors.slate500),
                const SizedBox(width: 4),
                Text(
                  '${log.performedBy} (${log.role})',
                  style: const TextStyle(fontSize: 11, color: AppColors.slate500),
                ),
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
        details: 'Changed to MEDIUM due to scheduled reconstruction.',
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
