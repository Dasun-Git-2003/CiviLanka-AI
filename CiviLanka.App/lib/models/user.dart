class User {
  final String id;
  final String fullName;
  final String email;
  final String role;
  final String token;
  final DateTime expiresAt;

  const User({
    required this.id,
    required this.fullName,
    required this.email,
    required this.role,
    required this.token,
    required this.expiresAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['userId'] as String,
      fullName: json['fullName'] as String,
      email: json['email'] as String,
      role: json['role'] as String,
      token: json['token'] as String,
      expiresAt: DateTime.parse(json['expiresAt'] as String),
    );
  }

  Map<String, dynamic> toJson() => {
        'userId': id,
        'fullName': fullName,
        'email': email,
        'role': role,
        'token': token,
        'expiresAt': expiresAt.toIso8601String(),
      };

  bool get isExpired => DateTime.now().isAfter(expiresAt);

  /// Whether this user's role is authorized to view municipal Work Orders on the backend.
  bool get canAccessWorkOrders =>
      role == 'FieldMaintenanceSupervisor' ||
      role == 'PublicWorksDirector' ||
      role == 'Director' ||
      role == 'MunicipalStaff' ||
      role == 'FieldWorker';

  /// Whether this user's role is authorized to create municipal Work Orders on the backend (CanCreateWorkOrder policy).
  bool get canCreateWorkOrders =>
      role == 'FieldMaintenanceSupervisor' ||
      role == 'PublicWorksDirector' ||
      role == 'Director' ||
      role == 'MunicipalStaff';

  /// Whether this user's role is authorized to update or cancel municipal Work Orders on the backend (CanManageWorkOrders policy).
  bool get canManageWorkOrders => canCreateWorkOrders;

  /// Whether this user's role is authorized to trigger AI cost estimates on the backend (POST /api/workorders/{id}/estimate).
  bool get canGenerateEstimate =>
      role == 'FieldMaintenanceSupervisor' ||
      role == 'PublicWorksDirector' ||
      role == 'Director' ||
      role == 'MunicipalStaff';

  /// Whether this user's role is authorized to approve or reject municipal Work Orders on the backend (CanApproveWorkOrder policy: PublicWorksDirector or Director only).
  bool get canApproveWorkOrders =>
      role == 'PublicWorksDirector' || role == 'Director';
}
