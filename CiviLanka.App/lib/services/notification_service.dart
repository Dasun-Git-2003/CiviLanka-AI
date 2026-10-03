import 'package:flutter/foundation.dart';
import '../models/notification_model.dart';

class NotificationService extends ChangeNotifier {
  final List<CivicNotification> _notifications = [];

  List<CivicNotification> get notifications => List.unmodifiable(_notifications);

  int get unreadCount => _notifications.where((n) => !n.isRead).length;

  NotificationService() {
    _loadInitialNotifications();
  }

  void _loadInitialNotifications() {
    _notifications.addAll([
      CivicNotification(
        id: 'notif-1',
        title: 'High Priority Hazard Reported',
        message: 'A critical road pothole was reported on Galle Road, Colombo 03.',
        category: 'Alerts',
        timestamp: DateTime.now().subtract(const Duration(minutes: 5)),
        isRead: false,
      ),
      CivicNotification(
        id: 'notif-2',
        title: 'Work Order Assigned',
        message: 'Work order WO-2026-0042 has been scheduled for today.',
        category: 'Work Orders',
        timestamp: DateTime.now().subtract(const Duration(minutes: 25)),
        isRead: false,
      ),
      CivicNotification(
        id: 'notif-3',
        title: 'Safety AI Assessment Complete',
        message: 'Compliance check confirmed PPE and traffic safety requirements.',
        category: 'AI',
        timestamp: DateTime.now().subtract(const Duration(hours: 1)),
        isRead: true,
      ),
      CivicNotification(
        id: 'notif-4',
        title: 'Maintenance Verification Requested',
        message: 'Ruwan Jayasinghe completed field repair on Galle Road.',
        category: 'Maintenance',
        timestamp: DateTime.now().subtract(const Duration(hours: 3)),
        isRead: false,
      ),
    ]);
  }

  List<CivicNotification> getByCategory(String category) {
    if (category == 'All') return notifications;
    return _notifications.where((n) => n.category.toLowerCase() == category.toLowerCase()).toList();
  }

  void markAsRead(String id) {
    final index = _notifications.indexWhere((n) => n.id == id);
    if (index != -1 && !_notifications[index].isRead) {
      _notifications[index].isRead = true;
      notifyListeners();
    }
  }

  void markAllAsRead() {
    for (var n in _notifications) {
      n.isRead = true;
    }
    notifyListeners();
  }

  void addNotification(CivicNotification notification) {
    _notifications.insert(0, notification);
    notifyListeners();
  }

  void clearAll() {
    _notifications.clear();
    notifyListeners();
  }
}
