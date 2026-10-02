import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../theme/app_colors.dart';
import '../screens/field_worker/create_maintenance_screen.dart';

class AppSidebar extends StatelessWidget {
  final int currentTabIndex;
  final ValueChanged<int>? onSelectTab;

  const AppSidebar({
    super.key,
    required this.currentTabIndex,
    this.onSelectTab,
  });

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthService>();
    final user = auth.currentUser;
    final role = user?.role ?? 'Citizen';
    final isWorker = (user?.isFieldWorker ?? false) || (user?.isSupervisor ?? false);

    return Drawer(
      backgroundColor: Colors.white,
      child: SafeArea(
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
              decoration: const BoxDecoration(
                border: Border(bottom: BorderSide(color: AppColors.cityBorder)),
              ),
              child: Row(
                children: [
                  Container(
                    width: 40,
                    height: 40,
                    decoration: BoxDecoration(
                      color: isWorker ? AppColors.teal : AppColors.primary,
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: (isWorker ? AppColors.teal : AppColors.primary).withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: const Icon(Icons.shield_outlined, color: Colors.white, size: 22),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'CiviLanka AI',
                        style: TextStyle(
                          color: AppColors.textDark,
                          fontWeight: FontWeight.w900,
                          fontSize: 16,
                          letterSpacing: -0.3,
                        ),
                      ),
                      Text(
                        isWorker ? 'Field Operations' : 'Smart Citizen Portal',
                        style: const TextStyle(
                          color: AppColors.textGrey,
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                children: [
                  if (!isWorker) ...[
                    _buildSectionHeader('CITIZEN PORTAL'),
                    _buildNavItem(
                      context,
                      icon: Icons.dashboard_outlined,
                      activeIcon: Icons.dashboard,
                      label: 'My Portal & Reports',
                      tabIndex: 0,
                    ),
                    _buildNavItem(
                      context,
                      icon: Icons.map_outlined,
                      activeIcon: Icons.map,
                      label: 'City GIS Map',
                      tabIndex: 1,
                    ),
                    _buildNavItem(
                      context,
                      icon: Icons.bar_chart_outlined,
                      activeIcon: Icons.bar_chart,
                      label: 'City Safety Analytics',
                      tabIndex: 2,
                    ),
                    const SizedBox(height: 16),
                    _buildSectionHeader('ACCOUNT'),
                    _buildNavItem(
                      context,
                      icon: Icons.person_outline,
                      activeIcon: Icons.person,
                      label: 'My Profile',
                      tabIndex: 3,
                    ),
                  ] else ...[
                    _buildSectionHeader('FIELD OPERATIONS'),
                    _buildNavItem(
                      context,
                      icon: Icons.assignment_outlined,
                      activeIcon: Icons.assignment,
                      label: 'Field Inspector Portal',
                      tabIndex: 0,
                    ),
                    _buildNavItem(
                      context,
                      icon: Icons.construction_outlined,
                      activeIcon: Icons.construction,
                      label: 'Assigned Work Orders',
                      tabIndex: 1,
                    ),
                    Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: InkWell(
                        onTap: () {
                          Navigator.of(context).pop();
                          Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => const CreateMaintenanceScreen()),
                          );
                        },
                        borderRadius: BorderRadius.circular(10),
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          child: const Row(
                            children: [
                              Icon(Icons.add_circle_outline, color: AppColors.teal, size: 20),
                              SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  'Create Maintenance Log',
                                  style: TextStyle(color: AppColors.textDark, fontWeight: FontWeight.w600, fontSize: 13),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    _buildNavItem(
                      context,
                      icon: Icons.map_outlined,
                      activeIcon: Icons.map,
                      label: 'Asset GIS Map',
                      tabIndex: 2,
                    ),
                    _buildNavItem(
                      context,
                      icon: Icons.bar_chart_outlined,
                      activeIcon: Icons.bar_chart,
                      label: 'Operational Analytics',
                      tabIndex: 3,
                    ),
                    const SizedBox(height: 16),
                    _buildSectionHeader('ACCOUNT'),
                    _buildNavItem(
                      context,
                      icon: Icons.person_outline,
                      activeIcon: Icons.person,
                      label: 'My Profile',
                      tabIndex: 4,
                    ),
                  ],
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: AppColors.cityBorder)),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 18,
                    backgroundColor: (isWorker ? AppColors.teal : AppColors.primary).withValues(alpha: 0.12),
                    child: Text(
                      (user?.fullName.isNotEmpty ?? false) ? user!.fullName[0].toUpperCase() : 'U',
                      style: TextStyle(
                        color: isWorker ? AppColors.teal : AppColors.primary,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.fullName ?? 'User',
                          style: const TextStyle(
                            color: AppColors.textDark,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          role,
                          style: const TextStyle(
                            color: AppColors.textGrey,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.logout, color: AppColors.critical, size: 20),
                    tooltip: 'Log Out',
                    onPressed: () async {
                      Navigator.of(context).pop();
                      await context.read<AuthService>().logout();
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 10, bottom: 8, top: 4),
      child: Text(
        title,
        style: const TextStyle(
          color: AppColors.textGrey,
          fontSize: 10,
          fontWeight: FontWeight.w800,
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _buildNavItem(
    BuildContext context, {
    required IconData icon,
    required IconData activeIcon,
    required String label,
    required int tabIndex,
  }) {
    final isSelected = currentTabIndex == tabIndex;

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: InkWell(
        onTap: () {
          Navigator.of(context).pop();
          if (onSelectTab != null) {
            onSelectTab!(tabIndex);
          }
        },
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFEFF6FF) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
          ),
          child: Row(
            children: [
              Icon(
                isSelected ? activeIcon : icon,
                color: isSelected ? AppColors.primary : AppColors.textGrey,
                size: 20,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    color: isSelected ? AppColors.primary : AppColors.textDark,
                    fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                    fontSize: 13,
                  ),
                ),
              ),
              if (isSelected)
                Container(
                  width: 6,
                  height: 6,
                  decoration: const BoxDecoration(
                    shape: BoxShape.circle,
                    color: AppColors.primary,
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
