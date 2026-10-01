import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

enum CivicButtonType { primary, secondary, outline, danger, success }

class CivicButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final CivicButtonType type;
  final IconData? icon;
  final bool isLoading;
  final double? width;
  final double height;
  final double borderRadius;

  const CivicButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.type = CivicButtonType.primary,
    this.icon,
    this.isLoading = false,
    this.width,
    this.height = 48,
    this.borderRadius = 10,
  });

  @override
  Widget build(BuildContext context) {
    Color bg;
    Color fg;
    BorderSide? border;

    switch (type) {
      case CivicButtonType.primary:
        bg = AppColors.primary;
        fg = Colors.white;
        break;
      case CivicButtonType.secondary:
        bg = AppColors.slate100;
        fg = AppColors.slate800;
        break;
      case CivicButtonType.outline:
        bg = Colors.transparent;
        fg = AppColors.primary;
        border = const BorderSide(color: AppColors.primary, width: 1.5);
        break;
      case CivicButtonType.danger:
        bg = AppColors.critical;
        fg = Colors.white;
        break;
      case CivicButtonType.success:
        bg = AppColors.success;
        fg = Colors.white;
        break;
    }

    final buttonStyle = ElevatedButton.styleFrom(
      backgroundColor: bg,
      foregroundColor: fg,
      elevation: type == CivicButtonType.primary ? 1 : 0,
      shadowColor: AppColors.primary.withValues(alpha: 0.3),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(borderRadius),
        side: border ?? BorderSide.none,
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16),
    );

    Widget child;
    if (isLoading) {
      child = SizedBox(
        height: 20,
        width: 20,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(fg),
        ),
      );
    } else if (icon != null) {
      child = Row(
        mainAxisSize: MainAxisSize.min,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
          ),
        ],
      );
    } else {
      child = Text(
        label,
        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
      );
    }

    return SizedBox(
      width: width,
      height: height,
      child: ElevatedButton(
        style: buttonStyle,
        onPressed: isLoading ? null : onPressed,
        child: child,
      ),
    );
  }
}
