import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'services/auth_state.dart';
import 'services/hazard_service.dart';
import 'services/work_order_service.dart';
import 'services/maintenance_service.dart';
import 'services/analytics_service.dart';
import 'services/location_service.dart';
import 'theme/app_theme.dart';
import 'screens/welcome_screen.dart';
import 'screens/auth/login_screen.dart';
import 'screens/shared/app_shell.dart';

export 'services/auth_state.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const CiviLankaApp());
}

class CiviLankaApp extends StatelessWidget {
  const CiviLankaApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider<ApiService>(create: (_) => ApiService()),
        ChangeNotifierProxyProvider<ApiService, AuthService>(
          create: (ctx) => AuthService(ctx.read<ApiService>()),
          update: (ctx, api, previous) => previous ?? AuthService(api),
        ),
        ChangeNotifierProxyProvider<AuthService, AuthState>(
          create: (ctx) => AuthState(ctx.read<AuthService>()),
          update: (ctx, auth, previous) => previous ?? AuthState(auth),
        ),
        ProxyProvider<ApiService, HazardService>(
          update: (_, api, __) => HazardService(api),
        ),
        ProxyProvider<ApiService, WorkOrderService>(
          update: (_, api, __) => WorkOrderService(api),
        ),
        ProxyProvider<ApiService, MaintenanceService>(
          update: (_, api, __) => MaintenanceService(api),
        ),
        ProxyProvider<ApiService, AnalyticsService>(
          update: (_, api, __) => AnalyticsService(api),
        ),
        Provider<LocationService>(
          create: (_) => LocationService(),
        ),
      ],
      child: MaterialApp(
        title: 'CiviLanka AI',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const AuthGate(),
      ),
    );
  }
}

/// Routes to AppShell if logged in, WelcomeScreen otherwise
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = context.watch<AuthService>();
    final isAuthenticated = authService.currentUser != null;

    if (isAuthenticated) {
      return const AppShell();
    }

    return const WelcomeScreen();
  }
}
