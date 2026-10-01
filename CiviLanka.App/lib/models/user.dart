class User {
  final String userId;
  final String email;
  final String fullName;
  final String role;
  final String token;
  final String? phone;

  User({
    required this.userId,
    required this.email,
    required this.fullName,
    required this.role,
    required this.token,
    this.phone,
  });

  bool get isCitizen => role.toLowerCase() == 'citizen';
  bool get isFieldWorker =>
      role.toLowerCase() == 'fieldworker' || role.toLowerCase() == 'contractor';
  bool get isSupervisor =>
      role.toLowerCase() == 'fieldmaintenancesupervisor' ||
      role.toLowerCase() == 'municipalstaff' ||
      role.toLowerCase() == 'director' ||
      role.toLowerCase() == 'publicworksdirector';

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      userId: json['userId'] as String? ?? json['id'] as String? ?? '',
      email: json['email'] as String? ?? '',
      fullName: json['fullName'] as String? ?? json['name'] as String? ?? '',
      role: json['role'] as String? ?? 'Citizen',
      token: json['token'] as String? ?? '',
      phone: json['phone'] as String? ?? json['contactPhone'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'userId': userId,
      'email': email,
      'fullName': fullName,
      'role': role,
      'token': token,
      'phone': phone,
    };
  }
}
