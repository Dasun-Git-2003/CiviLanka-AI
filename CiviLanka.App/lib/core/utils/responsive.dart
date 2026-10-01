import 'package:flutter/material.dart';

class Responsive {
  static bool isMobile(BuildContext context) =>
      MediaQuery.of(context).size.width < 650;

  static bool isTablet(BuildContext context) =>
      MediaQuery.of(context).size.width >= 650 &&
      MediaQuery.of(context).size.width < 1100;

  static bool isDesktop(BuildContext context) =>
      MediaQuery.of(context).size.width >= 1100;

  static double screenWidth(BuildContext context) =>
      MediaQuery.of(context).size.width;

  static double screenHeight(BuildContext context) =>
      MediaQuery.of(context).size.height;
}

class CivicSpacing {
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;

  static const SizedBox vxs = SizedBox(height: xs);
  static const SizedBox vsm = SizedBox(height: sm);
  static const SizedBox vmd = SizedBox(height: md);
  static const SizedBox vlg = SizedBox(height: lg);
  static const SizedBox vxl = SizedBox(height: xl);

  static const SizedBox hxs = SizedBox(width: xs);
  static const SizedBox hsm = SizedBox(width: sm);
  static const SizedBox hmd = SizedBox(width: md);
  static const SizedBox hlg = SizedBox(width: lg);
  static const SizedBox hxl = SizedBox(width: xl);
}
