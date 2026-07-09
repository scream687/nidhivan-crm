'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Props {
  leadId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ScheduleVisitModal({ leadId, onClose, onSuccess }: Props) {
  const [form, setForm] = useState({ scheduledAt: '', address: '', propertyShown: '', driverName: '', driverPhone: '', pickupLocation: '', pickupTime: '' });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.scheduledAt || !form.address.trim()) {
      toast.error('Date/time and address are required');
      return;
    }
    setSaving(true);
    try {
      await api.post(`/leads/${leadId}/site-visits`, {
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        address: form.address.trim(),
        propertyShown: form.propertyShown.trim() || undefined,
        driverName: form.driverName.trim() || undefined,
        driverPhone: form.driverPhone.trim() || undefined,
        pickupLocation: form.pickupLocation.trim() || undefined,
        pickupTime: form.pickupTime.trim() || undefined,
      });
      toast.success('Site visit scheduled');
      onSuccess();
    } catch {
      toast.error('Could not schedule visit');
    } finally {
      setSaving(false);
    }
  }

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
          className="bg-white rounded-2xl shadow-xl w-full max-w-md"
        >
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-blue-600" />
              <h2 className="text-base font-semibold text-gray-900">Schedule Site Visit</h2>
            </div>
            <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date & Time *</label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Address / Location *</label>
              <input
                type="text"
                value={form.address}
                onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                placeholder="e.g. Nidhivan Plot No. 5, Sector 12"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Property to Show</label>
              <input
                type="text"
                value={form.propertyShown}
                onChange={e => setForm(f => ({ ...f, propertyShown: e.target.value }))}
                placeholder="e.g. 3BHK Villa Type A"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <hr className="border-gray-100" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pickup Details (Optional)</p>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Driver Name</label>
              <input
                type="text"
                value={form.driverName}
                onChange={e => setForm(f => ({ ...f, driverName: e.target.value }))}
                placeholder="e.g. Ramesh"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Driver Phone</label>
              <input
                type="text"
                value={form.driverPhone}
                onChange={e => setForm(f => ({ ...f, driverPhone: e.target.value }))}
                placeholder="e.g. +91 98765 43210"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pickup Location</label>
              <input
                type="text"
                value={form.pickupLocation}
                onChange={e => setForm(f => ({ ...f, pickupLocation: e.target.value }))}
                placeholder="e.g. Nidhivan Office, Jaipur"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pickup Time</label>
              <input
                type="text"
                value={form.pickupTime}
                onChange={e => setForm(f => ({ ...f, pickupTime: e.target.value }))}
                placeholder="e.g. 10:00 AM"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

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
                {saving ? 'Scheduling...' : 'Schedule Visit'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
