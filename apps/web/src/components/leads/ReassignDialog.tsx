'use client';
import { useState, useEffect, useRef } from 'react';
import { useUsersStore } from '@/stores/usersStore';
import { useLeadsStore } from '@/stores/leadsStore';
import { UserPlus, Search, Check, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  leadId: string;
  currentAssigneeId?: string | null;
  onSuccess?: () => void;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  SALES_AGENT: 'bg-green-100 text-green-700',
  TELECALLER: 'bg-amber-100 text-amber-700',
  MARKETING: 'bg-pink-100 text-pink-700',
  ACCOUNTANT: 'bg-gray-100 text-gray-600',
};

function initials(name: string) {
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export function ReassignDialog({ leadId, currentAssigneeId, onSuccess }: Props) {
  const { users, fetchUsers } = useUsersStore();
  const { assignLead } = useLeadsStore();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string>(currentAssigneeId ?? '');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      fetchUsers();
      setSelected(currentAssigneeId ?? '');
      setSearch('');
      setTimeout(() => searchRef.current?.focus(), 80);
    }
  }, [open]);

  const filtered = users.filter(u =>
    u.isActive &&
    (u.name.toLowerCase().includes(search.toLowerCase()) ||
     u.role.toLowerCase().includes(search.toLowerCase()))
  );

  async function confirm() {
    if (!selected || selected === currentAssigneeId) { setOpen(false); return; }
    setSaving(true);
    try {
      await assignLead(leadId, selected);
      toast.success('Lead reassigned');
      setOpen(false);
      onSuccess?.();
    } catch {
      toast.error('Failed to reassign');
    } finally {
      setSaving(false);
    }
  }

  const selectedUser = users.find(u => u.id === selected);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition"
        title="Reassign lead"
      >
        <UserPlus size={14} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Reassign Lead</h2>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={18} />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pt-4 pb-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search by name or role…"
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* User list */}
            <div className="max-h-64 overflow-y-auto px-2 pb-2">
              {filtered.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">No users found</p>
              ) : (
                filtered.map(user => {
                  const isCurrent = user.id === currentAssigneeId;
                  const isSelected = user.id === selected;
                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelected(user.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-left mb-0.5
                        ${isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {user.avatarUrl
                          ? <img src={user.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt={user.name} />
                          : initials(user.name)
                        }
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-900 truncate">{user.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium flex-shrink-0">current</span>
                          )}
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-500'}`}>
                          {user.role.replace(/_/g, ' ')}
                        </span>
                      </div>

                      {isSelected && <Check size={14} className="text-blue-600 flex-shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              {selectedUser && (
                <p className="text-xs text-gray-500 mb-2 truncate">
                  Assigning to: <span className="font-medium text-gray-700">{selectedUser.name}</span>
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setOpen(false)}
                  className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 py-2 rounded-lg text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={confirm}
                  disabled={!selected || saving}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 rounded-lg text-sm transition"
                >
                  {saving ? <Loader2 size={13} className="animate-spin" /> : null}
                  {selected === currentAssigneeId ? 'Close' : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
