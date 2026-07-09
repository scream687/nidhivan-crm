'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CalendarClock } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const FOLLOWUP_TYPES = ['CALL', 'VISIT', 'WHATSAPP', 'EMAIL', 'SMS'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const;

interface Props {
  leadId?: string;
  leadName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface User {
  id: string;
  name: string;
  role: string;
}

export function FollowUpForm({ leadId, leadName, onClose, onSuccess }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: leadName ? `Follow-up: ${leadName}` : '',
    followupType: 'CALL' as string,
    dueDate: '',
    reminderAt: '',
    reminderNote: '',
    priority: 'MEDIUM' as string,
    assignedToId: '',
    description: '',
  });

  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data)).catch(() => toast.error('Failed to load users'));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.dueDate || !form.assignedToId) {
      toast.error('Title, due date, and assignee are required');
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, any> = {
        title: form.title.trim(),
        followupType: form.followupType,
        dueDate: new Date(form.dueDate).toISOString(),
        priority: form.priority,
        assignedToId: form.assignedToId,
        description: form.description.trim() || undefined,
      };
      if (leadId) payload.leadId = leadId;
      if (form.reminderAt) {
        payload.reminderAt = new Date(form.reminderAt).toISOString();
      }
      if (form.reminderNote.trim()) {
        payload.reminderNote = form.reminderNote.trim();
      }

      const { data } = await api.post('/tasks', payload);

      // Schedule reminder if set
      if (form.reminderAt && data.id) {
        await api.post(`/follow-ups/${data.id}/schedule`, {
          reminderAt: new Date(form.reminderAt).toISOString(),
          type: form.followupType,
          note: form.reminderNote.trim() || undefined,
        });
      }

      toast.success('Follow-up created');
      onSuccess();
    } catch {
      toast.error('Could not create follow-up');
    } finally {
      setSaving(false);
    }
  }

  const now = new Date();
  const minDate = now.toISOString().slice(0, 16);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          ref={useFocusTrap(true)} tabIndex={-1}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <CalendarClock size={16} className="text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">
                {leadId ? `Follow-up: ${leadName}` : 'Schedule Follow-up'}
              </h2>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Follow-up title"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            {/* Follow-up Type & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                <select
                  value={form.followupType}
                  onChange={e => setForm(f => ({ ...f, followupType: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FOLLOWUP_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                <select
                  value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {PRIORITIES.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date & Time *</label>
              <input
                type="datetime-local"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                min={minDate}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Reminder Date/Time */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reminder (optional)</label>
              <input
                type="datetime-local"
                value={form.reminderAt}
                onChange={e => setForm(f => ({ ...f, reminderAt: e.target.value }))}
                min={minDate}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Reminder Note */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reminder Note</label>
              <textarea
                value={form.reminderNote}
                onChange={e => setForm(f => ({ ...f, reminderNote: e.target.value }))}
                placeholder="Note to show with reminder..."
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Additional notes..."
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Assign To */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assign To *</label>
              <select
                value={form.assignedToId}
                onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select agent...</option>
                {users.map((u: User) => (
                  <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                ))}
              </select>
            </div>

            {/* Lead link (read-only if provided) */}
            {leadId && leadName && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                Linked to lead: <strong>{leadName}</strong>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition"
              >
                {saving ? 'Creating...' : 'Create Follow-up'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
