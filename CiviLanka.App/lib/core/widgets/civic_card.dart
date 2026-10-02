import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

class CivicCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final Color? borderColor;
  final double borderRadius;
  final double elevation;

  const CivicCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16),
    this.onTap,
    this.backgroundColor,
    this.borderColor,
    this.borderRadius = 12,
    this.elevation = 0,
  });

  @override
  Widget build(BuildContext context) {
    final border = Border.all(
      color: borderColor ?? AppColors.slate200,
      width: 1,
    );

    Widget content = Container(
      decoration: BoxDecoration(
        color: backgroundColor ?? Colors.white,
        borderRadius: BorderRadius.circular(borderRadius),
        border: border,
        boxShadow: elevation > 0
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04 * elevation),
                  blurRadius: 6 * elevation,
                  offset: Offset(0, 2 * elevation),
                ),
              ]
            : null,
      ),
      padding: padding,
      child: child,
    );

    if (onTap != null) {
      return Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(borderRadius),
          child: content,
        ),
      );
    }

    return content;
  }
}

class CivicStatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color? iconColor;
  final Color? accentColor;
  final String? subtitle;
  final String? badgeText;
  final double? progress;

  const CivicStatCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    this.iconColor,
    this.accentColor,
    this.subtitle,
    this.badgeText,
    this.progress,
  });

  @override
  Widget build(BuildContext context) {
    final effectiveColor = iconColor ?? AppColors.primary;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: effectiveColor.withValues(alpha: 0.22),
          width: 1.2,
        ),
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            effectiveColor.withValues(alpha: 0.05),
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: effectiveColor.withValues(alpha: 0.07),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          // Top Row: Icon Container + Badge / Pulse
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: effectiveColor.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: effectiveColor.withValues(alpha: 0.2), width: 1),
                ),
                child: Icon(icon, size: 18, color: effectiveColor),
              ),
              if (badgeText != null && badgeText!.isNotEmpty)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                  decoration: BoxDecoration(
                    color: effectiveColor.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    badgeText!,
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.w700,
                      color: effectiveColor,
                    ),
                  ),
                )
              else
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: effectiveColor.withValues(alpha: 0.6),
                    shape: BoxShape.circle,
                  ),
                ),
            ],
          ),

          const SizedBox(height: 6),

          // Value Row
          Text(
            value,
            style: const TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w800,
              color: AppColors.slate900,
              letterSpacing: -0.5,
              height: 1.1,
            ),
          ),

          const SizedBox(height: 2),

          // Title
          Text(
            title,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: AppColors.slate600,
            ),
          ),

          if (subtitle != null && subtitle!.isNotEmpty) ...[
            const SizedBox(height: 2),
            Text(
              subtitle!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 10, color: AppColors.slate400),
            ),
          ],

          const SizedBox(height: 6),

          // Micro Visualization Bar
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress ?? 0.65,
              backgroundColor: effectiveColor.withValues(alpha: 0.1),
              valueColor: AlwaysStoppedAnimation<Color>(effectiveColor),
              minHeight: 4,
            ),
          ),
        ],
      ),
    );
  }
}
