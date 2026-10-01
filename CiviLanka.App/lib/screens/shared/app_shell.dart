import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/app_sidebar.dart';
import '../citizen/citizen_home_screen.dart';
import '../citizen/citizen_map_screen.dart';
import '../citizen/report_hazard_screen.dart';
import '../field_worker/create_maintenance_screen.dart';
import '../field_worker/inspector_home_screen.dart';
import '../field_worker/work_orders_screen.dart';
import 'analytics_screen.dart';
import 'profile_screen.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final user = authService.currentUser;
    final isWorker = (user?.isFieldWorker ?? false) || (user?.isSupervisor ?? false);

    final citizenPages = [
      const CitizenHomeScreen(),
      const CitizenMapScreen(),
      const AnalyticsScreen(),
      const ProfileScreen(),
    ];

    final workerPages = [
      const InspectorHomeScreen(),
      const WorkOrdersScreen(),
      const CitizenMapScreen(),
      const AnalyticsScreen(),
      const ProfileScreen(),
    ];

    final pages = isWorker ? workerPages : citizenPages;
    if (_currentIndex >= pages.length) {
      _currentIndex = 0;
    }

    return Scaffold(
      drawer: AppSidebar(
        currentTabIndex: _currentIndex,
        onSelectTab: (index) {
          setState(() {
            _currentIndex = index.clamp(0, pages.length - 1);
          });
        },
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: pages,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: Colors.white,
        elevation: 8,
        indicatorColor: (isWorker ? AppColors.teal : AppColors.primary).withValues(alpha: 0.12),
        destinations: isWorker
            ? const [
                NavigationDestination(
                  icon: Icon(Icons.assignment_outlined),
                  selectedIcon: Icon(Icons.assignment, color: AppColors.teal),
                  label: 'Inspector',
                ),
                NavigationDestination(
                  icon: Icon(Icons.construction_outlined),
                  selectedIcon: Icon(Icons.construction, color: AppColors.teal),
                  label: 'Orders',
                ),
                NavigationDestination(
                  icon: Icon(Icons.map_outlined),
                  selectedIcon: Icon(Icons.map, color: AppColors.teal),
                  label: 'Map',
                ),
                NavigationDestination(
                  icon: Icon(Icons.bar_chart_outlined),
                  selectedIcon: Icon(Icons.bar_chart, color: AppColors.teal),
                  label: 'Analytics',
                ),
                NavigationDestination(
                  icon: Icon(Icons.person_outline),
                  selectedIcon: Icon(Icons.person, color: AppColors.teal),
                  label: 'Profile',
                ),
              ]
            : const [
                NavigationDestination(
                  icon: Icon(Icons.home_outlined),
                  selectedIcon: Icon(Icons.home, color: AppColors.primary),
                  label: 'Portal',
                ),
                NavigationDestination(
                  icon: Icon(Icons.map_outlined),
                  selectedIcon: Icon(Icons.map, color: AppColors.primary),
                  label: 'GIS Map',
                ),
                NavigationDestination(
                  icon: Icon(Icons.bar_chart_outlined),
                  selectedIcon: Icon(Icons.bar_chart, color: AppColors.primary),
                  label: 'Analytics',
                ),
                NavigationDestination(
                  icon: Icon(Icons.person_outline),
                  selectedIcon: Icon(Icons.person, color: AppColors.primary),
                  label: 'Profile',
                ),
              ],
      ),
      floatingActionButton: isWorker
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CreateMaintenanceScreen()),
                );
              },
              backgroundColor: AppColors.teal,
              icon: const Icon(Icons.add_task, color: Colors.white),
              label: const Text('Log Maintenance', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            )
          : FloatingActionButton.extended(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ReportHazardScreen()),
                );
              },
              backgroundColor: AppColors.primary,
              icon: const Icon(Icons.add_location_alt_outlined, color: Colors.white),
              label: const Text('Report Issue', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            ),
    );
  }
}
