import 'package:flutter/material.dart';

class AppColors {
  // Brand Primaries (Emerald & Teal)
  static const Color primary = Color(0xFF10B981);       // emerald-500
  static const Color primaryDark = Color(0xFF059669);   // emerald-600
  static const Color primaryLight = Color(0xFF34D399);  // emerald-400
  static const Color accent = Color(0xFF0D9488);        // teal-600
  static const Color tealAccent = Color(0xFF0D9488);    // teal-600 alias
  static const Color cyan = Color(0xFF06B6D4);          // cyan-500

  // Dark Theme Backgrounds & Surfaces (Slate)
  static const Color bgDark = Color(0xFF0F172A);         // slate-900
  static const Color surfaceDark = Color(0xFF1E293B);    // slate-800
  static const Color cardDark = Color(0xFF1E293B);       // slate-800
  static const Color cardSurfaceDark = Color(0xFF334155);// slate-700
  static const Color borderDark = Color(0xFF334155);     // slate-700
  static const Color borderSubtleDark = Color(0xFF1E293B);

  // Light Theme
  static const Color bgLight = Color(0xFFF8FAFC);
  static const Color surfaceLight = Color(0xFF334155);
  static const Color cardLight = Color(0xFFFFFFFF);
  static const Color borderLight = Color(0xFFE2E8F0);

  // Text Colors
  static const Color textPrimaryDark = Color(0xFFF8FAFC);
  static const Color textSecondaryDark = Color(0xFF94A3B8);
  static const Color textMutedDark = Color(0xFF64748B);

  static const Color textLight = textPrimaryDark;
  static const Color textSecondary = textSecondaryDark;
  static const Color textMuted = textMutedDark;

  // Severity & Status Accents
  static const Color critical = Color(0xFFEF4444);      // red-500
  static const Color high = Color(0xFFF97316);          // orange-500
  static const Color medium = Color(0xFFF59E0B);        // amber-500
  static const Color low = Color(0xFF10B981);           // emerald-500
  static const Color info = Color(0xFF3B82F6);          // blue-500
  static const Color purple = Color(0xFF8B5CF6);        // violet-500
}
