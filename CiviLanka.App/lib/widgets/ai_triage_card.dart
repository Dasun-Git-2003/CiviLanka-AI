import 'package:flutter/material.dart';
import '../models/hazard.dart';
import '../theme/app_colors.dart';

class AITriageCard extends StatelessWidget {
  final HazardAIAnalysis aiAnalysis;

  const AITriageCard({super.key, required this.aiAnalysis});

  @override
  Widget build(BuildContext context) {
    final confidencePct = (aiAnalysis.confidenceScore * 100).toStringAsFixed(0);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFFF0FDF4),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFBBF7D0)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Row(
                children: [
                  Icon(Icons.smart_toy, color: AppColors.success, size: 20),
                  SizedBox(width: 8),
                  Text(
                    'AI Safety Analysis Verified',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: Color(0xFF166534),
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.success,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  '$confidencePct% MATCH',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 11,
                  ),
                ),
              ),
            ],
          ),
          if (aiAnalysis.reasoning != null && aiAnalysis.reasoning!.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              aiAnalysis.reasoning!,
              style: const TextStyle(
                fontSize: 13,
                color: Color(0xFF14532D),
              ),
            ),
          ],
          if (aiAnalysis.recommendedActions.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text(
              'Recommended Protocol:',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Color(0xFF166534),
              ),
            ),
            const SizedBox(height: 6),
            ...aiAnalysis.recommendedActions.map(
              (act) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('• ', style: TextStyle(color: AppColors.success, fontWeight: FontWeight.bold)),
                    Expanded(
                      child: Text(
                        act,
                        style: const TextStyle(fontSize: 12, color: Color(0xFF166534)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
