import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_constants.dart';
import '../../core/widgets/civic_badge.dart';
import '../../core/widgets/civic_button.dart';
import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_states.dart';
import '../../models/hazard.dart';
import '../../services/ai_service.dart';
import '../../services/hazard_service.dart';
import '../../theme/app_colors.dart';

class HazardDetailsScreen extends StatefulWidget {
  final String hazardId;

  const HazardDetailsScreen({super.key, required this.hazardId});

  @override
  State<HazardDetailsScreen> createState() => _HazardDetailsScreenState();
}

class _HazardDetailsScreenState extends State<HazardDetailsScreen> {
  Hazard? _hazard;
  HazardAIAnalysis? _aiAnalysis;
  bool _loading = true;
  String? _error;
  bool _analyzingAI = false;

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

    final hazardService = context.read<HazardService>();
    final aiService = context.read<AIService>();

    try {
      final hazard = await hazardService.getHazardById(widget.hazardId);
      HazardAIAnalysis? analysis;
      try {
        analysis = await aiService.getHazardAnalysis(widget.hazardId);
      } catch (_) {
        analysis = hazard.aiAnalysis;
      }

      setState(() {
        _hazard = hazard;
        _aiAnalysis = analysis ?? hazard.aiAnalysis;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _triggerAIAnalysis() async {
    setState(() => _analyzingAI = true);
    try {
      final result =
          await context.read<AIService>().analyzeHazard(widget.hazardId);
      if (result != null) {
        setState(() => _aiAnalysis = result);
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('AI analysis updated successfully!'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('AI Analysis: $e'),
            backgroundColor: AppColors.critical,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _analyzingAI = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Incident Details')),
        body: const CivicSkeletonList(itemCount: 4, height: 90),
      );
    }

    if (_error != null || _hazard == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Incident Details')),
        body: Center(
          child: CivicErrorCard(
            message: _error ?? 'Incident report not found.',
            onRetry: _loadData,
          ),
        ),
      );
    }

    final h = _hazard!;

    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              h.ticketNumber.isNotEmpty ? h.ticketNumber : 'Incident Details',
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
            ),
            Text(
              h.category,
              style: const TextStyle(fontSize: 11, color: AppColors.slate500),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header Card
            CivicCard(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      CivicPriorityBadge(priority: h.priority),
                      CivicStatusBadge(status: h.status),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    h.title,
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: AppColors.slate900,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    h.description,
                    style: const TextStyle(
                      fontSize: 14,
                      color: AppColors.slate600,
                      height: 1.4,
                    ),
                  ),
                  const SizedBox(height: 12),
                  const Divider(height: 1),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      const Icon(Icons.location_on_outlined,
                          size: 16, color: AppColors.primary),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          h.locationAddress,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.slate700,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (h.latitude != 0.0 && h.longitude != 0.0) ...[
                    const SizedBox(height: 4),
                    Padding(
                      padding: const EdgeInsets.only(left: 22),
                      child: Text(
                        'Coordinates: ${h.latitude.toStringAsFixed(4)}, ${h.longitude.toStringAsFixed(4)}',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.slate400,
                          fontFamily: 'monospace',
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 10),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Reported: ${DateFormat('MMM dd, yyyy • h:mm a').format(h.createdAt)}',
                        style: const TextStyle(
                          fontSize: 11,
                          color: AppColors.slate500,
                        ),
                      ),
                      Text(
                        'Severity: ${h.severity}',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: h.isCritical
                              ? AppColors.critical
                              : AppColors.slate700,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            if (h.imageUrl != null && h.imageUrl!.isNotEmpty) ...[
              const SizedBox(height: 16),
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  h.imageUrl!.startsWith('http')
                      ? h.imageUrl!
                      : '${ApiConstants.defaultBaseUrl}${h.imageUrl}',
                  height: 200,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    height: 140,
                    color: AppColors.slate200,
                    alignment: Alignment.center,
                    child: const Text('Image unavailable'),
                  ),
                ),
              ),
            ],

            const SizedBox(height: 20),

            // AI Assessment Section
            _buildAIAssessmentSection(),

            const SizedBox(height: 20),

            // Municipal Progress Timeline
            _buildTimelineSection(h.status),
          ],
        ),
      ),
    );
  }

  Widget _buildAIAssessmentSection() {
    if (_aiAnalysis == null) {
      return CivicCard(
        padding: const EdgeInsets.all(16),
        backgroundColor: Colors.white,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.auto_awesome, color: AppColors.purple, size: 20),
                const SizedBox(width: 8),
                const Text(
                  'AI Incident Assessment',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.slate900,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            const Text(
              'Deep multimodal classification is queued for this incident.',
              style: TextStyle(fontSize: 13, color: AppColors.slate600),
            ),
            const SizedBox(height: 14),
            CivicButton(
              label: 'Trigger AI Analysis',
              icon: Icons.play_arrow_outlined,
              isLoading: _analyzingAI,
              onPressed: _triggerAIAnalysis,
              type: CivicButtonType.outline,
              height: 40,
            ),
          ],
        ),
      );
    }

    final ai = _aiAnalysis!;

    return CivicCard(
      padding: const EdgeInsets.all(16),
      borderColor: AppColors.purple.withValues(alpha: 0.3),
      backgroundColor: Colors.white,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: AppColors.purple.withValues(alpha: 0.12),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Icon(Icons.auto_awesome,
                        size: 16, color: AppColors.purple),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'AI Assessment',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.slate900,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.purple.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  '${(ai.confidenceScore * 100).toInt()}% Confidence',
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: AppColors.purple,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Metric Badges
          Row(
            children: [
              Expanded(
                child: _buildMetricTile(
                  'SEVERITY',
                  ai.severity ?? 'MEDIUM',
                  (ai.severity ?? '').toUpperCase() == 'CRITICAL' ||
                          (ai.severity ?? '').toUpperCase() == 'HIGH'
                      ? AppColors.critical
                      : AppColors.warning,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  'RISK',
                  ai.riskLevel,
                  ai.riskLevel.toUpperCase() == 'CRITICAL' ||
                          ai.riskLevel.toUpperCase() == 'HIGH'
                      ? AppColors.critical
                      : AppColors.warning,
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: _buildMetricTile(
                  'PRIORITY',
                  ai.suggestedPriority,
                  AppColors.info,
                ),
              ),
            ],
          ),

          if (ai.recommendedAction.isNotEmpty) ...[
            const SizedBox(height: 14),
            const Text(
              'Recommended Action',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppColors.slate700,
              ),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.all(10),
              width: double.infinity,
              decoration: BoxDecoration(
                color: AppColors.slate100,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                ai.recommendedAction,
                style: const TextStyle(fontSize: 12, color: AppColors.slate800),
              ),
            ),
          ],

          if (ai.aiExplanation.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text(
              'AI Reasoning',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: AppColors.slate700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              ai.aiExplanation,
              style: const TextStyle(fontSize: 12, color: AppColors.slate600, height: 1.35),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildMetricTile(String label, String value, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Column(
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value.toUpperCase(),
            style: TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineSection(String currentStatus) {
    final stages = [
      'Submitted',
      'AI Analyzed',
      'Reviewed',
      'Work Order Created',
      'Assigned',
      'Completed',
    ];

    int activeIndex = 0;
    final s = currentStatus.toUpperCase().replaceAll('_', '');

    if (s == 'COMPLETED' || s == 'VERIFIED' || s == 'RESOLVED') {
      activeIndex = 5;
    } else if (s == 'ASSIGNED' || s == 'SCHEDULED') {
      activeIndex = 4;
    } else if (s == 'WORKORDERCREATED' || s == 'INPROGRESS') {
      activeIndex = 3;
    } else if (s == 'REVIEWED' || s == 'APPROVED') {
      activeIndex = 2;
    } else if (_aiAnalysis != null) {
      activeIndex = 1;
    }

    return CivicCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Resolution Progress',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: AppColors.slate900,
            ),
          ),
          const SizedBox(height: 16),
          Column(
            children: List.generate(stages.length, (idx) {
              final isPassed = idx <= activeIndex;
              final isCurrent = idx == activeIndex;

              return Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Column(
                    children: [
                      Container(
                        width: 22,
                        height: 22,
                        decoration: BoxDecoration(
                          color: isPassed ? AppColors.primary : AppColors.slate200,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          isPassed ? Icons.check : Icons.circle,
                          size: isPassed ? 14 : 8,
                          color: isPassed ? Colors.white : AppColors.slate400,
                        ),
                      ),
                      if (idx < stages.length - 1)
                        Container(
                          width: 2,
                          height: 24,
                          color: idx < activeIndex
                              ? AppColors.primary
                              : AppColors.slate200,
                        ),
                    ],
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        stages[idx],
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight:
                              isCurrent ? FontWeight.bold : FontWeight.w500,
                          color: isPassed ? AppColors.slate900 : AppColors.slate400,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            }),
          ),
        ],
      ),
    );
  }
}
