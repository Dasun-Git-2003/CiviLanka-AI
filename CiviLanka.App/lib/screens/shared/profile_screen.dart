import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final user = authService.currentUser;

    if (user == null) {
      return const Scaffold(
        body: Center(child: Text('No active profile session.')),
      );
    }

    final isWorker = user.isFieldWorker || user.isSupervisor;

    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text('Municipal ID & Profile', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: AppColors.critical),
            tooltip: 'Sign Out',
            onPressed: () => _confirmSignOut(context),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.15),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 30,
                        backgroundColor: isWorker ? AppColors.teal : AppColors.primary,
                        child: Text(
                          user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : 'U',
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              user.fullName,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              user.email,
                              style: const TextStyle(color: AppColors.slate400, fontSize: 13),
                            ),
                            const SizedBox(height: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(
                                color: isWorker
                                    ? AppColors.teal.withValues(alpha: 0.2)
                                    : AppColors.primary.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: isWorker ? AppColors.teal : AppColors.primary,
                                  width: 1,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    isWorker ? Icons.engineering : Icons.verified_user,
                                    size: 13,
                                    color: isWorker ? AppColors.teal : AppColors.primary,
                                  ),
                                  const SizedBox(width: 5),
                                  Text(
                                    user.role.toUpperCase(),
                                    style: TextStyle(
                                      color: isWorker ? AppColors.teal : AppColors.primary,
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.8,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const Divider(color: AppColors.slate700, height: 28),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Jurisdiction: Colombo Zone 01',
                        style: TextStyle(color: AppColors.slate400, fontSize: 11),
                      ),
                      Row(
                        children: [
                          const Icon(Icons.qr_code, color: AppColors.slate400, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            user.userId.substring(0, user.userId.length.clamp(0, 8)),
                            style: const TextStyle(color: AppColors.slate400, fontSize: 11, fontFamily: 'monospace'),
                          ),
                        ],
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: const BorderSide(color: AppColors.slate200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.swap_horiz, color: AppColors.primary, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'Switch Role Persona (Development Demo)',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'Toggle instantly between Citizen Portal (Member 1) and Field Inspector Portal (Member 4).',
                      style: TextStyle(fontSize: 11, color: AppColors.slate500),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () async {
                              await authService.login(email: 'citizen@test.com', password: 'Director123!');
                            },
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(
                                color: !isWorker ? AppColors.primary : AppColors.slate300,
                                width: !isWorker ? 2 : 1,
                              ),
                              backgroundColor: !isWorker ? AppColors.primary.withValues(alpha: 0.05) : Colors.transparent,
                            ),
                            child: const Text('Citizen Demo'),
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () async {
                              await authService.login(email: 'fieldworker@test.com', password: 'Director123!');
                            },
                            style: OutlinedButton.styleFrom(
                              side: BorderSide(
                                color: isWorker ? AppColors.teal : AppColors.slate300,
                                width: isWorker ? 2 : 1,
                              ),
                              backgroundColor: isWorker ? AppColors.teal.withValues(alpha: 0.05) : Colors.transparent,
                            ),
                            child: const Text('Field Worker Demo'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: const BorderSide(color: AppColors.slate200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Municipal Safety Metrics',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 14),
                    _buildStatRow(
                      icon: Icons.report_problem_outlined,
                      label: 'Hazards Tracked',
                      val: '21 Municipal Incidents',
                      color: AppColors.primary,
                    ),
                    const Divider(height: 18),
                    _buildStatRow(
                      icon: Icons.checklist_rtl_outlined,
                      label: 'Safety Protocols Verified',
                      val: '100% Pass Rate',
                      color: AppColors.success,
                    ),
                    const Divider(height: 18),
                    _buildStatRow(
                      icon: Icons.smart_toy_outlined,
                      label: 'AI Audit Model',
                      val: 'Gemini 2.5 Flash Triage',
                      color: AppColors.teal,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: const BorderSide(color: AppColors.slate200),
              ),
              child: const Column(
                children: [
                  ListTile(
                    leading: Icon(Icons.verified_user_outlined, color: AppColors.slate600),
                    title: Text('Security & Permissions', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    subtitle: Text('Camera, GPS, Secure JWT Storage active', style: TextStyle(fontSize: 11)),
                    trailing: Icon(Icons.check_circle, color: AppColors.success, size: 18),
                  ),
                  Divider(height: 1),
                  ListTile(
                    leading: Icon(Icons.info_outline, color: AppColors.slate600),
                    title: Text('CiviLanka AI Mobile App', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
                    subtitle: Text('Version 1.0.0 (Build 2026.09) â€¢ Colombo Municipal Council', style: TextStyle(fontSize: 11)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: () => _confirmSignOut(context),
              icon: const Icon(Icons.logout, color: AppColors.critical),
              label: const Text('Sign Out of Municipal Portal', style: TextStyle(color: AppColors.critical, fontWeight: FontWeight.bold)),
              style: OutlinedButton.styleFrom(
                minimumSize: const Size.fromHeight(50),
                side: const BorderSide(color: AppColors.critical),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow({
    required IconData icon,
    required String label,
    required String val,
    required Color color,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, size: 18, color: color),
            ),
            const SizedBox(width: 12),
            Text(label, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500)),
          ],
        ),
        Text(val, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate700)),
      ],
    );
  }

  void _confirmSignOut(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to log out of CiviLanka?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<AuthService>().logout();
            },
            style: ElevatedButton.styleFrom(backgroundColor: AppColors.critical),
            child: const Text('Sign Out', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }
}
