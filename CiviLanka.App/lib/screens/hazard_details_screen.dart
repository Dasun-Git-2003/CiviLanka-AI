import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/hazard.dart';
import '../services/hazard_service.dart';

class HazardDetailsScreen extends StatefulWidget {
  final String hazardId;
  const HazardDetailsScreen({super.key, required this.hazardId});

  @override
  State<HazardDetailsScreen> createState() => _HazardDetailsScreenState();
}

class _HazardDetailsScreenState extends State<HazardDetailsScreen> {
  Hazard? _hazard;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final h = await context
          .read<HazardService>()
          .getHazardById(widget.hazardId);
      if (mounted) setState(() { _hazard = h; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _confirmCancel() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Cancel Report?'),
        content: const Text(
            'Are you sure you want to cancel this hazard report? This action cannot be undone.'),
        actions: [
          TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Keep')),
          TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Cancel Report',
                  style: TextStyle(color: Colors.red))),
        ],
      ),
    );

    if (confirm == true && mounted) {
      try {
        await context
            .read<HazardService>()
            .cancelHazard(widget.hazardId);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
                content: Text('Report cancelled.'),
                backgroundColor: Colors.orange),
          );
          Navigator.pop(context);
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Error: $e')));
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_loading) {
      return const Scaffold(
          appBar: null,
          body: Center(child: CircularProgressIndicator()));
    }

    if (_error != null || _hazard == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Hazard Details')),
        body: Center(
            child: Text(_error ?? 'Not found',
                style: const TextStyle(color: Colors.red))),
      );
    }

    final h = _hazard!;
    final canEdit = h.status == 'Submitted' || h.status == 'PendingAIAnalysis';
    final fmt = DateFormat('dd MMM yyyy, h:mm a');

    return Scaffold(
      appBar: AppBar(
        title: Text(h.ticketNumber),
        actions: [
          if (canEdit)
            IconButton(
              icon: const Icon(Icons.cancel_outlined),
              tooltip: 'Cancel Report',
              color: Colors.white,
              onPressed: _confirmCancel,
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Status badge
              Row(
                children: [
                  _StatusChip(status: h.status),
                  const SizedBox(width: 8),
                  if (h.priority != null)
                    _PriorityChip(priority: h.priority!),
                ],
              ),
              const SizedBox(height: 20),

              // Image
              if (h.imageUrl != null)
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.network(
                    'http://10.0.2.2:5000${h.imageUrl}',
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 120,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade200,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Center(
                          child: Icon(Icons.broken_image_outlined,
                              size: 48, color: Colors.grey)),
                    ),
                  ),
                ),

              if (h.imageUrl != null) const SizedBox(height: 20),

              // Details
              _DetailRow('Category', HazardCategory.displayName(h.category)),
              _DetailRow('Description', h.description),
              if (h.address != null)
                _DetailRow('Address', h.address!),
              if (h.latitude != null)
                _DetailRow('Coordinates',
                    '${h.latitude!.toStringAsFixed(5)}, ${h.longitude!.toStringAsFixed(5)}'),
              _DetailRow('Submitted', fmt.format(h.createdAt.toLocal())),
              _DetailRow('Last Updated', fmt.format(h.updatedAt.toLocal())),
              if (h.severity != null) _DetailRow('Severity', h.severity!),
              if (h.riskLevel != null) _DetailRow('Risk Level', h.riskLevel!),

              // AI Assessment
              if (h.latestAIAnalysis != null) ..._buildAISection(h, theme),

              const SizedBox(height: 40),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildAISection(Hazard h, ThemeData theme) {
    final ai = h.latestAIAnalysis!;
    return [
      const SizedBox(height: 24),
      const Divider(),
      const SizedBox(height: 16),
      Row(
        children: [
          Icon(Icons.psychology_outlined,
              color: theme.colorScheme.primary),
          const SizedBox(width: 8),
          Text('AI Assessment',
              style: theme.textTheme.titleLarge
                  ?.copyWith(fontWeight: FontWeight.bold)),
        ],
      ),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [
              theme.colorScheme.primary.withOpacity(0.05),
              theme.colorScheme.primary.withOpacity(0.02),
            ],
          ),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
              color: theme.colorScheme.primary.withOpacity(0.2)),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _AIMetric('Severity', ai.severity, _severityColor(ai.severity)),
                _AIMetric('Risk', ai.riskLevel, _severityColor(ai.riskLevel)),
                _AIMetric('Priority', ai.priority, _priorityColor(ai.priority)),
              ],
            ),
            const SizedBox(height: 16),
            Text('Confidence: ${(ai.confidence * 100).toStringAsFixed(0)}%',
                style: const TextStyle(
                    fontWeight: FontWeight.w500, fontSize: 13)),
            const SizedBox(height: 10),
            const Text('Assessment Reason:',
                style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Text(ai.reason,
                style: const TextStyle(
                    fontSize: 14, height: 1.5)),
            const SizedBox(height: 8),
            Text('Model: ${ai.modelName}',
                style: const TextStyle(
                    fontSize: 11, color: Colors.grey)),
          ],
        ),
      ),
    ];
  }

  Color _severityColor(String level) {
    switch (level.toUpperCase()) {
      case 'CRITICAL':
        return Colors.red[900]!;
      case 'HIGH':
        return Colors.red;
      case 'MEDIUM':
        return Colors.orange;
      default:
        return Colors.green;
    }
  }

  Color _priorityColor(String p) {
    switch (p.toUpperCase()) {
      case 'URGENT':
        return Colors.red;
      case 'HIGH':
        return Colors.orange;
      case 'NORMAL':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  const _DetailRow(this.label, this.value);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 110,
            child: Text(label,
                style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    color: Colors.grey,
                    fontSize: 13)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontSize: 14)),
          ),
        ],
      ),
    );
  }
}

class _AIMetric extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  const _AIMetric(this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label,
            style: const TextStyle(fontSize: 11, color: Colors.grey)),
        const SizedBox(height: 4),
        Container(
          padding:
              const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: color.withOpacity(0.12),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Text(value,
              style: TextStyle(
                  color: color,
                  fontWeight: FontWeight.bold,
                  fontSize: 13)),
        ),
      ],
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;
  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    Color bg;
    switch (status) {
      case 'Submitted':
      case 'PendingAIAnalysis':
        bg = Colors.orange;
        break;
      case 'AnalysisComplete':
      case 'UnderReview':
        bg = Colors.blue;
        break;
      case 'InProgress':
        bg = Colors.purple;
        break;
      case 'Resolved':
        bg = Colors.green;
        break;
      default:
        bg = Colors.grey;
    }
    return Chip(
      label: Text(status,
          style: const TextStyle(
              color: Colors.white, fontSize: 12)),
      backgroundColor: bg,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      padding: const EdgeInsets.symmetric(horizontal: 4),
    );
  }
}

class _PriorityChip extends StatelessWidget {
  final String priority;
  const _PriorityChip({required this.priority});

  @override
  Widget build(BuildContext context) {
    Color bg;
    switch (priority.toUpperCase()) {
      case 'URGENT':
        bg = Colors.red;
        break;
      case 'HIGH':
        bg = Colors.orange;
        break;
      case 'NORMAL':
        bg = Colors.blue;
        break;
      default:
        bg = Colors.grey;
    }
    return Chip(
      label: Text(priority,
          style: const TextStyle(
              color: Colors.white, fontSize: 12)),
      backgroundColor: bg,
      materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
      padding: const EdgeInsets.symmetric(horizontal: 4),
    );
  }
}
