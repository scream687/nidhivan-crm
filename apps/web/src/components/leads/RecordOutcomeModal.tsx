'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  leadId: string;
  visitId: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Outcome = 'COMPLETED' | 'NO_SHOW' | 'CANCELLED' | 'RESCHEDULED';

const OUTCOMES: { value: Outcome; label: string }[] = [
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'NO_SHOW', label: 'No Show' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
];

const INTEREST_LEVELS = [
  { value: 'HOT', label: 'Hot' },
  { value: 'WARM', label: 'Warm' },
  { value: 'COLD', label: 'Cold' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
];

export function RecordOutcomeModal({ leadId, visitId, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({
    outcome: '' as Outcome | '',
    interestLevel: '',
    propertyShown: '',
    objections: '',
    followUpNotes: '',
    followUpDate: '',
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.outcome) {
      toast.error('Please select an outcome');
      return;
    }
    setSaving(true);
    try {
      await api.patch(`/leads/${leadId}/site-visits/${visitId}`, {
        outcome: form.outcome,
        interestLevel: form.interestLevel || undefined,
        propertyShown: form.propertyShown.trim() || undefined,
        objections: form.objections.trim() || undefined,
        followUpNotes: form.followUpNotes.trim() || undefined,
        followUpDate: form.followUpDate ? new Date(form.followUpDate).toISOString() : undefined,
      });
      toast.success('Visit outcome recorded');
      onSuccess();
    } catch {
      toast.error('Could not record outcome');
    } finally {
      setSaving(false);
    }
  }

  const isCompleted = form.outcome === 'COMPLETED';

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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white">
            <div className="flex items-center gap-2">
              <CheckSquare size={16} className="text-green-600" />
              <h2 className="text-base font-semibold text-gray-900">Record Visit Outcome</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Outcome *</label>
              <div className="grid grid-cols-2 gap-2">
                {OUTCOMES.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, outcome: o.value }))}
                    className={cn(
                      'py-2 px-3 rounded-lg text-sm font-medium border transition',
                      form.outcome === o.value
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    )}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {isCompleted && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Interest Level</label>
                <select
                  value={form.interestLevel}
                  onChange={e => setForm(f => ({ ...f, interestLevel: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select interest level...</option>
                  {INTEREST_LEVELS.map(l => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Property Shown</label>
              <input
                type="text"
                value={form.propertyShown}
                onChange={e => setForm(f => ({ ...f, propertyShown: e.target.value }))}
                placeholder="e.g. 3BHK Villa Type A"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Objections / Concerns</label>
              <textarea
                value={form.objections}
                onChange={e => setForm(f => ({ ...f, objections: e.target.value }))}
                placeholder="What concerns did the client raise?"
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Notes</label>
              <textarea
                value={form.followUpNotes}
                onChange={e => setForm(f => ({ ...f, followUpNotes: e.target.value }))}
                placeholder="Key takeaways and next steps..."
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {isCompleted && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Follow-up Date</label>
                <input
                  type="date"
                  value={form.followUpDate}
                  onChange={e => setForm(f => ({ ...f, followUpDate: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">A follow-up task will be auto-created if set</p>
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
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition"
              >
                {saving ? 'Saving...' : 'Save Outcome'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
