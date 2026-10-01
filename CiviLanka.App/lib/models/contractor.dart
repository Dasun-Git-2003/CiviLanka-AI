class Contractor {
  final int id;
  final String name;
  final String specialization;
  final String location;
  final String phone;
  final String? email;
  final double rating;
  final bool isAvailable;
  final int jobCount;
  final DateTime? createdAt;

  Contractor({
    required this.id,
    required this.name,
    required this.specialization,
    required this.location,
    required this.phone,
    this.email,
    required this.rating,
    required this.isAvailable,
    required this.jobCount,
    this.createdAt,
  });

  factory Contractor.fromJson(Map<String, dynamic> json) {
    return Contractor(
      id: (json['id'] as num).toInt(),
      name: json['name'] as String? ?? '',
      specialization: json['specialization'] as String? ?? 'Roads & Bridges',
      location: json['location'] as String? ?? '',
      phone: json['phone'] as String? ?? '',
      email: json['email'] as String?,
      rating: (json['rating'] as num?)?.toDouble() ?? 5.0,
      isAvailable: json['isAvailable'] as bool? ?? true,
      jobCount: (json['jobCount'] as num?)?.toInt() ?? 0,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt'] as String) : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'specialization': specialization,
      'location': location,
      'phone': phone,
      'email': email,
      'rating': rating,
      'isAvailable': isAvailable,
      'jobCount': jobCount,
      'createdAt': createdAt?.toIso8601String(),
    };
  }

  static List<Contractor> get fallbackContractors => [
        Contractor(
          id: 1,
          name: 'Acme Civil Works',
          specialization: 'Roads & Bridges',
          location: 'City Center',
          phone: '011-234-5678',
          email: 'info@acmecivil.lk',
          rating: 4.8,
          isAvailable: true,
          jobCount: 24,
        ),
        Contractor(
          id: 2,
          name: 'ElectroFix Pro',
          specialization: 'Electrical',
          location: 'North District',
          phone: '011-987-6543',
          email: 'work@electrofixpro.lk',
          rating: 4.5,
          isAvailable: false,
          jobCount: 24,
        ),
        Contractor(
          id: 3,
          name: 'AquaFlow Utilities',
          specialization: 'Water & Plumbing',
          location: 'South District',
          phone: '011-555-1234',
          email: 'ops@aquaflow.lk',
          rating: 4.9,
          isAvailable: true,
          jobCount: 24,
        ),
      ];
}
