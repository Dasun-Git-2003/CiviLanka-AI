import 'package:flutter/material.dart';
import 'auth_service.dart';

/// Auth state notifier — drives top-level routing
class AuthState extends ChangeNotifier {
  final AuthService _authService;
  bool _isLoggedIn = false;

  AuthState(this._authService);

  bool get isLoggedIn => _isLoggedIn || _authService.currentUser != null;

  void setLoggedIn(bool value) {
    _isLoggedIn = value;
    notifyListeners();
  }

  Future<void> logout(BuildContext context) async {
    await _authService.logout();
    _isLoggedIn = false;
    notifyListeners();
  }
}
