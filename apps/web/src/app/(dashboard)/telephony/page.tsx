'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Clock, User } from 'lucide-react';

export default function TelephonyPage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);

  useEffect(() => { loadCalls(); }, []);

  async function loadCalls() {
    setIsLoading(true);
    const { data } = await api.get('/telephony/calls');
    setCalls(data.data);
    setTotal(data.total);
    setIsLoading(false);
  }

  const statusColor = { COMPLETED: 'text-green-600 bg-green-50', FAILED: 'text-red-600 bg-red-50', NO_ANSWER: 'text-gray-500 bg-gray-50', BUSY: 'text-orange-500 bg-orange-50' };

  return (
    <div className="flex flex-col h-screen">
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Call Logs</h1>
          <p className="text-xs text-gray-500">{total.toLocaleString()} calls</p>
        </div>
        <button onClick={() => setShowLogModal(true)} className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3.5 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
          <Phone size={14} />
          Log Call
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Type', 'From → To', 'Lead', 'Duration', 'Status', 'Time', 'Recording'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calls.map((call) => (
                  <motion.tr key={call.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      {call.callType === 'OUTGOING'
                        ? <PhoneOutgoing size={16} className="text-blue-500" />
                        : <PhoneIncoming size={16} className="text-green-500" />}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{call.fromNumber} → {call.toNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{call.lead?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {call.duration ? `${Math.floor(call.duration / 60)}:${String(call.duration % 60).padStart(2, '0')}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', (statusColor as any)[call.status] || 'bg-gray-50 text-gray-500')}>
                        {call.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{timeAgo(call.createdAt)}</td>
                    <td className="px-4 py-3">
                      {call.recordingUrl
                        ? <audio controls src={call.recordingUrl} className="h-7 w-36" />
                        : <span className="text-xs text-gray-300">—</span>}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showLogModal && <LogCallModal onClose={() => setShowLogModal(false)} onLogged={() => { setShowLogModal(false); loadCalls(); }} />}
    </div>
  );
}

function LogCallModal({ onClose, onLogged }: { onClose: () => void; onLogged: () => void }) {
  const [form, setForm] = useState({ fromNumber: '', toNumber: '', callType: 'OUTGOING', duration: '', notes: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await api.post('/telephony/calls', { ...form, duration: form.duration ? parseInt(form.duration) : undefined });
    onLogged();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Log Call</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          {[
            { key: 'fromNumber', label: 'Your Number', placeholder: '9876543210' },
            { key: 'toNumber', label: 'Customer Number', placeholder: '9876543210' },
            { key: 'duration', label: 'Duration (seconds)', type: 'number', placeholder: '120' },
          ].map(({ key, label, placeholder, type }) => (
            <div key={key}>
              <label className="text-xs font-medium text-gray-600 mb-1 block">{label}</label>
              <input type={type || 'text'} value={(form as any)[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder} className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          ))}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm border border-gray-200 rounded-lg text-gray-600">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 py-2 text-sm bg-blue-600 text-white rounded-lg disabled:opacity-60 font-medium">
              {loading ? 'Saving…' : 'Log Call'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
