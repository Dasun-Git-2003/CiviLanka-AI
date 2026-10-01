import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../main.dart';
import '../models/hazard.dart';
import '../models/infrastructure_asset.dart';
import '../services/auth_service.dart';
import '../services/hazard_service.dart';
import 'create_work_order_screen.dart';
import 'field_worker_screen.dart';
import 'gis_map_screen.dart';
import 'my_reports_screen.dart';
import 'report_hazard_screen.dart';
import 'work_order_list_screen.dart';
import 'infrastructure_assets_screen.dart';
import 'contractors_directory_screen.dart';
import 'repair_history_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedTab = 0; // 0: Home, 1: Work Orders, 2: GIS Map, 3: Profile
  SupervisorDashboardStats? _supervisorStats;
  bool _loading = true;
  String? _error;
  DateTime? _lastUpdated;

  @override
  void initState() {
    super.initState();
    _loadStats();
  }

  Future<void> _loadStats() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final hazardService = context.read<HazardService>();
      final stats = await hazardService.getSupervisorStats();
      if (mounted) {
        setState(() {
          _supervisorStats = stats;
          _loading = false;
          _lastUpdated = DateTime.now();
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final auth = context.read<AuthService>();
    final user = auth.currentUser;
    final userName = user?.fullName.split(' ').first ?? 'Supervisor';

    final Color bgColor = isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC);

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        elevation: 0,
        titleSpacing: 16,
        title: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: Image.asset(
                'assets/images/Logo.jpg',
                width: 32,
                height: 32,
                fit: BoxFit.cover,
                errorBuilder: (ctx, err, stack) => Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(Icons.shield_rounded, color: Color(0xFFF59E0B), size: 20),
                ),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text(
                  'CivitaGuard',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                    letterSpacing: -0.3,
                  ),
                ),
                Text(
                  'Field Maintenance Supervisor',
                  style: TextStyle(
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: _loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Database Telemetry',
            onPressed: _loading ? null : _loadStats,
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert_rounded),
            onSelected: (v) async {
              if (v == 'logout') {
                await context.read<AuthState>().logout(context);
              } else if (v == 'my_reports') {
                if (context.mounted) {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const MyReportsScreen()),
                  );
                }
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(
                value: 'my_reports',
                child: Row(
                  children: [
                    Icon(Icons.assignment_turned_in_outlined, size: 18),
                    SizedBox(width: 8),
                    Text('My Reported Hazards'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 18, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Sign Out', style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: IndexedStack(
        index: _selectedTab,
        children: [
          // Tab 0: Home (Redesigned Supervisor Dashboard)
          _buildHomeTab(context, isDark, userName),

          // Tab 1: Work Orders
          const WorkOrderListScreen(),

          // Tab 2: GIS Map
          GisMapScreen(
            initialHazards: _supervisorStats?.hazards,
            initialAssets: _supervisorStats?.assets,
          ),

          // Tab 3: Profile
          _buildProfileTab(context, isDark, user),
        ],
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          border: Border(
            top: BorderSide(
              color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
              width: 1,
            ),
          ),
        ),
        child: BottomNavigationBar(
          currentIndex: _selectedTab,
          onTap: (index) => setState(() => _selectedTab = index),
          backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
          selectedItemColor: const Color(0xFFF59E0B), // CivitaGuard Supervisor Amber
          unselectedItemColor: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 11),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
          type: BottomNavigationBarType.fixed,
          elevation: 0,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.home_outlined),
              activeIcon: Icon(Icons.home_rounded),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.assignment_outlined),
              activeIcon: Icon(Icons.assignment_rounded),
              label: 'Work Orders',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.explore_outlined),
              activeIcon: Icon(Icons.explore_rounded),
              label: 'Asset Map',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.person_outline_rounded),
              activeIcon: Icon(Icons.person_rounded),
              label: 'Profile',
            ),
          ],
        ),
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // HOME TAB
  // ═════════════════════════════════════════════════════════════════════════════

  Widget _buildHomeTab(BuildContext context, bool isDark, String userName) {
    final stats = _supervisorStats;
    final totalPins = stats?.totalActiveMapPins ?? 10;
    final citizenReports = stats?.citizenHazardReports ?? 5;
    final criticalHazards = stats?.criticalUrgentHazards ?? 3;
    final repairNeeded = stats?.repairAttentionNeeded ?? 5;

    final urgentList = stats?.hazards
            .where((h) =>
                (h.severity ?? '').toUpperCase() == 'CRITICAL' ||
                (h.severity ?? '').toUpperCase() == 'HIGH' ||
                (h.priority ?? '').toUpperCase() == 'URGENT')
            .take(3)
            .toList() ??
        [];

    return RefreshIndicator(
      onRefresh: _loadStats,
      color: const Color(0xFFF59E0B),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Supervisor Header & Live Database Status ─────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hello, $userName ',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                        letterSpacing: -0.4,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'City Infrastructure & Maintenance Operations',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: const Color(0xFF10B981).withValues(alpha: 0.3),
                      width: 1,
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: const BoxDecoration(
                          color: Color(0xFF10B981),
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      const Text(
                        'Live Sync',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: Color(0xFF059669),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),

            if (_lastUpdated != null) ...[
              const SizedBox(height: 4),
              Text(
                'Synced with database: ${_formatTime(_lastUpdated!)}',
                style: TextStyle(
                  fontSize: 11,
                  color: isDark ? Colors.grey[500] : Colors.grey[400],
                ),
              ),
            ],

            if (_error != null) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEE2E2),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.info_outline, color: Color(0xFFDC2626), size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Using cached metrics ($_error)',
                        style: const TextStyle(fontSize: 11, color: Color(0xFFDC2626)),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 20),

            // ── SECTION 1: 4 METRIC KPI CARDS (Photo 1 Reference) ───────────
            LayoutBuilder(
              builder: (context, constraints) {
                // Responsive: 2 columns on mobile, 4 columns on wide screens
                final int crossAxisCount = constraints.maxWidth > 700 ? 4 : 2;
                final double aspectRatio = constraints.maxWidth > 700 ? 2.2 : 1.75;

                return GridView.count(
                  crossAxisCount: crossAxisCount,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: aspectRatio,
                  children: [
                    // Card 1: Total Active Map Pins
                    _buildKpiCard(
                      value: '$totalPins',
                      label: 'Total Active Map Pins',
                      icon: Icons.location_on_outlined,
                      iconColor: const Color(0xFFF59E0B),
                      iconBgColor: const Color(0xFFFEF3C7),
                      iconBorderColor: const Color(0xFFFDE68A),
                      isDark: isDark,
                      valueColor: isDark ? Colors.white : const Color(0xFF0F172A),
                      onTap: () => setState(() => _selectedTab = 2),
                    ),

                    // Card 2: Citizen Hazard Reports
                    _buildKpiCard(
                      value: '$citizenReports',
                      label: 'Citizen Hazard Reports',
                      icon: Icons.warning_amber_rounded,
                      iconColor: const Color(0xFFD97706),
                      iconBgColor: const Color(0xFFFEF3C7),
                      iconBorderColor: const Color(0xFFFDE68A),
                      isDark: isDark,
                      valueColor: isDark ? Colors.white : const Color(0xFF0F172A),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const MyReportsScreen()),
                      ),
                    ),

                    // Card 3: Critical / Urgent Hazards (Red Number)
                    _buildKpiCard(
                      value: '$criticalHazards',
                      label: 'Critical / Urgent Hazards',
                      icon: Icons.shield_outlined,
                      iconColor: const Color(0xFFDC2626),
                      iconBgColor: const Color(0xFFFEE2E2),
                      iconBorderColor: const Color(0xFFFECACA),
                      isDark: isDark,
                      valueColor: const Color(0xFFDC2626), // Bold Red matching Photo 1!
                      onTap: () => setState(() => _selectedTab = 2),
                    ),

                    // Card 4: Repair Attention Needed
                    _buildKpiCard(
                      value: '$repairNeeded',
                      label: 'Repair Attention Needed',
                      icon: Icons.show_chart_rounded,
                      iconColor: const Color(0xFFD97706),
                      iconBgColor: const Color(0xFFFEF3C7),
                      iconBorderColor: const Color(0xFFFDE68A),
                      isDark: isDark,
                      valueColor: isDark ? Colors.white : const Color(0xFF0F172A),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const WorkOrderListScreen()),
                      ),
                    ),
                  ],
                );
              },
            ),

            const SizedBox(height: 28),

            // ── SECTION 2: CIRCULAR MENU ACTION BUTTONS (Photo 3 & Photo 2) ──
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Supervisor Operations',
                  style: TextStyle(
                    fontSize: 16.5,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    letterSpacing: -0.2,
                  ),
                ),
                const Text(
                  'Portal Shortcuts',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFFF59E0B),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Double-Ring Circular Buttons Grid matching Photo 3
            Container(
              padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 12),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(
                  color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                  width: 1,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
                    blurRadius: 10,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: Column(
                children: [
                  // Row 1: 4 circular action buttons (All Orange Theme)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 1. Asset GIS Map
                      _buildCircularMenuButton(
                        icon: Icons.explore_rounded,
                        label: 'Asset Map',
                        color: const Color(0xFFF97316), // Vibrant Orange
                        isDark: isDark,
                        onTap: () => setState(() => _selectedTab = 2),
                      ),

                      // 2. Work Orders
                      _buildCircularMenuButton(
                        icon: Icons.assignment_rounded,
                        label: 'Work Orders',
                        color: const Color(0xFFEA580C), // Deep Orange
                        isDark: isDark,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const WorkOrderListScreen()),
                        ),
                      ),

                      // 3. Citizen Reports
                      _buildCircularMenuButton(
                        icon: Icons.report_problem_rounded,
                        label: 'Citizen Reports',
                        color: const Color(0xFFFB8C00), // Amber Orange
                        isDark: isDark,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const MyReportsScreen()),
                        ),
                      ),

                      // 4. Create Work Order
                      _buildCircularMenuButton(
                        icon: Icons.add_task_rounded,
                        label: 'Create Order',
                        color: const Color(0xFFF97316), // Vibrant Orange
                        isDark: isDark,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const CreateWorkOrderScreen()),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 20),

                  // Row 2: 4 circular action buttons (All Orange Theme)
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // 5. Field Inspector Portal
                      _buildCircularMenuButton(
                        icon: Icons.handyman_rounded,
                        label: 'Field Portal',
                        color: const Color(0xFFD97706), // Warm Orange-Gold
                        isDark: isDark,
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const FieldWorkerScreen()),
                        ),
                      ),

                      // 6. Maintenance Records
                      _buildCircularMenuButton(
                        icon: Icons.build_circle_rounded,
                        label: 'Maintenance',
                        color: const Color(0xFFEA580C), // Deep Orange
                        isDark: isDark,
                        onTap: () => _showMaintenanceSheet(context, isDark),
                      ),

                      // 7. Infrastructure Assets
                      _buildCircularMenuButton(
                        icon: Icons.account_balance_rounded,
                        label: 'Assets',
                        color: const Color(0xFFC2410C), // Terracotta Orange
                        isDark: isDark,
                        onTap: () => _showAssetsSheet(context, isDark),
                      ),

                      // 8. Autonomous AI Models
                      _buildCircularMenuButton(
                        icon: Icons.psychology_rounded,
                        label: 'AI Models',
                        color: const Color(0xFFF97316), // Vibrant Orange
                        isDark: isDark,
                        onTap: () => _showAiModelsSheet(context, isDark),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 26),

            // ── SECTION 3: URGENT ATTENTION QUEUE ────────────────────────────
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Critical Attention Queue',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: isDark ? Colors.white : const Color(0xFF0F172A),
                    letterSpacing: -0.2,
                  ),
                ),
                TextButton(
                  onPressed: () => setState(() => _selectedTab = 2),
                  child: const Text(
                    'View on Map',
                    style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700, color: Color(0xFFF59E0B)),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),

            if (urgentList.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.check_circle_outline, color: Color(0xFF10B981), size: 28),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'All Critical Items Addressed',
                            style: TextStyle(
                              fontWeight: FontWeight.w700,
                              color: isDark ? Colors.white : const Color(0xFF0F172A),
                            ),
                          ),
                          Text(
                            'No pending critical severity alerts requiring immediate supervisor escalation.',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              )
            else
              ...urgentList.map((hazard) => _buildUrgentItemCard(hazard, isDark)),

            const SizedBox(height: 24),

            // ── SECTION 4: QUICK DISPATCH CTA ───────────────────────────────
            InkWell(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ReportHazardScreen()),
              ).then((_) => _loadStats()),
              borderRadius: BorderRadius.circular(16),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: isDark
                        ? [const Color(0xFF0F172A), const Color(0xFF1E293B)]
                        : [const Color(0xFFF97316), const Color(0xFFEA580C)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFFED7AA),
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: (isDark ? Colors.black : const Color(0xFFEA580C)).withValues(alpha: 0.18),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: isDark ? 0.2 : 0.25),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Icon(Icons.add_location_alt_outlined, color: Colors.white, size: 24),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Log New Municipal Hazard',
                            style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 14.5),
                          ),
                          Text(
                            'Pin location & auto-trigger AI triage analysis',
                            style: TextStyle(color: Colors.white.withValues(alpha: 0.9), fontSize: 11.5),
                          ),
                        ],
                      ),
                    ),
                    const Icon(Icons.arrow_forward_ios_rounded, color: Colors.white70, size: 14),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // KPI METRIC CARD (Exact match to Photo 1)
  // ═════════════════════════════════════════════════════════════════════════════

  Widget _buildKpiCard({
    required String value,
    required String label,
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required Color iconBorderColor,
    required bool isDark,
    required Color valueColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: isDark ? const Color(0xFF1E293B) : Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
            width: 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: isDark ? 0.2 : 0.03),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Rounded square container for icon (matching photo 1)
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: isDark ? iconColor.withValues(alpha: 0.15) : iconBgColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: isDark ? iconColor.withValues(alpha: 0.3) : iconBorderColor,
                  width: 1,
                ),
              ),
              child: Icon(
                icon,
                color: iconColor,
                size: 21,
              ),
            ),
            const SizedBox(width: 12),

            // Number + Label
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    value,
                    style: TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: valueColor,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    label,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 11.5,
                      fontWeight: FontWeight.w500,
                      color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                      height: 1.2,
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

  // ═════════════════════════════════════════════════════════════════════════════
  // CIRCULAR MENU BUTTON (Exact match to Photo 3 Double-Ring Pattern)
  // ═════════════════════════════════════════════════════════════════════════════

  Widget _buildCircularMenuButton({
    required IconData icon,
    required String label,
    required Color color,
    required bool isDark,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(36),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Concentric double-ring circular container
          Container(
            width: 58,
            height: 58,
            padding: const EdgeInsets.all(3.5), // Ring gap
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(
                color: color.withValues(alpha: 0.55),
                width: 2.2,
              ),
              boxShadow: [
                BoxShadow(
                  color: color.withValues(alpha: 0.22),
                  blurRadius: 8,
                  offset: const Offset(0, 3),
                ),
              ],
            ),
            child: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                gradient: LinearGradient(
                  colors: [
                    color,
                    color.withValues(alpha: 0.85),
                  ],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
              child: Icon(
                icon,
                color: Colors.white,
                size: 24,
              ),
            ),
          ),
          const SizedBox(height: 7),
          SizedBox(
            width: 72,
            child: Text(
              label,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 11.5,
                fontWeight: FontWeight.w700,
                color: isDark ? const Color(0xFFE2E8F0) : const Color(0xFF1E293B),
                letterSpacing: -0.2,
                height: 1.15,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // URGENT ITEM CARD
  // ═════════════════════════════════════════════════════════════════════════════

  Widget _buildUrgentItemCard(Hazard hazard, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: const Color(0xFFDC2626).withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: const Color(0xFFFEE2E2),
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Icon(Icons.priority_high_rounded, color: Color(0xFFDC2626), size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      hazard.ticketNumber,
                      style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                    ),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFFDC2626),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        hazard.severity ?? 'CRITICAL',
                        style: const TextStyle(color: Colors.white, fontSize: 9.5, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  hazard.description,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 12,
                    color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => CreateWorkOrderScreen(initialHazardId: hazard.id),
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // PROFILE TAB
  // ═════════════════════════════════════════════════════════════════════════════

  Widget _buildProfileTab(BuildContext context, bool isDark, dynamic user) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(
        children: [
          const SizedBox(height: 20),
          CircleAvatar(
            radius: 44,
            backgroundColor: const Color(0xFFF59E0B).withValues(alpha: 0.2),
            child: const Icon(Icons.person_rounded, size: 48, color: Color(0xFFF59E0B)),
          ),
          const SizedBox(height: 14),
          Text(
            user?.fullName ?? 'Field Supervisor',
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          ),
          Text(
            user?.email ?? 'supervisor@civilanka.gov.lk',
            style: TextStyle(color: isDark ? Colors.grey[400] : Colors.grey[600], fontSize: 13),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFFFDE68A)),
            ),
            child: const Text(
              'Field Maintenance Supervisor',
              style: TextStyle(color: Color(0xFFB45309), fontSize: 11, fontWeight: FontWeight.bold),
            ),
          ),
          const SizedBox(height: 32),

          // Menu Options
          _profileOptionTile(
            icon: Icons.assignment_outlined,
            title: 'Manage Municipal Work Orders',
            subtitle: 'Assign, inspect, and approve repairs',
            onTap: () => setState(() => _selectedTab = 1),
            isDark: isDark,
          ),
          _profileOptionTile(
            icon: Icons.map_outlined,
            title: 'Municipal GIS Asset Map',
            subtitle: 'Interactive map pins and GPS routing',
            onTap: () => setState(() => _selectedTab = 2),
            isDark: isDark,
          ),
          _profileOptionTile(
            icon: Icons.handyman_outlined,
            title: 'Field Worker Execution Mode',
            subtitle: 'Launch Member 4 mobile field worker portal',
            onTap: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const FieldWorkerScreen()),
            ),
            isDark: isDark,
          ),

          const SizedBox(height: 24),

          // Sign Out Button
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              onPressed: () => context.read<AuthState>().logout(context),
              icon: const Icon(Icons.logout, color: Colors.red),
              label: const Text('Sign Out of CivitaGuard', style: TextStyle(color: Colors.red)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: Colors.red),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _profileOptionTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    required bool isDark,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: ListTile(
        leading: Icon(icon, color: const Color(0xFFF59E0B)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text(subtitle, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
        trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
        onTap: onTap,
      ),
    );
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // MODAL BOTTOM SHEETS (Assets, Maintenance, AI Models)
  // ═════════════════════════════════════════════════════════════════════════════

  void _showAssetsSheet(BuildContext context, bool isDark) {
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[400],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'INFRASTRUCTURE & ASSETS',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 1.2,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                ),
              ),
              const SizedBox(height: 16),

              // Sub-button 1: Infrastructure Assets (Highlighted Orange Pill matching Photo 1)
              InkWell(
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const InfrastructureAssetsScreen()),
                  );
                },
                borderRadius: BorderRadius.circular(20),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF97316), // Orange pill background matching Photo 1
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFFF97316).withValues(alpha: 0.35),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Row(
                    children: [
                      Icon(Icons.apartment_rounded, color: Colors.white, size: 24),
                      SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          'Infrastructure Assets',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      Icon(Icons.arrow_forward_ios_rounded, color: Colors.white, size: 16),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Sub-button 2: Contractors Directory (Matching Photo 1)
              InkWell(
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const ContractorsDirectoryScreen()),
                  );
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.people_outline_rounded,
                        color: isDark ? Colors.white70 : const Color(0xFF475569),
                        size: 22,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          'Contractors Directory',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : const Color(0xFF0F172A),
                          ),
                        ),
                      ),
                      Icon(
                        Icons.arrow_forward_ios_rounded,
                        color: isDark ? Colors.white38 : Colors.grey[400],
                        size: 14,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12),

              // Sub-button 3: Repair History (Matching Photo 1)
              InkWell(
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const RepairHistoryScreen()),
                  );
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.history_toggle_off_rounded,
                        color: isDark ? Colors.white70 : const Color(0xFF475569),
                        size: 22,
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Text(
                          'Repair History',
                          style: TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: isDark ? Colors.white : const Color(0xFF0F172A),
                          ),
                        ),
                      ),
                      Icon(
                        Icons.arrow_forward_ios_rounded,
                        color: isDark ? Colors.white38 : Colors.grey[400],
                        size: 14,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 12),
            ],
          ),
        );
      },
    );
  }

  void _showMaintenanceSheet(BuildContext context, bool isDark) {
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Field Maintenance & Sign-Off',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              Text(
                'Review field worker progress, sign off completions, and inspect verification queues.',
                style: TextStyle(color: Colors.grey[600], fontSize: 12.5),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0891B2).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.handyman_rounded, color: Color(0xFF0891B2)),
                ),
                title: const Text('Field Inspector Mode', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('Launch field worker checklist & photo sign-off'),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const FieldWorkerScreen()));
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB).withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.assignment_rounded, color: Color(0xFF2563EB)),
                ),
                title: const Text('Work Orders Registry', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('View all municipal work orders & AI estimates'),
                trailing: const Icon(Icons.arrow_forward_ios_rounded, size: 14),
                onTap: () {
                  Navigator.pop(ctx);
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const WorkOrderListScreen()));
                },
              ),
            ],
          ),
        );
      },
    );
  }

  void _showAiModelsSheet(BuildContext context, bool isDark) {
    showModalBottomSheet(
      context: context,
      backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFD946EF).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.psychology_rounded, color: Color(0xFFD946EF)),
                  ),
                  const SizedBox(width: 12),
                  const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Autonomous AI Models',
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'CivitaGuard AI Intelligence Suite',
                        style: TextStyle(fontSize: 12, color: Colors.grey),
                      ),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 18),
              _aiModelTile(
                title: 'Hazard Classification AI',
                desc: 'Deep learning triage classifying potholes, water leaks & electrical hazards with 94%+ confidence.',
                icon: Icons.center_focus_strong_outlined,
              ),
              _aiModelTile(
                title: 'Asset Risk Prediction AI',
                desc: 'Evaluates structural degradation telemetry to forecast failure probabilities on bridges & water mains.',
                icon: Icons.trending_up_rounded,
              ),
              _aiModelTile(
                title: 'Cost Estimator AI (RAG)',
                desc: 'Synthesizes municipal BOQ rates with historical material invoices for instant work order estimates.',
                icon: Icons.calculate_outlined,
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _aiModelTile({
    required String title,
    required String desc,
    required IconData icon,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: const Color(0xFFD946EF)),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5)),
                const SizedBox(height: 1),
                Text(desc, style: const TextStyle(fontSize: 11.5, color: Colors.grey)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatTime(DateTime time) {
    final hour = time.hour > 12 ? time.hour - 12 : (time.hour == 0 ? 12 : time.hour);
    final minute = time.minute.toString().padLeft(2, '0');
    final period = time.hour >= 12 ? 'PM' : 'AM';
    return '$hour:$minute $period';
  }
}
