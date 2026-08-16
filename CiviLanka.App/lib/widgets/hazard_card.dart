import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/hazard.dart';

class HazardCard extends StatelessWidget {
  final Hazard hazard;
  final VoidCallback? onTap;

  const HazardCard({super.key, required this.hazard, this.onTap});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final fmt = DateFormat('dd MMM yyyy');

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      hazard.ticketNumber,
                      style: theme.textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: theme.colorScheme.primary,
                      ),
                    ),
                  ),
                  _StatusBadge(status: hazard.status),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(Icons.category_outlined,
                      size: 14, color: Colors.grey[500]),
                  const SizedBox(width: 4),
                  Text(
                    HazardCategory.displayName(hazard.category),
                    style: TextStyle(
                        fontSize: 13, color: Colors.grey[700]),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                hazard.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 13),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  if (hazard.priority != null) ..._buildPriorityBadge(hazard.priority!),
                  if (hazard.severity != null && hazard.priority != null)
                    const SizedBox(width: 8),
                  if (hazard.severity != null) ..._buildSeverityBadge(hazard.severity!),
                  const Spacer(),
                  Icon(Icons.access_time,
                      size: 12, color: Colors.grey[400]),
                  const SizedBox(width: 4),
                  Text(
                    fmt.format(hazard.createdAt),
                    style: TextStyle(
                        fontSize: 11, color: Colors.grey[400]),
                  ),
                ],
              ),
              if (hazard.latestAIAnalysis != null) ..._buildAISnippet(hazard.latestAIAnalysis!),
            ],
          ),
        ),
      ),
    );
  }

  List<Widget> _buildPriorityBadge(String priority) {
    final color = priority == 'URGENT'
        ? Colors.red
        : priority == 'HIGH'
            ? Colors.orange
            : Colors.blue;
    return [
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(priority,
            style: TextStyle(
                fontSize: 11,
                color: color,
                fontWeight: FontWeight.bold)),
      )
    ];
  }

  List<Widget> _buildSeverityBadge(String severity) {
    final color = severity == 'CRITICAL'
        ? Colors.red[900]!
        : severity == 'HIGH'
            ? Colors.red
            : severity == 'MEDIUM'
                ? Colors.orange
                : Colors.green;
    return [
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
        decoration: BoxDecoration(
          color: color.withOpacity(0.12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(severity,
            style: TextStyle(
                fontSize: 11,
                color: color,
                fontWeight: FontWeight.bold)),
      )
    ];
  }

  List<Widget> _buildAISnippet(HazardAIAnalysis ai) => [
    const SizedBox(height: 8),
    const Divider(height: 1),
    const SizedBox(height: 8),
    Row(
      children: [
        const Icon(Icons.psychology_outlined, size: 14, color: Colors.teal),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            ai.reason,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 11, color: Colors.teal),
          ),
        ),
      ],
    ),
  ];
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    String label;
    switch (status) {
      case 'Submitted':
        color = Colors.blue.shade300;
        label = 'Submitted';
        break;
      case 'PendingAIAnalysis':
        color = Colors.orange;
        label = 'Analyzing...';
        break;
      case 'AnalysisComplete':
        color = Colors.teal;
        label = 'Analyzed';
        break;
      case 'UnderReview':
        color = Colors.purple;
        label = 'Under Review';
        break;
      case 'InProgress':
        color = Colors.indigo;
        label = 'In Progress';
        break;
      case 'Resolved':
        color = Colors.green;
        label = 'Resolved';
        break;
      case 'Cancelled':
        color = Colors.grey;
        label = 'Cancelled';
        break;
      default:
        color = Colors.grey;
        label = status;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(label,
          style: TextStyle(
              fontSize: 11, color: color, fontWeight: FontWeight.bold)),
    );
  }
}
