import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/work_order.dart';

/// Clean mobile presentation of the Cost & Material Estimation AI results.
///
/// Displays:
/// 1. Cost Summary (Total, Materials, Labour, Equipment)
/// 2. Required Materials (Quantities, Units, Unit Costs, Totals)
/// 3. Required Equipment
/// 4. Work Requirements (Duration, Recommended Crew Size, Labour Hours)
/// 5. AI Analysis (Model/Source, Confidence, Benchmarks, Reasoning)
///
/// NOTE: Flutter does NOT calculate costs or material quantities locally.
/// All figures and approval flags originate authoritatively from the ASP.NET Core backend.
class CostEstimateCard extends StatelessWidget {
  final WorkOrder workOrder;
  final bool canEstimate;
  final bool isEstimating;
  final VoidCallback? onGenerateEstimate;

  const CostEstimateCard({
    super.key,
    required this.workOrder,
    this.canEstimate = false,
    this.isEstimating = false,
    this.onGenerateEstimate,
  });

  @override
  Widget build(BuildContext context) {
    final estimate = workOrder.latestCostEstimate;
    final currencyFmt = NumberFormat.currency(
      locale: 'en_LK',
      symbol: 'Rs. ',
      decimalDigits: 0,
    );
    final dateFmt = DateFormat('dd MMM yyyy, h:mm a');

    if (estimate == null) {
      return _buildEmptyState(context);
    }

    return _buildEstimateCard(context, estimate, currencyFmt, dateFmt);
  }

  // ── EMPTY STATE (NO ESTIMATE YET) ──────────────────────────────────────────

  Widget _buildEmptyState(BuildContext context) {
    final theme = Theme.of(context);

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.auto_awesome,
                    size: 20, color: theme.colorScheme.primary),
                const SizedBox(width: 8),
                const Text(
                  'AI Cost & Material Estimation',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                ),
              ],
            ),
            const SizedBox(height: 6),
            const Text(
              'AI-assisted estimate using project repair benchmarks',
              style: TextStyle(fontSize: 11, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            Text(
              'No cost estimate has been generated for this work order yet. The AI agent calculates required materials, equipment, crew size, labour hours, and estimated costs based on project municipal benchmarks.',
              style: TextStyle(
                  fontSize: 13, color: Colors.grey.shade700, height: 1.4),
            ),
            const SizedBox(height: 16),
            if (canEstimate)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: isEstimating ? null : onGenerateEstimate,
                  icon: isEstimating
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Icon(Icons.auto_awesome, size: 18),
                  label: Text(
                    isEstimating
                        ? 'Generating AI Estimate...'
                        : 'Generate AI Cost Estimate',
                  ),
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              )
            else
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.lock_outline,
                        size: 16, color: Colors.grey.shade600),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Awaiting cost estimation by authorized municipal staff.',
                        style: TextStyle(
                            fontSize: 12, color: Colors.grey.shade700),
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }

  // ── POPULATED ESTIMATE CARD ────────────────────────────────────────────────

  Widget _buildEstimateCard(
    BuildContext context,
    CostEstimate estimate,
    NumberFormat currencyFmt,
    DateFormat dateFmt,
  ) {
    final theme = Theme.of(context);
    final isFallback = estimate.modelName.toLowerCase().contains('fallback') ||
        estimate.modelName.toLowerCase().contains('rule');
    final confidencePct = (estimate.confidence * 100).toStringAsFixed(0);

    final materials = workOrder.items
        .where((i) => i.itemType.toLowerCase() == 'material')
        .toList();
    final equipment = workOrder.items
        .where((i) => i.itemType.toLowerCase() == 'equipment')
        .toList();

    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // ── Card Header: Title + Source Badge ────────────────────────────
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(Icons.psychology_outlined,
                              size: 20, color: theme.colorScheme.primary),
                          const SizedBox(width: 8),
                          const Text(
                            'AI Cost & Material Estimation',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      const Text(
                        'AI-assisted estimate using project repair benchmarks',
                        style: TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _buildSourceBadge(estimate.modelName, isFallback),
              ],
            ),
            const SizedBox(height: 16),

            // ── Section 1: Cost Summary ──────────────────────────────────────
            _buildCostSummary(estimate, currencyFmt),
            const SizedBox(height: 18),

            // ── Section 2: Work Requirements ─────────────────────────────────
            _buildWorkRequirements(estimate),
            const SizedBox(height: 18),

            // ── Section 3: Materials Breakdown ───────────────────────────────
            if (materials.isNotEmpty) ...[
              _buildMaterialsSection(materials, currencyFmt),
              const SizedBox(height: 18),
            ],

            // ── Section 4: Equipment Requirements ────────────────────────────
            if (equipment.isNotEmpty) ...[
              _buildEquipmentSection(equipment, currencyFmt),
              const SizedBox(height: 18),
            ],

            // ── Section 5: AI Analysis & Reasoning ───────────────────────────
            _buildAiAnalysisSection(estimate, confidencePct, dateFmt),

            // ── Section 6: Action Button (Recalculate) ────────────────────────
            if (canEstimate) ...[
              const SizedBox(height: 16),
              const Divider(height: 1),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: isEstimating ? null : onGenerateEstimate,
                  icon: isEstimating
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.refresh, size: 16),
                  label: Text(
                    isEstimating
                        ? 'Recalculating Estimate...'
                        : 'Recalculate AI Estimate',
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ── WIDGET SUB-COMPONENTS ──────────────────────────────────────────────────

  Widget _buildSourceBadge(String modelName, bool isFallback) {
    final String label = isFallback
        ? 'Rule-based fallback'
        : modelName.isNotEmpty
            ? modelName
            : 'AI Agent';

    final Color bg =
        isFallback ? Colors.amber.shade50 : const Color(0xFFE8F1F8);
    final Color border =
        isFallback ? Colors.amber.shade300 : const Color(0xFFB0D0E8);
    final Color text =
        isFallback ? Colors.amber.shade900 : const Color(0xFF1A6FA8);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: border),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: text,
        ),
      ),
    );
  }

  Widget _buildCostSummary(CostEstimate estimate, NumberFormat currencyFmt) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: const Color(0xFFF7FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'COST SUMMARY',
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 0.8,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Total Estimated Cost',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
              ),
              Text(
                currencyFmt.format(estimate.estimatedCost),
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.green.shade800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          const Divider(height: 1),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _buildMiniMetric(
                  'Materials',
                  currencyFmt.format(estimate.materialCost),
                  Colors.blue.shade800,
                ),
              ),
              Expanded(
                child: _buildMiniMetric(
                  'Labour',
                  currencyFmt.format(estimate.labourCost),
                  Colors.indigo.shade800,
                ),
              ),
              Expanded(
                child: _buildMiniMetric(
                  'Equipment',
                  currencyFmt.format(estimate.equipmentCost),
                  Colors.amber.shade900,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniMetric(String label, String value, Color color) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: Colors.grey),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: TextStyle(
            fontFamily: 'monospace',
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: color,
          ),
        ),
      ],
    );
  }

  Widget _buildWorkRequirements(CostEstimate estimate) {
    final durationStr =
        '${estimate.estimatedDurationHours.toStringAsFixed(estimate.estimatedDurationHours % 1 == 0 ? 0 : 1)} hrs';
    final crewStr = '${estimate.recommendedCrewSize} workers';
    final labourHoursStr =
        '${estimate.estimatedLabourHours.toStringAsFixed(estimate.estimatedLabourHours % 1 == 0 ? 0 : 1)} person-hrs';

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'WORK REQUIREMENTS',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.8,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _buildWorkReqTile(
                Icons.schedule,
                'Duration',
                durationStr,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildWorkReqTile(
                Icons.groups_outlined,
                'Crew Size',
                crewStr,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _buildWorkReqTile(
                Icons.engineering_outlined,
                'Labour Hours',
                labourHoursStr,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildWorkReqTile(IconData icon, String title, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: const Color(0xFF1A6FA8)),
              const SizedBox(width: 4),
              Expanded(
                child: Text(
                  title,
                  style: TextStyle(fontSize: 10, color: Colors.grey.shade700),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  Widget _buildMaterialsSection(
    List<WorkOrderItem> materials,
    NumberFormat currencyFmt,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'MATERIALS',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
                color: Colors.grey,
              ),
            ),
            Text(
              '${materials.length} required',
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...materials.map((m) {
          final qtyFormatted =
              '${m.quantity.toStringAsFixed(m.quantity % 1 == 0 ? 0 : 1)} ${m.unit}';
          final unitCostFormatted = m.estimatedUnitCost > 0
              ? '@ ${currencyFmt.format(m.estimatedUnitCost)}/${m.unit}'
              : '';

          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Expanded(
                  flex: 3,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        m.itemName,
                        style: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (unitCostFormatted.isNotEmpty)
                        Text(
                          '$qtyFormatted $unitCostFormatted',
                          style: TextStyle(
                              fontSize: 11, color: Colors.grey.shade600),
                        ),
                    ],
                  ),
                ),
                Text(
                  currencyFmt.format(m.estimatedTotalCost),
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildEquipmentSection(
    List<WorkOrderItem> equipment,
    NumberFormat currencyFmt,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'EQUIPMENT',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                letterSpacing: 0.8,
                color: Colors.grey,
              ),
            ),
            Text(
              '${equipment.length} items',
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...equipment.map((e) {
          final qtyFormatted =
              '${e.quantity.toStringAsFixed(e.quantity % 1 == 0 ? 0 : 1)} ${e.unit}';

          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    e.itemName,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
                Text(
                  qtyFormatted,
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
                ),
                const SizedBox(width: 12),
                Text(
                  currencyFmt.format(e.estimatedTotalCost),
                  style: const TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  Widget _buildAiAnalysisSection(
    CostEstimate estimate,
    String confidencePct,
    DateFormat dateFmt,
  ) {
    final aiAnalysis = workOrder.latestAIAnalysis;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'AI ANALYSIS',
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.8,
            color: Colors.grey,
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.verified_outlined,
                    size: 14, color: Colors.green),
                const SizedBox(width: 4),
                Text(
                  'Confidence: $confidencePct%',
                  style: const TextStyle(
                      fontSize: 12, fontWeight: FontWeight.w600),
                ),
              ],
            ),
            Text(
              dateFmt.format(estimate.createdAt.toLocal()),
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
            ),
          ],
        ),
        if (estimate.reason.isNotEmpty) ...[
          const SizedBox(height: 8),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.grey.shade200),
            ),
            child: Text(
              estimate.reason,
              style: TextStyle(
                fontSize: 12,
                color: Colors.grey.shade800,
                height: 1.3,
              ),
            ),
          ),
        ],
        if (aiAnalysis?.recommendation != null &&
            aiAnalysis!.recommendation.isNotEmpty &&
            aiAnalysis.recommendation != estimate.reason) ...[
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.tips_and_updates_outlined,
                  size: 14, color: Colors.amber.shade800),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  'Recommendation: ${aiAnalysis.recommendation}',
                  style: TextStyle(
                    fontSize: 11,
                    fontStyle: FontStyle.italic,
                    color: Colors.grey.shade700,
                  ),
                ),
              ),
            ],
          ),
        ],
      ],
    );
  }
}
