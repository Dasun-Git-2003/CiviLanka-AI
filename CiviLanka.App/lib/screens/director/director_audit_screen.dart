import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';

import '../../services/api_service.dart';
import '../../core/widgets/civic_card.dart';
import '../../theme/app_colors.dart';
import '../../core/widgets/civic_states.dart';

class AuditLog {
  final String id;
  final String action;
  final String entityType;
  final String entityId;
  final String performedBy;
  final String performedByEmail;
  final DateTime timestamp;
  final String details;

  AuditLog({
    required this.id,
    required this.action,
    required this.entityType,
    required this.entityId,
    required this.performedBy,
    required this.performedByEmail,
    required this.timestamp,
    required this.details,
  });

  factory AuditLog.fromJson(Map<String, dynamic> json) {
    return AuditLog(
      id: json['id']?.toString() ?? '',
      action: json['action'] as String? ?? 'UNKNOWN',
      entityType: json['entityType'] as String? ?? '',
      entityId: json['entityId']?.toString() ?? '',
      performedBy: json['performedBy'] as String? ?? 'System',
      performedByEmail: json['performedByEmail'] as String? ?? '',
      timestamp: json['timestamp'] != null
          ? DateTime.tryParse(json['timestamp'] as String) ?? DateTime.now()
          : DateTime.now(),
      details: json['details'] as String? ?? '',
    );
  }
}

class DirectorAuditScreen extends StatefulWidget {
  const DirectorAuditScreen({super.key});

  @override
  State<DirectorAuditScreen> createState() => _DirectorAuditScreenState();
}

class _DirectorAuditScreenState extends State<DirectorAuditScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<AuditLog> _allLogs = [];
  String _selectedFilter = 'All';

  final List<String> _filters = ['All', 'Hazards', 'WorkOrders', 'Maintenance', 'Auth'];

  @override
  void initState() {
    super.initState();
    _loadLogs();
  }

  Future<void> _loadLogs() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = context.read<ApiService>();
      final response = await apiService.dio.get('/api/audit-logs');
      
      final List<dynamic> data = response.data as List<dynamic>;
      final logs = data.map((json) => AuditLog.fromJson(json as Map<String, dynamic>)).toList();
      
      // Sort reverse chronological
      logs.sort((a, b) => b.timestamp.compareTo(a.timestamp));

      if (!mounted) return;
      setState(() {
        _allLogs = logs;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  List<AuditLog> get _filteredLogs {
    if (_selectedFilter == 'All') return _allLogs;
    return _allLogs.where((log) => log.entityType.toLowerCase() == _selectedFilter.toLowerCase()).toList();
  }

  Color _getActionColor(String action) {
    switch (action.toUpperCase()) {
      case 'CREATED':
        return AppColors.success;
      case 'UPDATED':
        return AppColors.info;
      case 'DELETED':
        return AppColors.critical;
      case 'APPROVED':
        return AppColors.purple;
      case 'REJECTED':
        return AppColors.warning; // or maybe orange, but warning is amber-500
      default:
        return AppColors.slate500;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text('Audit Ledger'),
        backgroundColor: AppColors.slate900,
        foregroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.warning),
      ),
      body: Column(
        children: [
          _buildFilters(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadLogs,
              color: AppColors.warning,
              child: _buildList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      width: double.infinity,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Date: ${DateFormat('MMM d, yyyy').format(DateTime.now().subtract(const Duration(days: 30)))} - ${DateFormat('MMM d, yyyy').format(DateTime.now())}',
            style: const TextStyle(
              color: AppColors.slate500,
              fontSize: 13,
              fontWeight: FontWeight.w500,
            ),
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _filters.map((filter) {
                final isSelected = _selectedFilter == filter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: FilterChip(
                    label: Text(filter),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() {
                        _selectedFilter = filter;
                      });
                    },
                    backgroundColor: AppColors.slate100,
                    selectedColor: AppColors.warning.withOpacity(0.2),
                    checkmarkColor: AppColors.warning,
                    labelStyle: TextStyle(
                      color: isSelected ? AppColors.warning : AppColors.slate700,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildList() {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: CivicSkeletonList(itemCount: 8),
      );
    }

    if (_errorMessage != null) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: CivicErrorCard(
          message: _errorMessage!,
          onRetry: _loadLogs,
        ),
      );
    }

    final logs = _filteredLogs;

    if (logs.isEmpty) {
      return const SingleChildScrollView(
        physics: AlwaysScrollableScrollPhysics(),
        child: Padding(
          padding: EdgeInsets.only(top: 60.0),
          child: CivicEmptyState(
            title: 'No audit logs found',
            message: 'There are no records matching the selected filter.',
            icon: Icons.history,
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: logs.length,
      itemBuilder: (context, index) {
        final log = logs[index];
        final actionColor = _getActionColor(log.action);
        
        return Padding(
          padding: const EdgeInsets.only(bottom: 12.0),
          child: CivicCard(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      DateFormat('MMM d, yyyy • h:mm a').format(log.timestamp),
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.slate500,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: actionColor.withOpacity(0.1),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        log.action.toUpperCase(),
                        style: TextStyle(
                          color: actionColor,
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.folder_outlined, size: 16, color: AppColors.slate400),
                    const SizedBox(width: 6),
                    Text(
                      '${log.entityType} #${log.entityId.length > 8 ? log.entityId.substring(0, 8) : log.entityId}',
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  log.details,
                  style: const TextStyle(color: AppColors.slate700, fontSize: 14),
                ),
                const Divider(height: 24),
                Row(
                  children: [
                    CircleAvatar(
                      radius: 12,
                      backgroundColor: AppColors.slate200,
                      child: Text(
                        log.performedBy.isNotEmpty ? log.performedBy[0].toUpperCase() : '?',
                        style: const TextStyle(fontSize: 10, color: AppColors.slate700),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '${log.performedBy} (${log.performedByEmail})',
                        style: const TextStyle(fontSize: 12, color: AppColors.slate600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
