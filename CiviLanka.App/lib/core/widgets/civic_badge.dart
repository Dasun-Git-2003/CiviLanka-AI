import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

class CivicStatusBadge extends StatelessWidget {
  final String status;
  final double fontSize;

  const CivicStatusBadge({super.key, required this.status, this.fontSize = 11});

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    Color border;

    final s = status.toUpperCase().replaceAll('_', '');

    if (s == 'COMPLETED' ||
        s == 'VERIFIED' ||
        s == 'RESOLVED' ||
        s == 'APPROVED') {
      bg = AppColors.success.withValues(alpha: 0.1);
      fg = AppColors.success;
      border = AppColors.success.withValues(alpha: 0.25);
    } else if (s == 'INPROGRESS' || s == 'ASSIGNED' || s == 'SCHEDULED') {
      bg = AppColors.info.withValues(alpha: 0.1);
      fg = AppColors.info;
      border = AppColors.info.withValues(alpha: 0.25);
    } else if (s == 'PENDINGAPPROVAL' ||
        s == 'PENDING' ||
        s == 'AIGENERATED' ||
        s == 'SUBMITTED') {
      bg = AppColors.warning.withValues(alpha: 0.1);
      fg = const Color(0xFFD97706); // amber-600
      border = AppColors.warning.withValues(alpha: 0.25);
    } else if (s == 'CANCELLED' || s == 'REJECTED' || s == 'CRITICAL') {
      bg = AppColors.critical.withValues(alpha: 0.1);
      fg = AppColors.critical;
      border = AppColors.critical.withValues(alpha: 0.25);
    } else {
      bg = AppColors.slate100;
      fg = AppColors.slate700;
      border = AppColors.slate300;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: border, width: 0.8),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(
          fontSize: fontSize,
          fontWeight: FontWeight.w600,
          color: fg,
        ),
      ),
    );
  }
}

class CivicPriorityBadge extends StatelessWidget {
  final String priority;

  const CivicPriorityBadge({super.key, required this.priority});

  @override
  Widget build(BuildContext context) {
    Color color;
    IconData icon;

    switch (priority.toUpperCase()) {
      case 'CRITICAL':
      case 'URGENT':
        color = AppColors.critical;
        icon = Icons.error_outline;
        break;
      case 'HIGH':
        color = const Color(0xFFEA580C); // orange-600
        icon = Icons.warning_amber_rounded;
        break;
      case 'NORMAL':
      case 'MEDIUM':
        color = AppColors.info;
        icon = Icons.info_outline;
        break;
      case 'LOW':
      default:
        color = AppColors.success;
        icon = Icons.check_circle_outline;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.25), width: 0.8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            priority.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
