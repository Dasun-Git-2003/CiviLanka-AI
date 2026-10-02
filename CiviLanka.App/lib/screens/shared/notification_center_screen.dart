import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_states.dart';
import '../../models/notification_model.dart';
import '../../services/notification_service.dart';
import '../../theme/app_colors.dart';

class NotificationCenterScreen extends StatefulWidget {
  const NotificationCenterScreen({super.key});

  @override
  State<NotificationCenterScreen> createState() =>
      _NotificationCenterScreenState();
}

class _NotificationCenterScreenState extends State<NotificationCenterScreen> {
  String _selectedCategory = 'All';
  final List<String> _categories = [
    'All',
    'Alerts',
    'Work Orders',
    'AI',
    'Maintenance',
    'System',
  ];

  @override
  Widget build(BuildContext context) {
    final notifService = context.watch<NotificationService>();
    final notifications = notifService.getByCategory(_selectedCategory);

    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text(
          'Notifications',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          if (notifService.unreadCount > 0)
            TextButton(
              onPressed: () => notifService.markAllAsRead(),
              child: const Text('Mark all as read',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
            ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: _categories.map((cat) {
                final isSelected = _selectedCategory == cat;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(cat),
                    selected: isSelected,
                    selectedColor: AppColors.primary.withValues(alpha: 0.15),
                    checkmarkColor: AppColors.primary,
                    labelStyle: TextStyle(
                      color: isSelected ? AppColors.primaryDark : AppColors.slate700,
                      fontWeight:
                          isSelected ? FontWeight.bold : FontWeight.normal,
                      fontSize: 12,
                    ),
                    onSelected: (_) => setState(() => _selectedCategory = cat),
                  ),
                );
              }).toList(),
            ),
          ),
          const Divider(height: 1),

          // Notification List
          Expanded(
            child: notifications.isEmpty
                ? const CivicEmptyState(
                    title: 'No Notifications',
                    message: 'You have no alerts in this category.',
                    icon: Icons.notifications_none,
                  )
                : ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: notifications.length,
                    itemBuilder: (ctx, i) {
                      final item = notifications[i];
                      return _NotificationCard(
                        notification: item,
                        onTap: () {
                          notifService.markAsRead(item.id);
                        },
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _NotificationCard extends StatelessWidget {
  final CivicNotification notification;
  final VoidCallback onTap;

  const _NotificationCard({
    required this.notification,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    IconData icon;
    Color iconColor;

    switch (notification.category.toLowerCase()) {
      case 'alerts':
        icon = Icons.warning_amber_rounded;
        iconColor = AppColors.critical;
        break;
      case 'work orders':
        icon = Icons.assignment_outlined;
        iconColor = AppColors.primary;
        break;
      case 'ai':
        icon = Icons.auto_awesome;
        iconColor = AppColors.purple;
        break;
      case 'maintenance':
        icon = Icons.build_circle_outlined;
        iconColor = AppColors.teal;
        break;
      default:
        icon = Icons.info_outline;
        iconColor = AppColors.slate500;
        break;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: CivicCard(
        padding: const EdgeInsets.all(14),
        onTap: onTap,
        backgroundColor:
            notification.isRead ? Colors.white : AppColors.primaryLight,
        borderColor: notification.isRead
            ? AppColors.slate200
            : AppColors.primary.withValues(alpha: 0.3),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, size: 20, color: iconColor),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          notification.title,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: notification.isRead
                                ? FontWeight.w600
                                : FontWeight.bold,
                            color: AppColors.slate900,
                          ),
                        ),
                      ),
                      if (!notification.isRead)
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: AppColors.primary,
                            shape: BoxShape.circle,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    notification.message,
                    style: TextStyle(
                      fontSize: 12,
                      color: AppColors.slate600,
                      height: 1.35,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    DateFormat('h:mm a • MMM d').format(notification.timestamp),
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.slate400,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
