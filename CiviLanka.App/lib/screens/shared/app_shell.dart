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
import '../../widgets/municipal_app_drawer.dart';

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
        NavigationDestination(icon: Icon(Icons.construction_outlined), selectedIcon: Icon(Icons.construction, color: AppColors.warning), label: 'Orders'),
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
        NavigationDestination(icon: Icon(Icons.construction_outlined), selectedIcon: Icon(Icons.construction, color: AppColors.purple), label: 'Orders'),
        NavigationDestination(icon: Icon(Icons.build_outlined), selectedIcon: Icon(Icons.build, color: AppColors.purple), label: 'Maintenance'),
        NavigationDestination(icon: Icon(Icons.insights_outlined), selectedIcon: Icon(Icons.insights, color: AppColors.purple), label: 'AI Hub'),
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
        CitizenHomeScreen(onNavigateTab: _switchTab),
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
      bottomNavigationBar: NavigationBarTheme(
        data: NavigationBarThemeData(
          labelTextStyle: WidgetStateProperty.resolveWith((states) {
            final isSelected = states.contains(WidgetState.selected);
            return TextStyle(
              fontSize: 11,
              fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
              color: isSelected
                  ? indicatorColor
                  : (Theme.of(context).brightness == Brightness.dark
                      ? const Color(0xFF94A3B8)
                      : const Color(0xFF64748B)),
            );
          }),
        ),
        child: NavigationBar(
          selectedIndex: _currentIndex,
          onDestinationSelected: _switchTab,
          height: 64,
          backgroundColor: Theme.of(context).brightness == Brightness.dark
              ? const Color(0xFF1E293B)
              : Colors.white,
          elevation: 8,
          indicatorColor: indicatorColor.withValues(alpha: 0.12),
          destinations: destinations,
        ),
      ),
      floatingActionButton: fab,
    );
  }

  Widget _buildSupervisorDrawer(BuildContext context, dynamic user) {
    return const MunicipalAppDrawer(
      role: 'supervisor',
      activeRoute: '/supervisor-dashboard',
    );
  }

  Widget _buildDirectorDrawer(BuildContext context, dynamic user) {
    return const MunicipalAppDrawer(
      role: 'director',
      activeRoute: '/director-dashboard',
    );
  }
}
