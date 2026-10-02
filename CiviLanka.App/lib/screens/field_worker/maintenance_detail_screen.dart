import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../models/maintenance_record.dart';
import '../../services/maintenance_service.dart';
import '../../theme/app_colors.dart';
import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_badge.dart';
import '../../core/widgets/civic_states.dart';

class MaintenanceDetailScreen extends StatefulWidget {
  final String recordId;

  const MaintenanceDetailScreen({required this.recordId, super.key});

  @override
  State<MaintenanceDetailScreen> createState() => _MaintenanceDetailScreenState();
}

class _MaintenanceDetailScreenState extends State<MaintenanceDetailScreen> {
  bool _isLoading = true;
  String? _error;
  MaintenanceRecord? _record;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final service = context.read<MaintenanceService>();
      final allRecords = await service.getAllRecords();
      final record = allRecords.firstWhere(
        (r) => r.id == widget.recordId,
        orElse: () => throw Exception('Maintenance record not found'),
      );
      
      if (mounted) {
        setState(() {
          _record = record;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text('Maintenance Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: AppColors.teal,
        foregroundColor: Colors.white,
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: CivicSkeletonList(itemCount: 3),
      );
    }
    if (_error != null) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: Center(
          child: CivicErrorCard(
            message: _error!,
            onRetry: _loadData,
          ),
        ),
      );
    }
    if (_record == null) {
      return const Center(child: Text('Record not found'));
    }

    final rec = _record!;

    return RefreshIndicator(
      onRefresh: _loadData,
      color: AppColors.teal,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildHeader(rec),
            const SizedBox(height: 16),
            _buildWorkDetails(rec),
            const SizedBox(height: 16),
            _buildCostInfo(rec),
            const SizedBox(height: 16),
            _buildTimestamps(rec),
            if (rec.beforeImageUrl != null || rec.afterImageUrl != null) ...[
              const SizedBox(height: 16),
              _buildImageSection(rec),
            ],
            if (rec.aiSafetyAnalysis != null) ...[
              const SizedBox(height: 16),
              _buildAISafetyAnalysis(rec.aiSafetyAnalysis!),
            ],
            if (rec.workerNotes != null && rec.workerNotes!.isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildWorkerNotes(rec),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(MaintenanceRecord rec) {
    return CivicCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                rec.maintenanceType,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppColors.slate900),
              ),
              CivicStatusBadge(status: rec.status),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            rec.workOrderTitle ?? 'Maintenance Task',
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.textDark),
          ),
          if (rec.workOrderNumber != null) ...[
            const SizedBox(height: 8),
            Text('WO: ${rec.workOrderNumber}', style: const TextStyle(fontSize: 14, color: AppColors.slate600)),
          ]
        ],
      ),
    );
  }

  Widget _buildWorkDetails(MaintenanceRecord rec) {
    return CivicCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Work Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          const Text('Description', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate500)),
          const SizedBox(height: 4),
          Text(rec.description, style: const TextStyle(fontSize: 14, color: AppColors.slate800)),
          const SizedBox(height: 12),
          if (rec.materialsUsed != null && rec.materialsUsed!.isNotEmpty) ...[
            const Text('Materials Used', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate500)),
            const SizedBox(height: 4),
            Text(rec.materialsUsed!, style: const TextStyle(fontSize: 14, color: AppColors.slate800)),
            const SizedBox(height: 12),
          ],
          if (rec.equipmentUsed != null && rec.equipmentUsed!.isNotEmpty) ...[
            const Text('Equipment Used', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.slate500)),
            const SizedBox(height: 4),
            Text(rec.equipmentUsed!, style: const TextStyle(fontSize: 14, color: AppColors.slate800)),
            const SizedBox(height: 12),
          ],
          Row(
            children: [
              const Icon(Icons.timer_outlined, size: 16, color: AppColors.slate500),
              const SizedBox(width: 8),
              Text('Labour Hours: ${rec.labourHours} hrs', style: const TextStyle(fontSize: 14, color: AppColors.slate800)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildCostInfo(MaintenanceRecord rec) {
    final formatCurrency = NumberFormat.currency(symbol: 'LKR ', decimalDigits: 0);
    return CivicCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Actual Cost', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          Text(
            formatCurrency.format(rec.actualCost),
            style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.slate900),
          ),
        ],
      ),
    );
  }

  Widget _buildTimestamps(MaintenanceRecord rec) {
    final dateFormat = DateFormat('MMM dd, yyyy HH:mm');
    return CivicCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Timeline', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          _buildTimeRow('Created', dateFormat.format(rec.createdAt)),
          if (rec.workStartedAt != null) ...[
            const SizedBox(height: 8),
            _buildTimeRow('Started', dateFormat.format(rec.workStartedAt!)),
          ],
          if (rec.workCompletedAt != null) ...[
            const SizedBox(height: 8),
            _buildTimeRow('Completed', dateFormat.format(rec.workCompletedAt!)),
          ],
        ],
      ),
    );
  }

  Widget _buildTimeRow(String label, String time) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(fontSize: 14, color: AppColors.slate600)),
        Text(time, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500, color: AppColors.slate900)),
      ],
    );
  }

  Widget _buildImageSection(MaintenanceRecord rec) {
    return CivicCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Evidence Photos', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 12),
          Row(
            children: [
              if (rec.beforeImageUrl != null)
                Expanded(
                  child: Column(
                    children: [
                      const Text('Before', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: CachedNetworkImage(
                          imageUrl: rec.beforeImageUrl!,
                          height: 120,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          placeholder: (context, url) => Container(color: AppColors.slate200, child: const Center(child: CircularProgressIndicator())),
                          errorWidget: (context, url, error) => Container(color: AppColors.slate200, child: const Icon(Icons.error)),
                        ),
                      ),
                    ],
                  ),
                ),
              if (rec.beforeImageUrl != null && rec.afterImageUrl != null)
                const SizedBox(width: 12),
              if (rec.afterImageUrl != null)
                Expanded(
                  child: Column(
                    children: [
                      const Text('After', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: CachedNetworkImage(
                          imageUrl: rec.afterImageUrl!,
                          height: 120,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          placeholder: (context, url) => Container(color: AppColors.slate200, child: const Center(child: CircularProgressIndicator())),
                          errorWidget: (context, url, error) => Container(color: AppColors.slate200, child: const Icon(Icons.error)),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAISafetyAnalysis(MaintenanceSafetyAnalysis analysis) {
    Color scoreColor = AppColors.success;
    if (analysis.safetyScore < 60) {
      scoreColor = AppColors.critical;
    } else if (analysis.safetyScore < 80) {
      scoreColor = AppColors.warning;
    }

    return CivicCard(
      backgroundColor: AppColors.slate100,
      borderColor: AppColors.slate200,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.security, color: AppColors.teal, size: 20),
              const SizedBox(width: 8),
              const Expanded(
                child: Text('AI Safety Analysis', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: scoreColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Score: ${analysis.safetyScore}',
                  style: TextStyle(fontWeight: FontWeight.bold, color: scoreColor, fontSize: 12),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              const Text('Compliance Status: ', style: TextStyle(fontSize: 13, color: AppColors.slate600)),
              Text(
                analysis.complianceStatus,
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: scoreColor),
              ),
            ],
          ),
          if (analysis.identifiedRisks.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text('Identified Risks:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            ...analysis.identifiedRisks.map((r) => Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('• ', style: TextStyle(color: AppColors.critical)),
                Expanded(child: Text(r, style: const TextStyle(fontSize: 13, color: AppColors.slate700))),
              ]),
            )),
          ],
          if (analysis.requiredMitigations.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text('Required Mitigations:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            ...analysis.requiredMitigations.map((m) => Padding(
              padding: const EdgeInsets.only(bottom: 2),
              child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                const Text('• ', style: TextStyle(color: AppColors.success)),
                Expanded(child: Text(m, style: const TextStyle(fontSize: 13, color: AppColors.slate700))),
              ]),
            )),
          ],
          if (analysis.reasoning != null) ...[
            const SizedBox(height: 12),
            const Text('Reasoning:', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(analysis.reasoning!, style: const TextStyle(fontSize: 12, color: AppColors.slate600, fontStyle: FontStyle.italic)),
          ],
        ],
      ),
    );
  }

  Widget _buildWorkerNotes(MaintenanceRecord rec) {
    return CivicCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Worker Notes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          const SizedBox(height: 8),
          Text(
            rec.workerNotes!,
            style: const TextStyle(fontSize: 14, color: AppColors.slate700),
          ),
        ],
      ),
    );
  }
}
