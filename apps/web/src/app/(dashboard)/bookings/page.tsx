'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FileCheck, Plus, X, Save, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
  COMPLETED: 'bg-blue-100 text-blue-700',
};

function inr(n: number | string) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, sRes] = await Promise.all([
        api.get('/bookings', { params: status ? { status } : {} }),
        api.get('/bookings/stats'),
      ]);
      setBookings(bRes.data?.data || []);
      setStats(sRes.data);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileCheck size={20} className="text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Bookings</h1>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3.5 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
          <Plus size={14} /> New Booking
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-xs text-blue-500 font-medium mt-0.5">Total Bookings</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{stats.thisMonth}</p>
            <p className="text-xs text-green-500 font-medium mt-0.5">This Month</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 text-center">
            <p className="text-xl font-bold text-amber-700">{inr(stats.totalRevenue)}</p>
            <p className="text-xs text-amber-500 font-medium mt-0.5">Total Revenue</p>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setStatus(s)}
            className={cn('px-3 py-1.5 text-xs font-medium rounded-lg border transition', status === s ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-600" /></div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileCheck size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No bookings yet. Create your first booking.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Booking #', 'Lead', 'Project', 'Unit', 'Total Amount', 'Booking Amt', 'Status', 'Date', 'Agent'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => (
                <motion.tr key={b.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                  className="border-b border-gray-50 hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono text-xs text-blue-600 font-medium">{b.bookingNumber}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{b.lead?.name}</p>
                    <p className="text-xs text-gray-400">{b.lead?.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{b.project?.name}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-700">{b.unitNumber}</p>
                    <p className="text-xs text-gray-400">{b.unitType}{b.unitArea ? ` · ${b.unitArea} sq.yd` : ''}</p>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{inr(b.totalAmount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{inr(b.bookingAmount)}</td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[b.status] || 'bg-gray-100 text-gray-500')}>
                      {b.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {new Date(b.bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{b.agent?.name}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showNew && <NewBookingModal onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); load(); }} />}
    </div>
  );
}

function NewBookingModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [leads, setLeads] = useState<any[]>([]);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [form, setForm] = useState({
    projectId: '', unitNumber: '', unitType: 'PLOT', unitArea: '',
    basePrice: '', bookingAmount: '', totalAmount: '', notes: '',
  });

  useEffect(() => {
    api.get('/inventory').then(r => setProjects(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!leadSearch.trim()) { setLeads([]); return; }
    const t = setTimeout(() => {
      api.get('/leads', { params: { search: leadSearch, limit: 8 } })
        .then(r => setLeads(r.data?.leads || r.data || []))
        .catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [leadSearch]);

  function set(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedLead) { toast.error('Select a lead'); return; }
    if (!form.projectId) { toast.error('Select a project'); return; }
    if (!form.unitNumber || !form.basePrice || !form.totalAmount) {
      toast.error('Unit #, base price, and total amount are required'); return;
    }
    setSaving(true);
    try {
      await api.post('/bookings', {
        leadId: selectedLead.id,
        projectId: form.projectId,
        unitNumber: form.unitNumber,
        unitType: form.unitType,
        unitArea: form.unitArea ? +form.unitArea : undefined,
        basePrice: +form.basePrice,
        bookingAmount: form.bookingAmount ? +form.bookingAmount : +form.basePrice * 0.1,
        totalAmount: +form.totalAmount,
        notes: form.notes || undefined,
      });
      toast.success('Booking created');
      onCreated();
    } catch {
      toast.error('Failed to create booking');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">New Booking</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Lead search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lead *</label>
            {selectedLead ? (
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedLead.name}</p>
                  <p className="text-xs text-gray-500">{selectedLead.phone} · {selectedLead.leadNumber}</p>
                </div>
                <button type="button" onClick={() => { setSelectedLead(null); setLeadSearch(''); }}
                  className="text-gray-400 hover:text-red-500"><X size={14} /></button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input value={leadSearch} onChange={e => setLeadSearch(e.target.value)}
                  placeholder="Search lead by name or phone…"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                {leads.length > 0 && (
                  <div className="absolute z-10 top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                    {leads.slice(0, 6).map(l => (
                      <button type="button" key={l.id} onClick={() => { setSelectedLead(l); setLeads([]); setLeadSearch(''); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 transition">
                        <p className="text-sm font-medium text-gray-900">{l.name}</p>
                        <p className="text-xs text-gray-400">{l.phone} · {l.leadNumber}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Project */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Project *</label>
            <select value={form.projectId} onChange={e => set('projectId', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Select project…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name} — {p.location}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit Number *</label>
              <input value={form.unitNumber} onChange={e => set('unitNumber', e.target.value)}
                placeholder="A-101" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Unit Type</label>
              <select value={form.unitType} onChange={e => set('unitType', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['PLOT', 'APARTMENT', 'VILLA', 'TOWNSHIP'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Area (sq.yd)</label>
              <input type="number" value={form.unitArea} onChange={e => set('unitArea', e.target.value)}
                placeholder="200" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Base Price (₹) *</label>
              <input type="number" value={form.basePrice} onChange={e => set('basePrice', e.target.value)}
                placeholder="2500000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Booking Amount (₹)</label>
              <input type="number" value={form.bookingAmount} onChange={e => set('bookingAmount', e.target.value)}
                placeholder="250000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Amount (₹) *</label>
              <input type="number" value={form.totalAmount} onChange={e => set('totalAmount', e.target.value)}
                placeholder="3200000" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              placeholder="Payment terms, special conditions…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Create Booking
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
