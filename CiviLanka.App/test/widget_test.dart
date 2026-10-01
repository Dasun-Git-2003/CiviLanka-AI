import 'package:flutter_test/flutter_test.dart';
import 'package:civilanka_app/main.dart';

void main() {
  testWidgets('CiviLanka App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const CiviLankaApp());
    expect(find.byType(CiviLankaApp), findsOneWidget);
  });
}
