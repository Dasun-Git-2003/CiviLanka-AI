class InfrastructureAsset {
  final String id;
  final String name;
  final String type;
  final String status;
  final String location;
  final double? latitude;
  final double? longitude;
  final String? latestCondition;
  final String? description;

  const InfrastructureAsset({
    required this.id,
    required this.name,
    required this.type,
    required this.status,
    required this.location,
    this.latitude,
    this.longitude,
    this.latestCondition,
    this.description,
  });

  factory InfrastructureAsset.fromJson(Map<String, dynamic> json) {
    return InfrastructureAsset(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? 'Infrastructure Asset',
      type: json['type'] as String? ?? 'General',
      status: json['status'] as String? ?? 'Active',
      location: json['location'] as String? ?? 'Colombo',
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      latestCondition: json['latestCondition'] as String? ?? 'Fair',
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'type': type,
        'status': status,
        'location': location,
        'latitude': latitude,
        'longitude': longitude,
        'latestCondition': latestCondition,
        'description': description,
      };

  static const List<InfrastructureAsset> defaultFallbackAssets = [
    InfrastructureAsset(
      id: 'AST-001',
      name: 'Main St Water Pipe',
      type: 'Water',
      status: 'Active',
      location: 'Downtown, Colombo',
      latitude: 6.9271,
      longitude: 79.8612,
      latestCondition: 'Poor',
      description: 'Primary water supply pipe running along Main Street.',
    ),
    InfrastructureAsset(
      id: 'AST-002',
      name: 'Oak Ave Streetlight Grid',
      type: 'Electrical',
      status: 'Active',
      location: 'Fort, Colombo',
      latitude: 6.9310,
      longitude: 79.8450,
      latestCondition: 'Good',
      description: 'LED smart streetlight array connected to central grid.',
    ),
    InfrastructureAsset(
      id: 'AST-003',
      name: 'Central Park Pathway',
      type: 'Road',
      status: 'Active',
      location: 'Cinnamon Gardens',
      latitude: 6.9050,
      longitude: 79.8510,
      latestCondition: 'Fair',
      description: 'Pedestrian and cycle pathway requiring resurfacing.',
    ),
    InfrastructureAsset(
      id: 'AST-004',
      name: 'Galle Rd Bridge Viaduct',
      type: 'Bridge',
      status: 'Under Inspection',
      location: 'Kollupitiya',
      latitude: 6.9180,
      longitude: 79.8580,
      latestCondition: 'Poor',
      description: 'Expansion joints wear detected during routine structural analysis.',
    ),
    InfrastructureAsset(
      id: 'AST-005',
      name: 'Negombo Rd Storm Drain',
      type: 'Drainage',
      status: 'Active',
      location: 'Peliyagoda',
      latitude: 6.9400,
      longitude: 79.8530,
      latestCondition: 'Fair',
      description: 'High capacity culvert for monsoon flood mitigation.',
    ),
  ];
}
