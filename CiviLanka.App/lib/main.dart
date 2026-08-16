import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'services/api_service.dart';
import 'services/auth_service.dart';
import 'services/hazard_service.dart';
import 'services/location_service.dart';
import 'screens/login_screen.dart';
import 'screens/dashboard_screen.dart';

void main() {
  runApp(const CiviLankaApp());
}

class CiviLankaApp extends StatelessWidget {
  const CiviLankaApp({super.key});

  @override
  Widget build(BuildContext context) {
    // Service singletons injected via Provider
    final apiService = ApiService();
    final authService = AuthService(apiService);
    final hazardService = HazardService(apiService);
    final locationService = LocationService();

    return MultiProvider(
      providers: [
        Provider<ApiService>.value(value: apiService),
        Provider<AuthService>.value(value: authService),
        Provider<HazardService>.value(value: hazardService),
        Provider<LocationService>.value(value: locationService),
        ChangeNotifierProvider(
          create: (_) => AuthState(authService),
        ),
      ],
      child: MaterialApp(
        title: 'CivitaGuard — Citizen App',
        debugShowCheckedModeBanner: false,
        theme: _buildTheme(),
        home: const AuthGate(),
      ),
    );
  }

  ThemeData _buildTheme() {
    const primaryColor = Color(0xFF1A6FA8); // Municipal blue
    const accentColor = Color(0xFFF4A426); // Warning amber

    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primaryColor,
        primary: primaryColor,
        secondary: accentColor,
        surface: const Color(0xFFF8F9FA),
        error: const Color(0xFFDC3545),
      ),
      fontFamily: 'Roboto',
      appBarTheme: const AppBarTheme(
        backgroundColor: primaryColor,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: false,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primaryColor,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      cardTheme: CardThemeData(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 0),
      ),
    );
  }
}

/// Auth state notifier — drives the top-level routing.
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

/// Routes to Dashboard if logged in, Login screen otherwise.
class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final authState = context.watch<AuthState>();
    return authState.isLoggedIn
        ? const DashboardScreen()
        : const LoginScreen();
  }
}
