import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/user.dart';
import '../../services/api_service.dart';
import '../../core/widgets/civic_card.dart';
import '../../theme/app_colors.dart';
import '../../core/widgets/civic_states.dart';

class DirectorUsersScreen extends StatefulWidget {
  const DirectorUsersScreen({super.key});

  @override
  State<DirectorUsersScreen> createState() => _DirectorUsersScreenState();
}

class _DirectorUsersScreenState extends State<DirectorUsersScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  List<User> _allUsers = [];
  String _searchQuery = '';
  String _selectedRole = 'All';

  final List<String> _roles = ['All', 'Citizen', 'FieldWorker', 'Supervisor', 'Director'];

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final apiService = context.read<ApiService>();
      final response = await apiService.dio.get('/api/users');
      
      final List<dynamic> data = response.data as List<dynamic>;
      final users = data.map((json) => User.fromJson(json as Map<String, dynamic>)).toList();
      
      if (!mounted) return;
      setState(() {
        _allUsers = users;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  List<User> get _filteredUsers {
    return _allUsers.where((user) {
      final matchesSearch = user.fullName.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          user.email.toLowerCase().contains(_searchQuery.toLowerCase());
      
      if (!matchesSearch) return false;
      if (_selectedRole == 'All') return true;
      
      return user.role.toLowerCase() == _selectedRole.toLowerCase();
    }).toList();
  }

  int _getRoleCount(String role) {
    if (role == 'All') return _allUsers.length;
    return _allUsers.where((u) => u.role.toLowerCase() == role.toLowerCase()).length;
  }

  Color _getRoleColor(String role) {
    switch (role.toLowerCase()) {
      case 'citizen':
        return AppColors.info;
      case 'fieldworker':
        return AppColors.teal;
      case 'supervisor':
        return AppColors.purple;
      case 'director':
        return AppColors.warning;
      default:
        return AppColors.slate500;
    }
  }

  void _showUserDetails(User user) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircleAvatar(
                radius: 32,
                backgroundColor: _getRoleColor(user.role).withOpacity(0.2),
                child: Text(
                  user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : '?',
                  style: TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: _getRoleColor(user.role),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                user.fullName,
                style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: _getRoleColor(user.role).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Text(
                  user.role,
                  style: TextStyle(
                    color: _getRoleColor(user.role),
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              ListTile(
                leading: const Icon(Icons.email, color: AppColors.slate500),
                title: Text(user.email),
              ),
              if (user.phone != null && user.phone!.isNotEmpty)
                ListTile(
                  leading: const Icon(Icons.phone, color: AppColors.slate500),
                  title: Text(user.phone!),
                ),
              ListTile(
                leading: const Icon(Icons.badge, color: AppColors.slate500),
                title: Text(user.userId),
                subtitle: const Text('User ID'),
              ),
            ],
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.cityBg,
      appBar: AppBar(
        title: const Text('User Directory'),
        backgroundColor: AppColors.slate900,
        foregroundColor: Colors.white,
        elevation: 0,
        iconTheme: const IconThemeData(color: AppColors.warning),
      ),
      body: Column(
        children: [
          _buildSearchAndFilters(),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _loadUsers,
              color: AppColors.warning,
              child: _buildUserList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchAndFilters() {
    return Container(
      color: Colors.white,
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          TextField(
            decoration: InputDecoration(
              hintText: 'Search by name or email',
              prefixIcon: const Icon(Icons.search, color: AppColors.slate400),
              filled: true,
              fillColor: AppColors.slate100,
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(vertical: 0),
            ),
            onChanged: (val) {
              setState(() {
                _searchQuery = val;
              });
            },
          ),
          const SizedBox(height: 12),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: _roles.map((role) {
                final isSelected = _selectedRole == role;
                final count = _getRoleCount(role);
                return Padding(
                  padding: const EdgeInsets.only(right: 8.0),
                  child: FilterChip(
                    label: Text('$role ($count)'),
                    selected: isSelected,
                    onSelected: (selected) {
                      setState(() {
                        _selectedRole = role;
                      });
                    },
                    backgroundColor: AppColors.slate100,
                    selectedColor: AppColors.warning.withOpacity(0.2),
                    checkmarkColor: AppColors.warning,
                    labelStyle: TextStyle(
                      color: isSelected ? AppColors.warning : AppColors.slate700,
                      fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                    ),
                  ),
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUserList() {
    if (_isLoading) {
      return const Padding(
        padding: EdgeInsets.all(16.0),
        child: CivicSkeletonList(itemCount: 8),
      );
    }

    if (_errorMessage != null) {
      return Padding(
        padding: const EdgeInsets.all(16.0),
        child: CivicErrorCard(
          message: _errorMessage!,
          onRetry: _loadUsers,
        ),
      );
    }

    final users = _filteredUsers;

    if (users.isEmpty) {
      return const SingleChildScrollView(
        physics: AlwaysScrollableScrollPhysics(),
        child: Padding(
          padding: EdgeInsets.only(top: 60.0),
          child: CivicEmptyState(
            title: 'No users found',
            message: 'Try adjusting your search or filters.',
            icon: Icons.people_outline,
          ),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: users.length,
      itemBuilder: (context, index) {
        final user = users[index];
        final roleColor = _getRoleColor(user.role);
        
        return Padding(
          padding: const EdgeInsets.only(bottom: 8.0),
          child: CivicCard(
            onTap: () => _showUserDetails(user),
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                CircleAvatar(
                  backgroundColor: roleColor.withOpacity(0.1),
                  child: Text(
                    user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : '?',
                    style: TextStyle(color: roleColor, fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.fullName,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      Text(
                        user.email,
                        style: const TextStyle(color: AppColors.slate500, fontSize: 13),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: roleColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    user.role,
                    style: TextStyle(
                      color: roleColor,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
