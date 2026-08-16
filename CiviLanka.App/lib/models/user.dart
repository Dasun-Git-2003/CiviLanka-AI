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
}
