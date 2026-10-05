import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../models/contractor.dart';
import '../services/api_service.dart';
import '../services/contractor_service.dart';
import '../theme/app_colors.dart';

class ContractorsDirectoryScreen extends StatefulWidget {
  const ContractorsDirectoryScreen({super.key});

  @override
  State<ContractorsDirectoryScreen> createState() => _ContractorsDirectoryScreenState();
}

class _ContractorsDirectoryScreenState extends State<ContractorsDirectoryScreen> {
  final ContractorService _contractorService = ContractorService(ApiService());

  List<Contractor> _contractors = [];
  bool _isLoading = true;
  String _searchQuery = '';
  String _selectedStatus = 'All Status';
  String _selectedSpecialization = 'All Specializations';

  final List<String> _statusFilters = ['All Status', 'Available', 'Busy'];
  final List<String> _specializationFilters = [
    'All Specializations',
    'Roads & Bridges',
    'Electrical',
    'Water & Plumbing',
    'Sanitation',
    'Civil',
    'Telecom',
  ];

  @override
  void initState() {
    super.initState();
    _loadContractors();
  }

  Future<void> _loadContractors() async {
    setState(() => _isLoading = true);
    try {
      final contractors = await _contractorService.getContractors();
      if (mounted) {
        setState(() {
          _contractors = contractors;
          _isLoading = false;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _contractors = Contractor.fallbackContractors;
          _isLoading = false;
        });
      }
    }
  }

  List<Contractor> get _filteredContractors {
    return _contractors.where((c) {
      // Search filter
      if (_searchQuery.isNotEmpty) {
        final q = _searchQuery.toLowerCase();
        final matchName = c.name.toLowerCase().contains(q);
        final matchLocation = c.location.toLowerCase().contains(q);
        final matchPhone = c.phone.toLowerCase().contains(q);
        final matchEmail = (c.email ?? '').toLowerCase().contains(q);
        final matchSpec = c.specialization.toLowerCase().contains(q);
        if (!matchName && !matchLocation && !matchPhone && !matchEmail && !matchSpec) {
          return false;
        }
      }

      // Status filter
      if (_selectedStatus == 'Available' && !c.isAvailable) return false;
      if (_selectedStatus == 'Busy' && c.isAvailable) return false;

      // Specialization filter
      if (_selectedSpecialization != 'All Specializations' &&
          c.specialization.toLowerCase() != _selectedSpecialization.toLowerCase()) {
        return false;
      }

      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final totalCount = _contractors.length;
    final availableCount = _contractors.where((c) => c.isAvailable).length;
    final busyCount = totalCount - availableCount;
    final avgRating = _contractors.isEmpty
        ? 0.0
        : _contractors.map((c) => c.rating).reduce((a, b) => a + b) / totalCount;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        automaticallyImplyLeading: false,
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        surfaceTintColor: Colors.transparent,
        scrolledUnderElevation: 0,
        elevation: 0,
        leadingWidth: 52,
        leading: Padding(
          padding: const EdgeInsets.only(left: 6),
          child: IconButton(
            icon: Icon(
              Icons.arrow_back_rounded,
              color: isDark ? Colors.white : AppColors.textDark,
              size: 22,
            ),
            tooltip: 'Back',
            onPressed: () {
              if (Navigator.of(context).canPop()) {
                Navigator.of(context).pop();
              } else {
                Navigator.of(context).maybePop();
              }
            },
          ),
        ),
        titleSpacing: 0,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7ED),
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.business_center_rounded, color: Color(0xFFF97316), size: 18),
            ),
            const SizedBox(width: 8),
            Text(
              'Contractor Directory',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : AppColors.textDark,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(
              Icons.refresh_rounded,
              color: isDark ? Colors.white : AppColors.textDark,
              size: 22,
            ),
            tooltip: 'Refresh Contractors',
            onPressed: _loadContractors,
          ),
          const SizedBox(width: 2),
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF97316),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
              icon: const Icon(Icons.person_add_alt_1_rounded, size: 16),
              label: const Text('Register', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
              onPressed: () => _openRegisterContractorModal(context),
            ),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(
            color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
            height: 1.0,
          ),
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFF97316)))
          : RefreshIndicator(
              onRefresh: _loadContractors,
              color: const Color(0xFFF97316),
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Title & Subtitle Banner
                    Text(
                      'Contractor Management & Directory',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w800,
                        color: isDark ? Colors.white : const Color(0xFF0F172A),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Maintain authorized municipal contractors, specializations, ratings, and active repair dispatches.',
                      style: TextStyle(
                        fontSize: 12.5,
                        color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Top Stat Cards (Matching Photo 1)
                    _buildStatCardsRow(
                      context: context,
                      total: totalCount,
                      available: availableCount,
                      busy: busyCount,
                      avgRating: avgRating,
                      isDark: isDark,
                    ),
                    const SizedBox(height: 20),

                    // Search Bar (Matching Photo 1)
                    TextField(
                      onChanged: (val) => setState(() => _searchQuery = val),
                      decoration: InputDecoration(
                        hintText: 'Search by company name, location, phone, or email...',
                        hintStyle: TextStyle(
                          fontSize: 13,
                          color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
                        ),
                        prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFFF97316)),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear_rounded, size: 18),
                                onPressed: () => setState(() => _searchQuery = ''),
                              )
                            : null,
                        filled: true,
                        fillColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                          ),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide(
                            color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                          ),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: const BorderSide(color: Color(0xFFF97316), width: 1.5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Status Filters (All Status, Available, Busy)
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _statusFilters.map((st) {
                          final isSel = _selectedStatus == st;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: FilterChip(
                              label: Text(st),
                              selected: isSel,
                              selectedColor: const Color(0xFFF97316),
                              backgroundColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                              checkmarkColor: Colors.white,
                              labelStyle: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                                color: isSel
                                    ? Colors.white
                                    : (isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569)),
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                                side: BorderSide(
                                  color: isSel
                                      ? const Color(0xFFF97316)
                                      : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                                ),
                              ),
                              onSelected: (_) => setState(() => _selectedStatus = st),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Specialization Filters
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _specializationFilters.map((sp) {
                          final isSel = _selectedSpecialization == sp;
                          return Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: ChoiceChip(
                              label: Text(sp),
                              selected: isSel,
                              selectedColor: const Color(0xFFF97316),
                              backgroundColor: isDark ? const Color(0xFF1E293B) : const Color(0xFFF1F5F9),
                              labelStyle: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.w600,
                                color: isSel
                                    ? Colors.white
                                    : (isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569)),
                              ),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                                side: BorderSide(
                                  color: isSel
                                      ? const Color(0xFFF97316)
                                      : (isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                                ),
                              ),
                              onSelected: (_) => setState(() => _selectedSpecialization = sp),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Contractor Cards List (Matching Photo 1)
                    if (_filteredContractors.isEmpty)
                      _buildEmptyState(isDark)
                    else
                      ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _filteredContractors.length,
                        itemBuilder: (ctx, i) {
                          final contractor = _filteredContractors[i];
                          return _buildContractorCard(context, contractor, isDark);
                        },
                      ),
                  ],
                ),
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFFF97316),
        foregroundColor: Colors.white,
        elevation: 3,
        icon: const Icon(Icons.person_add_alt_1_rounded),
        label: const Text('Add Contractor', style: TextStyle(fontWeight: FontWeight.bold)),
        onPressed: () => _openRegisterContractorModal(context),
      ),
    );
  }

  // ── 4 Stat Cards Row ─────────────────────────────────────────────────────────
  Widget _buildStatCardsRow({
    required BuildContext context,
    required int total,
    required int available,
    required int busy,
    required double avgRating,
    required bool isDark,
  }) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          // Card 1: TOTAL CONTRACTORS
          _buildStatCard(
            title: 'TOTAL CONTRACTORS',
            value: '$total',
            badgeText: 'Registered',
            badgeColor: Colors.blue.shade700,
            badgeBg: Colors.blue.shade50,
            isDark: isDark,
          ),
          const SizedBox(width: 12),

          // Card 2: AVAILABLE FOR WORK
          _buildStatCard(
            title: 'AVAILABLE FOR WORK',
            titleColor: const Color(0xFF10B981),
            value: '$available',
            badgeText: '● Standby',
            badgeColor: const Color(0xFF10B981),
            badgeBg: const Color(0xFFECFDF5),
            isDark: isDark,
          ),
          const SizedBox(width: 12),

          // Card 3: BUSY ON PROJECTS
          _buildStatCard(
            title: 'BUSY ON PROJECTS',
            titleColor: const Color(0xFFF97316),
            value: '$busy',
            badgeText: '⏱ Dispatched',
            badgeColor: const Color(0xFFF97316),
            badgeBg: const Color(0xFFFFF7ED),
            isDark: isDark,
          ),
          const SizedBox(width: 12),

          // Card 4: AVERAGE RATING
          _buildStatCard(
            title: 'AVERAGE RATING',
            titleColor: const Color(0xFFD97706),
            value: avgRating.toStringAsFixed(1),
            badgeText: '/ 5.0 Stars',
            badgeColor: const Color(0xFFD97706),
            badgeBg: const Color(0xFFFEF3C7),
            isDark: isDark,
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    Color? titleColor,
    required String value,
    required String badgeText,
    required Color badgeColor,
    required Color badgeBg,
    required bool isDark,
  }) {
    return Container(
      width: 155,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          if (!isDark)
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.5,
              color: titleColor ?? (isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(
                value,
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: isDark ? badgeColor.withValues(alpha: 0.2) : badgeBg,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  badgeText,
                  style: TextStyle(
                    fontSize: 9.5,
                    fontWeight: FontWeight.bold,
                    color: badgeColor,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // ── Contractor Card (Matching Photo 1) ──────────────────────────────────────
  Widget _buildContractorCard(BuildContext context, Contractor c, bool isDark) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
        boxShadow: [
          if (!isDark)
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 10,
              offset: const Offset(0, 3),
            ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row: ID + Status Pill
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '#${c.id}',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: c.isAvailable
                      ? const Color(0xFF10B981).withValues(alpha: 0.12)
                      : const Color(0xFFF97316).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 6,
                      height: 6,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        color: c.isAvailable ? const Color(0xFF10B981) : const Color(0xFFF97316),
                      ),
                    ),
                    const SizedBox(width: 5),
                    Text(
                      c.isAvailable ? 'Available' : 'Busy',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: c.isAvailable ? const Color(0xFF059669) : const Color(0xFFEA580C),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),

          // Company / Contractor Name
          Text(
            c.name,
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: isDark ? Colors.white : const Color(0xFF0F172A),
            ),
          ),
          const SizedBox(height: 8),

          // Specialization Pill & Rating
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF3C7),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  c.specialization,
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFB45309),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              const Icon(Icons.star_rounded, color: Color(0xFFF59E0B), size: 16),
              const SizedBox(width: 3),
              Text(
                c.rating.toStringAsFixed(1),
                style: TextStyle(
                  fontSize: 12.5,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(width: 4),
              Text(
                '(${c.jobCount} jobs)',
                style: TextStyle(
                  fontSize: 11.5,
                  color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Details List: Location, Phone, Email
          _buildInfoRow(Icons.location_on_outlined, c.location, isDark),
          const SizedBox(height: 4),
          _buildInfoRow(Icons.phone_outlined, c.phone, isDark),
          if (c.email != null && c.email!.isNotEmpty) ...[
            const SizedBox(height: 4),
            _buildInfoRow(Icons.email_outlined, c.email!, isDark),
          ],
          const SizedBox(height: 14),

          // Action Buttons Row (Matching Photo 1)
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: isDark ? Colors.white : const Color(0xFF334155),
                    side: BorderSide(
                      color: isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1),
                    ),
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () => _showContractorDetailsModal(context, c, isDark),
                  child: const Text('View Details', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF97316),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Assigning work order to ${c.name}...'),
                        backgroundColor: const Color(0xFFF97316),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  child: const Text('Assign Work', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5)),
                ),
              ),
              const SizedBox(width: 6),
              IconButton(
                icon: const Icon(Icons.edit_outlined, size: 20),
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                tooltip: 'Edit Contractor',
                onPressed: () => _openEditContractorModal(context, c),
              ),
              IconButton(
                icon: const Icon(Icons.delete_outline_rounded, size: 20),
                color: Colors.red.shade400,
                tooltip: 'Delete Contractor',
                onPressed: () => _confirmDeleteContractor(c),
              ),
            ],
          ),
        ],
      ),
    );
  }

  void _confirmDeleteContractor(Contractor c) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.red.shade50,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.delete_forever_rounded, color: Colors.red),
            ),
            const SizedBox(width: 10),
            const Text('Delete Contractor', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
          ],
        ),
        content: Text(
          'Are you sure you want to remove "${c.name}" from the authorized contractor registry? This action cannot be undone.',
          style: TextStyle(
            fontSize: 13.5,
            color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await _contractorService.deleteContractor(c.id);
              } catch (_) {}
              setState(() {
                _contractors.removeWhere((x) => x.id == c.id);
              });
              if (mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text('Contractor "${c.name}" deleted successfully'),
                    backgroundColor: Colors.red.shade700,
                    behavior: SnackBarBehavior.floating,
                  ),
                );
              }
            },
            child: const Text('Delete Contractor', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text, bool isDark) {
    return Row(
      children: [
        Icon(icon, size: 14, color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B)),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            text,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: 12,
              color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF475569),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(bool isDark) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 40),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.business_center_outlined, size: 48, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text(
              'No Contractors Found',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isDark ? Colors.white : const Color(0xFF0F172A),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Try adjusting your search query or filter selection.',
              style: TextStyle(
                fontSize: 12,
                color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Register Contractor Modal (Matching Photo 2) ────────────────────────────
  void _openRegisterContractorModal(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => RegisterContractorModal(
        onRegistered: (newContractor) {
          setState(() {
            _contractors.insert(0, newContractor);
          });
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Contractor "${newContractor.name}" registered successfully!'),
              backgroundColor: const Color(0xFF10B981),
              behavior: SnackBarBehavior.floating,
            ),
          );
        },
      ),
    );
  }

  void _showContractorDetailsModal(BuildContext context, Contractor c, bool isDark) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF7ED),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.business_rounded, color: Color(0xFFF97316)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                c.name,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isDark ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
            ),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildDetailTile('Contractor ID', '#${c.id}', isDark),
              _buildDetailTile('Specialization', c.specialization, isDark),
              _buildDetailTile('Operating District', c.location, isDark),
              _buildDetailTile('Phone Number', c.phone, isDark),
              if (c.email != null) _buildDetailTile('Email Address', c.email!, isDark),
              _buildDetailTile('Rating', '⭐ ${c.rating.toStringAsFixed(1)} / 5.0 Stars', isDark),
              _buildDetailTile('Total Completed Jobs', '${c.jobCount} Dispatches', isDark),
              _buildDetailTile('Status', c.isAvailable ? 'Available for Work' : 'Busy on Projects', isDark),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close', style: TextStyle(color: Color(0xFFF97316), fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailTile(String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: isDark ? Colors.white : const Color(0xFF0F172A),
            ),
          ),
        ],
      ),
    );
  }

  void _openEditContractorModal(BuildContext context, Contractor c) {
    final nameCtrl = TextEditingController(text: c.name);
    final phoneCtrl = TextEditingController(text: c.phone);
    final emailCtrl = TextEditingController(text: c.email ?? '');
    final locationCtrl = TextEditingController(text: c.location);
    String spec = c.specialization;
    bool isAvailable = c.isAvailable;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        final isDark = Theme.of(ctx).brightness == Brightness.dark;
        return StatefulBuilder(
          builder: (ctx, setModalState) {
            return Container(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 20,
                bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
              ),
              decoration: BoxDecoration(
                color: isDark ? const Color(0xFF1E293B) : Colors.white,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Edit Contractor Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () => Navigator.pop(ctx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: nameCtrl,
                      decoration: const InputDecoration(labelText: 'Company / Contractor Name', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    DropdownButtonFormField<String>(
                      value: spec,
                      decoration: const InputDecoration(labelText: 'Primary Specialization', border: OutlineInputBorder()),
                      items: _specializationFilters
                          .where((s) => s != 'All Specializations')
                          .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                          .toList(),
                      onChanged: (val) {
                        if (val != null) setModalState(() => spec = val);
                      },
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: locationCtrl,
                      decoration: const InputDecoration(labelText: 'Operating District', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    TextFormField(
                      controller: phoneCtrl,
                      keyboardType: TextInputType.number,
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        LengthLimitingTextInputFormatter(10),
                      ],
                      decoration: const InputDecoration(labelText: 'Phone Number (10 digits)', hintText: '0112345678', border: OutlineInputBorder()),
                      validator: (v) {
                        if (v == null || v.trim().isEmpty) return 'Phone is required';
                        if (!RegExp(r'^\d{10}$').hasMatch(v.trim())) {
                          return 'Phone must be exactly 10 digits';
                        }
                        return null;
                      },
                    ),
                    const SizedBox(height: 10),
                    TextField(
                      controller: emailCtrl,
                      decoration: const InputDecoration(labelText: 'Email Address', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 10),
                    SwitchListTile(
                      title: const Text('Available for Work', style: TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Text(isAvailable ? 'Contractor is currently standby' : 'Contractor is busy on projects'),
                      value: isAvailable,
                      activeColor: const Color(0xFF10B981),
                      onChanged: (val) => setModalState(() => isAvailable = val),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: OutlinedButton(
                            onPressed: () => Navigator.pop(ctx),
                            child: const Text('Cancel'),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF97316)),
                            onPressed: () async {
                              final updated = Contractor(
                                id: c.id,
                                name: nameCtrl.text.trim(),
                                specialization: spec,
                                location: locationCtrl.text.trim(),
                                phone: phoneCtrl.text.trim(),
                                email: emailCtrl.text.trim(),
                                rating: c.rating,
                                isAvailable: isAvailable,
                                jobCount: c.jobCount,
                              );
                              try {
                                await _contractorService.updateContractor(
                                  id: c.id,
                                  name: updated.name,
                                  specialization: updated.specialization,
                                  location: updated.location,
                                  phone: updated.phone,
                                  email: updated.email,
                                  rating: c.rating,
                                  isAvailable: isAvailable,
                                );
                              } catch (_) {}
                              setState(() {
                                final idx = _contractors.indexWhere((x) => x.id == c.id);
                                if (idx != -1) _contractors[idx] = updated;
                              });
                              if (ctx.mounted) Navigator.pop(ctx);
                            },
                            child: const Text('Save Changes', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
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
      },
    );
  }
}

// ── Register Contractor Modal Widget (Photo 2) ─────────────────────────────────
class RegisterContractorModal extends StatefulWidget {
  final ValueChanged<Contractor> onRegistered;

  const RegisterContractorModal({super.key, required this.onRegistered});

  @override
  State<RegisterContractorModal> createState() => _RegisterContractorModalState();
}

class _RegisterContractorModalState extends State<RegisterContractorModal> {
  final _formKey = GlobalKey<FormState>();
  final _contractorService = ContractorService(ApiService());

  final _nameController = TextEditingController();
  final _locationController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();

  String _selectedSpecialization = 'Roads & Bridges';
  bool _isSubmitting = false;

  final List<String> _specializations = [
    'Roads & Bridges',
    'Electrical',
    'Water & Plumbing',
    'Sanitation',
    'Civil',
    'Telecom',
  ];

  @override
  void dispose() {
    _nameController.dispose();
    _locationController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      final newContractor = await _contractorService.createContractor(
        name: _nameController.text,
        specialization: _selectedSpecialization,
        location: _locationController.text,
        phone: _phoneController.text,
        email: _emailController.text,
      );
      if (mounted) {
        widget.onRegistered(newContractor);
        Navigator.pop(context);
      }
    } catch (_) {
      // Fallback local creation if backend offline
      final fallbackContractor = Contractor(
        id: DateTime.now().millisecondsSinceEpoch % 1000,
        name: _nameController.text.trim(),
        specialization: _selectedSpecialization,
        location: _locationController.text.trim(),
        phone: _phoneController.text.trim(),
        email: _emailController.text.trim(),
        rating: 5.0,
        isAvailable: true,
        jobCount: 0,
      );
      if (mounted) {
        widget.onRegistered(fallbackContractor);
        Navigator.pop(context);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: EdgeInsets.only(
        left: 20,
        right: 20,
        top: 20,
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header matching Photo 2
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFFEF3C7),
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const Icon(
                      Icons.person_add_alt_1_rounded,
                      color: Color(0xFFD97706),
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Register Contractor',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: isDark ? Colors.white : const Color(0xFF0F172A),
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          'Add an authorized service provider to the registry.',
                          style: TextStyle(
                            fontSize: 12,
                            color: isDark ? const Color(0xFF94A3B8) : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close_rounded, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // Field 1: Company / Contractor Name * (Matching Photo 2)
              _buildFieldLabel('Company / Contractor Name *', isDark),
              TextFormField(
                controller: _nameController,
                style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A)),
                decoration: _buildInputDecoration(
                  hint: 'e.g. Lanka Civil Infrastructure Ltd',
                  isDark: isDark,
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Company name is required' : null,
              ),
              const SizedBox(height: 14),

              // Field 2: Primary Specialization * (Matching Photo 2)
              _buildFieldLabel('Primary Specialization *', isDark),
              DropdownButtonFormField<String>(
                value: _selectedSpecialization,
                dropdownColor: isDark ? const Color(0xFF1E293B) : Colors.white,
                style: TextStyle(fontSize: 14, color: isDark ? Colors.white : const Color(0xFF0F172A)),
                decoration: _buildInputDecoration(hint: 'Select Specialization', isDark: isDark),
                items: _specializations
                    .map((sp) => DropdownMenuItem(
                          value: sp,
                          child: Text(sp),
                        ))
                    .toList(),
                onChanged: (val) {
                  if (val != null) setState(() => _selectedSpecialization = val);
                },
              ),
              const SizedBox(height: 14),

              // Field 3: Municipal Location / Operating District * (Matching Photo 2)
              _buildFieldLabel('Municipal Location / Operating District *', isDark),
              TextFormField(
                controller: _locationController,
                style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A)),
                decoration: _buildInputDecoration(
                  hint: 'e.g. Colombo 05, Western Province',
                  isDark: isDark,
                ),
                validator: (v) => (v == null || v.trim().isEmpty) ? 'Location is required' : null,
              ),
              const SizedBox(height: 14),

              // Field 4 & 5: Phone Number & Email Address (Matching Photo 2)
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFieldLabel('Phone Number (10 Digits) *', isDark),
                        TextFormField(
                          controller: _phoneController,
                          keyboardType: TextInputType.number,
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            LengthLimitingTextInputFormatter(10),
                          ],
                          style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A)),
                          decoration: _buildInputDecoration(
<<<<<<< HEAD
                            hint: '0112345678',
=======
                            hint: '0771234567',
>>>>>>> origin/main
                            isDark: isDark,
                          ),
                          validator: (v) {
                            if (v == null || v.trim().isEmpty) return 'Phone is required';
<<<<<<< HEAD
                            if (!RegExp(r'^\d{10}$').hasMatch(v.trim())) {
                              return 'Phone must be exactly 10 digits';
                            }
=======
                            if (v.trim().length != 10) return 'Phone number must be exactly 10 digits';
>>>>>>> origin/main
                            return null;
                          },
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildFieldLabel('Email Address', isDark),
                        TextFormField(
                          controller: _emailController,
                          keyboardType: TextInputType.emailAddress,
                          style: TextStyle(color: isDark ? Colors.white : const Color(0xFF0F172A)),
                          decoration: _buildInputDecoration(
                            hint: 'ops@contractor.lk',
                            isDark: isDark,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Action Buttons: Cancel & Register Contractor (Matching Photo 2)
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: isDark ? Colors.white : const Color(0xFF334155),
                        side: BorderSide(
                          color: isDark ? const Color(0xFF475569) : const Color(0xFFCBD5E1),
                        ),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Cancel', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFF97316),
                        foregroundColor: Colors.white,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: _isSubmitting ? null : _submitForm,
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Text(
                              'Register Contractor',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
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

  Widget _buildFieldLabel(String label, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.bold,
          color: isDark ? const Color(0xFFCBD5E1) : const Color(0xFF334155),
        ),
      ),
    );
  }

  InputDecoration _buildInputDecoration({required String hint, required bool isDark}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(
        fontSize: 13,
        color: isDark ? const Color(0xFF64748B) : const Color(0xFF94A3B8),
      ),
      filled: true,
      fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(
          color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: const BorderSide(color: Color(0xFFF97316), width: 1.5),
      ),
    );
  }
}
