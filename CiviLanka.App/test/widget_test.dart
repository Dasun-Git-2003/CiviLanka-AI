import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:civilanka_app/main.dart';

void main() {
  testWidgets('App smoke test renders welcome screen',
      (WidgetTester tester) async {
    await tester.pumpWidget(const CiviLankaApp());
    expect(find.byType(CiviLankaApp), findsOneWidget);
    expect(find.text('CiviLanka'), findsWidgets);
    expect(find.byType(ElevatedButton), findsWidgets);
  });
}
