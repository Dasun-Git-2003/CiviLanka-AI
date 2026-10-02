import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/analytics_service.dart';
import '../../theme/app_colors.dart';

class AnalyticsScreen extends StatefulWidget {
  const AnalyticsScreen({super.key});

  @override
  State<AnalyticsScreen> createState() => _AnalyticsScreenState();
}

class _AnalyticsScreenState extends State<AnalyticsScreen> {
  AnalyticsData? _data;
  bool _isLoading = true;
  String? _error;
  String _timeframe = '30d';

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
      final res = await context.read<AnalyticsService>().getVisualizations(timeframe: _timeframe);
      if (mounted) {
        setState(() {
          _data = res;
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
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('City Safety Analytics', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            Text('Real-Time Municipal AI Telemetry', style: TextStyle(fontSize: 11, color: AppColors.slate500)),
          ],
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.textDark,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.primary),
            onPressed: _isLoading ? null : _loadData,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.signal_cellular_connected_no_internet_4_bar, size: 48, color: AppColors.critical),
                        const SizedBox(height: 12),
                        Text(_error!, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.slate600)),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _loadData,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Try Again'),
                        ),
                      ],
                    ),
                  ),
                )
              : _buildContent(),
    );
  }

  Widget _buildContent() {
    final d = _data!;
    final resolutionRate = d.totalHazards > 0
        ? ((d.resolvedHazardsCount / d.totalHazards) * 100).toStringAsFixed(1)
        : '0.0';

    return RefreshIndicator(
      onRefresh: _loadData,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(
                      width: 8,
                      height: 8,
                      decoration: const BoxDecoration(
                        color: AppColors.success,
                        shape: BoxShape.circle,
                      ),
                    ),
                    const SizedBox(width: 6),
                    const Text(
                      'Colombo Telemetry Live',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate700),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.slate200),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: ['7d', '30d', '90d'].map((tf) {
                      final isSel = _timeframe == tf;
                      return InkWell(
                        onTap: () {
                          if (!isSel) {
                            setState(() => _timeframe = tf);
                            _loadData();
                          }
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: isSel ? AppColors.primary : Colors.transparent,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            tf.toUpperCase(),
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isSel ? Colors.white : AppColors.slate600,
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: AppColors.teal.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Icon(Icons.smart_toy, color: AppColors.teal, size: 24),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Text(
                              'Municipal Audit Agent',
                              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            SizedBox(width: 6),
                            Icon(Icons.verified, color: AppColors.teal, size: 14),
                          ],
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${d.aiVerificationRate}% Audit Confidence • ${d.verifiedMaintenanceCount} Auto-Triaged Inspections',
                          style: const TextStyle(color: AppColors.slate400, fontSize: 11),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            GridView.count(
              crossAxisCount: 2,
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              mainAxisSpacing: 12,
              crossAxisSpacing: 12,
              childAspectRatio: 1.4,
              children: [
                _buildMetricCard(
                  title: 'Active Hazards',
                  value: '${d.activeHazardsCount}',
                  subtitle: '${d.criticalHazardsCount} Critical Priority',
                  icon: Icons.warning_amber_rounded,
                  iconColor: AppColors.critical,
                  bgColor: const Color(0xFFFEF2F2),
                ),
                _buildMetricCard(
                  title: 'Resolution Rate',
                  value: '$resolutionRate%',
                  subtitle: '${d.resolvedHazardsCount} of ${d.totalHazards} Solved',
                  icon: Icons.check_circle_outline,
                  iconColor: AppColors.success,
                  bgColor: const Color(0xFFF0FDF4),
                ),
                _buildMetricCard(
                  title: 'AI Audit Pass',
                  value: '${d.aiVerificationRate}%',
                  subtitle: '${d.verifiedMaintenanceCount} Verified',
                  icon: Icons.verified_user_outlined,
                  iconColor: AppColors.teal,
                  bgColor: const Color(0xFFF0FDFA),
                ),
                _buildMetricCard(
                  title: 'Avg Turnaround',
                  value: '${d.averageTurnaroundDays.toStringAsFixed(1)}d',
                  subtitle: '${d.activeWorkOrdersCount} In Progress',
                  icon: Icons.timer_outlined,
                  iconColor: AppColors.primary,
                  bgColor: const Color(0xFFEFF6FF),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: const BorderSide(color: AppColors.slate200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Incident Resolution Trajectory',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        Row(
                          children: [
                            Icon(Icons.trending_up, size: 16, color: AppColors.success),
                            SizedBox(width: 4),
                            Text('Live', style: TextStyle(fontSize: 11, color: AppColors.success, fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    const Text(
                      'Monthly incidents reported vs. field verified resolutions',
                      style: TextStyle(fontSize: 11, color: AppColors.slate500),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      height: 120,
                      width: double.infinity,
                      child: CustomPaint(
                        painter: _TrendChartPainter(
                          trends: d.resolutionTrends.isNotEmpty
                              ? d.resolutionTrends
                              : [
                                  {'month': 'Jan', 'reported': 12, 'resolved': 10},
                                  {'month': 'Feb', 'reported': 18, 'resolved': 14},
                                  {'month': 'Mar', 'reported': 15, 'resolved': 17},
                                  {'month': 'Apr', 'reported': 22, 'resolved': 20},
                                  {'month': 'May', 'reported': 28, 'resolved': 25},
                                  {'month': 'Jun', 'reported': 21, 'resolved': 21},
                                ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        _buildLegendItem(color: AppColors.primary, label: 'Reported'),
                        const SizedBox(width: 24),
                        _buildLegendItem(color: AppColors.success, label: 'Resolved'),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),
            Card(
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
                side: const BorderSide(color: AppColors.slate200),
              ),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Incidents by Infrastructure Sector',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                    ),
                    const SizedBox(height: 14),
                    _buildSectorBar(
                      title: 'Roads & Highways (RDA)',
                      active: 14,
                      resolved: 8,
                      pct: 0.72,
                      color: AppColors.primary,
                    ),
                    const SizedBox(height: 12),
                    _buildSectorBar(
                      title: 'Drainage & Canal Works (SLLRDC)',
                      active: 8,
                      resolved: 6,
                      pct: 0.55,
                      color: AppColors.teal,
                    ),
                    const SizedBox(height: 12),
                    _buildSectorBar(
                      title: 'Electrical & Street Lighting (CEB)',
                      active: 6,
                      resolved: 7,
                      pct: 0.42,
                      color: AppColors.warning,
                    ),
                    const SizedBox(height: 12),
                    _buildSectorBar(
                      title: 'Municipal Water Supply (NWSDB)',
                      active: 4,
                      resolved: 9,
                      pct: 0.30,
                      color: Colors.blueAccent,
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }

  Widget _buildMetricCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color iconColor,
    required Color bgColor,
  }) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.slate200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                title,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: AppColors.slate600),
              ),
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 16, color: iconColor),
              ),
            ],
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                value,
                style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.textDark),
              ),
              const SizedBox(height: 2),
              Text(
                subtitle,
                style: const TextStyle(fontSize: 10, color: AppColors.slate500, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildLegendItem({required Color color, required String label}) {
    return Row(
      children: [
        Container(
          width: 10,
          height: 10,
          decoration: BoxDecoration(color: color, shape: BoxShape.circle),
        ),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 11, color: AppColors.slate600)),
      ],
    );
  }

  Widget _buildSectorBar({
    required String title,
    required int active,
    required int resolved,
    required double pct,
    required Color color,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
            Text('$active active • $resolved resolved', style: const TextStyle(fontSize: 11, color: AppColors.slate500)),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            minHeight: 6,
            backgroundColor: AppColors.slate100,
            valueColor: AlwaysStoppedAnimation<Color>(color),
          ),
        ),
      ],
    );
  }
}

class _TrendChartPainter extends CustomPainter {
  final List<dynamic> trends;

  _TrendChartPainter({required this.trends});

  @override
  void paint(Canvas canvas, Size size) {
    if (trends.isEmpty) return;

    final reportedPaint = Paint()
      ..color = AppColors.primary
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke;

    final resolvedPaint = Paint()
      ..color = AppColors.success
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke;

    final dotPaintReported = Paint()..color = AppColors.primary;
    final dotPaintResolved = Paint()..color = AppColors.success;

    final double stepX = size.width / (trends.length - 1).clamp(1, 100);
    double maxVal = 1;
    for (var item in trends) {
      final rep = (item['reported'] as num?)?.toDouble() ?? 0.0;
      final res = (item['resolved'] as num?)?.toDouble() ?? 0.0;
      if (rep > maxVal) maxVal = rep;
      if (res > maxVal) maxVal = res;
    }
    maxVal *= 1.2;

    final reportedPath = Path();
    final resolvedPath = Path();

    for (int i = 0; i < trends.length; i++) {
      final x = i * stepX;
      final rep = (trends[i]['reported'] as num?)?.toDouble() ?? 0.0;
      final res = (trends[i]['resolved'] as num?)?.toDouble() ?? 0.0;

      final yRep = size.height - (rep / maxVal) * size.height;
      final yRes = size.height - (res / maxVal) * size.height;

      if (i == 0) {
        reportedPath.moveTo(x, yRep);
        resolvedPath.moveTo(x, yRes);
      } else {
        reportedPath.lineTo(x, yRep);
        resolvedPath.lineTo(x, yRes);
      }

      canvas.drawCircle(Offset(x, yRep), 3.5, dotPaintReported);
      canvas.drawCircle(Offset(x, yRes), 3.5, dotPaintResolved);
    }

    canvas.drawPath(reportedPath, reportedPaint);
    canvas.drawPath(resolvedPath, resolvedPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
