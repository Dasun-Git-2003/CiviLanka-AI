import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/auth_service.dart';
import '../theme/app_colors.dart';

// Screens
import '../screens/citizen/citizen_map_screen.dart';
import '../screens/shared/analytics_screen.dart';
import '../screens/supervisor/supervisor_hazards_screen.dart';
import '../screens/supervisor/supervisor_dashboard_screen.dart';
import '../screens/director/director_dashboard_screen.dart';
import '../screens/director/director_approvals_screen.dart';
import '../screens/director/director_budget_screen.dart';
import '../screens/director/director_audit_screen.dart';
import '../screens/director/director_users_screen.dart';
import '../screens/work_order_list_screen.dart';
import '../screens/create_work_order_screen.dart';
import '../screens/field_worker/inspector_home_screen.dart';
import '../screens/supervisor/supervisor_maintenance_screen.dart';
import '../screens/supervisor/supervisor_verification_queue_screen.dart';
import '../screens/supervisor/supervisor_maintenance_history_screen.dart';
import '../screens/supervisor/supervisor_budget_screen.dart';
import '../screens/field_worker/create_maintenance_screen.dart';
import '../screens/infrastructure_assets_screen.dart';
import '../screens/contractors_directory_screen.dart';
import '../screens/repair_history_screen.dart';
import '../screens/shared/ai_intelligence_screen.dart';
import '../screens/agent_estimator_screen.dart';
import '../screens/shared/notification_center_screen.dart';
import '../screens/shared/profile_screen.dart';

class MunicipalAppDrawer extends StatelessWidget {
  final String role; // 'supervisor' or 'director'
  final String? activeRoute;

  const MunicipalAppDrawer({
    super.key,
    required this.role,
    this.activeRoute,
  });

  bool get isDirector => role.toLowerCase() == 'director';
  bool get isSupervisor => role.toLowerCase() == 'supervisor';

  Color get accentColor => isDirector ? const Color(0xFFD97706) : AppColors.purple;
  Color get accentBg => isDirector ? const Color(0xFFFEF3C7) : const Color(0xFFF3E8FF);

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final user = auth.currentUser;
    final fullName = user?.fullName ?? (isDirector ? 'Municipal Director' : 'Operations Supervisor');
    final email = user?.email ?? '';

    return Drawer(
      backgroundColor: const Color(0xFF0F172A), // Deep dark executive slate
      child: SafeArea(
        child: Column(
          children: [
            // Drawer Header
            _buildHeader(context, fullName, email),

            // Scrollable Menu Items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                children: isDirector
                    ? _buildDirectorMenuItems(context)
                    : _buildSupervisorMenuItems(context),
              ),
            ),

            // Drawer Footer (User Profile & Sign Out)
            _buildFooter(context, fullName, user?.role ?? (isDirector ? 'Director' : 'Supervisor')),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, String fullName, String email) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
      decoration: const BoxDecoration(
        color: Color(0xFF1E293B),
        border: Border(
          bottom: BorderSide(color: Color(0xFF334155), width: 1),
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: isDirector
                    ? [const Color(0xFFF59E0B), const Color(0xFFD97706)]
                    : [const Color(0xFF8B5CF6), const Color(0xFF6D28D9)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: accentColor.withValues(alpha: 0.35),
                  blurRadius: 10,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Icon(
              isDirector ? Icons.account_balance_rounded : Icons.admin_panel_settings_rounded,
              color: Colors.white,
              size: 24,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'CiviLanka',
                      style: TextStyle(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                        fontSize: 17,
                        letterSpacing: -0.3,
                      ),
                    ),
                    const SizedBox(width: 5),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                      decoration: BoxDecoration(
                        color: accentColor,
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'AI',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  isDirector ? 'Executive Governance' : 'Operations Supervisor Portal',
                  style: TextStyle(
                    color: isDirector ? const Color(0xFFFCD34D) : const Color(0xFFC4B5FD),
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildSupervisorMenuItems(BuildContext context) {
    return [
      _buildSectionHeader('OVERVIEW & ANALYTICS'),
      _buildNavItem(
        context,
        icon: Icons.map_rounded,
        title: 'Asset GIS Map',
        subtitle: 'Live spatial city map & pins',
        route: '/map',
        destination: const CitizenMapScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.insights_rounded,
        title: 'City Safety Analytics',
        subtitle: 'Executive KPIs & heatmaps',
        route: '/analytics',
        destination: const AnalyticsScreen(),
      ),

      const SizedBox(height: 14),
      _buildSectionHeader('WORK ORDERS & TRIAGE'),
      _buildNavItem(
        context,
        icon: Icons.warning_amber_rounded,
        title: 'Citizen Reports',
        subtitle: 'Triage reported urban hazards',
        badge: 'Incoming',
        route: '/hazards',
        destination: const SupervisorHazardsScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.dashboard_rounded,
        title: 'Work Orders Dashboard',
        subtitle: 'Command & status board',
        route: '/supervisor-dashboard',
        destination: const SupervisorDashboardScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.assignment_outlined,
        title: 'All Work Orders',
        subtitle: 'Full list & dispatch filter',
        route: '/work-orders',
        destination: const WorkOrderListScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.add_task_rounded,
        title: 'Create Work Order',
        subtitle: 'Initiate new municipal job',
        route: '/work-orders/create',
        destination: const CreateWorkOrderScreen(),
      ),

      const SizedBox(height: 14),
      _buildSectionHeader('FIELD OPERATIONS & SIGN-OFF'),
      _buildNavItem(
        context,
        icon: Icons.engineering_rounded,
        title: 'Field Inspector Portal',
        subtitle: 'Worker views & task assignments',
        route: '/field-inspector',
        destination: const InspectorHomeScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.build_circle_outlined,
        title: 'Maintenance Records',
        subtitle: 'Field logs & completion status',
        route: '/maintenance',
        destination: const SupervisorMaintenanceScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.note_add_rounded,
        title: 'Create Maintenance Record',
        subtitle: 'Log on-site repair work',
        route: '/maintenance/create',
        destination: const CreateMaintenanceScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.fact_check_rounded,
        title: 'Verification Queue',
        subtitle: 'Review & sign off completed work',
        badge: 'Verify',
        badgeColor: AppColors.teal,
        route: '/maintenance/verification',
        destination: const SupervisorVerificationQueueScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.history_rounded,
        title: 'Maintenance History',
        subtitle: 'Archive of past operations',
        route: '/maintenance/history',
        destination: const SupervisorMaintenanceHistoryScreen(),
      ),

      const SizedBox(height: 14),
      _buildSectionHeader('INFRASTRUCTURE & ASSETS'),
      _buildNavItem(
        context,
        icon: Icons.location_city_rounded,
        title: 'Infrastructure Assets',
        subtitle: 'Roads, bridges, water & power',
        route: '/assets',
        destination: const InfrastructureAssetsScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.groups_rounded,
        title: 'Contractors Directory',
        subtitle: 'Specialists & crew management',
        route: '/contractors',
        destination: const ContractorsDirectoryScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.receipt_long_rounded,
        title: 'Repair History',
        subtitle: 'Expenditures & verified fixes',
        route: '/repairs',
        destination: const RepairHistoryScreen(),
      ),

      const SizedBox(height: 14),
      _buildSectionHeader('AUTONOMOUS AI MODELS'),
      _buildNavItem(
        context,
        icon: Icons.psychology_rounded,
        title: 'Hazard Classification AI',
        subtitle: 'Computer vision hazard triage',
        badge: 'AI',
        route: '/ai-classification',
        destination: const AIIntelligenceScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.auto_graph_rounded,
        title: 'Asset Risk Prediction AI',
        subtitle: 'Predictive structural wear',
        badge: 'AI',
        route: '/ai-risk',
        destination: const AIIntelligenceScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.calculate_rounded,
        title: 'Cost Estimator AI',
        subtitle: 'Automated repair quote agent',
        badge: 'AI Agent',
        badgeColor: const Color(0xFF10B981),
        route: '/ai-estimator',
        destination: const AgentEstimatorScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.verified_user_rounded,
        title: 'Safety Compliance AI Audit',
        subtitle: 'Standard operating compliance',
        badge: 'AI',
        route: '/ai-compliance',
        destination: const AIIntelligenceScreen(),
      ),

      const SizedBox(height: 14),
      _buildSectionHeader('GOVERNANCE & LEDGER'),
      _buildNavItem(
        context,
        icon: Icons.account_balance_wallet_rounded,
        title: 'Operational Budget',
        subtitle: 'Cost tracker & spending forecast',
        route: '/budget',
        destination: const SupervisorBudgetScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.security_rounded,
        title: 'Security Audit Ledger',
        subtitle: 'Immutable record logs',
        route: '/audit',
        destination: const DirectorAuditScreen(),
      ),

      const SizedBox(height: 14),
      _buildSectionHeader('COMMUNICATION & ACCOUNT'),
      _buildNavItem(
        context,
        icon: Icons.notifications_rounded,
        title: 'Notifications',
        subtitle: 'System alerts & announcements',
        route: '/notifications',
        destination: const NotificationCenterScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.badge_rounded,
        title: 'My Profile',
        subtitle: 'Supervisor credentials & security',
        route: '/profile',
        destination: const ProfileScreen(),
      ),
    ];
  }

  List<Widget> _buildDirectorMenuItems(BuildContext context) {
    return [
      _buildSectionHeader('EXECUTIVE GOVERNANCE'),
      _buildNavItem(
        context,
        icon: Icons.map_rounded,
        title: 'Asset GIS Map',
        subtitle: 'Live spatial municipal map',
        route: '/map',
        destination: const CitizenMapScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.fact_check_rounded,
        title: 'Approval Queue',
        subtitle: 'Work orders pending director sign-off',
        badge: 'Pending',
        badgeColor: const Color(0xFFF59E0B),
        route: '/approval-queue',
        destination: const DirectorApprovalsScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.warning_amber_rounded,
        title: 'Citizen Reports',
        subtitle: 'Citizen hazard incident oversight',
        route: '/hazards',
        destination: const SupervisorHazardsScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.insights_rounded,
        title: 'City Safety Analytics',
        subtitle: 'High-level safety KPI analytics',
        route: '/analytics',
        destination: const AnalyticsScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.account_balance_rounded,
        title: 'Treasury & Operational Budget',
        subtitle: 'Municipal capital allocation',
        badge: 'Treasury',
        badgeColor: const Color(0xFF10B981),
        route: '/budget',
        destination: const DirectorBudgetScreen(),
      ),

      const SizedBox(height: 14),
      _buildSectionHeader('WORK ORDERS & TRIAGE'),
      _buildNavItem(
        context,
        icon: Icons.dashboard_rounded,
        title: 'Work Orders Dashboard',
        subtitle: 'Executive operational dispatch',
        route: '/director-dashboard',
        destination: const DirectorDashboardScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.assignment_outlined,
        title: 'All Work Orders',
        subtitle: 'Citywide maintenance tasks',
        route: '/work-orders',
        destination: const WorkOrderListScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.add_task_rounded,
        title: 'Create Work Order',
        subtitle: 'Commission infrastructure mandate',
        route: '/work-orders/create',
        destination: const CreateWorkOrderScreen(),
      ),

      const SizedBox(height: 14),
      _buildSectionHeader('FIELD OPERATIONS & SIGN-OFF'),
      _buildNavItem(
        context,
        icon: Icons.engineering_rounded,
        title: 'Field Inspector Portal',
        subtitle: 'On-site worker dispatch status',
        route: '/field-inspector',
        destination: const InspectorHomeScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.build_circle_outlined,
        title: 'Maintenance Records',
        subtitle: 'Execution reports & compliance',
        route: '/maintenance',
        destination: const SupervisorMaintenanceScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.checklist_rounded,
        title: 'Verification Queue',
        subtitle: 'Supervisor sign-offs & audit state',
        route: '/maintenance/verification',
        destination: const SupervisorVerificationQueueScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.history_rounded,
        title: 'Maintenance History',
        subtitle: 'City infrastructure historical records',
        route: '/maintenance/history',
        destination: const SupervisorMaintenanceHistoryScreen(),
      ),

      const SizedBox(height: 14),
      _buildSectionHeader('INFRASTRUCTURE & ASSETS'),
      _buildNavItem(
        context,
        icon: Icons.location_city_rounded,
        title: 'Infrastructure Assets',
        subtitle: 'Public civil works database',
        route: '/assets',
        destination: const InfrastructureAssetsScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.groups_rounded,
        title: 'Contractors Directory',
        subtitle: 'Vetted partner construction firms',
        route: '/contractors',
        destination: const ContractorsDirectoryScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.receipt_long_rounded,
        title: 'Repair History',
        subtitle: 'Capital expenditure auditing',
        route: '/repairs',
        destination: const RepairHistoryScreen(),
      ),

      const SizedBox(height: 14),
      _buildSectionHeader('AUTONOMOUS AI MODELS'),
      _buildNavItem(
        context,
        icon: Icons.psychology_rounded,
        title: 'Hazard Classification AI',
        subtitle: 'Deep neural hazard classification',
        badge: 'AI',
        route: '/ai-classification',
        destination: const AIIntelligenceScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.auto_graph_rounded,
        title: 'Asset Risk Prediction AI',
        subtitle: 'Predictive risk forecasting',
        badge: 'AI',
        route: '/ai-risk',
        destination: const AIIntelligenceScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.calculate_rounded,
        title: 'Cost Estimator AI',
        subtitle: 'AI financial bill of quantities',
        badge: 'AI Agent',
        badgeColor: const Color(0xFF10B981),
        route: '/ai-estimator',
        destination: const AgentEstimatorScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.verified_user_rounded,
        title: 'Safety Compliance AI Audit',
        subtitle: 'Regulatory safety scorecards',
        badge: 'AI',
        route: '/ai-compliance',
        destination: const AIIntelligenceScreen(),
      ),

      const SizedBox(height: 14),
      _buildSectionHeader('SECURITY & ADMINISTRATION'),
      _buildNavItem(
        context,
        icon: Icons.security_rounded,
        title: 'Security Audit Ledger',
        subtitle: 'Tamper-evident activity trail',
        badge: 'Ledger',
        badgeColor: const Color(0xFF3B82F6),
        route: '/audit',
        destination: const DirectorAuditScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.manage_accounts_rounded,
        title: 'User Directory & RBAC',
        subtitle: 'Manage municipal officers & roles',
        badge: 'Admin',
        badgeColor: const Color(0xFF8B5CF6),
        route: '/users',
        destination: const DirectorUsersScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.notifications_rounded,
        title: 'Notifications',
        subtitle: 'City emergency broadcasts & alerts',
        route: '/notifications',
        destination: const NotificationCenterScreen(),
      ),
      _buildNavItem(
        context,
        icon: Icons.badge_rounded,
        title: 'My Profile',
        subtitle: 'Director credentials & privileges',
        route: '/profile',
        destination: const ProfileScreen(),
      ),
    ];
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 10, top: 8, bottom: 6),
      child: Text(
        title,
        style: TextStyle(
          color: isDirector ? const Color(0xFF94A3B8) : const Color(0xFFA5B4FC),
          fontSize: 10.5,
          fontWeight: FontWeight.w800,
          letterSpacing: 1.1,
        ),
      ),
    );
  }

  Widget _buildNavItem(
    BuildContext context, {
    required IconData icon,
    required String title,
    required String subtitle,
    required String route,
    required Widget destination,
    String? badge,
    Color? badgeColor,
  }) {
    final bool isActive = activeRoute == route;

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          onTap: () {
            Navigator.pop(context); // Close drawer
            if (activeRoute != route) {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => destination),
              );
            }
          },
          borderRadius: BorderRadius.circular(10),
          hoverColor: const Color(0xFF1E293B),
          splashColor: accentColor.withValues(alpha: 0.15),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8.5),
            decoration: BoxDecoration(
              color: isActive ? const Color(0xFF1E293B) : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              border: isActive
                  ? Border.all(color: accentColor.withValues(alpha: 0.4), width: 1)
                  : Border.all(color: Colors.transparent, width: 1),
            ),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: isActive
                        ? accentColor.withValues(alpha: 0.2)
                        : const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(
                    icon,
                    size: 17,
                    color: isActive
                        ? accentColor
                        : (isDirector ? const Color(0xFFFBBF24) : const Color(0xFFA78BFA)),
                  ),
                ),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: TextStyle(
                          color: isActive ? Colors.white : const Color(0xFFF1F5F9),
                          fontWeight: isActive ? FontWeight.w700 : FontWeight.w600,
                          fontSize: 13,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        subtitle,
                        style: const TextStyle(
                          color: Color(0xFF64748B),
                          fontSize: 10.5,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                if (badge != null) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: (badgeColor ?? accentColor).withValues(alpha: 0.18),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(
                        color: (badgeColor ?? accentColor).withValues(alpha: 0.4),
                        width: 0.8,
                      ),
                    ),
                    child: Text(
                      badge,
                      style: TextStyle(
                        color: badgeColor ?? accentColor,
                        fontSize: 9.5,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFooter(BuildContext context, String fullName, String roleName) {
    final initial = fullName.isNotEmpty ? fullName[0].toUpperCase() : 'U';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: const BoxDecoration(
        color: Color(0xFF1E293B),
        border: Border(
          top: BorderSide(color: Color(0xFF334155), width: 1),
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 17,
            backgroundColor: accentColor.withValues(alpha: 0.25),
            child: Text(
              initial,
              style: TextStyle(
                color: accentColor,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  fullName,
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 12.5,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  roleName.toUpperCase(),
                  style: TextStyle(
                    color: isDirector ? const Color(0xFFFCD34D) : const Color(0xFFC4B5FD),
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.5,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Color(0xFFF87171), size: 20),
            tooltip: 'Sign Out',
            onPressed: () async {
              Navigator.pop(context); // Close drawer
              await context.read<AuthService>().logout();
            },
          ),
        ],
      ),
    );
  }
}
