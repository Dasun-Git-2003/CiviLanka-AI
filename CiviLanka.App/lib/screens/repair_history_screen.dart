import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class RepairHistoryScreen extends StatelessWidget {
  const RepairHistoryScreen({super.key});

  static const List<Map<String, String>> _repairs = [
    {
      'woId': 'WO-2026-001',
      'asset': 'Main St Water Pipe (AST-001)',
      'type': 'Pipe Replacement & Pressure Test',
      'contractor': 'Colombo Municipal Water Corp',
      'cost': 'LKR 450,000',
      'date': '2026-09-24',
      'status': 'Signed Off',
    },
    {
      'woId': 'WO-2026-002',
      'asset': 'Galle Rd Bridge Viaduct (AST-004)',
      'type': 'Expansion Joint Structural Retrofit',
      'contractor': 'Lanka Infrastructure Construction',
      'cost': 'LKR 1,200,000',
      'date': '2026-09-20',
      'status': 'In Progress',
    },
    {
      'woId': 'WO-2026-003',
      'asset': 'Oak Ave Streetlight Grid (AST-002)',
      'type': 'Smart LED Controller Replacement',
      'contractor': 'Ceylon Electrical Solutions',
      'cost': 'LKR 180,000',
      'date': '2026-09-15',
      'status': 'Completed & Inspected',
    },
  ];

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
        title: Text(
          'Repair History & Maintenance',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: isDark ? Colors.white : AppColors.textDark,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1.0),
          child: Container(
            color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0),
            height: 1.0,
          ),
        ),
      ),
      body: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: _repairs.length,
        itemBuilder: (ctx, i) {
          final r = _repairs[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: isDark ? const Color(0xFF1E293B) : Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: isDark ? const Color(0xFF334155) : const Color(0xFFE2E8F0)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(r['woId']!, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFF97316))),
                    Text(r['date']!, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                  ],
                ),
                const SizedBox(height: 6),
                Text(r['asset']!, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold)),
                Text(r['type']!, style: const TextStyle(fontSize: 12.5, color: Colors.grey)),
                const SizedBox(height: 10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('Cost: ${r['cost']}', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF10B981))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                      decoration: BoxDecoration(
                        color: const Color(0xFF2563EB).withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(r['status']!, style: const TextStyle(color: Color(0xFF2563EB), fontSize: 10.5, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
