'use client';
import { useState, useEffect, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileCheck,
  Plus,
  Loader2,
  Search,
  ChevronDown,
  ChevronRight,
  IndianRupee,
  Calendar,
  Filter,
  X,
  Save,
} from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import BookingDetail from '@/components/bookings/BookingDetail';

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
  COMPLETED: 'bg-blue-100 text-blue-700',
};

const REGISTRY_STYLES: Record<string, string> = {
  TOKEN: 'bg-purple-100 text-purple-700',
  AGREEMENT: 'bg-blue-100 text-blue-700',
  REGISTRATION_PENDING: 'bg-amber-100 text-amber-700',
  REGISTERED: 'bg-green-100 text-green-700',
};

const COMMISSION_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
};

function inr(n: number | string) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Filters
  const [filterStatus, setFilterStatus] = useState('');
  const [filterRegistry, setFilterRegistry] = useState('');
  const [filterAgent, setFilterAgent] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [showNew, setShowNew] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterStatus) params.status = filterStatus;
      if (filterRegistry) params.registryStatus = filterRegistry;
      if (filterAgent) params.agentId = filterAgent;
      if (filterDateFrom) params.dateFrom = filterDateFrom;
      if (filterDateTo) params.dateTo = filterDateTo;

      const [bRes, sRes] = await Promise.all([
        api.get('/bookings', { params }),
        api.get('/bookings/stats'),
      ]);
      setBookings(bRes.data?.data || []);
      setStats(sRes.data);
    } catch {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterRegistry, filterAgent, filterDateFrom, filterDateTo]);

  useEffect(() => { load(); }, [load]);

  const registryCounts = bookings.reduce(
    (acc: Record<string, number>, b: any) => {
      const r = b.registryStatus || 'TOKEN';
      acc[r] = (acc[r] || 0) + 1;
      return acc;
    },
    {},
  );

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
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

      {/* Dashboard summary bar */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
            <p className="text-2xl font-bold text-blue-700">{stats.total || 0}</p>
            <p className="text-xs text-blue-500 font-medium mt-0.5">Total Bookings</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4">
            <p className="text-2xl font-bold text-green-700">{stats.thisMonth || 0}</p>
            <p className="text-xs text-green-500 font-medium mt-0.5">This Month</p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-4">
            <p className="text-xl font-bold text-amber-700">{inr(stats.totalRevenue || 0)}</p>
            <p className="text-xs text-amber-500 font-medium mt-0.5">Total Revenue</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4">
            <p className="text-xl font-bold text-yellow-700">{inr(stats.pendingCommission || 0)}</p>
            <p className="text-xs text-yellow-500 font-medium mt-0.5">Commission Pending</p>
          </div>
        </div>
      )}

      {/* Registry breakdown */}
      {bookings.length > 0 && (
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-400 font-medium">Registry:</span>
          {['TOKEN', 'AGREEMENT', 'REGISTRATION_PENDING', 'REGISTERED'].map((r) => (
            <span key={r} className="flex items-center gap-1.5">
              <span className={cn('w-2 h-2 rounded-full', {
                'bg-purple-500': r === 'TOKEN',
                'bg-blue-500': r === 'AGREEMENT',
                'bg-amber-500': r === 'REGISTRATION_PENDING',
                'bg-green-500': r === 'REGISTERED',
              })} />
              <span className="text-gray-600">{r.replace('_', ' ')}</span>
              <span className="text-gray-400 font-mono">{registryCounts[r] || 0}</span>
            </span>
          ))}
        </div>
      )}

      {/* Filters */}
      <div>
        <button onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 font-medium mb-2">
          <Filter size={13} /> Filters {showFilters ? '(hide)' : '(show)'}
        </button>
        <AnimatePresence>
          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              className="flex flex-wrap gap-2 overflow-hidden">
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
                <option value="">All Status</option>
                <option value="CONFIRMED">CONFIRMED</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
              <select value={filterRegistry} onChange={e => setFilterRegistry(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs">
                <option value="">All Registry</option>
                <option value="TOKEN">TOKEN</option>
                <option value="AGREEMENT">AGREEMENT</option>
                <option value="REGISTRATION_PENDING">REGISTRATION PENDING</option>
                <option value="REGISTERED">REGISTERED</option>
              </select>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs" placeholder="From" />
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs" placeholder="To" />
              {(filterStatus || filterRegistry || filterDateFrom || filterDateTo) && (
                <button onClick={() => { setFilterStatus(''); setFilterRegistry(''); setFilterDateFrom(''); setFilterDateTo(''); }}
                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600">
                  <X size={12} /> Clear
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-blue-600" /></div>
      ) : bookings.length === 0 ? (
        <EmptyState icon={FileCheck} title="No bookings yet" description="Create your first booking to get started." action={{ label: 'New Booking', onClick: () => setShowNew(true) }} />
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['', 'Booking #', 'Customer', 'Project', 'Unit', 'Amount', 'Token', 'Status', 'Registry', 'Agent', 'Commission', 'Date'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bookings.map((b, i) => (
                <Fragment key={b.id}>
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}
                    className={cn(
                      'border-b border-gray-50 transition cursor-pointer',
                      expandedId === b.id ? 'bg-blue-50' : 'hover:bg-gray-50',
                    )}
                  >
                    <td className="px-2 py-3">
                      {expandedId === b.id
                        ? <ChevronDown size={14} className="text-blue-500" />
                        : <ChevronRight size={14} className="text-gray-300" />
                      }
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-600 font-medium">{b.bookingNumber}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{b.lead?.name}</p>
                      <p className="text-xs text-gray-400">{b.lead?.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{b.project?.name}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{b.unitNumber}</p>
                      <p className="text-xs text-gray-400">{b.unitType}{b.unitArea ? ` · ${b.unitArea}` : ''}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{inr(b.totalAmount)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.tokenAmount ? inr(b.tokenAmount) : '—'}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[b.status] || 'bg-gray-100 text-gray-500')}>
                        {b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', REGISTRY_STYLES[b.registryStatus] || 'bg-gray-100 text-gray-500')}>
                        {b.registryStatus || 'TOKEN'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.agent?.name}</td>
                    <td className="px-4 py-3">
                      {b.commissionStatus ? (
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', COMMISSION_STYLES[b.commissionStatus])}>
                          {b.commissionStatus}
                        </span>
                      ) : <span className="text-xs text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(b.bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                  </motion.tr>
                  {/* Expanded detail */}
                  {expandedId === b.id && (
                    <tr key={`${b.id}-detail`}>
                      <td colSpan={12} className="px-4 pb-4">
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                        >
                          <BookingDetail
                            booking={b}
                            onClose={() => setExpandedId(null)}
                            onUpdated={() => setRefreshKey(k => k + 1)}
                          />
                        </motion.div>
                      </td>
                    </tr>
                  )}
                </Fragment>
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
    api.get('/inventory').then(r => setProjects(r.data || [])).catch(() => toast.error('Failed to load projects'));
  }, []);

  useEffect(() => {
    if (!leadSearch.trim()) { setLeads([]); return; }
    const t = setTimeout(() => {
      api.get('/leads', { params: { search: leadSearch, limit: 8 } })
        .then(r => setLeads(r.data?.leads || r.data || []))
        .catch(() => toast.error('Failed to search leads'));
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

  const trapRef = useFocusTrap(true);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <motion.div ref={trapRef} tabIndex={-1} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">New Booking</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Lead *</label>
            {selectedLead ? (
              <div className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedLead.name}</p>
                  <p className="text-xs text-gray-500">{selectedLead.phone} · {selectedLead.leadNumber}</p>
                </div>
                <button type="button" onClick={() => { setSelectedLead(null); setLeadSearch(''); }}
                  aria-label="Clear lead selection" className="text-gray-400 hover:text-red-500"><X size={14} /></button>
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


