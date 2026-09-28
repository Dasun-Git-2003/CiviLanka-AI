// backend/modules/member4_operations_audit/services/notificationService.js
// Firebase Cloud Messaging (FCM) Integration & Simulation Service

class NotificationService {
  constructor() {
    this.notifications = [];
  }

  /**
   * Send push notification to target (e.g. Director, Field Worker, Supervisor)
   */
  async sendPushNotification({ recipientRole, title, body, data = {} }) {
    const notificationPayload = {
      id: 'fcm_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      recipientRole, // 'DIRECTOR', 'FIELD_WORKER', 'DISPATCHER', 'SUPERVISOR'
      title,
      body,
      data,
      timestamp: new Date().toISOString(),
      status: 'DELIVERED'
    };

    this.notifications.unshift(notificationPayload);
    console.log(`[FCM Push Dispatch] -> [${recipientRole}] ${title}: ${body}`);
    return notificationPayload;
  }

  /**
   * Get all recent dispatch logs
   */
  getRecentNotifications(limit = 20) {
    return this.notifications.slice(0, limit);
  }
}

module.exports = new NotificationService();
