'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Plus, Search, X, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { Role } from '@prisma/client';

type UserData = {
  id: string; name: string; email: string; phone?: string | null;
  role: string; isActive: boolean; avatarUrl?: string | null;
  lastLoginAt?: string | null; createdAt: string;
};

type PageData = {
  data: UserData[]; total: number; page: number; limit: number; totalPages: number;
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-600',
  MANAGER: 'bg-blue-100 text-blue-600',
  SALES_AGENT: 'bg-green-100 text-green-600',
  TELECALLER: 'bg-amber-100 text-amber-600',
  MARKETING: 'bg-pink-100 text-pink-600',
  ACCOUNTANT: 'bg-cyan-100 text-cyan-600',
};

const ROLE_OPTIONS = ['ADMIN', 'MANAGER', 'SALES_AGENT', 'TELECALLER', 'MARKETING', 'ACCOUNTANT'];

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const isAdmin = me?.role === 'ADMIN';
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [p, setP] = useState(1);

  const [showAdd, setShowAdd] = useState(false);
  const addTrapRef = useFocusTrap(showAdd);
  const [addForm, setAddForm] = useState({ name: '', email: '', role: 'SALES_AGENT', password: '' });
  const [adding, setAdding] = useState(false);

  const [editing, setEditing] = useState<UserData | null>(null);
  const editTrapRef = useFocusTrap(editing !== null);
  const [editForm, setEditForm] = useState({ name: '', email: '', role: '', isActive: true });
  const [saving, setSaving] = useState<string | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<UserData | null>(null);
  const deleteTrapRef = useFocusTrap(confirmDelete !== null);
  const [deleting, setDeleting] = useState(false);

  const load = async (pNum = p) => {
    setLoading(true);
    try {
      const params: any = { page: pNum, limit: 20 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await api.get('/users', { params });
      setPage(data);
    } catch {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(1); setP(1); }, [search, roleFilter]);
  useEffect(() => { load(p); }, [p]);

  async function addUser(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    try {
      await api.post('/users', addForm);
      toast.success('User created');
      setShowAdd(false);
      setAddForm({ name: '', email: '', role: 'SALES_AGENT', password: '' });
      load(1); setP(1);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create user');
    } finally {
      setAdding(false);
    }
  }

  async function saveEdit(id: string) {
    setSaving(id);
    try {
      await api.patch(`/users/${id}`, editForm);
      toast.success('User updated');
      setEditing(null);
      load(p);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(null);
    }
  }

  async function toggleActive(user: UserData) {
    setSaving(user.id);
    try {
      await api.patch(`/users/${user.id}`, { isActive: !user.isActive });
      load(p);
    } catch {
      toast.error('Failed to toggle status');
    } finally {
      setSaving(null);
    }
  }

  async function deactivateUser() {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${confirmDelete.id}`);
      toast.success('User deactivated');
      setConfirmDelete(null);
      load(p);
    } catch {
      toast.error('Failed to deactivate user');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">User Management</h1>
          <p className="text-xs text-gray-500">{page?.total ?? 0} total</p>
        </div>
        <div className="relative flex-1 max-w-xs mx-3">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or email…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Roles</option>
          {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
        </select>
        <div className="ml-auto" />
        {isAdmin && (
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition">
            <Plus size={14} /> Add User
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Name', 'Email', 'Role', 'Status', 'Last Login', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading && !page && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">Loading…</td></tr>
                )}
                {!loading && page?.data.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-400">No users found</td></tr>
                )}
                {page?.data.map((u, i) => (
                  <tr key={u.id} className={cn('border-b border-gray-50 hover:bg-gray-50 transition', i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-500')}>
                        {u.role.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={cn('w-2 h-2 rounded-full', u.isActive ? 'bg-green-400' : 'bg-gray-300')} />
                        <span className={cn('text-xs font-medium', u.isActive ? 'text-green-600' : 'text-gray-400')}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setEditing(u); setEditForm({ name: u.name, email: u.email, role: u.role, isActive: u.isActive }); }}
                          disabled={saving === u.id}
                          className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50">
                          Edit
                        </button>
                        {isAdmin && u.role !== 'ADMIN' && (
                          <>
                            <button onClick={() => toggleActive(u)} disabled={saving === u.id}
                              className={cn('px-2.5 py-1 text-xs font-medium rounded-lg transition disabled:opacity-50',
                                u.isActive ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50')}>
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            {u.isActive && (
                              <button onClick={() => setConfirmDelete(u)}
                                className="px-2.5 py-1 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition">
                                Delete
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {page && page.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-gray-500">Page {page.page} of {page.totalPages}</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setP(p => Math.max(1, p - 1))} disabled={p <= 1}
                className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(5, page.totalPages) }, (_, i) => {
                const start = Math.max(1, Math.min(p - 2, page.totalPages - 4));
                const n = start + i;
                if (n > page.totalPages) return null;
                return (
                  <button key={n} onClick={() => setP(n)}
                    className={cn('w-8 h-8 text-xs font-medium rounded-lg transition', p === n ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50 border border-gray-200')}>
                    {n}
                  </button>
                );
              })}
              <button onClick={() => setP(p => Math.min(page.totalPages, p + 1))} disabled={p >= page.totalPages}
                className="p-1.5 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => !adding && setShowAdd(false)}>
          <div ref={addTrapRef} tabIndex={-1} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">Add User</h3>
            <form onSubmit={addUser} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                <select value={addForm.role} onChange={e => setAddForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
                <input type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} required minLength={6}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowAdd(false)} disabled={adding}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={adding}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                  {adding ? 'Creating…' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => !saving && setEditing(null)}>
          <div ref={editTrapRef} tabIndex={-1} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-4">Edit User</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                <select value={editForm.role} onChange={e => setEditForm(f => ({ ...f, role: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Active</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={editForm.isActive} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))}
                    className="sr-only peer" />
                  <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500" />
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setEditing(null)} disabled={saving === editing.id}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={() => saveEdit(editing.id)} disabled={saving === editing.id}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                  {saving === editing.id ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => !deleting && setConfirmDelete(null)}>
          <div ref={deleteTrapRef} tabIndex={-1} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-2">Deactivate User</h3>
            <p className="text-sm text-gray-600 mb-4">Are you sure you want to deactivate <strong>{confirmDelete.name}</strong>? They will no longer be able to log in.</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={deactivateUser} disabled={deleting}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60">
                {deleting ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
