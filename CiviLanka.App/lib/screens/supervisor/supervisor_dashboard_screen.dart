import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/widgets/civic_badge.dart';
import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_states.dart';
import '../../models/hazard.dart';
import '../../models/work_order.dart';
import '../../services/auth_service.dart';
import '../../services/hazard_service.dart';
import '../../services/maintenance_service.dart';
import '../../services/work_order_service.dart';
import '../../theme/app_colors.dart';
import '../citizen/hazard_details_screen.dart';
import '../create_work_order_screen.dart';
import '../work_order_details_screen.dart';
import '../shared/profile_screen.dart';
import '../../widgets/municipal_app_drawer.dart';

class SupervisorDashboardScreen extends StatefulWidget {
  final Function(int)? onNavigateTab;

  const SupervisorDashboardScreen({super.key, this.onNavigateTab});

  @override
  State<SupervisorDashboardScreen> createState() =>
      _SupervisorDashboardScreenState();
}

class _SupervisorDashboardScreenState extends State<SupervisorDashboardScreen> {
  bool _loading = true;
  String? _error;

  List<Hazard> _priorityHazards = [];
  List<WorkOrder> _activeWorkOrders = [];
  List<WorkOrder> _pendingApprovals = [];
  int _safetyAlertsCount = 0;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final hazardService = context.read<HazardService>();
      final workOrderService = context.read<WorkOrderService>();
      final maintenanceService = context.read<MaintenanceService>();

      final hazards = await hazardService.getAllHazards();
      final workOrders = await workOrderService.getWorkOrders();
      final maintenanceList = await maintenanceService.getAll();

      final priorityHazards = hazards
          .where((h) =>
              h.priority.toUpperCase() == 'CRITICAL' ||
              h.priority.toUpperCase() == 'HIGH' ||
              h.priority.toUpperCase() == 'URGENT')
          .take(4)
          .toList();

      final activeWorkOrders = workOrders
          .where((w) =>
              w.status.toUpperCase() == 'IN_PROGRESS' ||
              w.status.toUpperCase() == 'ASSIGNED' ||
              w.status.toUpperCase() == 'SCHEDULED')
          .take(4)
          .toList();

      final pendingApprovals = workOrders
          .where((w) =>
              w.status.toUpperCase() == 'PENDING_APPROVAL' ||
              w.approvalStatus.toUpperCase() == 'PENDING')
          .take(4)
          .toList();

      final safetyAlerts = maintenanceList
          .where((m) =>
              m.aiSafetyAnalysis != null &&
              m.aiSafetyAnalysis!.complianceStatus.toLowerCase() != 'compliant')
          .length;

      setState(() {
        _priorityHazards = priorityHazards;
        _activeWorkOrders = activeWorkOrders;
        _pendingApprovals = pendingApprovals;
        _safetyAlertsCount = safetyAlerts;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().currentUser;
    final userName = user?.fullName.split(' ').first ?? 'Supervisor';

    return Scaffold(
      backgroundColor: AppColors.cityBg,
      drawer: const MunicipalAppDrawer(
        role: 'supervisor',
        activeRoute: '/supervisor-dashboard',
      ),
      appBar: AppBar(
        leading: Builder(
          builder: (ctx) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            tooltip: 'Operations Menu',
            onPressed: () => Scaffold.of(ctx).openDrawer(),
          ),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Good morning, $userName',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const Text(
              'Municipal Operations',
              style: TextStyle(fontSize: 11, color: AppColors.slate500),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Operations',
            onPressed: _loadDashboardData,
          ),
          IconButton(
            icon: const Icon(Icons.account_circle_outlined, color: AppColors.purple),
            tooltip: 'Supervisor Profile',
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ProfileScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: AppColors.critical),
            tooltip: 'Sign Out',
            onPressed: () => _confirmSignOut(context),
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: _loading
          ? const CivicSkeletonList(itemCount: 5, height: 80)
          : _error != null
              ? Center(
                  child: CivicErrorCard(
                    message: _error!,
                    onRetry: _loadDashboardData,
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadDashboardData,
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Supervisor Profile Header Card
                        _buildSupervisorProfileCard(user),

                        // Metrics 2x2 Grid
                        Row(
                          children: [
                            Expanded(
                              child: CivicStatCard(
                                title: 'Open Hazards',
                                value: '${_priorityHazards.length}',
                                icon: Icons.warning_amber_rounded,
                                iconColor: AppColors.warning,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: CivicStatCard(
                                title: 'Pending Approval',
                                value: '${_pendingApprovals.length}',
                                icon: Icons.gavel_outlined,
                                iconColor: AppColors.purple,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: CivicStatCard(
                                title: 'Active Work Orders',
                                value: '${_activeWorkOrders.length}',
                                icon: Icons.construction_outlined,
                                iconColor: AppColors.primary,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: CivicStatCard(
                                title: 'Safety Alerts',
                                value: '$_safetyAlertsCount',
                                icon: Icons.security_outlined,
                                iconColor: AppColors.critical,
                              ),
                            ),
                          ],
                        ),

                        const SizedBox(height: 24),

                        // Priority Incidents Section
                        _buildSectionHeader('Priority Incidents', () {
                          widget.onNavigateTab?.call(1); // Hazards Tab
                        }),
                        const SizedBox(height: 10),
                        if (_priorityHazards.isEmpty)
                          const CivicCard(
                            child: Text(
                              'No critical incidents pending review.',
                              style: TextStyle(color: AppColors.slate500, fontSize: 13),
                            ),
                          )
                        else
                          ..._priorityHazards.map((h) => _buildHazardCard(h)),

                        const SizedBox(height: 24),

                        // Active Work Orders Section
                        _buildSectionHeader('Active Field Operations', () {
                          widget.onNavigateTab?.call(2); // Work Orders Tab
                        }),
                        const SizedBox(height: 10),
                        if (_activeWorkOrders.isEmpty)
                          const CivicCard(
                            child: Text(
                              'No active work orders currently scheduled.',
                              style: TextStyle(color: AppColors.slate500, fontSize: 13),
                            ),
                          )
                        else
                          ..._activeWorkOrders.map((wo) => _buildWorkOrderCard(wo)),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildSectionHeader(String title, VoidCallback onViewAll) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 16,
            fontWeight: FontWeight.bold,
            color: AppColors.slate900,
          ),
        ),
        TextButton(
          onPressed: onViewAll,
          child: const Text('View All', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }

  Widget _buildHazardCard(Hazard h) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: CivicCard(
        padding: const EdgeInsets.all(14),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => HazardDetailsScreen(hazardId: h.id),
            ),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                CivicPriorityBadge(priority: h.priority),
                CivicStatusBadge(status: h.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              h.title,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
            ),
            const SizedBox(height: 4),
            Text(
              h.locationAddress,
              style: const TextStyle(fontSize: 12, color: AppColors.slate600),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  h.ticketNumber,
                  style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: AppColors.primary),
                ),
                TextButton.icon(
                  icon: const Icon(Icons.add_task, size: 14),
                  label: const Text('Create Work Order', style: TextStyle(fontSize: 11)),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => CreateWorkOrderScreen(initialHazardId: h.id),
                      ),
                    );
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildWorkOrderCard(WorkOrder wo) {
    final currencyFmt = NumberFormat.currency(symbol: 'Rs. ', decimalDigits: 0);

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      child: CivicCard(
        padding: const EdgeInsets.all(14),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => WorkOrderDetailsScreen(workOrderId: wo.id),
            ),
          );
        },
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  wo.orderNumber,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'monospace',
                    color: AppColors.primaryDark,
                  ),
                ),
                CivicStatusBadge(status: wo.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              wo.title,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.slate900),
            ),
            const SizedBox(height: 6),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  wo.estimatedCost != null
                      ? 'Est: ${currencyFmt.format(wo.estimatedCost)}'
                      : 'No estimate',
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate700),
                ),
                if (wo.scheduledDate != null)
                  Text(
                    'Due: ${DateFormat('MMM dd').format(wo.scheduledDate!)}',
                    style: const TextStyle(fontSize: 11, color: AppColors.slate500),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  void _confirmSignOut(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Row(
          children: const [
            Icon(Icons.logout_rounded, color: AppColors.critical),
            SizedBox(width: 8),
            Text('Sign Out', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
          ],
        ),
        content: const Text(
          'Are you sure you want to sign out of your supervisor operations session?',
          style: TextStyle(fontSize: 13.5, color: Color(0xFF475569)),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700)),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<AuthService>().logout();
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.critical,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: const Text('Sign Out', style: TextStyle(fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }

  Widget _buildSupervisorProfileCard(dynamic user) {
    final fullName = user?.fullName ?? 'Municipal Operations Lead';
    final email = user?.email ?? 'supervisor@cmc.gov.lk';
    final initial = fullName.isNotEmpty ? fullName[0].toUpperCase() : 'S';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFF0F172A),
            Color(0xFF2E1065),
            Color(0xFF1E1B4B),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(18),
        border: Border.all(
          color: const Color(0xFF8B5CF6).withValues(alpha: 0.4),
          width: 1.2,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2E1065).withValues(alpha: 0.25),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(2.5),
                decoration: const BoxDecoration(
                  shape: BoxShape.circle,
                  gradient: LinearGradient(
                    colors: [Color(0xFFA855F7), Color(0xFF8B5CF6)],
                  ),
                ),
                child: CircleAvatar(
                  radius: 24,
                  backgroundColor: const Color(0xFF1E1B4B),
                  child: Text(
                    initial,
                    style: const TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFFD8B4FE),
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            fullName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF8B5CF6).withValues(alpha: 0.25),
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: const Color(0xFFA855F7), width: 0.8),
                          ),
                          child: const Text(
                            'SUPERVISOR',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFFD8B4FE),
                              letterSpacing: 0.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      email,
                      style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11.5),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 2),
                    const Text(
                      'Colombo Municipal Operations • Zone 01 Dispatch',
                      style: TextStyle(
                        color: Color(0xFFC084FC),
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          const Divider(color: Color(0xFF334155), height: 1),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: InkWell(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(builder: (_) => const ProfileScreen()),
                    );
                  },
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: Colors.white.withValues(alpha: 0.15)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.person_outline_rounded, color: Colors.white, size: 15),
                        SizedBox(width: 6),
                        Text(
                          'My Profile',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: InkWell(
                  onTap: () => _confirmSignOut(context),
                  borderRadius: BorderRadius.circular(10),
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0xFFEF4444).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: const Color(0xFFEF4444).withValues(alpha: 0.3)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.logout_rounded, color: Color(0xFFFCA5A5), size: 15),
                        SizedBox(width: 6),
                        Text(
                          'Sign Out',
                          style: TextStyle(
                            color: Color(0xFFFCA5A5),
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
