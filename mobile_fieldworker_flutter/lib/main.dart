import 'package:flutter/material.dart';
import 'screens/assigned_orders_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CivitaGuardFieldWorkerApp());
}

class CivitaGuardFieldWorkerApp extends StatelessWidget {
  const CivitaGuardFieldWorkerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CivitaGuard Field Worker',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF10B981), // Emerald municipal accent
          brightness: Brightness.dark,
          primary: const Color(0xFF10B981),
          secondary: const Color(0xFF3B82F6),
          background: const Color(0xFF0F172A),
          surface: const Color(0xFF1E293B),
        ),
        scaffoldBackgroundColor: const Color(0xFF0B0F19),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFF111827),
          elevation: 0,
          centerTitle: false,
          titleTextStyle: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Colors.white,
            letterSpacing: 0.5,
          ),
        ),
        cardTheme: CardTheme(
          color: const Color(0xFF1E293B),
          elevation: 2,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF334155), width: 1),
          ),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF10B981),
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            textStyle: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
          ),
        ),
      ),
      home: const AssignedOrdersScreen(),
    );
  }
}
