import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_states.dart';
import '../../core/widgets/civic_badge.dart';
import '../../models/maintenance_record.dart';
import '../../services/maintenance_service.dart';
import '../../theme/app_colors.dart';

class SupervisorMaintenanceHistoryScreen extends StatefulWidget {
  const SupervisorMaintenanceHistoryScreen({Key? key}) : super(key: key);

  @override
  State<SupervisorMaintenanceHistoryScreen> createState() =>
      _SupervisorMaintenanceHistoryScreenState();
}

class _SupervisorMaintenanceHistoryScreenState
    extends State<SupervisorMaintenanceHistoryScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<MaintenanceRecord> _records = [];
  
  final List<String> _filters = ['All', 'Scheduled', 'In Progress', 'Completed', 'Verified'];
  String _selectedFilter = 'All';

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final maintenanceService = context.read<MaintenanceService>();
      final statusParam = _selectedFilter == 'All' ? null : _selectedFilter.replaceAll(' ', '');
      
      final records = await maintenanceService.getAll(status: statusParam);
      
      if (mounted) {
        setState(() {
          _records = records;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _onFilterChanged(String filter) {
    if (_selectedFilter == filter) return;
    setState(() {
      _selectedFilter = filter;
    });
    _loadData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text('Maintenance History'),
        backgroundColor: AppColors.slate900,
        foregroundColor: Colors.white,
        elevation: 0,
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(60),
          child: Container(
            color: AppColors.slate900,
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Row(
                children: _filters.map((filter) {
                  final isSelected = _selectedFilter == filter;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(
                      label: Text(filter),
                      selected: isSelected,
                      onSelected: (_) => _onFilterChanged(filter),
                      selectedColor: AppColors.purple.withOpacity(0.2),
                      backgroundColor: AppColors.slate800,
                      labelStyle: TextStyle(
                        color: isSelected ? AppColors.purple : Colors.white70,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(20),
                        side: BorderSide(
                          color: isSelected ? AppColors.purple : Colors.transparent,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: _loadData,
        color: AppColors.purple,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: CivicSkeletonList(),
      );
    }

    if (_errorMessage != null) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: CivicErrorCard(
          message: _errorMessage!,
          onRetry: _loadData,
        ),
      );
    }

    if (_records.isEmpty) {
      return CivicEmptyState(
        icon: Icons.history,
        title: 'No Records Found',
        message: 'There are no maintenance records matching the selected filter.',
        actionLabel: 'Refresh',
        onAction: _loadData,
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: _records.length,
      separatorBuilder: (context, index) => const SizedBox(height: 12),
      itemBuilder: (context, index) {
        final record = _records[index];
        final currencyFormat = NumberFormat.currency(symbol: 'LKR ', decimalDigits: 0);
        final createdDate = DateFormat('MMM d, yyyy h:mm a').format(record.createdAt);

        return CivicCard(
          onTap: () {},
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      record.workOrderNumber ?? 'WO-${record.workOrderId.substring(0, 8)}',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.bold,
                          ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  CivicStatusBadge(status: record.status),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                record.maintenanceType,
                style: const TextStyle(color: AppColors.purple, fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 4),
              Text(
                record.description.isNotEmpty ? record.description : 'No description provided.',
                style: const TextStyle(color: AppColors.textDark),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.timer_outlined, size: 16, color: AppColors.textGrey),
                      const SizedBox(width: 4),
                      Text('${record.labourHours} hrs', style: const TextStyle(color: AppColors.textGrey)),
                    ],
                  ),
                  Row(
                    children: [
                      const Icon(Icons.attach_money, size: 16, color: AppColors.textGrey),
                      const SizedBox(width: 4),
                      Text(currencyFormat.format(record.actualCost), style: const TextStyle(color: AppColors.textGrey, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Divider(color: AppColors.cityBorder),
              const SizedBox(height: 8),
              Row(
                children: [
                  const Icon(Icons.calendar_today, size: 14, color: AppColors.textGrey),
                  const SizedBox(width: 4),
                  Text('Created: $createdDate', style: const TextStyle(color: AppColors.textGrey, fontSize: 12)),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
