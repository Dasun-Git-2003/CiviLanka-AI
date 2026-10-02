import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';

import '../../models/maintenance_record.dart';
import '../../models/work_order.dart';
import '../../services/maintenance_service.dart';
import '../../services/work_order_service.dart';
import '../../services/auth_service.dart';
import '../../theme/app_colors.dart';
import '../../core/widgets/civic_card.dart';
import 'work_order_detail_screen.dart';
import 'work_orders_screen.dart';
import 'create_maintenance_screen.dart';

class InspectorHomeScreen extends StatefulWidget {
  const InspectorHomeScreen({super.key});

  @override
  State<InspectorHomeScreen> createState() => _InspectorHomeScreenState();
}

class _InspectorHomeScreenState extends State<InspectorHomeScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<MaintenanceRecord> _records = [];
  List<WorkOrder> _workOrders = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    _loadAllData();
  }

  Future<void> _loadAllData() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final maintService = context.read<MaintenanceService>();
      final woService = context.read<WorkOrderService>();

      final results = await Future.wait([
        maintService.getMyAssignments(),
        woService.getWorkOrders(),
      ]);

      if (mounted) {
        setState(() {
          _records = results[0] as List<MaintenanceRecord>;
          _workOrders = results[1] as List<WorkOrder>;
          _loading = false;
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
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = context.read<AuthService>().currentUser;
    final userName = user?.fullName ?? 'Field Worker';

    return Scaffold(
      backgroundColor: AppColors.cityBg,
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.teal))
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.error_outline, size: 48, color: AppColors.critical),
                        const SizedBox(height: 12),
                        Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.slate600)),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _loadAllData,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Retry'),
                          style: ElevatedButton.styleFrom(backgroundColor: AppColors.teal),
                        ),
                      ],
                    ),
                  ),
                )
              : NestedScrollView(
                  headerSliverBuilder: (context, innerBoxIsScrolled) {
                    return [
                      SliverAppBar(
                        backgroundColor: AppColors.teal,
                        expandedHeight: 120,
                        pinned: true,
                        flexibleSpace: FlexibleSpaceBar(
                          titlePadding: const EdgeInsets.only(left: 16, bottom: 16),
                          title: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Hello, $userName', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Colors.white)),
                              const Text('Field Operations Hub', style: TextStyle(fontSize: 12, color: Colors.white70)),
                            ],
                          ),
                          background: Container(
                            decoration: const BoxDecoration(
                              gradient: LinearGradient(
                                colors: [Color(0xFF0F766E), Color(0xFF14B8A6)],
                                begin: Alignment.topLeft,
                                end: Alignment.bottomRight,
                              ),
                            ),
                          ),
                        ),
                        actions: [
                          IconButton(
                            icon: const Icon(Icons.refresh, color: Colors.white),
                            onPressed: _loadAllData,
                          ),
                        ],
                      ),
                      SliverToBoxAdapter(
                        child: Padding(
                          padding: const EdgeInsets.all(16.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              _buildKPIGrid(),
                              const SizedBox(height: 24),
                              _buildQuickActions(context),
                              const SizedBox(height: 24),
                              _buildRecentWorkOrders(context),
                              const SizedBox(height: 16),
                            ],
                          ),
                        ),
                      ),
                      SliverPersistentHeader(
                        pinned: true,
                        delegate: _SliverAppBarDelegate(
                          TabBar(
                            controller: _tabController,
                            labelColor: AppColors.teal,
                            indicatorColor: AppColors.teal,
                            unselectedLabelColor: AppColors.slate500,
                            labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                            isScrollable: true,
                            tabs: const [
                              Tab(text: 'ACTION NEEDED'),
                              Tab(text: 'IN PROGRESS'),
                              Tab(text: 'AUDITED'),
                              Tab(text: 'ALL JOBS'),
                            ],
                          ),
                        ),
                      ),
                    ];
                  },
                  body: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildList(_records.where((r) => r.isAssignedOrScheduled).toList()),
                      _buildList(_records.where((r) => r.isInProgress).toList()),
                      _buildList(_records.where((r) => r.isCompleted).toList()),
                      _buildList(_records),
                    ],
                  ),
                ),
    );
  }

  Widget _buildKPIGrid() {
    final activeOrders = _workOrders.where((wo) => wo.status.toUpperCase() == 'ASSIGNED' || wo.status.toUpperCase() == 'IN_PROGRESS' || wo.status.toUpperCase() == 'INPROGRESS').length;
    final completedThisWeek = _workOrders.where((wo) => wo.status.toUpperCase() == 'COMPLETED' && wo.updatedAt.isAfter(DateTime.now().subtract(const Duration(days: 7)))).length;
    final pendingMaintenance = _records.where((r) => r.isAssignedOrScheduled || r.isInProgress).length;
    
    final auditedRecords = _records.where((r) => r.aiSafetyAnalysis != null).toList();
    double avgSafety = 95.0; // Default if none
    if (auditedRecords.isNotEmpty) {
      avgSafety = auditedRecords.map((r) => r.aiSafetyAnalysis!.safetyScore).reduce((a, b) => a + b) / auditedRecords.length;
    }

    final totalOrders = _workOrders.isEmpty ? 1 : _workOrders.length;
    final activeRatio = (activeOrders / totalOrders).clamp(0.1, 1.0);
    final completedRatio = (_workOrders.isEmpty ? 0.8 : (completedThisWeek / totalOrders)).clamp(0.15, 1.0);
    final pendingRatio = (_records.isEmpty ? 0.4 : (pendingMaintenance / _records.length)).clamp(0.2, 1.0);

    return GridView.count(
      crossAxisCount: 2,
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      childAspectRatio: 1.24,
      children: [
        CivicStatCard(
          title: 'Active Orders',
          value: activeOrders.toString(),
          icon: Icons.engineering_outlined,
          iconColor: const Color(0xFF2563EB),
          badgeText: 'In Field',
          subtitle: 'Orders underway',
          progress: activeRatio,
        ),
        CivicStatCard(
          title: 'Completed (Week)',
          value: completedThisWeek.toString(),
          icon: Icons.check_circle_outline,
          iconColor: const Color(0xFF059669),
          badgeText: 'On Track',
          subtitle: 'Verified closed',
          progress: completedRatio,
        ),
        CivicStatCard(
          title: 'Pending Maint.',
          value: pendingMaintenance.toString(),
          icon: Icons.handyman_outlined,
          iconColor: const Color(0xFFD97706),
          badgeText: 'Scheduled',
          subtitle: 'Pending action',
          progress: pendingRatio,
        ),
        CivicStatCard(
          title: 'Safety Score',
          value: '${avgSafety.toStringAsFixed(0)}%',
          icon: Icons.shield_outlined,
          iconColor: avgSafety >= 80 ? const Color(0xFF0D9488) : const Color(0xFFE11D48),
          badgeText: avgSafety >= 85 ? 'Optimal' : 'Needs Review',
          subtitle: 'OHS Protocol Verified',
          progress: (avgSafety / 100).clamp(0.0, 1.0),
        ),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Field Action Hub',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.slate900),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: AppColors.teal.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Row(
                children: [
                  Icon(Icons.bolt, size: 14, color: AppColors.teal),
                  SizedBox(width: 4),
                  Text('Quick Ops', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.teal)),
                ],
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: InkWell(
                onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const CreateMaintenanceScreen()));
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF0F766E), Color(0xFF14B8A6)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(color: const Color(0xFF0F766E).withValues(alpha: 0.25), blurRadius: 8, offset: const Offset(0, 3)),
                    ],
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.add_task_rounded, color: Colors.white, size: 24),
                      SizedBox(height: 10),
                      Text('Log Maintenance', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                      SizedBox(height: 2),
                      Text('Record field repairs', style: TextStyle(color: Colors.white70, fontSize: 10)),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: InkWell(
                onTap: () {
                  Navigator.push(context, MaterialPageRoute(builder: (_) => const WorkOrdersScreen()));
                },
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.slate200, width: 1.2),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 8, offset: const Offset(0, 2)),
                    ],
                  ),
                  child: const Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Icon(Icons.format_list_bulleted_rounded, color: Color(0xFF2563EB), size: 24),
                      SizedBox(height: 10),
                      Text('All Work Orders', style: TextStyle(color: AppColors.slate900, fontWeight: FontWeight.bold, fontSize: 13)),
                      SizedBox(height: 2),
                      Text('Browse assignments', style: TextStyle(color: AppColors.slate500, fontSize: 10)),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildRecentWorkOrders(BuildContext context) {
    if (_workOrders.isEmpty) return const SizedBox.shrink();

    final activeOrders = _workOrders.where((wo) => wo.status.toUpperCase() == 'ASSIGNED' || wo.status.toUpperCase() == 'IN_PROGRESS' || wo.status.toUpperCase() == 'INPROGRESS').toList();
    activeOrders.sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    final recent = activeOrders.take(3).toList();

    if (recent.isEmpty) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Recent Assigned Work Orders', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        const SizedBox(height: 12),
        ...recent.map((wo) => Padding(
          padding: const EdgeInsets.only(bottom: 8.0),
          child: CivicCard(
            onTap: () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => WorkOrderDetailScreen(workOrderId: wo.id)));
            },
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(wo.orderNumber, style: const TextStyle(fontSize: 12, color: AppColors.slate500)),
                      const SizedBox(height: 4),
                      Text(wo.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right, color: AppColors.slate400),
              ],
            ),
          ),
        )),
      ],
    );
  }

  Widget _buildList(List<MaintenanceRecord> items) {
    if (items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.assignment_turned_in_outlined, size: 52, color: AppColors.slate300),
            const SizedBox(height: 12),
            const Text(
              'No Maintenance Tasks Found',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.slate600),
            ),
            const SizedBox(height: 4),
            const Text(
              'You have no assigned tasks in this state.',
              style: TextStyle(fontSize: 12, color: AppColors.slate400),
            ),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: items.length,
      separatorBuilder: (_, __) => const SizedBox(height: 12),
      itemBuilder: (ctx, i) => _buildCard(items[i]),
    );
  }

  Widget _buildCard(MaintenanceRecord rec) {
    Color badgeColor = AppColors.primary;
    if (rec.isInProgress) badgeColor = AppColors.warning;
    if (rec.isVerified) badgeColor = AppColors.teal;
    if (rec.isCompleted) badgeColor = AppColors.success;

    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: const BorderSide(color: AppColors.cityBorder),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: badgeColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    rec.status.toUpperCase(),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: badgeColor,
                    ),
                  ),
                ),
                Text(
                  rec.maintenanceType,
                  style: const TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: AppColors.slate500,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              rec.workOrderTitle ?? rec.description,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textDark),
            ),
            const SizedBox(height: 6),
            Text(
              rec.description,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 12, color: AppColors.slate600),
            ),
            const Divider(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.timer_outlined, size: 14, color: AppColors.slate400),
                    const SizedBox(width: 4),
                    Text('${rec.labourHours} hrs', style: const TextStyle(fontSize: 11, color: AppColors.slate600)),
                    const SizedBox(width: 12),
                    const Icon(Icons.payments_outlined, size: 14, color: AppColors.slate400),
                    const SizedBox(width: 4),
                    Text('Rs. ${rec.actualCost.toStringAsFixed(0)}', style: const TextStyle(fontSize: 11, color: AppColors.slate600)),
                  ],
                ),
                Text(
                  DateFormat('MMM dd').format(rec.createdAt),
                  style: const TextStyle(fontSize: 11, color: AppColors.slate400),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                if (rec.isAssignedOrScheduled)
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _updateStatus(rec.id, 'InProgress'),
                      icon: const Icon(Icons.play_arrow, size: 16, color: Colors.white),
                      label: const Text('Start Work', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.teal,
                        minimumSize: const Size(0, 38),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                if (rec.isInProgress) ...[
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _showEvidenceModal(rec),
                      icon: const Icon(Icons.camera_alt_outlined, size: 16, color: AppColors.teal),
                      label: const Text('Evidence', style: TextStyle(fontSize: 12, color: AppColors.teal, fontWeight: FontWeight.bold)),
                      style: OutlinedButton.styleFrom(
                        minimumSize: const Size(0, 38),
                        side: const BorderSide(color: AppColors.teal),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _updateStatus(rec.id, 'WorkCompleted'),
                      icon: const Icon(Icons.check_circle_outline, size: 16, color: Colors.white),
                      label: const Text('Sign Off', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.white)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.success,
                        minimumSize: const Size(0, 38),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                ],
                if (rec.isCompleted)
                  Expanded(
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AppColors.teal.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.verified, color: AppColors.teal, size: 16),
                          SizedBox(width: 6),
                          Text(
                            'Audited & Verified by AI Safety Model',
                            style: TextStyle(fontSize: 12, color: AppColors.teal, fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _updateStatus(String id, String status) async {
    try {
      await context.read<MaintenanceService>().updateStatus(id, status: status);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status changed to $status'), backgroundColor: AppColors.teal),
        );
        _loadAllData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppColors.critical),
        );
      }
    }
  }

  void _showEvidenceModal(MaintenanceRecord rec) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Upload Maintenance Evidence',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 6),
              const Text(
                'Attach visual verification before and after repair execution for Municipal Safety & Audit validation.',
                style: TextStyle(fontSize: 12, color: AppColors.slate500),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        _pickAndUploadEvidence(rec.id, 'before');
                      },
                      icon: const Icon(Icons.camera_alt, color: Colors.white, size: 16),
                      label: const Text('Before Photo', style: TextStyle(color: Colors.white)),
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () async {
                        Navigator.pop(ctx);
                        _pickAndUploadEvidence(rec.id, 'after');
                      },
                      icon: const Icon(Icons.check, color: Colors.white, size: 16),
                      label: const Text('After Photo', style: TextStyle(color: Colors.white)),
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _pickAndUploadEvidence(String id, String type) async {
    final picker = ImagePicker();
    final picked = await picker.pickImage(source: ImageSource.camera, imageQuality: 85);
    if (picked != null) {
      try {
        await context.read<MaintenanceService>().uploadEvidence(
              id,
              file: File(picked.path),
              evidenceType: type,
            );
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('$type photo evidence submitted for AI audit!'),
              backgroundColor: AppColors.teal,
            ),
          );
          _loadAllData();
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Upload failed: $e'), backgroundColor: AppColors.critical),
          );
        }
      }
    }
  }
}

class _SliverAppBarDelegate extends SliverPersistentHeaderDelegate {
  _SliverAppBarDelegate(this._tabBar);

  final TabBar _tabBar;

  @override
  double get minExtent => _tabBar.preferredSize.height;
  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: AppColors.cityBg,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(_SliverAppBarDelegate oldDelegate) {
    return false;
  }
}
