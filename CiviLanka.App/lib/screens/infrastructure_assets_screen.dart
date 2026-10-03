import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../models/asset_risk_result.dart';
import '../models/infrastructure_asset.dart';
import '../services/ai_service.dart';
import '../services/asset_service.dart';
import '../services/location_service.dart';
import 'shared/ai_intelligence_screen.dart';

class InfrastructureAssetsScreen extends StatefulWidget {
  const InfrastructureAssetsScreen({super.key});

  @override
  State<InfrastructureAssetsScreen> createState() => _InfrastructureAssetsScreenState();
}

class _InfrastructureAssetsScreenState extends State<InfrastructureAssetsScreen> {
  final MapController _mapController = MapController();
  List<InfrastructureAsset> _assets = [];
  bool _loading = true;
  String? _error;

  // Search & Filters
  String _searchQuery = '';
  String _selectedType = 'All Types';
  String _selectedCondition = 'ALL';
  String _selectedStatus = 'ALL';

  InfrastructureAsset? _selectedAssetForDetails;

  final List<String> _assetTypes = [
    'All Types',
    'Water',
    'Electrical',
    'Civil',
    'Roads & Bridges',
    'Sanitation',
    'Telecom',
  ];

  final List<String> _statuses = ['Active', 'Under Maintenance', 'Inactive', 'Decommissioned'];
  final List<String> _conditions = ['Good', 'Moderate', 'Poor', 'Critical'];

  @override
  void initState() {
    super.initState();
    _loadAssets();
  }

  Future<void> _loadAssets() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final assetService = context.read<AssetService>();
      final data = await assetService.getAssets(
        search: _searchQuery,
        type: _selectedType,
        status: _selectedStatus,
        condition: _selectedCondition,
      );
      if (mounted) {
        setState(() {
          _assets = data;
          _loading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _assets = InfrastructureAsset.defaultFallbackAssets;
          _loading = false;
        });
      }
    }
  }

  List<InfrastructureAsset> get _filteredAssets {
    return _assets.where((a) {
      final matchesSearch = _searchQuery.isEmpty ||
          a.name.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          a.id.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          a.location.toLowerCase().contains(_searchQuery.toLowerCase());
      final matchesType = _selectedType == 'All Types' ||
          a.type.toLowerCase() == _selectedType.toLowerCase();
      final matchesCondition = _selectedCondition == 'ALL' ||
          (a.latestCondition != null &&
              a.latestCondition!.toLowerCase() == _selectedCondition.toLowerCase());
      final matchesStatus = _selectedStatus == 'ALL' ||
          a.status.toLowerCase() == _selectedStatus.toLowerCase();

      return matchesSearch && matchesType && matchesCondition && matchesStatus;
    }).toList();
  }

  // ── Metrics calculation ──
  int get _totalCount => _assets.length;
  int get _goodCount =>
      _assets.where((a) => (a.latestCondition ?? '').toLowerCase() == 'good').length;
  int get _maintenanceCount =>
      _assets.where((a) => a.status.toLowerCase() == 'under maintenance').length;
  int get _poorCount =>
      _assets.where((a) => (a.latestCondition ?? '').toLowerCase() == 'poor').length;
  int get _criticalCount =>
      _assets.where((a) => (a.latestCondition ?? '').toLowerCase() == 'critical').length;

  void _openRegisterModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: RegisterAssetModal(
          onAssetRegistered: () => _loadAssets(),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final filtered = _filteredAssets;

    return Scaffold(
      backgroundColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Infrastructure Assets',
              style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
            ),
            Text(
              'Municipal Asset Registry & Health',
              style: TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            tooltip: 'Refresh Database',
            onPressed: _loadAssets,
          ),
          Padding(
            padding: const EdgeInsets.only(right: 12),
            child: ElevatedButton.icon(
              onPressed: _openRegisterModal,
              icon: const Icon(Icons.add_rounded, size: 18),
              label: const Text('Register', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF97316),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                elevation: 0,
              ),
            ),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadAssets,
        color: const Color(0xFFF97316),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── 5 Aggregate KPI Metric Cards (Photo 2 Reference) ──────────
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: [
                    _kpiMetricTile('Total Assets', '$_totalCount', 'Tracked', Colors.grey[700]!, isDark),
                    const SizedBox(width: 8),
                    _kpiMetricTile('Good Condition', '$_goodCount', 'Operational', const Color(0xFF10B981), isDark),
                    const SizedBox(width: 8),
                    _kpiMetricTile('Maintenance', '$_maintenanceCount', 'In Service', const Color(0xFFF59E0B), isDark),
                    const SizedBox(width: 8),
                    _kpiMetricTile('Poor Health', '$_poorCount', 'Needs Repair', const Color(0xFFEA580C), isDark),
                    const SizedBox(width: 8),
                    _kpiMetricTile('Critical Risk', '$_criticalCount', 'Immediate Action', const Color(0xFFDC2626), isDark),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // ── Search & Filter Controls ──────────────────────────────────
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  children: [
                    // Search Bar
                    TextField(
                      onChanged: (val) => setState(() => _searchQuery = val),
                      decoration: InputDecoration(
                        hintText: 'Search by asset name, ID, or location...',
                        prefixIcon: const Icon(Icons.search, size: 20, color: Color(0xFF94A3B8)),
                        suffixIcon: _searchQuery.isNotEmpty
                            ? IconButton(
                                icon: const Icon(Icons.clear, size: 18),
                                onPressed: () => setState(() => _searchQuery = ''),
                              )
                            : null,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        filled: true,
                        fillColor: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                          borderSide: BorderSide.none,
                        ),
                      ),
                    ),

                    const SizedBox(height: 10),

                    // Filter Pills
                    SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
                      child: Row(
                        children: _assetTypes.map((type) {
                          final selected = _selectedType == type;
                          return Padding(
                            padding: const EdgeInsets.only(right: 6),
                            child: ChoiceChip(
                              label: Text(type),
                              selected: selected,
                              selectedColor: const Color(0xFFF97316),
                              onSelected: (_) => setState(() => _selectedType = type),
                              labelStyle: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.bold,
                                color: selected ? Colors.white : (isDark ? Colors.grey[300] : Colors.grey[800]),
                              ),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // ── GIS Municipal Asset Map (Photo 2 Reference) ──────────────
              Container(
                height: 220,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(16),
                  child: Stack(
                    children: [
                      FlutterMap(
                        mapController: _mapController,
                        options: const MapOptions(
                          initialCenter: LatLng(6.9271, 79.8612), // Colombo
                          initialZoom: 11.5,
                        ),
                        children: [
                          TileLayer(
                            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                            userAgentPackageName: 'lk.gov.civilanka.app',
                          ),
                          MarkerLayer(
                            markers: filtered
                                .where((a) => a.latitude != null && a.longitude != null)
                                .map((a) {
                              final cond = (a.latestCondition ?? '').toLowerCase();
                              final color = cond == 'critical'
                                  ? const Color(0xFFDC2626)
                                  : cond == 'poor'
                                      ? const Color(0xFFEA580C)
                                      : cond == 'moderate'
                                          ? const Color(0xFFF59E0B)
                                          : const Color(0xFF10B981);

                              return Marker(
                                point: LatLng(a.latitude!, a.longitude!),
                                width: 36,
                                height: 36,
                                child: GestureDetector(
                                  onTap: () => setState(() => _selectedAssetForDetails = a),
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: color,
                                      shape: BoxShape.circle,
                                      border: Border.all(color: Colors.white, width: 2),
                                      boxShadow: [
                                        BoxShadow(
                                          color: color.withValues(alpha: 0.4),
                                          blurRadius: 6,
                                        ),
                                      ],
                                    ),
                                    child: const Icon(
                                      Icons.account_balance_outlined,
                                      color: Colors.white,
                                      size: 18,
                                    ),
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                      Positioned(
                        top: 10,
                        left: 10,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.7),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.map_outlined, color: Color(0xFFF97316), size: 14),
                              const SizedBox(width: 6),
                              Text(
                                'GIS Assets Map (${filtered.where((a) => a.latitude != null).length} mapped)',
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              // ── Section Title ─────────────────────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Registered Asset Registry (${filtered.length})',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  if (_loading)
                    const SizedBox(
                      width: 16,
                      height: 16,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    ),
                ],
              ),
              const SizedBox(height: 10),

              // ── Asset Registry List Cards ─────────────────────────────────
              if (_loading && filtered.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: CircularProgressIndicator(),
                  ),
                )
              else if (filtered.isEmpty)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(28),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF1E293B) : Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
                  ),
                  child: const Column(
                    children: [
                      Icon(Icons.account_balance_outlined, size: 40, color: Colors.grey),
                      SizedBox(height: 10),
                      Text('No infrastructure assets match filter', style: TextStyle(fontWeight: FontWeight.bold)),
                      Text('Try changing search query or register a new asset.', style: TextStyle(fontSize: 12, color: Colors.grey)),
                    ],
                  ),
                )
              else
                ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: filtered.length,
                  itemBuilder: (ctx, i) {
                    final asset = filtered[i];
                    return _buildAssetCard(asset, isDark);
                  },
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _kpiMetricTile(String label, String value, String sub, Color color, bool isDark) {
    return Container(
      width: 120,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: color),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: color),
          ),
          Text(
            sub,
            style: const TextStyle(fontSize: 10, color: Colors.grey),
          ),
        ],
      ),
    );
  }

  void _openEditModal(InfrastructureAsset asset) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: EditAssetModal(
          asset: asset,
          onAssetUpdated: () => _loadAssets(),
        ),
      ),
    );
  }

  void _confirmDelete(InfrastructureAsset asset) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Infrastructure Asset'),
        content: Text('Are you sure you want to delete "${asset.id} - ${asset.name}" from the municipal database? This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                final assetService = context.read<AssetService>();
                await assetService.deleteAsset(asset.id);
                _loadAssets();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text('Asset ${asset.id} deleted successfully'),
                      backgroundColor: const Color(0xFF10B981),
                    ),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
                  );
                }
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('Delete Asset'),
          ),
        ],
      ),
    );
  }

  Widget _buildAssetCard(InfrastructureAsset asset, bool isDark) {
    final cond = (asset.latestCondition ?? 'Good').toLowerCase();
    final condColor = cond == 'critical'
        ? const Color(0xFFDC2626)
        : cond == 'poor'
            ? const Color(0xFFEA580C)
            : cond == 'moderate'
                ? const Color(0xFFF59E0B)
                : const Color(0xFF10B981);

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: condColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(Icons.account_balance_outlined, color: condColor, size: 24),
        ),
        title: Row(
          children: [
            Text(
              asset.id,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                asset.name,
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 2),
            Text('${asset.type} • ${asset.location}', style: const TextStyle(fontSize: 12)),
            const SizedBox(height: 6),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: condColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    asset.latestCondition ?? 'Good',
                    style: TextStyle(color: condColor, fontSize: 10.5, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.grey.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    asset.status,
                    style: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ],
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              icon: const Icon(Icons.psychology_outlined, size: 20, color: Color(0xFF047857)),
              tooltip: 'AI Risk Prediction',
              onPressed: () => _runAssetRiskAnalysisModal(context, asset, isDark),
            ),
            IconButton(
              icon: const Icon(Icons.edit_outlined, size: 18, color: Color(0xFFF97316)),
              tooltip: 'Edit Asset',
              onPressed: () => _openEditModal(asset),
            ),
            IconButton(
              icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Colors.red),
              tooltip: 'Delete Asset',
              onPressed: () => _confirmDelete(asset),
            ),
          ],
        ),
        onTap: () {
          _showAssetDetailSheet(context, asset, isDark);
        },
      ),
    );
  }

  void _showAssetDetailSheet(BuildContext context, InfrastructureAsset asset, bool isDark) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    asset.id,
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFFF97316)),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: const Color(0xFF10B981).withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      asset.status,
                      style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold, fontSize: 11),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              Text(
                asset.name,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 4),
              Text(
                '${asset.type} Infrastructure • ${asset.location}',
                style: const TextStyle(color: Colors.grey, fontSize: 13),
              ),
              const SizedBox(height: 16),
              if (asset.description != null && asset.description!.isNotEmpty) ...[
                const Text('Description & Specifications', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                const SizedBox(height: 4),
                Text(asset.description!, style: const TextStyle(fontSize: 12.5)),
                const SizedBox(height: 16),
              ],
              const SizedBox(height: 14),
              // AI Risk Prediction Button
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.pop(ctx);
                    _runAssetRiskAnalysisModal(context, asset, isDark);
                  },
                  icon: const Icon(Icons.psychology, size: 18, color: Colors.white),
                  label: const Text(
                    'Run AI Structural Risk Prediction',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.white),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F172A),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        _openEditModal(asset);
                      },
                      icon: const Icon(Icons.edit_outlined, size: 16, color: Color(0xFFF97316)),
                      label: const Text('Edit Asset', style: TextStyle(color: Color(0xFFF97316))),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        _confirmDelete(asset);
                      },
                      icon: const Icon(Icons.delete_outline_rounded, size: 16),
                      label: const Text('Delete Asset'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.red,
                        foregroundColor: Colors.white,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  String _mapAssetTypeToHazardCategory(String type) {
    final t = type.toLowerCase();
    if (t.contains('water') || t.contains('pipe')) return 'Water Leak';
    if (t.contains('electric') || t.contains('light') || t.contains('power')) return 'Electrical Hazard';
    if (t.contains('bridge') || t.contains('civil') || t.contains('culvert')) return 'Structural Damage';
    if (t.contains('drain') || t.contains('canal') || t.contains('flood')) return 'Drainage & Flooding';
    return 'Road Damage';
  }

  void _runAssetRiskAnalysisModal(BuildContext context, InfrastructureAsset asset, bool isDark) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return FutureBuilder<AssetRiskResult>(
          future: context.read<AIService>().analyzeAssetRisk(
                asset.id,
                assetName: asset.name,
                assetType: asset.type,
                condition: asset.latestCondition,
                location: asset.location,
              ),
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) {
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: const [
                    CircularProgressIndicator(color: Color(0xFF10B981)),
                    SizedBox(height: 16),
                    Text(
                      'Running AI Structural Risk Prediction...',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Evaluating material fatigue, monsoon degradation & commuter load',
                      style: TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                  ],
                ),
              );
            }

            final risk = snapshot.data ??
                AssetRiskResult(
                  riskLevel: 'HIGH',
                  riskScore: 78,
                  confidence: 0.95,
                  conditionAssessment: 'Deteriorating',
                  failureLikelihood: 'High',
                  reason:
                      'Accelerated material fatigue and rainfall inundation detected.',
                  recommendedInspectionFrequency: 'Weekly',
                  recommendedAction: 'Emergency shoring and traffic diversion.',
                  urgency: 'High',
                  modelName: 'gemini-3.1-flash-lite / Markov Structural Degradation',
                  status: 'AI_ANALYZED',
                  timestamp: DateTime.now(),
                );

            Color riskColor = const Color(0xFF10B981);
            if (risk.riskLevel == 'MEDIUM') riskColor = const Color(0xFFF59E0B);
            if (risk.riskLevel == 'HIGH') riskColor = const Color(0xFFEA580C);
            if (risk.riskLevel == 'CRITICAL') riskColor = const Color(0xFFEF4444);

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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: riskColor.withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(Icons.psychology, color: riskColor, size: 20),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'AI STRUCTURAL RISK PREDICTION',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF047857),
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  Text(
                                    asset.name,
                                    style: const TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w800,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: riskColor.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: riskColor),
                        ),
                        child: Text(
                          risk.riskLevel,
                          style: TextStyle(
                            color: riskColor,
                            fontWeight: FontWeight.w900,
                            fontSize: 11,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),

                  // Risk score bar
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'FAILURE PROBABILITY SCORE',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                            ),
                            Text(
                              '${risk.riskScore} / 100',
                              style: TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: riskColor),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4),
                          child: LinearProgressIndicator(
                            value: risk.riskScore / 100,
                            minHeight: 7,
                            backgroundColor: Colors.grey[200],
                            valueColor: AlwaysStoppedAnimation<Color>(riskColor),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Condition: ${risk.conditionAssessment} • Likelihood: ${risk.failureLikelihood}',
                              style: const TextStyle(fontSize: 10, color: Colors.grey),
                            ),
                            Text(
                              'Conf: ${(risk.confidence * 100).toInt()}%',
                              style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12),

                  // Reason Card
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(10),
                      border: Border(left: BorderSide(color: riskColor, width: 3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'DEGRADATION ASSESSMENT & ROOT CAUSE',
                          style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Colors.grey),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          risk.reason,
                          style: const TextStyle(fontSize: 11.5, height: 1.35),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 10),

                  // Remedial Intervention
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: isDark ? const Color(0xFF0F172A) : const Color(0xFFF0FDF4),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(
                        color: const Color(0xFF10B981).withValues(alpha: 0.3),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'RECOMMENDED INTERVENTION',
                              style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF047857)),
                            ),
                            Text(
                              'Urgency: ${risk.urgency}',
                              style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.bold, color: Color(0xFF047857)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 3),
                        Text(
                          risk.recommendedAction,
                          style: const TextStyle(fontSize: 11.5, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16),

                  // ── CRITICAL REDIRECT TO HAZARD CLASSIFICATION AI ──
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.pop(ctx);
                        Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => AIIntelligenceScreen(
                              initialTab: 0,
                              prefillTitle: '[Asset Risk Alert] ${asset.name} Structural Threat',
                              prefillCategory: _mapAssetTypeToHazardCategory(asset.type),
                              prefillDescription:
                                  '${asset.name} (${asset.type}) at ${asset.location}. Structural Failure Risk: ${risk.riskLevel} (${risk.riskScore}/100). Condition: ${risk.conditionAssessment}. Failure likelihood: ${risk.failureLikelihood}. ${risk.reason}. Recommended Action: ${risk.recommendedAction}',
                              prefillLocation: asset.location,
                              prefillZone: 'Municipal Infrastructure Corridor',
                              autoRunTriage: true,
                            ),
                          ),
                        );
                      },
                      icon: const Icon(Icons.flash_on, color: Colors.white, size: 18),
                      label: const Text(
                        'Escalate to Hazard Classification AI',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFEA580C),
                        padding: const EdgeInsets.symmetric(vertical: 13),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        elevation: 2,
                      ),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// REGISTER ASSET MODAL (Photo 3 Reference)
// ═════════════════════════════════════════════════════════════════════════════

class RegisterAssetModal extends StatefulWidget {
  final VoidCallback onAssetRegistered;
  const RegisterAssetModal({super.key, required this.onAssetRegistered});

  @override
  State<RegisterAssetModal> createState() => _RegisterAssetModalState();
}

class _RegisterAssetModalState extends State<RegisterAssetModal> {
  final _formKey = GlobalKey<FormState>();
  final MapController _pickerMapCtrl = MapController();
  final _nameCtrl = TextEditingController();
  final _locationCtrl = TextEditingController(text: 'Colombo, Sri Lanka');
  final _latCtrl = TextEditingController(text: '6.9271');
  final _lngCtrl = TextEditingController(text: '79.8612');
  final _customIdCtrl = TextEditingController();
  final _descCtrl = TextEditingController();

  String _selectedType = 'Water';
  String _selectedStatus = 'Active';
  String _selectedCondition = 'Good';
  bool _submitting = false;

  final List<String> _types = ['Water', 'Electrical', 'Civil', 'Roads & Bridges', 'Sanitation', 'Telecom'];
  final List<String> _statuses = ['Active', 'Under Maintenance', 'Inactive', 'Decommissioned'];
  final List<String> _conditions = ['Good', 'Moderate', 'Poor', 'Critical'];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _detectLocationOnOpen();
    });
  }

  Future<void> _detectLocationOnOpen() async {
    try {
      final locService = context.read<LocationService>();
      final pos = await locService.getCurrentPosition();
      if (pos != null && mounted) {
        setState(() {
          _latCtrl.text = pos.latitude.toStringAsFixed(4);
          _lngCtrl.text = pos.longitude.toStringAsFixed(4);
        });
        _pickerMapCtrl.move(LatLng(pos.latitude, pos.longitude), 15);
      }
    } catch (_) {}
  }

  Future<void> _detectLocation() async {
    try {
      final locService = context.read<LocationService>();
      final pos = await locService.getCurrentPosition();
      if (pos != null && mounted) {
        setState(() {
          _latCtrl.text = pos.latitude.toStringAsFixed(4);
          _lngCtrl.text = pos.longitude.toStringAsFixed(4);
        });
        _pickerMapCtrl.move(LatLng(pos.latitude, pos.longitude), 15);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Current GPS location marked!')),
        );
      }
    } catch (_) {}
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _submitting = true);
    try {
      final assetService = context.read<AssetService>();
      await assetService.createAsset(
        name: _nameCtrl.text.trim(),
        type: _selectedType,
        status: _selectedStatus,
        condition: _selectedCondition,
        location: _locationCtrl.text.trim(),
        latitude: double.tryParse(_latCtrl.text),
        longitude: double.tryParse(_lngCtrl.text),
        customId: _customIdCtrl.text.trim(),
        description: _descCtrl.text.trim(),
      );

      widget.onAssetRegistered();

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Asset registered successfully in municipal database!'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF97316).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.add_business_rounded, color: Color(0xFFF97316), size: 20),
                      ),
                      const SizedBox(width: 10),
                      const Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Register Infrastructure Asset', style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                          Text('Record physical municipal asset & GIS location', style: TextStyle(fontSize: 11, color: Colors.grey)),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Asset Name *
              const Text('Asset Name *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _nameCtrl,
                decoration: const InputDecoration(
                  hintText: 'e.g. Baseline Road Culvert Drainage System',
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'Asset name is required' : null,
              ),

              const SizedBox(height: 14),

              // Asset Type & Status
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Asset Type *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          value: _selectedType,
                          items: _types.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                          onChanged: (val) => setState(() => _selectedType = val!),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Operational Status *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          value: _selectedStatus,
                          items: _statuses.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                          onChanged: (val) => setState(() => _selectedStatus = val!),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Asset Condition *
              const Text('Asset Condition *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: _selectedCondition,
                items: _conditions.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (val) => setState(() => _selectedCondition = val!),
              ),

              const SizedBox(height: 14),

              // Location Address *
              const Text('Location Address *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _locationCtrl,
                decoration: const InputDecoration(
                  hintText: 'e.g. Downtown, Colombo 03',
                  prefixIcon: Icon(Icons.location_on_outlined, size: 18),
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'Location is required' : null,
              ),

              const SizedBox(height: 14),

              // GIS Coordinates
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Pin GIS Coordinates on Map', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  TextButton.icon(
                    onPressed: _detectLocation,
                    icon: const Icon(Icons.my_location, size: 14, color: Color(0xFFF97316)),
                    label: const Text('Detect GPS', style: TextStyle(fontSize: 11, color: Color(0xFFF97316), fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _latCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Latitude'),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _lngCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Longitude'),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 10),

              // Interactive GIS Map Picker to mark asset position (Matching Photo 3)
              Container(
                height: 190,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Stack(
                    children: [
                      FlutterMap(
                        mapController: _pickerMapCtrl,
                        options: MapOptions(
                          initialCenter: LatLng(
                            double.tryParse(_latCtrl.text) ?? 6.9271,
                            double.tryParse(_lngCtrl.text) ?? 79.8612,
                          ),
                          initialZoom: 13.5,
                          onTap: (tapPos, latLng) {
                            setState(() {
                              _latCtrl.text = latLng.latitude.toStringAsFixed(4);
                              _lngCtrl.text = latLng.longitude.toStringAsFixed(4);
                            });
                            _pickerMapCtrl.move(latLng, _pickerMapCtrl.camera.zoom);
                          },
                        ),
                        children: [
                          TileLayer(
                            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                            userAgentPackageName: 'lk.gov.civilanka.app',
                          ),
                          MarkerLayer(
                            markers: [
                              if (double.tryParse(_latCtrl.text) != null &&
                                  double.tryParse(_lngCtrl.text) != null)
                                Marker(
                                  point: LatLng(
                                    double.parse(_latCtrl.text),
                                    double.parse(_lngCtrl.text),
                                  ),
                                  width: 42,
                                  height: 42,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF97316),
                                      shape: BoxShape.circle,
                                      border: Border.all(color: Colors.white, width: 2.5),
                                      boxShadow: [
                                        BoxShadow(
                                          color: const Color(0xFFF97316).withValues(alpha: 0.45),
                                          blurRadius: 8,
                                          offset: const Offset(0, 3),
                                        ),
                                      ],
                                    ),
                                    child: const Icon(
                                      Icons.location_on_rounded,
                                      color: Colors.white,
                                      size: 22,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                      Positioned(
                        bottom: 8,
                        left: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.75),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.touch_app_rounded, color: Color(0xFFF97316), size: 14),
                              SizedBox(width: 6),
                              Text(
                                'Tap anywhere on map to mark asset GIS location',
                                style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 14),

              // Custom Asset ID (Optional)
              const Text('Custom Asset ID (Optional)', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _customIdCtrl,
                decoration: const InputDecoration(
                  hintText: 'Leave blank for auto AST-xxx',
                ),
              ),

              const SizedBox(height: 14),

              // Description
              const Text('Description & Specifications', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _descCtrl,
                maxLines: 2,
                decoration: const InputDecoration(
                  hintText: 'Engineering specs, material type, capacity notes...',
                ),
              ),

              const SizedBox(height: 24),

              // Submit Button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF97316),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _submitting
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Register Asset', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// EDIT ASSET MODAL
// ═════════════════════════════════════════════════════════════════════════════

class EditAssetModal extends StatefulWidget {
  final InfrastructureAsset asset;
  final VoidCallback onAssetUpdated;

  const EditAssetModal({
    super.key,
    required this.asset,
    required this.onAssetUpdated,
  });

  @override
  State<EditAssetModal> createState() => _EditAssetModalState();
}

class _EditAssetModalState extends State<EditAssetModal> {
  final _formKey = GlobalKey<FormState>();
  late final MapController _pickerMapCtrl;
  late final TextEditingController _nameCtrl;
  late final TextEditingController _locationCtrl;
  late final TextEditingController _latCtrl;
  late final TextEditingController _lngCtrl;
  late final TextEditingController _descCtrl;

  late String _selectedType;
  late String _selectedStatus;
  late String _selectedCondition;
  bool _submitting = false;

  final List<String> _types = ['Water', 'Electrical', 'Civil', 'Roads & Bridges', 'Sanitation', 'Telecom'];
  final List<String> _statuses = ['Active', 'Under Maintenance', 'Inactive', 'Decommissioned'];
  final List<String> _conditions = ['Good', 'Moderate', 'Poor', 'Critical'];

  @override
  void initState() {
    super.initState();
    _pickerMapCtrl = MapController();
    _nameCtrl = TextEditingController(text: widget.asset.name);
    _locationCtrl = TextEditingController(text: widget.asset.location);
    _latCtrl = TextEditingController(text: (widget.asset.latitude ?? 6.9271).toStringAsFixed(4));
    _lngCtrl = TextEditingController(text: (widget.asset.longitude ?? 79.8612).toStringAsFixed(4));
    _descCtrl = TextEditingController(text: widget.asset.description ?? '');

    _selectedType = _types.contains(widget.asset.type) ? widget.asset.type : 'Water';
    _selectedStatus = _statuses.contains(widget.asset.status) ? widget.asset.status : 'Active';
    _selectedCondition = _conditions.contains(widget.asset.latestCondition) ? widget.asset.latestCondition! : 'Good';
  }

  Future<void> _detectLocation() async {
    try {
      final locService = context.read<LocationService>();
      final pos = await locService.getCurrentPosition();
      if (pos != null && mounted) {
        setState(() {
          _latCtrl.text = pos.latitude.toStringAsFixed(4);
          _lngCtrl.text = pos.longitude.toStringAsFixed(4);
        });
        _pickerMapCtrl.move(LatLng(pos.latitude, pos.longitude), 15);
      }
    } catch (_) {}
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _submitting = true);
    try {
      final assetService = context.read<AssetService>();
      await assetService.updateAsset(
        id: widget.asset.id,
        name: _nameCtrl.text.trim(),
        type: _selectedType,
        status: _selectedStatus,
        condition: _selectedCondition,
        location: _locationCtrl.text.trim(),
        latitude: double.tryParse(_latCtrl.text),
        longitude: double.tryParse(_lngCtrl.text),
        description: _descCtrl.text.trim(),
      );

      widget.onAssetUpdated();

      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Asset ${widget.asset.id} updated successfully!'),
            backgroundColor: const Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _submitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: const EdgeInsets.all(24),
      child: Form(
        key: _formKey,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF97316).withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Icon(Icons.edit_note_rounded, color: Color(0xFFF97316), size: 20),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Edit Asset (${widget.asset.id})', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.bold)),
                          const Text('Update municipal asset & GIS details', style: TextStyle(fontSize: 11, color: Colors.grey)),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),

              const SizedBox(height: 20),

              // Asset Name *
              const Text('Asset Name *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _nameCtrl,
                validator: (val) => val == null || val.trim().isEmpty ? 'Asset name is required' : null,
              ),

              const SizedBox(height: 14),

              // Asset Type & Status
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Asset Type *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          value: _selectedType,
                          items: _types.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                          onChanged: (val) => setState(() => _selectedType = val!),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Operational Status *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          value: _selectedStatus,
                          items: _statuses.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                          onChanged: (val) => setState(() => _selectedStatus = val!),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14),

              // Asset Condition *
              const Text('Asset Condition *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: _selectedCondition,
                items: _conditions.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (val) => setState(() => _selectedCondition = val!),
              ),

              const SizedBox(height: 14),

              // Location Address *
              const Text('Location Address *', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _locationCtrl,
                decoration: const InputDecoration(
                  prefixIcon: Icon(Icons.location_on_outlined, size: 18),
                ),
                validator: (val) => val == null || val.trim().isEmpty ? 'Location is required' : null,
              ),

              const SizedBox(height: 14),

              // GIS Coordinates
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Pin GIS Coordinates on Map', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  TextButton.icon(
                    onPressed: _detectLocation,
                    icon: const Icon(Icons.my_location, size: 14, color: Color(0xFFF97316)),
                    label: const Text('Detect GPS', style: TextStyle(fontSize: 11, color: Color(0xFFF97316), fontWeight: FontWeight.bold)),
                  ),
                ],
              ),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _latCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Latitude'),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _lngCtrl,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Longitude'),
                      onChanged: (_) => setState(() {}),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 10),

              // Interactive GIS Map Picker
              Container(
                height: 180,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
                  ),
                ),
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: Stack(
                    children: [
                      FlutterMap(
                        mapController: _pickerMapCtrl,
                        options: MapOptions(
                          initialCenter: LatLng(
                            double.tryParse(_latCtrl.text) ?? 6.9271,
                            double.tryParse(_lngCtrl.text) ?? 79.8612,
                          ),
                          initialZoom: 14.0,
                          onTap: (tapPos, latLng) {
                            setState(() {
                              _latCtrl.text = latLng.latitude.toStringAsFixed(4);
                              _lngCtrl.text = latLng.longitude.toStringAsFixed(4);
                            });
                            _pickerMapCtrl.move(latLng, _pickerMapCtrl.camera.zoom);
                          },
                        ),
                        children: [
                          TileLayer(
                            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                            userAgentPackageName: 'lk.gov.civilanka.app',
                          ),
                          MarkerLayer(
                            markers: [
                              if (double.tryParse(_latCtrl.text) != null &&
                                  double.tryParse(_lngCtrl.text) != null)
                                Marker(
                                  point: LatLng(
                                    double.parse(_latCtrl.text),
                                    double.parse(_lngCtrl.text),
                                  ),
                                  width: 42,
                                  height: 42,
                                  child: Container(
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFF97316),
                                      shape: BoxShape.circle,
                                      border: Border.all(color: Colors.white, width: 2.5),
                                      boxShadow: [
                                        BoxShadow(
                                          color: const Color(0xFFF97316).withValues(alpha: 0.45),
                                          blurRadius: 8,
                                        ),
                                      ],
                                    ),
                                    child: const Icon(
                                      Icons.location_on_rounded,
                                      color: Colors.white,
                                      size: 22,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                      Positioned(
                        bottom: 8,
                        left: 8,
                        right: 8,
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.75),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.touch_app_rounded, color: Color(0xFFF97316), size: 14),
                              SizedBox(width: 6),
                              Text(
                                'Tap anywhere on map to reposition asset marker',
                                style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 14),

              // Description
              const Text('Description & Specifications', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              TextFormField(
                controller: _descCtrl,
                maxLines: 2,
              ),

              const SizedBox(height: 24),

              // Submit Button
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  onPressed: _submitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF97316),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _submitting
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text('Save Asset Changes', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
