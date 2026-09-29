import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'services/hazard_service.dart';
import 'services/work_order_service.dart';
import 'services/maintenance_service.dart';
import 'services/location_service.dart';
import 'screens/auth/login_screen.dart';
import 'screens/shared/app_shell.dart';
import 'theme/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CiviLankaApp());
}

class CiviLankaApp extends StatelessWidget {
  const CiviLankaApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Singleton services injected via Provider
    final apiService = ApiService();
    final authService = AuthService(apiService);
    final hazardService = HazardService(apiService);
    final workOrderService = WorkOrderService(apiService);
    final maintenanceService = MaintenanceService(apiService);
    final locationService = LocationService();
    final workOrderService = WorkOrderService(apiService);

    return MultiProvider(
      providers: [
        Provider<ApiService>.value(value: apiService),
        ChangeNotifierProvider<AuthService>.value(value: authService),
        Provider<HazardService>.value(value: hazardService),
        Provider<WorkOrderService>.value(value: workOrderService),
        Provider<MaintenanceService>.value(value: maintenanceService),
        Provider<LocationService>.value(value: locationService),
        Provider<WorkOrderService>.value(value: workOrderService),
        ChangeNotifierProvider(
          create: (_) => AuthState(authService),
        ),
      ],
      child: MaterialApp(
        title: 'CiviLanka AI — Smart Municipal Ops',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const AuthGate(),
      ),
    );
  }
}

/// Auth state notifier — drives top-level routing
class AuthState extends ChangeNotifier {
  final AuthService _authService;
  bool _isLoggedIn = false;

  AuthState(this._authService);

  bool get isLoggedIn => _isLoggedIn;

  void setLoggedIn(bool value) {
    _isLoggedIn = value;
    notifyListeners();
  }

  Future<void> logout(BuildContext context) async {
    await _authService.logout();
    setLoggedIn(false);
  }
}

/// Routes to AppShell if logged in, LoginScreen otherwise
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthState>();
    return authState.isLoggedIn
        ? const AppShell()
        : const LoginScreen();
  }
}
