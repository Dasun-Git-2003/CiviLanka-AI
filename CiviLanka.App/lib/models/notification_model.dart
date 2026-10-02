class CivicNotification {
  final String id;
  final String title;
  final String message;
  final String category; // Alerts, Work Orders, AI, Maintenance, System
  final DateTime timestamp;
  bool isRead;
  final String? targetRoute;
  final String? referenceId;

  CivicNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.category,
    required this.timestamp,
    this.isRead = false,
    this.targetRoute,
    this.referenceId,
  });

  factory CivicNotification.fromJson(Map<String, dynamic> json) {
    return CivicNotification(
      id: json['id']?.toString() ?? '',
      title: json['title'] as String? ?? 'Municipal Notification',
      message: json['message'] as String? ?? '',
      category: json['category'] as String? ?? 'Alerts',
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'] as String) ?? DateTime.now()
          : DateTime.now(),
      isRead: json['isRead'] as bool? ?? false,
      targetRoute: json['targetRoute'] as String?,
      referenceId: json['referenceId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'message': message,
        'category': category,
        'timestamp': timestamp.toIso8601String(),
        'isRead': isRead,
        if (targetRoute != null) 'targetRoute': targetRoute,
        if (referenceId != null) 'referenceId': referenceId,
      };
}
