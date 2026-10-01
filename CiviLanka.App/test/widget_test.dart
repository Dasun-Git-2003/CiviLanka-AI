import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:civilanka_app/main.dart';

void main() {
  testWidgets('App smoke test renders welcome screen',
      (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const CiviLankaApp());

    // Verify that the welcome screen renders with brand and login button.
    expect(find.text('CiviLanka'), findsWidgets);
    expect(find.byType(ElevatedButton), findsWidgets);
  });
}
