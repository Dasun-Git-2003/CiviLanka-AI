import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'services/auth_state.dart';
import 'services/hazard_service.dart';
import 'services/work_order_service.dart';
import 'services/maintenance_service.dart';
import 'services/location_service.dart';
import 'services/asset_service.dart';
import 'screens/welcome_screen.dart';
import 'screens/dashboard_screen.dart';
import 'theme/app_theme.dart';

export 'services/auth_state.dart';

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
    final assetService = AssetService(apiService);

    return MultiProvider(
      providers: [
        Provider<ApiService>.value(value: apiService),
        ChangeNotifierProvider<AuthService>.value(value: authService),
        Provider<HazardService>.value(value: hazardService),
        Provider<WorkOrderService>.value(value: workOrderService),
        Provider<MaintenanceService>.value(value: maintenanceService),
        Provider<LocationService>.value(value: locationService),
        Provider<AssetService>.value(value: assetService),
        ChangeNotifierProvider(
          create: (_) => AuthState(authService),
        ),
      ],
      child: MaterialApp(
        title: 'CiviLanka AI — Smart Municipal Ops',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const AuthGate(),
      ),
    );
  }
}

/// Routes to DashboardScreen if logged in, WelcomeScreen otherwise
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthState>();
    return authState.isLoggedIn
        ? const DashboardScreen()
        : const WelcomeScreen();
  }
}
