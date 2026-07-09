'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckSquare, MapPin } from 'lucide-react';
import { useFocusTrap } from '@/hooks/useFocusTrap';
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
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkedInAt, setCheckedInAt] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  async function handleGpsCheckin() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setCheckingIn(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      );
      const { latitude, longitude } = pos.coords;
      await api.post(`/site-visits/${visitId}/checkin`, { gpsLatitude: latitude, gpsLongitude: longitude });
      setGpsCoords({ lat: latitude, lng: longitude });
      setCheckedInAt(new Date().toLocaleString('en-IN'));
      toast.success('GPS check-in recorded');
    } catch {
      toast.error('Could not get GPS location');
    } finally {
      setCheckingIn(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await api.post(`/site-visits/${visitId}/photos/upload`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotoUrls(prev => [...prev, data.url]);
      toast.success('Photo uploaded');
    } catch {
      toast.error('Could not upload photo');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  }

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
      if (photoUrls.length) {
        await api.post(`/site-visits/${visitId}/photos`, { photoUrls });
      }
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
          ref={useFocusTrap(true)} tabIndex={-1}
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
            <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
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

            <hr className="border-gray-100" />
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Visit Logistics</p>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">GPS Check-in</label>
              {checkedInAt ? (
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
                  Checked in at {checkedInAt}
                  {gpsCoords && <span className="block text-[11px] text-green-500 mt-0.5">{gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}</span>}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleGpsCheckin}
                  disabled={checkingIn}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {checkingIn ? (
                    <><span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Locating…</>
                  ) : (
                    <><MapPin size={14} /> Check In with GPS</>
                  )}
                </button>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Photos</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadingPhoto && <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
              </div>
              {photoUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {photoUrls.map((url, i) => (
                    <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden border border-gray-200">
                      <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setPhotoUrls(prev => prev.filter((_, j) => j !== i))}
                        aria-label="Remove photo"
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-bl-lg p-0.5"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
