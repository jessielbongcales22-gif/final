import { useState, useEffect, useCallback } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';
import { Search, Users, Shield, UserCircle, UserCheck, Edit2, XCircle, Trash2, UserPlus, Mail, Lock, Phone, MapPin, User as UserIcon, Eye, EyeOff } from 'lucide-react';
import { apiGetUsers, apiCreateUser, apiUpdateUserRole, apiDeleteUser } from '../api/client';
import ConfirmModal from '../components/ConfirmModal';

const USE_API = import.meta.env.VITE_USE_API === 'true';

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { orders, usingApi } = useData();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [users, setUsersState] = useState<User[]>([]);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<string>('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Add account modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddPw, setShowAddPw]       = useState(false);
  const [addLoading, setAddLoading]     = useState(false);
  const [addError, setAddError]         = useState('');
  const [addSuccess, setAddSuccess]     = useState('');
  const [newAcc, setNewAcc] = useState({
    username: '', email: '', password: '', role: 'customer' as User['role'],
    phone: '', address: '',
  });

  const resetAddForm = () => {
    setNewAcc({ username: '', email: '', password: '', role: 'customer', phone: '', address: '' });
    setAddError(''); setAddSuccess(''); setShowAddPw(false);
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(''); setAddSuccess('');

    if (!newAcc.username.trim()) return setAddError('Username is required.');
    if (!newAcc.email.trim())    return setAddError('Email is required.');
    if (newAcc.password.length < 6) return setAddError('Password must be at least 6 characters.');

    setAddLoading(true);

    if (USE_API && usingApi) {
      try {
        await apiCreateUser(newAcc);
        setAddSuccess(`Account created for ${newAcc.username}!`);
        await loadUsers();
        setTimeout(() => { setShowAddModal(false); resetAddForm(); }, 1500);
      } catch (err: unknown) {
        setAddError(err instanceof Error ? err.message : 'Failed to create account.');
      }
    } else {
      // localStorage mode
      const exists = users.find(u =>
        u.email.toLowerCase() === newAcc.email.toLowerCase() ||
        u.username.toLowerCase() === newAcc.username.toLowerCase()
      );
      if (exists) {
        setAddError('Email or username already exists.');
        setAddLoading(false);
        return;
      }
      const created: User = {
        id: 'u' + Date.now(),
        username: newAcc.username,
        email: newAcc.email,
        password: newAcc.password,
        role: newAcc.role,
        phone: newAcc.phone,
        address: newAcc.address,
        createdAt: new Date().toISOString(),
      };
      const updated = [...users, created];
      setUsersState(updated);
      localStorage.setItem('wm_users', JSON.stringify(updated));
      setAddSuccess(`Account created for ${newAcc.username}!`);
      setTimeout(() => { setShowAddModal(false); resetAddForm(); }, 1500);
    }
    setAddLoading(false);
  };

  const loadUsers = useCallback(async () => {
    if (USE_API && usingApi) {
      try {
        const data = await apiGetUsers();
        if (data) {
          setUsersState(data.map((u: Record<string, string>) => ({
            id: u.id, username: u.username, email: u.email,
            role: u.role as User['role'],
            phone: u.phone || '', address: u.address || '',
            createdAt: u.created_at || new Date().toISOString(),
            password: '',
          })));
          return;
        }
      } catch (err) {
        console.error('Failed to load users from API:', err);
      }
    }
    const stored = localStorage.getItem('wm_users');
    if (stored) setUsersState(JSON.parse(stored));
  }, [usingApi]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const filtered = users
    .filter(u => roleFilter === 'all' || u.role === roleFilter)
    .filter(u =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    );

  const adminCount = users.filter(u => u.role === 'admin').length;
  const staffCount = users.filter(u => u.role === 'staff').length;
  const customerCount = users.filter(u => u.role === 'customer').length;

  const handleSaveRole = async () => {
    if (!editingUser) return;
    if (USE_API && usingApi) {
      try { await apiUpdateUserRole(editingUser.id, editRole); }
      catch (err) { console.error('Failed to update role:', err); }
    }
    const updated = users.map(u =>
      u.id === editingUser.id ? { ...u, role: editRole as User['role'] } : u
    );
    setUsersState(updated);
    if (!usingApi) localStorage.setItem('wm_users', JSON.stringify(updated));
    setEditingUser(null);
    loadUsers();
  };

  const handleDelete = async () => {
    if (!userToDelete) return;
    if (USE_API && usingApi) {
      try { await apiDeleteUser(userToDelete.id); }
      catch (err) {
        console.error('Failed to delete user:', err);
        alert('Failed to delete user. Please try again.');
        setUserToDelete(null);
        return;
      }
    }
    const updated = users.filter(u => u.id !== userToDelete.id);
    setUsersState(updated);
    if (!usingApi) localStorage.setItem('wm_users', JSON.stringify(updated));
    setUserToDelete(null);
    loadUsers();
  };

  const getUserOrders = (userId: string) => orders.filter(o => o.customerId === userId);
  const getUserSpent = (userId: string) =>
    getUserOrders(userId)
      .filter(o => o.status === 'completed')
      .reduce((s, o) => s + o.totalAmount, 0);

  const roleColors: Record<string, string> = {
    admin: 'bg-red-100 text-red-700',
    staff: 'bg-blue-100 text-blue-700',
    customer: 'bg-green-100 text-green-700',
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{adminCount}</p>
              <p className="text-sm text-gray-500">Admins</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{staffCount}</p>
              <p className="text-sm text-gray-500">Staff</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{customerCount}</p>
              <p className="text-sm text-gray-500">Customers</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters + Add Button */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search users..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="customer">Customer</option>
        </select>
        <button
          onClick={() => { resetAddForm(); setShowAddModal(true); }}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-blue-500/20 flex items-center gap-2 whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4" />
          Add Account
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase hidden md:table-cell">Contact</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase">Role</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Orders</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase hidden lg:table-cell">Total Spent</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                        <UserCircle className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">{u.username}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <p className="text-sm text-gray-600">{u.phone}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${roleColors[u.role]}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <p className="text-sm text-gray-600">{getUserOrders(u.id).length}</p>
                  </td>
                  <td className="px-5 py-4 hidden lg:table-cell">
                    <p className="text-sm font-medium text-gray-800">₱{getUserSpent(u.id).toLocaleString()}</p>
                  </td>
                  <td className="px-5 py-4">
                    {u.id !== currentUser?.id && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingUser(u); setEditRole(u.role); }}
                          className="p-2 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit Role"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setUserToDelete(u)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="p-10 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No users found</p>
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">Change Role</h3>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Change role for <strong>{editingUser.username}</strong>
              </p>
              <select
                value={editRole}
                onChange={e => setEditRole(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="admin">Admin</option>
                <option value="staff">Staff</option>
                <option value="customer">Customer</option>
              </select>
              <div className="flex gap-3">
                <button
                  onClick={handleSaveRole}
                  className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-6 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Confirmation */}
      <ConfirmModal
        show={!!userToDelete}
        title="Delete User?"
        message={`Are you sure you want to permanently delete ${userToDelete?.username} (${userToDelete?.email})? ${
          userToDelete?.role === 'customer'
            ? 'This will also delete all their orders. '
            : ''
        }This action cannot be undone.`}
        confirmText="Yes, Delete"
        onConfirm={handleDelete}
        onCancel={() => setUserToDelete(null)}
      />

      {/* ═══════ ADD ACCOUNT MODAL ═══════ */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-bold">Add New Account</p>
                  <p className="text-white/70 text-xs">Create a user with any role</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-white/70 hover:text-white p-1">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="p-6 space-y-4">
              {/* Error / Success */}
              {addError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
                  ⚠️ {addError}
                </div>
              )}
              {addSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl flex items-center gap-2">
                  ✅ {addSuccess}
                </div>
              )}

              {/* Role selector — visual */}
              <div>
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">Account Role</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'customer', label: 'Customer', icon: Users,     color: 'green' },
                    { id: 'staff',    label: 'Staff',    icon: UserCheck, color: 'blue' },
                    { id: 'admin',    label: 'Admin',    icon: Shield,    color: 'red' },
                  ] as const).map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setNewAcc({ ...newAcc, role: r.id })}
                      className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all text-xs font-semibold ${
                        newAcc.role === r.id
                          ? r.color === 'red'   ? 'border-red-500 bg-red-50 text-red-700'
                          : r.color === 'blue'  ? 'border-blue-500 bg-blue-50 text-blue-700'
                          :                       'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      <r.icon className="w-5 h-5" />
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username <span className="text-red-500">*</span></label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={newAcc.username}
                    onChange={e => setNewAcc({ ...newAcc, username: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. juan_dela_cruz"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={newAcc.email}
                    onChange={e => setNewAcc({ ...newAcc, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="user@example.com"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password <span className="text-red-500">*</span></label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type={showAddPw ? 'text' : 'password'}
                    value={newAcc.password}
                    onChange={e => setNewAcc({ ...newAcc, password: e.target.value })}
                    className="w-full pl-10 pr-11 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="At least 6 characters"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPw(!showAddPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showAddPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={newAcc.phone}
                    onChange={e => setNewAcc({ ...newAcc, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="09XXXXXXXXX"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={newAcc.address}
                    onChange={e => setNewAcc({ ...newAcc, address: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Purok Saging, Brgy. Panalaron, Hinunangan"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-2.5 rounded-xl font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {addLoading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating...</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> Create Account</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
