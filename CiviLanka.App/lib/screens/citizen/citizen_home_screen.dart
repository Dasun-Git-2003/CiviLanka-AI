import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../models/hazard.dart';
import '../../services/auth_service.dart';
import '../../services/hazard_service.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ai_triage_card.dart';
import 'citizen_map_screen.dart';
import 'citizen_my_reports_screen.dart';
import 'hazard_details_screen.dart';
import 'report_hazard_screen.dart';

class CitizenHomeScreen extends StatefulWidget {
  final void Function(int)? onNavigateTab;
  const CitizenHomeScreen({super.key, this.onNavigateTab});

  @override
  State<CitizenHomeScreen> createState() => _CitizenHomeScreenState();
}

class _CitizenHomeScreenState extends State<CitizenHomeScreen> {
  List<Hazard> _hazards = [];
  bool _loading = true;
  String? _error;

  String _searchQuery = '';
  String _statusFilter = 'all'; // 'all', 'under_review', 'in_progress', 'resolved'
  String _selectedCategory = 'All';

  final TextEditingController _searchController = TextEditingController();

  final List<String> _categories = [
    'All',
    'Pothole',
    'WaterLeak',
    'DamagedRoad',
    'TrafficLight',
    'DrainageProblem',
    'StreetLightProblem',
    'FallenTree',
  ];

  @override
  void initState() {
    super.initState();
    _fetchHazards();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _fetchHazards() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final hazardService = context.read<HazardService>();
      final myHazards = await hazardService.getMyHazards();
      final mapHazards = await hazardService.getMapHazards();

      final Map<String, Hazard> map = {};
      for (final h in myHazards) {
        map[h.id] = h;
      }
      for (final h in mapHazards) {
        map[h.id] = h;
      }

      final combined = map.values.toList()
        ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

      if (mounted) {
        setState(() {
          _hazards = combined;
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

  List<Hazard> get _filteredHazards {
    return _hazards.where((h) {
      // Status filter
      final statusLower = h.status.toLowerCase();
      if (_statusFilter == 'under_review') {
        final isUnderReview = !h.isResolved &&
            (statusLower == 'submitted' ||
                statusLower == 'pendingaianalysis' ||
                statusLower == 'analysiscomplete' ||
                statusLower == 'underreview');
        if (!isUnderReview) return false;
      } else if (_statusFilter == 'in_progress') {
        if (statusLower != 'inprogress') return false;
      } else if (_statusFilter == 'resolved') {
        if (!h.isResolved && statusLower != 'resolved') return false;
      }

      // Category filter
      if (_selectedCategory != 'All') {
        if (!h.category.toLowerCase().contains(_selectedCategory.toLowerCase())) {
          return false;
        }
      }

      // Search query filter
      if (_searchQuery.trim().isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matchTitle = h.title.toLowerCase().contains(q);
        final matchDesc = h.description.toLowerCase().contains(q);
        final matchAddr = h.locationAddress.toLowerCase().contains(q);
        final matchCat = h.category.toLowerCase().contains(q);
        if (!matchTitle && !matchDesc && !matchAddr && !matchCat) {
          return false;
        }
      }

      return true;
    }).toList();
  }

  void _navigateToMap() {
    if (widget.onNavigateTab != null) {
      widget.onNavigateTab!(1);
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const CitizenMapScreen()),
      );
    }
  }

  void _navigateToMyReports() {
    if (widget.onNavigateTab != null) {
      widget.onNavigateTab!(2);
    } else {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (_) => const CitizenMyReportsScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().currentUser;
    final totalCount = _hazards.length;
    final underReviewCount = _hazards.where((h) {
      final s = h.status.toLowerCase();
      return !h.isResolved &&
          (s == 'submitted' || s == 'pendingaianalysis' || s == 'analysiscomplete' || s == 'underreview');
    }).length;
    final inProgressCount = _hazards.where((h) => h.status.toLowerCase() == 'inprogress').length;
    final resolvedCount = _hazards.where((h) => h.isResolved || h.status.toLowerCase() == 'resolved').length;

    final displayList = _filteredHazards;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        elevation: 0,
        backgroundColor: Colors.white,
        title: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF0369A1)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(10),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0284C7).withValues(alpha: 0.25),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: const Icon(Icons.shield_outlined, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Text(
                      'CiviLanka',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        letterSpacing: -0.3,
                        color: Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(width: 4),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0284C7),
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: const Text(
                        'AI',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                        ),
                      ),
                    ),
                  ],
                ),
                const Text(
                  'Colombo Municipal Citizen Desk',
                  style: TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ],
        ),
        actions: [
          IconButton(
            tooltip: 'Refresh Records',
            icon: _loading
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF0284C7)),
                  )
                : const Icon(Icons.refresh_rounded, color: Color(0xFF475569)),
            onPressed: _loading ? null : _fetchHazards,
          ),
          const SizedBox(width: 4),
        ],
      ),
      body: RefreshIndicator(
        color: const Color(0xFF0284C7),
        onRefresh: _fetchHazards,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── 1. Hero Municipal Banner (Matching Web Citizen Dashboard) ──
              _buildHeroBanner(user),

              const SizedBox(height: 16),

              // ── 2. Metric KPI Cards (2x2 Grid) ──
              _buildMetricCardsGrid(
                totalCount: totalCount,
                underReviewCount: underReviewCount,
                inProgressCount: inProgressCount,
                resolvedCount: resolvedCount,
              ),

              const SizedBox(height: 16),

              // ── 3. Emergency Monsoon / AI Triage Live Status Notice ──
              _buildEmergencyStatusNotice(),

              const SizedBox(height: 18),

              // ── 4. Interactive Search & Filter Desk ──
              _buildSearchAndFilters(
                totalCount: totalCount,
                underReviewCount: underReviewCount,
                inProgressCount: inProgressCount,
                resolvedCount: resolvedCount,
              ),

              const SizedBox(height: 14),

              // ── 5. Category Quick Filter Chips ──
              _buildCategoryChips(),

              const SizedBox(height: 16),

              // ── 6. Stream Header ──
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Text(
                        'Municipal Incident Stream',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFE2E8F0),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '${displayList.length}',
                          style: const TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF334155),
                          ),
                        ),
                      ),
                    ],
                  ),
                  TextButton.icon(
                    onPressed: _navigateToMyReports,
                    icon: const Icon(Icons.arrow_forward_rounded, size: 14, color: Color(0xFF0284C7)),
                    label: const Text(
                      'My Reports',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                    ),
                    style: TextButton.styleFrom(padding: EdgeInsets.zero, visualDensity: VisualDensity.compact),
                  ),
                ],
              ),

              const SizedBox(height: 10),

              // ── 7. Incident Stream Feed / Empty / Error State ──
              if (_loading && _hazards.isEmpty)
                _buildLoadingSkeletons()
              else if (_error != null)
                _buildErrorCard()
              else if (displayList.isEmpty)
                _buildEmptyState()
              else
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: displayList.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (ctx, idx) => _buildHazardCard(displayList[idx]),
                ),

              const SizedBox(height: 32),
            ],
          ),
        ),
      ),
    );
  }

  // ── 1. Hero Municipal Banner ───────────────────────────────────────────────
  Widget _buildHeroBanner(dynamic user) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            Color(0xFF0F172A), // Dark slate
            Color(0xFF164E63), // Cyan slate
            Color(0xFF0E7490), // Cyan 700
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF0891B2).withValues(alpha: 0.28),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Stack(
        children: [
          // Background ambient pattern
          Positioned(
            right: -24,
            top: -24,
            child: Icon(
              Icons.location_city_rounded,
              size: 150,
              color: Colors.white.withValues(alpha: 0.05),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Top Tag
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.14),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.verified_user_outlined, color: Color(0xFF67E8F9), size: 13),
                          SizedBox(width: 5),
                          Text(
                            'COLOMBO MUNICIPAL CITIZEN DESK',
                            style: TextStyle(
                              color: Color(0xFFA5F3FC),
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Text(
                  'Welcome, ${user?.fullName ?? "Citizen"}',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    letterSpacing: -0.4,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Report broken roads, hazardous potholes, dark corridors, and pipe bursts. CivitaGuard AI triages reports with computer vision and dispatches municipal crews.',
                  style: TextStyle(
                    color: Color(0xFFCFFAFE),
                    fontSize: 12,
                    height: 1.45,
                  ),
                ),
                const SizedBox(height: 16),
                // Action Buttons Row
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (_) => const ReportHazardScreen()),
                        ).then((_) => _fetchHazards());
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF06B6D4), // Vibrant cyan
                        foregroundColor: const Color(0xFF082F49),
                        elevation: 4,
                        shadowColor: const Color(0xFF06B6D4).withValues(alpha: 0.5),
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.add_photo_alternate_rounded, size: 16),
                      label: const Text(
                        'Report Defect',
                        style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13),
                      ),
                    ),
                    OutlinedButton.icon(
                      onPressed: _navigateToMap,
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.white,
                        side: BorderSide(color: Colors.white.withValues(alpha: 0.3)),
                        backgroundColor: Colors.white.withValues(alpha: 0.08),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.map_rounded, size: 16, color: Color(0xFF67E8F9)),
                      label: const Text(
                        'City GIS Map',
                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 12),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── 2. Metric KPI Cards (2x2 Grid) ─────────────────────────────────────────
  Widget _buildMetricCardsGrid({
    required int totalCount,
    required int underReviewCount,
    required int inProgressCount,
    required int resolvedCount,
  }) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: 1.55,
      children: [
        _buildMetricItem(
          label: 'My Submissions',
          subtitle: 'Logged hazards',
          count: '$totalCount',
          icon: Icons.assignment_turned_in_outlined,
          color: const Color(0xFF0284C7),
          bgColor: const Color(0xFFF0F9FF),
          borderColor: const Color(0xFFBAE6FD),
        ),
        _buildMetricItem(
          label: 'Under Review',
          subtitle: 'AI & verification',
          count: '$underReviewCount',
          icon: Icons.hourglass_top_rounded,
          color: const Color(0xFFD97706),
          bgColor: const Color(0xFFFFFBEB),
          borderColor: const Color(0xFFFDE68A),
        ),
        _buildMetricItem(
          label: 'Field Repair',
          subtitle: 'Crews active',
          count: '$inProgressCount',
          icon: Icons.engineering_outlined,
          color: const Color(0xFF4F46E5),
          bgColor: const Color(0xFFEEF2FF),
          borderColor: const Color(0xFFC7D2FE),
        ),
        _buildMetricItem(
          label: 'Resolved',
          subtitle: 'SLA completed',
          count: '$resolvedCount',
          icon: Icons.check_circle_outline_rounded,
          color: const Color(0xFF059669),
          bgColor: const Color(0xFFF0FDF4),
          borderColor: const Color(0xFFA7F3D0),
        ),
      ],
    );
  }

  Widget _buildMetricItem({
    required String label,
    required String subtitle,
    required String count,
    required IconData icon,
    required Color color,
    required Color bgColor,
    required Color borderColor,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: const TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: Color(0xFF64748B),
                ),
              ),
              Container(
                padding: const EdgeInsets.all(5),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: borderColor, width: 0.7),
                ),
                child: Icon(icon, color: color, size: 14),
              ),
            ],
          ),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                count,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                  letterSpacing: -0.5,
                ),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  subtitle,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── 3. Emergency Status Notice ─────────────────────────────────────────────
  Widget _buildEmergencyStatusNotice() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFF0F172A),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFF334155)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: const Color(0xFF0284C7).withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(8),
            ),
            child: const Icon(Icons.bolt_rounded, color: Color(0xFF38BDF8), size: 16),
          ),
          const SizedBox(width: 10),
          const Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Colombo Municipal AI Triage Active',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                SizedBox(height: 2),
                Text(
                  'Monsoon protocols active: Severe road defects dispatched under 24h SLA target.',
                  style: TextStyle(color: Color(0xFF94A3B8), fontSize: 10),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── 4. Interactive Search & Filter Desk ────────────────────────────────────
  Widget _buildSearchAndFilters({
    required int totalCount,
    required int underReviewCount,
    required int inProgressCount,
    required int resolvedCount,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Search Input
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.02),
                blurRadius: 4,
                offset: const Offset(0, 1),
              ),
            ],
          ),
          child: TextField(
            controller: _searchController,
            onChanged: (val) => setState(() => _searchQuery = val),
            style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A)),
            decoration: InputDecoration(
              hintText: 'Search by landmark, street, category, or title...',
              hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
              prefixIcon: const Icon(Icons.search_rounded, size: 18, color: Color(0xFF64748B)),
              suffixIcon: _searchQuery.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.close_rounded, size: 16, color: Color(0xFF94A3B8)),
                      onPressed: () {
                        _searchController.clear();
                        setState(() => _searchQuery = '');
                      },
                    )
                  : null,
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              border: InputBorder.none,
            ),
          ),
        ),

        const SizedBox(height: 10),

        // Filter Tabs
        SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          child: Row(
            children: [
              _buildFilterTab(
                key: 'all',
                label: 'All Reports',
                count: totalCount,
              ),
              const SizedBox(width: 8),
              _buildFilterTab(
                key: 'under_review',
                label: 'Under Review',
                count: underReviewCount,
                color: const Color(0xFFD97706),
              ),
              const SizedBox(width: 8),
              _buildFilterTab(
                key: 'in_progress',
                label: 'In Progress',
                count: inProgressCount,
                color: const Color(0xFF4F46E5),
              ),
              const SizedBox(width: 8),
              _buildFilterTab(
                key: 'resolved',
                label: 'Resolved',
                count: resolvedCount,
                color: const Color(0xFF059669),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFilterTab({
    required String key,
    required String label,
    required int count,
    Color? color,
  }) {
    final isSelected = _statusFilter == key;
    return InkWell(
      onTap: () => setState(() => _statusFilter = key),
      borderRadius: BorderRadius.circular(20),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0F172A) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFE2E8F0),
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w600,
                color: isSelected ? Colors.white : const Color(0xFF475569),
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
              decoration: BoxDecoration(
                color: isSelected
                    ? Colors.white.withValues(alpha: 0.2)
                    : (color?.withValues(alpha: 0.12) ?? const Color(0xFFF1F5F9)),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.w800,
                  color: isSelected ? Colors.white : (color ?? const Color(0xFF64748B)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── 5. Category Quick Filter Chips ─────────────────────────────────────────
  Widget _buildCategoryChips() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: _categories.map((cat) {
          final isSelected = _selectedCategory == cat;
          return Padding(
            padding: const EdgeInsets.only(right: 6),
            child: ChoiceChip(
              label: Text(_formatCategoryName(cat)),
              selected: isSelected,
              selectedColor: const Color(0xFFE0F2FE),
              backgroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: BorderSide(
                  color: isSelected ? const Color(0xFF0284C7) : const Color(0xFFE2E8F0),
                ),
              ),
              labelStyle: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.w800 : FontWeight.w500,
                color: isSelected ? const Color(0xFF0369A1) : const Color(0xFF475569),
              ),
              onSelected: (_) => setState(() => _selectedCategory = cat),
            ),
          );
        }).toList(),
      ),
    );
  }

  String _formatCategoryName(String cat) {
    switch (cat) {
      case 'All':
        return 'All Categories';
      case 'Pothole':
        return '🕳️ Pothole';
      case 'WaterLeak':
        return '💧 Water Leak';
      case 'DamagedRoad':
        return '🚧 Road Damage';
      case 'TrafficLight':
        return '🚦 Traffic Light';
      case 'DrainageProblem':
        return '🌊 Drainage';
      case 'StreetLightProblem':
        return '💡 Street Light';
      case 'FallenTree':
        return '🌿 Fallen Tree';
      default:
        return cat;
    }
  }

  // ── 6. Incident Feed Card ──────────────────────────────────────────────────
  Widget _buildHazardCard(Hazard hazard) {
    final isCrit = hazard.isCritical;
    final isRes = hazard.isResolved;
    final statusLower = hazard.status.toLowerCase();

    // Visual tags
    Color statusBg = const Color(0xFFF1F5F9);
    Color statusColor = const Color(0xFF475569);
    String statusText = hazard.status.toUpperCase();

    if (isRes || statusLower == 'resolved') {
      statusBg = const Color(0xFFECFDF5);
      statusColor = const Color(0xFF059669);
      statusText = 'RESOLVED';
    } else if (statusLower == 'inprogress') {
      statusBg = const Color(0xFFEEF2FF);
      statusColor = const Color(0xFF4F46E5);
      statusText = 'IN PROGRESS';
    } else if (statusLower == 'underreview' || statusLower == 'analysiscomplete') {
      statusBg = const Color(0xFFFFFBEB);
      statusColor = const Color(0xFFD97706);
      statusText = 'UNDER REVIEW';
    } else if (statusLower == 'submitted' || statusLower == 'pendingaianalysis') {
      statusBg = const Color(0xFFF0F9FF);
      statusColor = const Color(0xFF0284C7);
      statusText = 'SUBMITTED';
    }

    return InkWell(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => HazardDetailsScreen(hazardId: hazard.id),
          ),
        ).then((_) => _fetchHazards());
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isCrit ? const Color(0xFFFECACA) : const Color(0xFFE2E8F0),
            width: isCrit ? 1.5 : 1,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Row 1: Badges & Date
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Wrap(
                  spacing: 6,
                  children: [
                    // Status Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: statusBg,
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        statusText,
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w800,
                          color: statusColor,
                          letterSpacing: 0.2,
                        ),
                      ),
                    ),
                    // Severity Badge
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: isCrit
                            ? const Color(0xFFFEE2E2)
                            : (hazard.severity.toUpperCase() == 'HIGH'
                                ? const Color(0xFFFFEDD5)
                                : const Color(0xFFF1F5F9)),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          if (isCrit) ...[
                            const Icon(Icons.warning_amber_rounded, size: 11, color: Color(0xFFDC2626)),
                            const SizedBox(width: 3),
                          ],
                          Text(
                            hazard.severity.toUpperCase(),
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: isCrit
                                  ? const Color(0xFFDC2626)
                                  : (hazard.severity.toUpperCase() == 'HIGH'
                                      ? const Color(0xFFEA580C)
                                      : const Color(0xFF475569)),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                Text(
                  DateFormat('MMM dd, yyyy • h:mm a').format(hazard.createdAt),
                  style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                ),
              ],
            ),

            const SizedBox(height: 10),

            // Row 2: Title with Category Icon
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Center(
                    child: Text(
                      _getCategoryEmoji(hazard.category),
                      style: const TextStyle(fontSize: 16),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        hazard.title,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.2,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        hazard.description,
                        style: const TextStyle(
                          fontSize: 12,
                          color: Color(0xFF64748B),
                          height: 1.35,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ],
            ),

            const SizedBox(height: 12),

            // Row 3: Address & Location Strip
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.place_rounded, size: 14, color: Color(0xFF0284C7)),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      hazard.locationAddress.isNotEmpty ? hazard.locationAddress : 'Colombo Municipal Sector',
                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF334155)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  const SizedBox(width: 6),
                  InkWell(
                    onTap: _navigateToMap,
                    child: const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'Map',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0284C7)),
                        ),
                        Icon(Icons.chevron_right_rounded, size: 14, color: Color(0xFF0284C7)),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Row 4: AI Triage Assessment (If Present)
            if (hazard.aiAnalysis != null) ...[
              const SizedBox(height: 10),
              AITriageCard(aiAnalysis: hazard.aiAnalysis!),
            ],

            const SizedBox(height: 10),

            // Row 5: Footer Actions
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.access_time_rounded, size: 12, color: Color(0xFF94A3B8)),
                    const SizedBox(width: 4),
                    Text(
                      isRes ? 'Closed Ticket' : 'Target SLA: 24h Emergency Response',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w600,
                        color: isRes ? const Color(0xFF059669) : const Color(0xFF64748B),
                      ),
                    ),
                  ],
                ),
                const Row(
                  children: [
                    Text(
                      'View Details',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0284C7),
                      ),
                    ),
                    Icon(Icons.arrow_forward_ios_rounded, size: 10, color: Color(0xFF0284C7)),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  String _getCategoryEmoji(String category) {
    final cat = category.toLowerCase();
    if (cat.contains('pothole')) return '🕳️';
    if (cat.contains('water')) return '💧';
    if (cat.contains('road')) return '🚧';
    if (cat.contains('traffic')) return '🚦';
    if (cat.contains('light')) return '💡';
    if (cat.contains('drain')) return '🌊';
    if (cat.contains('tree')) return '🌿';
    return '⚠️';
  }

  // ── 7. States ──────────────────────────────────────────────────────────────
  Widget _buildLoadingSkeletons() {
    return Column(
      children: List.generate(
        3,
        (i) => Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(width: 100, height: 16, decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4))),
              const SizedBox(height: 12),
              Container(width: double.infinity, height: 16, decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4))),
              const SizedBox(height: 6),
              Container(width: 180, height: 12, decoration: BoxDecoration(color: const Color(0xFFF1F5F9), borderRadius: BorderRadius.circular(4))),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildErrorCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Column(
        children: [
          const Icon(Icons.error_outline_rounded, color: AppColors.critical, size: 28),
          const SizedBox(height: 8),
          Text(
            _error!,
            textAlign: TextAlign.center,
            style: const TextStyle(color: AppColors.critical, fontSize: 12),
          ),
          const SizedBox(height: 10),
          ElevatedButton.icon(
            onPressed: _fetchHazards,
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.critical,
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: const Icon(Icons.refresh, size: 14),
            label: const Text('Try Again', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 20),
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFFF0FDF4),
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFBBF7D0)),
            ),
            child: const Icon(Icons.check_circle_outline_rounded, size: 40, color: Color(0xFF16A34A)),
          ),
          const SizedBox(height: 14),
          const Text(
            'All Municipal Hazards Cleared',
            style: TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: Color(0xFF0F172A)),
          ),
          const SizedBox(height: 4),
          const Text(
            'No matching infrastructure hazards found in this sector.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Color(0xFF64748B), fontSize: 12),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: () {
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ReportHazardScreen()),
              ).then((_) => _fetchHazards());
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0284C7),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            icon: const Icon(Icons.add_photo_alternate_rounded, size: 16),
            label: const Text('Submit New Hazard', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
          ),
        ],
      ),
    );
  }
}
