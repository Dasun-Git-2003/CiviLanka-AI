
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../core/widgets/civic_badge.dart';
import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_states.dart';
import '../../models/hazard.dart';
import '../../services/hazard_service.dart';
import '../../theme/app_colors.dart';
import 'hazard_details_screen.dart';

class CitizenMyReportsScreen extends StatefulWidget {
  const CitizenMyReportsScreen({super.key});

  @override
  State<CitizenMyReportsScreen> createState() => _CitizenMyReportsScreenState();
}

class _CitizenMyReportsScreenState extends State<CitizenMyReportsScreen> {
  String _selectedFilter = 'All';
  final List<String> _filters = [
    'All',
    'Submitted',
    'In Progress',
    'Resolved',
    'Cancelled'
  ];

  List<Hazard> _hazards = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadMyHazards();
  }

  Future<void> _loadMyHazards() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final list = await context.read<HazardService>().getMyHazards();
      setState(() {
        _hazards = list;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  List<Hazard> get _filteredHazards {
    if (_selectedFilter == 'All') return _hazards;
    return _hazards.where((h) {
      final s = h.status.toUpperCase();
      switch (_selectedFilter) {
        case 'Submitted':
          return s == 'REPORTED' || s == 'SUBMITTED' || s == 'PENDINGAIANALYSIS';
        case 'In Progress':
          return s == 'INPROGRESS' || s == 'WORKORDERCREATED' || s == 'ASSIGNED';
        case 'Resolved':
          return s == 'RESOLVED' || s == 'COMPLETED' || s == 'VERIFIED';
        case 'Cancelled':
          return s == 'CANCELLED';
        default:
          return true;
      }
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text(
          'My Reports',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadMyHazards,
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: _filters.map((f) {
                final isSelected = _selectedFilter == f;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(f),
                    selected: isSelected,
                    selectedColor: AppColors.primary.withValues(alpha: 0.15),
                    checkmarkColor: AppColors.primary,
                    labelStyle: TextStyle(
                      color: isSelected ? AppColors.primaryDark : AppColors.slate700,
                      fontWeight:
                          isSelected ? FontWeight.bold : FontWeight.normal,
                      fontSize: 12,
                    ),
                    onSelected: (_) => setState(() => _selectedFilter = f),
                  ),
                );
              }).toList(),
            ),
          ),
          const Divider(height: 1),

          Expanded(
            child: _loading
                ? const CivicSkeletonList(itemCount: 4, height: 100)
                : _error != null
                    ? Center(
                        child: CivicErrorCard(
                          message: _error!,
                          onRetry: _loadMyHazards,
                        ),
                      )
                    : _filteredHazards.isEmpty
                        ? const CivicEmptyState(
                            title: 'No Reports Found',
                            message:
                                'You have not submitted any reports matching this status.',
                            icon: Icons.assignment_outlined,
                          )
                        : RefreshIndicator(
                            onRefresh: _loadMyHazards,
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _filteredHazards.length,
                              itemBuilder: (ctx, i) {
                                final h = _filteredHazards[i];
                                return _CitizenReportCard(hazard: h);
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

class _CitizenReportCard extends StatelessWidget {
  final Hazard hazard;

  const _CitizenReportCard({required this.hazard});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: CivicCard(
        padding: const EdgeInsets.all(14),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (_) => HazardDetailsScreen(hazardId: hazard.id),
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
                  hazard.ticketNumber.isNotEmpty
                      ? hazard.ticketNumber
                      : hazard.category,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'monospace',
                    color: AppColors.primaryDark,
                  ),
                ),
                CivicStatusBadge(status: hazard.status),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              hazard.title,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: AppColors.slate900,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              hazard.locationAddress,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.slate600,
              ),
            ),
            const SizedBox(height: 10),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                CivicPriorityBadge(priority: hazard.priority),
                Text(
                  DateFormat('MMM dd • h:mm a').format(hazard.createdAt),
                  style: const TextStyle(
                    fontSize: 11,
                    color: AppColors.slate400,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
