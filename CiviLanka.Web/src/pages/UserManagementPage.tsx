import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  PlusCircle,
  KeyRound,
  Trash2,
  Lock,
  Unlock,
  Edit2,
  Mail,
  X,
  AlertTriangle,
  UserCheck,
  UserX,
} from 'lucide-react';
import { userService } from '../services/userService';
import type { UserListItem, CreateUserRequest, UpdateUserRequest } from '../types/user';

export const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserListItem | null>(null);
  const [resetUser, setResetUser] = useState<UserListItem | null>(null);

  // Create Form State
  const [createForm, setCreateForm] = useState<CreateUserRequest>({
    fullName: '',
    email: '',
    role: 'FieldWorker',
    contactPhone: '',
    password: 'Password123!',
  });
  const [creating, setCreating] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState<UpdateUserRequest>({
    fullName: '',
    role: 'FieldWorker',
    contactPhone: '',
  });
  const [editing, setEditing] = useState(false);

  // Reset Password State
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await userService.getAll();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      await userService.create(createForm);
      setCreateModalOpen(false);
      setCreateForm({
        fullName: '',
        email: '',
        role: 'FieldWorker',
        contactPhone: '',
        password: 'Password123!',
      });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user.');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    try {
      setEditing(true);
      await userService.update(editUser.id, editForm);
      setEditUser(null);
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user.');
    } finally {
      setEditing(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUser) return;
    try {
      setResetting(true);
      await userService.resetPassword(resetUser.id, { newPassword });
      alert(`Password successfully updated for ${resetUser.email}`);
      setResetUser(null);
      setNewPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  };

  const handleToggleLock = async (user: UserListItem) => {
    try {
      const res = await userService.toggleLock(user.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isLockedOut: res.isLockedOut } : u))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to toggle account lockout.');
    }
  };

  const handleDelete = async (user: UserListItem) => {
    if (!window.confirm(`Are you sure you want to delete user ${user.fullName} (${user.email})?`))
      return;
    try {
      await userService.delete(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete user.');
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      !searchTerm ||
      u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.contactPhone && u.contactPhone.includes(searchTerm));

    const matchRole = !roleFilter || u.role === roleFilter;

    return matchSearch && matchRole;
  });

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'PublicWorksDirector':
      case 'Director':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'FieldMaintenanceSupervisor':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'MunicipalStaff':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'FieldWorker':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Citizen':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header Title & Actions ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>Administration</span>
            <span>&bull;</span>
            <span className="text-teal-600 font-bold">Access &amp; Security</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <Users className="w-7 h-7 text-teal-600" />
            User Directory &amp; Access Control
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage municipal employee permissions, field technician access, and citizen platform accounts
          </p>
        </div>

        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Add New User
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2.5">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* ── KPI Summary Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Total Accounts
          </span>
          <div className="text-2xl font-black text-slate-900">{users.length}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Registered users</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block mb-1">
            Municipal Staff
          </span>
          <div className="text-2xl font-black text-blue-700">
            {users.filter((u) => u.role.includes('Director') || u.role.includes('Staff')).length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Operations &amp; Admin</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-600 block mb-1">
            Supervisors
          </span>
          <div className="text-2xl font-black text-teal-700">
            {users.filter((u) => u.role.includes('Supervisor')).length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Verification sign-off</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
            Field Workers
          </span>
          <div className="text-2xl font-black text-amber-700">
            {users.filter((u) => u.role === 'FieldWorker').length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active field crew</div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 block mb-1">
            Locked Accounts
          </span>
          <div className="text-2xl font-black text-rose-700">
            {users.filter((u) => u.isLockedOut).length}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Suspended access</div>
        </div>
      </div>

      {/* ── Search & Filter Bar ───────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search users by name, email, or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-800"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500 text-slate-700 bg-white"
        >
          <option value="">All Municipal Roles</option>
          <option value="Director">Director</option>
          <option value="PublicWorksDirector">PublicWorksDirector</option>
          <option value="FieldMaintenanceSupervisor">FieldMaintenanceSupervisor</option>
          <option value="MunicipalStaff">MunicipalStaff</option>
          <option value="FieldWorker">FieldWorker</option>
          <option value="Citizen">Citizen</option>
        </select>

        {(searchTerm || roleFilter) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setRoleFilter('');
            }}
            className="text-xs text-teal-600 hover:text-teal-800 font-semibold px-2 py-1"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ── Users Table ───────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-xs text-slate-500">
            <div className="w-8 h-8 border-3 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Loading user directory...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-500">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            No users found matching the active criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3.5">User Details</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Contact Phone</th>
                  <th className="px-5 py-3.5">Registration Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-xs">
                          {u.fullName ? u.fullName[0].toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{u.fullName}</div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3 text-slate-300" />
                            <span>{u.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getRoleBadgeClass(
                          u.role
                        )}`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-slate-600">
                      {u.contactPhone || <span className="text-slate-300 italic">None</span>}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap">
                      {u.isLockedOut ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          <UserX className="w-3 h-3" /> Locked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <UserCheck className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 whitespace-nowrap text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditUser(u);
                            setEditForm({
                              fullName: u.fullName,
                              role: u.role,
                              contactPhone: u.contactPhone || '',
                            });
                          }}
                          title="Edit User"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-teal-600 hover:bg-slate-100 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            setResetUser(u);
                            setNewPassword('');
                          }}
                          title="Reset Password"
                          className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-slate-100 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleToggleLock(u)}
                          title={u.isLockedOut ? 'Unlock Account' : 'Lock Account'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            u.isLockedOut
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-slate-500 hover:text-rose-600 hover:bg-slate-100'
                          }`}
                        >
                          {u.isLockedOut ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        </button>

                        <button
                          onClick={() => handleDelete(u)}
                          title="Delete User"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal: Create New User ─────────────────────────────────────── */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Add New Municipal Account</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kasun Fernando"
                  value={createForm.fullName}
                  onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="kasun@civilanka.gov.lk"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Municipal Role</label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="FieldWorker">FieldWorker (Technician / Crew)</option>
                  <option value="FieldMaintenanceSupervisor">FieldMaintenanceSupervisor</option>
                  <option value="MunicipalStaff">MunicipalStaff (Operator / Triage)</option>
                  <option value="PublicWorksDirector">PublicWorksDirector (Engineering Lead)</option>
                  <option value="Citizen">Citizen (Public Reporter)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  placeholder="+94 77 000 0000"
                  value={createForm.contactPhone || ''}
                  onChange={(e) => setCreateForm({ ...createForm, contactPhone: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Edit User ───────────────────────────────────────────── */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-teal-600" />
                <h3 className="text-sm font-bold text-slate-900">Edit User Permissions</h3>
              </div>
              <button
                onClick={() => setEditUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email (Read-only)</label>
                <input
                  type="email"
                  disabled
                  value={editUser.email}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Role / Permissions</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                >
                  <option value="FieldWorker">FieldWorker</option>
                  <option value="FieldMaintenanceSupervisor">FieldMaintenanceSupervisor</option>
                  <option value="MunicipalStaff">MunicipalStaff</option>
                  <option value="PublicWorksDirector">PublicWorksDirector</option>
                  <option value="Citizen">Citizen</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={editForm.contactPhone || ''}
                  onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="px-4 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {editing ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Reset Password ─────────────────────────────────────── */}
      {resetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Administrator Password Reset</h3>
              </div>
              <button
                onClick={() => setResetUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="mt-4 space-y-3">
              <p className="text-xs text-slate-500">
                Resetting password for: <strong className="text-slate-800">{resetUser.email}</strong>
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {resetting ? 'Resetting...' : 'Confirm Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
