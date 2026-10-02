import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/widgets/civic_badge.dart';
import '../../core/widgets/civic_card.dart';
import '../../core/widgets/civic_states.dart';
import '../../core/widgets/civic_text_field.dart';
import '../../models/hazard.dart';
import '../../services/ai_service.dart';
import '../../services/hazard_service.dart';
import '../../theme/app_colors.dart';
import '../citizen/hazard_details_screen.dart';
import '../create_work_order_screen.dart';

class SupervisorHazardsScreen extends StatefulWidget {
  const SupervisorHazardsScreen({super.key});

  @override
  State<SupervisorHazardsScreen> createState() =>
      _SupervisorHazardsScreenState();
}

class _SupervisorHazardsScreenState extends State<SupervisorHazardsScreen> {
  List<Hazard> _hazards = [];
  bool _loading = true;
  String? _error;

  String _searchQuery = '';
  String _selectedFilter = 'All';
  final List<String> _filters = [
    'All',
    'Critical',
    'High',
    'Medium',
    'Low',
    'Pending Review',
  ];

  @override
  void initState() {
    super.initState();
    _loadHazards();
  }

  Future<void> _loadHazards() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final list = await context.read<HazardService>().getAllHazards();
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
    return _hazards.where((h) {
      // 1. Search Query
      if (_searchQuery.isNotEmpty) {
        final query = _searchQuery.toLowerCase();
        final matchesTitle = h.title.toLowerCase().contains(query);
        final matchesTicket = h.ticketNumber.toLowerCase().contains(query);
        final matchesDesc = h.description.toLowerCase().contains(query);
        final matchesAddress = h.locationAddress.toLowerCase().contains(query);
        if (!matchesTitle && !matchesTicket && !matchesDesc && !matchesAddress) {
          return false;
        }
      }

      // 2. Severity / Status filter
      if (_selectedFilter == 'All') return true;
      if (_selectedFilter == 'Pending Review') {
        return h.status.toUpperCase() == 'REPORTED' ||
            h.status.toUpperCase() == 'PENDINGAIANALYSIS';
      }

      return h.severity.equalsIgnoreCase(_selectedFilter) ||
          h.priority.equalsIgnoreCase(_selectedFilter);
    }).toList();
  }

  Future<void> _runAIAnalysis(Hazard h) async {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Starting AI analysis for ${h.ticketNumber}...')),
    );
    try {
      await context.read<AIService>().analyzeHazard(h.id);
      await _loadHazards();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('AI classification complete!'),
            backgroundColor: AppColors.success,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('AI error: $e'), backgroundColor: AppColors.critical),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text(
          'Hazard Management',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadHazards,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: CivicTextField(
              hintText: 'Search by ticket, category, or address...',
              prefixIcon: const Icon(Icons.search, size: 20),
              onChanged: (val) => setState(() => _searchQuery = val),
            ),
          ),

          // Filters
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
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
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                      fontSize: 12,
                    ),
                    onSelected: (_) => setState(() => _selectedFilter = f),
                  ),
                );
              }).toList(),
            ),
          ),
          const Divider(height: 1),

          // List
          Expanded(
            child: _loading
                ? const CivicSkeletonList(itemCount: 5, height: 110)
                : _error != null
                    ? Center(
                        child: CivicErrorCard(
                          message: _error!,
                          onRetry: _loadHazards,
                        ),
                      )
                    : _filteredHazards.isEmpty
                        ? const CivicEmptyState(
                            title: 'No Hazards Found',
                            message: 'No incidents match your filter criteria.',
                            icon: Icons.search_off_outlined,
                          )
                        : RefreshIndicator(
                            onRefresh: _loadHazards,
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _filteredHazards.length,
                              itemBuilder: (ctx, i) {
                                final h = _filteredHazards[i];
                                return _SupervisorHazardCard(
                                  hazard: h,
                                  onRunAI: () => _runAIAnalysis(h),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

class _SupervisorHazardCard extends StatelessWidget {
  final Hazard hazard;
  final VoidCallback onRunAI;

  const _SupervisorHazardCard({
    required this.hazard,
    required this.onRunAI,
  });

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
                  hazard.ticketNumber,
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: AppColors.primaryDark,
                  ),
                ),
                CivicPriorityBadge(priority: hazard.priority),
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
              style: const TextStyle(fontSize: 12, color: AppColors.slate600),
            ),
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 8),

            // Actions row
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                TextButton.icon(
                  icon: const Icon(Icons.auto_awesome, size: 14, color: AppColors.purple),
                  label: const Text('Run AI', style: TextStyle(fontSize: 12, color: AppColors.purple)),
                  onPressed: onRunAI,
                ),
                TextButton.icon(
                  icon: const Icon(Icons.add_task, size: 14, color: AppColors.primary),
                  label: const Text('Create Work Order', style: TextStyle(fontSize: 12)),
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) =>
                            CreateWorkOrderScreen(initialHazardId: hazard.id),
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
}

extension _StringExt on String {
  bool equalsIgnoreCase(String other) => toLowerCase() == other.toLowerCase();
}
