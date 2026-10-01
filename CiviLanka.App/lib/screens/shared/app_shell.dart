import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';
import '../citizen/citizen_home_screen.dart';
import '../citizen/citizen_map_screen.dart';
import '../citizen/citizen_my_reports_screen.dart';
import '../citizen/report_hazard_screen.dart';
import '../field_worker/create_maintenance_screen.dart';
import '../field_worker/inspector_home_screen.dart';
import '../field_worker/work_orders_screen.dart';
import '../supervisor/supervisor_dashboard_screen.dart';
import '../supervisor/supervisor_hazards_screen.dart';
import '../supervisor/supervisor_maintenance_screen.dart';
import '../director/director_dashboard_screen.dart';
import '../director/director_approvals_screen.dart';
import '../work_order_list_screen.dart';
import '../create_work_order_screen.dart';
import 'analytics_screen.dart';
import 'profile_screen.dart';
import 'notification_center_screen.dart';
import 'ai_intelligence_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _currentIndex = 0;

  void _switchTab(int index) {
    setState(() {
      _currentIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final user = authService.currentUser;

    final isDirector = user?.isDirector ?? false;
    final isSupervisor = (user?.isSupervisor ?? false) && !isDirector;
    final isFieldWorker = (user?.isFieldWorker ?? false) && !(user?.isSupervisor ?? false) && !isDirector;
    // Citizen is the default fallback

    List<Widget> pages = [];
    List<NavigationDestination> destinations = [];
    Color indicatorColor = AppColors.primary;
    Widget? fab;
    Widget? drawer;

    if (isDirector) {
      pages = [
        DirectorDashboardScreen(onNavigateTab: _switchTab),
        const DirectorApprovalsScreen(),
        const WorkOrderListScreen(),
        const AIIntelligenceScreen(),
        const AnalyticsScreen(),
      ];
      destinations = const [
        NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard, color: AppColors.warning), label: 'Dashboard'),
        NavigationDestination(icon: Icon(Icons.fact_check_outlined), selectedIcon: Icon(Icons.fact_check, color: AppColors.warning), label: 'Approvals'),
        NavigationDestination(icon: Icon(Icons.construction_outlined), selectedIcon: Icon(Icons.construction, color: AppColors.warning), label: 'Work Orders'),
        NavigationDestination(icon: Icon(Icons.psychology_outlined), selectedIcon: Icon(Icons.psychology, color: AppColors.warning), label: 'AI Hub'),
        NavigationDestination(icon: Icon(Icons.bar_chart_outlined), selectedIcon: Icon(Icons.bar_chart, color: AppColors.warning), label: 'Analytics'),
      ];
      indicatorColor = AppColors.warning;
      drawer = _buildDirectorDrawer(context, user);
      fab = null;
    } else if (isSupervisor) {
      pages = [
        SupervisorDashboardScreen(onNavigateTab: _switchTab),
        const SupervisorHazardsScreen(),
        const WorkOrderListScreen(),
        const SupervisorMaintenanceScreen(),
        const AIIntelligenceScreen(),
      ];
      destinations = const [
        NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard, color: AppColors.purple), label: 'Dashboard'),
        NavigationDestination(icon: Icon(Icons.warning_amber_outlined), selectedIcon: Icon(Icons.warning, color: AppColors.purple), label: 'Hazards'),
        NavigationDestination(icon: Icon(Icons.construction_outlined), selectedIcon: Icon(Icons.construction, color: AppColors.purple), label: 'Work Orders'),
        NavigationDestination(icon: Icon(Icons.build_outlined), selectedIcon: Icon(Icons.build, color: AppColors.purple), label: 'Maintenance'),
        NavigationDestination(icon: Icon(Icons.insights_outlined), selectedIcon: Icon(Icons.insights, color: AppColors.purple), label: 'AI & Analytics'),
      ];
      indicatorColor = AppColors.purple;
      drawer = _buildSupervisorDrawer(context, user);
      fab = FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateWorkOrderScreen()));
        },
        backgroundColor: AppColors.purple,
        icon: const Icon(Icons.add_task, color: Colors.white),
        label: const Text('Create Work Order', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      );
    } else if (isFieldWorker) {
      pages = [
        const InspectorHomeScreen(),
        const WorkOrdersScreen(),
        const CreateMaintenanceScreen(),
        const CitizenMapScreen(),
        const ProfileScreen(),
      ];
      destinations = const [
        NavigationDestination(icon: Icon(Icons.dashboard_outlined), selectedIcon: Icon(Icons.dashboard, color: AppColors.teal), label: 'Dashboard'),
        NavigationDestination(icon: Icon(Icons.assignment_outlined), selectedIcon: Icon(Icons.assignment, color: AppColors.teal), label: 'My Orders'),
        NavigationDestination(icon: Icon(Icons.add_box_outlined), selectedIcon: Icon(Icons.add_box, color: AppColors.teal), label: 'Log Work'),
        NavigationDestination(icon: Icon(Icons.map_outlined), selectedIcon: Icon(Icons.map, color: AppColors.teal), label: 'Map'),
        NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person, color: AppColors.teal), label: 'Profile'),
      ];
      indicatorColor = AppColors.teal;
      drawer = null;
      fab = null;
    } else {
      // CITIZEN
      pages = [
        const CitizenHomeScreen(),
        const CitizenMapScreen(),
        const CitizenMyReportsScreen(),
        const NotificationCenterScreen(),
        const ProfileScreen(),
      ];
      destinations = const [
        NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home, color: AppColors.primary), label: 'Home'),
        NavigationDestination(icon: Icon(Icons.map_outlined), selectedIcon: Icon(Icons.map, color: AppColors.primary), label: 'Map'),
        NavigationDestination(icon: Icon(Icons.report_outlined), selectedIcon: Icon(Icons.report, color: AppColors.primary), label: 'My Reports'),
        NavigationDestination(icon: Icon(Icons.notifications_outlined), selectedIcon: Icon(Icons.notifications, color: AppColors.primary), label: 'Alerts'),
        NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person, color: AppColors.primary), label: 'Profile'),
      ];
      indicatorColor = AppColors.primary;
      drawer = null;
      fab = FloatingActionButton.extended(
        onPressed: () {
          Navigator.push(context, MaterialPageRoute(builder: (_) => const ReportHazardScreen()));
        },
        backgroundColor: AppColors.primary,
        icon: const Icon(Icons.add_location_alt_outlined, color: Colors.white),
        label: const Text('Report Issue', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      );
    }

    if (_currentIndex >= pages.length) {
      _currentIndex = 0;
    }

    return Scaffold(
      drawer: drawer,
      body: IndexedStack(
        index: _currentIndex,
        children: pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: _switchTab,
        backgroundColor: Colors.white,
        elevation: 8,
        indicatorColor: indicatorColor.withValues(alpha: 0.12),
        destinations: destinations,
      ),
      floatingActionButton: fab,
    );
  }

  Widget _buildSupervisorDrawer(BuildContext context, dynamic user) {
    return Drawer(
      backgroundColor: Colors.white,
      child: SafeArea(
        child: Column(
          children: [
            _buildDrawerHeader(user, AppColors.purple, 'Supervisor Operations'),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 12),
                children: [
                  _buildDrawerItem(
                    context,
                    icon: Icons.bar_chart_outlined,
                    label: 'Analytics',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const AnalyticsScreen()));
                    },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.notifications_outlined,
                    label: 'Notifications',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationCenterScreen()));
                    },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.person_outline,
                    label: 'Profile',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
                    },
                  ),
                ],
              ),
            ),
            _buildDrawerFooter(context, user, AppColors.purple),
          ],
        ),
      ),
    );
  }

  Widget _buildDirectorDrawer(BuildContext context, dynamic user) {
    return Drawer(
      backgroundColor: Colors.white,
      child: SafeArea(
        child: Column(
          children: [
            _buildDrawerHeader(user, AppColors.warning, 'Director Hub'),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 12),
                children: [
                  _buildDrawerItem(
                    context,
                    icon: Icons.notifications_outlined,
                    label: 'Notifications',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const NotificationCenterScreen()));
                    },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.person_outline,
                    label: 'Profile',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
                    },
                  ),
                  _buildDrawerItem(
                    context,
                    icon: Icons.manage_accounts_outlined,
                    label: 'User Management',
                    onTap: () {
                      Navigator.pop(context);
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => Scaffold(
                            appBar: AppBar(title: const Text('User Management')),
                            body: const Center(child: Text('User Management Module (Coming Soon)')),
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            _buildDrawerFooter(context, user, AppColors.warning),
          ],
        ),
      ),
    );
  }

  Widget _buildDrawerHeader(dynamic user, Color color, String subtitle) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: AppColors.cityBorder)),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(12),
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 0.3),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: const Icon(Icons.shield_outlined, color: Colors.white, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'CiviLanka AI',
                  style: TextStyle(color: AppColors.textDark, fontWeight: FontWeight.w900, fontSize: 18),
                ),
                Text(
                  subtitle,
                  style: const TextStyle(color: AppColors.textGrey, fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawerItem(BuildContext context, {required IconData icon, required String label, required VoidCallback onTap}) {
    return ListTile(
      leading: Icon(icon, color: AppColors.textGrey, size: 22),
      title: Text(label, style: const TextStyle(color: AppColors.textDark, fontWeight: FontWeight.w600, fontSize: 14)),
      onTap: onTap,
      dense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 24),
    );
  }

  Widget _buildDrawerFooter(BuildContext context, dynamic user, Color color) {
    final role = user?.role ?? 'Role';
    final fullName = user?.fullName ?? 'User';
    final initial = fullName.isNotEmpty ? fullName[0].toUpperCase() : 'U';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        border: Border(top: BorderSide(color: AppColors.cityBorder)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 18,
            backgroundColor: color.withValues(alpha: 0.12),
            child: Text(
              initial,
              style: TextStyle(color: color, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  fullName,
                  style: const TextStyle(color: AppColors.textDark, fontWeight: FontWeight.bold, fontSize: 13),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                Text(
                  role,
                  style: const TextStyle(color: AppColors.textGrey, fontSize: 11),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.critical, size: 20),
            tooltip: 'Log Out',
            onPressed: () async {
              Navigator.pop(context);
              await context.read<AuthService>().logout();
            },
          ),
        ],
      ),
    );
  }
}
