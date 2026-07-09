'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import api from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { Download, Eye, Users, Target, CalendarCheck, IndianRupee, Wallet, CheckCircle, Phone, MessageSquare, UserPlus, Bell, Zap, DollarSign, TrendingUp, Clock, BarChart3 } from 'lucide-react';
import { KpiCard } from '@/components/dashboard/KpiCard';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#f59e0b', '#6366f1', '#14b8a6'];

export default function ReportsPage() {
  const [tab, setTab] = useState<'funnel' | 'sources' | 'agents' | 'aging' | 'visits' | 'bookings' | 'followups' | 'activity' | 'conversion' | 'dashboard'>('funnel');
  const [funnel, setFunnel] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [aging, setAging] = useState<any[]>([]);
  const [visits, setVisits] = useState<any>(null);
  const [bookings, setBookings] = useState<any>(null);
  const [followups, setFollowups] = useState<any>(null);
  const [activity, setActivity] = useState<any>(null);
  const [conversion, setConversion] = useState<any>(null);
  const [overview, setOverview] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const [dateFrom, setDateFrom] = useState(monthStart);
  const [dateTo, setDateTo] = useState(today);

  useEffect(() => { loadData(tab); }, [tab, dateFrom, dateTo]);

  async function loadData(t: string) {
    setIsLoading(true);
    const params = { from: dateFrom, to: dateTo };
    try {
      if (t === 'funnel') { const { data } = await api.get('/reports/sales-funnel', { params }); setFunnel(data); }
      if (t === 'sources') { const { data } = await api.get('/reports/source-breakdown', { params }); setSources(data.filter((s: any) => s.total > 0)); }
      if (t === 'agents') { const { data } = await api.get('/reports/agent-performance', { params }); setAgents(data); }
      if (t === 'aging') { const { data } = await api.get('/reports/lead-aging', { params }); setAging(data.filter((d: any) => d.count > 0)); }
      if (t === 'visits') { const { data } = await api.get('/reports/site-visits', { params }); setVisits(data); }
      if (t === 'bookings') { const { data } = await api.get('/reports/bookings', { params }); setBookings(data); }
      if (t === 'followups') { const { data } = await api.get('/reports/follow-ups', { params }); setFollowups(data); }
      if (t === 'activity') { const { data } = await api.get('/reports/activities', { params }); setActivity(data); }
      if (t === 'conversion') { const { data } = await api.get('/reports/conversion', { params }); setConversion(data); }
      if (t === 'dashboard') { const { data } = await api.get('/reports/dashboard-overview', { params }); setOverview(data); }
    } catch { /* ignore */ } finally { setIsLoading(false); }
  }

  async function exportLeads() {
    const { data } = await api.get('/leads/export/csv', { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    const a = document.createElement('a'); a.href = url; a.download = `leads-${Date.now()}.csv`; a.click();
    toast.success('Leads exported!');
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-lg font-bold text-gray-900">Reports & Analytics</h1><p className="text-sm text-gray-500">Business intelligence dashboard</p></div>
        <button onClick={exportLeads} className="flex items-center gap-1.5 border border-gray-200 text-gray-700 text-sm px-3.5 py-2 rounded-lg hover:bg-gray-50 transition">
          <Download size={14} />Export Leads CSV
        </button>
      </div>

      {/* Date Range Picker */}
      <div className="flex items-center gap-2">
        <Clock size={14} className="text-gray-400" />
        <label className="text-xs text-gray-500 font-medium">From:</label>
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        <label className="text-xs text-gray-500 font-medium">To:</label>
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
      </div>

      {/* Tabs — Row 1 */}
      <div className="space-y-1">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto flex-nowrap">
          {[
            { k: 'funnel', l: 'Sales Funnel' }, { k: 'sources', l: 'Lead Sources' },
            { k: 'agents', l: 'Agent Performance' }, { k: 'aging', l: 'Lead Aging' },
            { k: 'visits', l: 'Site Visits' }, { k: 'bookings', l: 'Bookings' },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setTab(k as any)}
              className={cn('px-4 py-1.5 text-sm font-medium rounded-lg transition flex-shrink-0', tab === k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
              {l}
            </button>
          ))}
        </div>
        {/* Tabs — Row 2 */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto flex-nowrap">
          {[
            { k: 'followups', l: 'Follow-ups' }, { k: 'activity', l: 'Activity' },
            { k: 'conversion', l: 'Conversion' }, { k: 'dashboard', l: 'Dashboard Overview' },
          ].map(({ k, l }) => (
            <button key={k} onClick={() => setTab(k as any)}
              className={cn('px-4 py-1.5 text-sm font-medium rounded-lg transition flex-shrink-0', tab === k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* ════ EXISTING TAB: Sales Funnel ════ */}
          {tab === 'funnel' && (
            <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
              <h2 className="font-semibold text-gray-900 mb-4">Sales Pipeline Funnel</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnel} layout="vertical" margin={{ left: 120 }}>
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={120}
                    tickFormatter={(v) => { const f = funnel.find((s: any) => s.stage === v); return f?.label || v; }} />
                  <Tooltip formatter={(v) => [v, 'Leads']} labelFormatter={(l) => { const f = funnel.find((s: any) => s.stage === l); return f?.label || l; }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* ════ EXISTING TAB: Lead Sources ════ */}
          {tab === 'sources' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                <h2 className="font-semibold text-gray-900 mb-4">Lead Source Performance</h2>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={sources}>
                    <XAxis dataKey="source" tick={{ fontSize: 11 }} tickFormatter={(v) => v.replace('_COM', '.com').replace('_', ' ')} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" name="Total Leads" radius={[4, 4, 0, 0]}>
                      {sources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">{['Source', 'Total Leads', 'Closed Won', 'Conv. Rate'].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>)}</tr></thead>
                  <tbody>
                    {sources.map((s) => (
                      <tr key={s.source} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{s.source.replace('_COM', '.com').replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{s.total}</td>
                        <td className="px-4 py-3 text-sm text-green-600 font-medium">{s.closedWon}</td>
                        <td className="px-4 py-3 text-sm text-blue-600">{s.conversionRate}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════ EXISTING TAB: Agent Performance ════ */}
          {tab === 'agents' && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
              <table className="w-full">
                <thead><tr className="bg-gray-50 border-b border-gray-100">{['Agent', 'Role', 'Leads Assigned', 'Calls Made', 'Hot Leads', 'Closed Won', 'Conv. Rate'].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>)}</tr></thead>
                <tbody>
                  {agents.map((a) => (
                    <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 capitalize">{a.role.toLowerCase().replace('_', ' ')}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{a.leadsAssigned}</td>
                      <td className="px-4 py-3 text-sm text-blue-600">{a.callsMade}</td>
                      <td className="px-4 py-3 text-sm text-red-600">{a.hotLeads}</td>
                      <td className="px-4 py-3 text-sm text-green-600 font-bold">{a.closedWon}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{a.conversionRate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ════ EXISTING TAB: Lead Aging ════ */}
          {tab === 'aging' && (
            <div className="space-y-3">
              {aging.map((stageData: any) => (
                <div key={stageData.stage} className="bg-white rounded-xl border border-gray-100 shadow-card">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-800">{stageData.label || stageData.stage}</h3>
                    <span className="text-sm text-gray-500">{stageData.count} leads</span>
                  </div>
                  <div className="p-4">
                    <table className="w-full">
                      <thead><tr>{['Lead', 'Phone', 'Assigned To', 'Days in Stage', 'Last Contact'].map(h => <th key={h} className="text-left text-xs text-gray-400 pb-2">{h}</th>)}</tr></thead>
                      <tbody>
                        {stageData.leads.slice(0, 5).map((l: any) => (
                          <tr key={l.id} className="border-t border-gray-50">
                            <td className="py-2 text-sm font-medium text-gray-800">{l.name}</td>
                            <td className="py-2 text-sm text-gray-600">{l.phone}</td>
                            <td className="py-2 text-sm text-gray-500">{l.assignedTo?.name || '—'}</td>
                            <td className="py-2"><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', l.daysInStage > 14 ? 'bg-red-100 text-red-700' : l.daysInStage > 7 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700')}>{l.daysInStage}d</span></td>
                            <td className="py-2 text-xs text-gray-400">{l.daysSinceContact != null ? `${l.daysSinceContact}d ago` : 'Never'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ════ NEW TAB: Site Visits ════ */}
          {tab === 'visits' && visits && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard title="Total Visits" value={visits.total ?? 0} icon={<Eye size={18} />} color="blue" />
                <KpiCard title="Unique Leads" value={visits.byProject?.reduce?.((s: number, p: any) => s + (p.uniqueLeads ?? 0), 0) ?? 0} icon={<Users size={18} />} color="purple" />
                <KpiCard title="Conversion Rate" value={(() => { const u = visits.byProject?.reduce?.((s: number, p: any) => s + (p.uniqueLeads ?? 0), 0); const b = visits.byProject?.reduce?.((s: number, p: any) => s + (p.bookings ?? 0), 0); return u && b ? +((b / u) * 100).toFixed(1) : 0; })()} icon={<Target size={18} />} suffix="%" color="green" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Visits per Project */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                  <h2 className="font-semibold text-gray-900 mb-4">Visits per Project</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={visits.byProject ?? []}>
                      <XAxis dataKey="project" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Visits" radius={[4, 4, 0, 0]}>
                        {(visits.byProject ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Visits per Agent */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                  <h2 className="font-semibold text-gray-900 mb-4">Visits per Agent</h2>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={visits.byAgent ?? []}>
                      <XAxis dataKey="agent" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Visits" radius={[4, 4, 0, 0]}>
                        {(visits.byAgent ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Outcome Breakdown */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                  <h2 className="font-semibold text-gray-900 mb-4">Outcome Breakdown</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={visits.outcomeBreakdown ?? []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={2}>
                        {(visits.outcomeBreakdown ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Monthly Trend */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                  <h2 className="font-semibold text-gray-900 mb-4">Monthly Trend</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={visits.monthlyTrend ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="visits" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} name="Visits" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Details Table */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Visit Details</h3></div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="bg-gray-50 border-b border-gray-100">{['Lead', 'Project', 'Agent', 'Date', 'Outcome'].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>)}</tr></thead>
                    <tbody>
                      {(visits.details ?? []).map((d: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{d.leadName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{d.project}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{d.agent}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{d.date}</td>
                          <td className="px-4 py-3"><span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', d.outcome === 'Interested' ? 'bg-green-100 text-green-700' : d.outcome === 'Not Interested' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600')}>{d.outcome}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════ NEW TAB: Bookings ════ */}
          {tab === 'bookings' && bookings && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard title="Total Bookings" value={bookings.total ?? 0} icon={<CalendarCheck size={18} />} color="blue" />
                <KpiCard title="Total Revenue" value={formatCurrency(bookings.totalRevenue ?? 0)} icon={<IndianRupee size={18} />} color="green" />
                <KpiCard title="Avg Booking Value" value={formatCurrency(bookings.averageBookingValue ?? 0)} icon={<Wallet size={18} />} color="purple" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Monthly Trend — Dual Bar */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                  <h2 className="font-semibold text-gray-900 mb-4">Monthly Trend</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={bookings.monthlyTrend ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="count" name="Bookings" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="revenue" name="Revenue (₹)" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                      <Legend />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* By Project — Horizontal Bar */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                  <h2 className="font-semibold text-gray-900 mb-4">Bookings per Project</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={bookings.byProject ?? []} layout="vertical" margin={{ left: 100 }}>
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="value" name="Bookings" radius={[0, 4, 4, 0]}>
                        {(bookings.byProject ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* By Agent Table */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
                  <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Bookings by Agent</h3></div>
                  <table className="w-full">
                    <thead><tr className="bg-gray-50 border-b border-gray-100">{['Agent', 'Bookings', 'Revenue'].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>)}</tr></thead>
                    <tbody>
                      {(bookings.byAgent ?? []).map((a: any, i: number) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-800">{a.agent}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{a.bookings}</td>
                          <td className="px-4 py-3 text-sm text-green-600 font-medium">{formatCurrency(a.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Registry Breakdown — Donut */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                  <h2 className="font-semibold text-gray-900 mb-4">Registry Breakdown</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={bookings.registryBreakdown ?? []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={2}>
                        {(bookings.registryBreakdown ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ════ NEW TAB: Follow-ups ════ */}
          {tab === 'followups' && followups && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard title="Total Tasks" value={followups.total ?? 0} icon={<CheckCircle size={18} />} color="blue" />
                <KpiCard title="Completed" value={followups.completed ?? 0} icon={<TrendingUp size={18} />} color="green" />
                <KpiCard title="Completion Rate" value={followups.completionRate ?? 0} icon={<Target size={18} />} suffix="%" color="purple" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Status Breakdown — Donut */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                  <h2 className="font-semibold text-gray-900 mb-4">Timely vs Overdue</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={followups.statusBreakdown ?? []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={2}>
                        {(followups.statusBreakdown ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Daily Trend — Line */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                  <h2 className="font-semibold text-gray-900 mb-4">Daily Trend</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={followups.dailyTrend ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} name="Follow-ups" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Per Agent Table */}
              <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-800">Follow-ups by Agent</h3></div>
                <table className="w-full">
                  <thead><tr className="bg-gray-50 border-b border-gray-100">{['Agent', 'Completed', 'Overdue', 'Total'].map(h => <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>)}</tr></thead>
                  <tbody>
                    {(followups.byAgent ?? []).map((a: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{a.agent}</td>
                        <td className="px-4 py-3 text-sm text-green-600">{a.completed}</td>
                        <td className="px-4 py-3 text-sm text-red-500">{a.overdue}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{a.completed + a.overdue}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════ NEW TAB: Activity ════ */}
          {tab === 'activity' && activity && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard title="Total Calls" value={activity.totalCalls ?? 0} icon={<Phone size={18} />} color="blue" />
                <KpiCard title="Total Messages" value={activity.totalMessages ?? 0} icon={<MessageSquare size={18} />} color="green" />
                <KpiCard title="Avg Call Duration" value={activity.avgCallDuration ?? '—'} icon={<Clock size={18} />} color="orange" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Call Answer Rate — Donut */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                  <h2 className="font-semibold text-gray-900 mb-4">Call Answer Rate</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={activity.callAnswerRate ?? []} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" nameKey="name" paddingAngle={2}>
                        {(activity.callAnswerRate ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                {/* Activity Type Breakdown — Bar */}
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                  <h2 className="font-semibold text-gray-900 mb-4">Activity Type Breakdown</h2>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={activity.typeBreakdown ?? []} layout="vertical" margin={{ left: 100 }}>
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="type" tick={{ fontSize: 11 }} width={90} />
                      <Tooltip />
                      <Bar dataKey="count" name="Count" radius={[0, 4, 4, 0]}>
                        {(activity.typeBreakdown ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              {/* Daily Trend — Multi-line */}
              <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                <h2 className="font-semibold text-gray-900 mb-4">Daily Activity Trend</h2>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={activity.dailyTrend ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="calls" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 2 }} name="Calls" />
                    <Line type="monotone" dataKey="messages" stroke={COLORS[1]} strokeWidth={2} dot={{ r: 2 }} name="Messages" />
                    <Line type="monotone" dataKey="activities" stroke={COLORS[2]} strokeWidth={2} dot={{ r: 2 }} name="Activities" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ════ NEW TAB: Conversion ════ */}
          {tab === 'conversion' && conversion && (
            <div className="space-y-4">
              {/* Overall Rate */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-6 shadow-card text-white">
                <p className="text-sm opacity-80 font-medium">Overall Lead-to-Booking Rate</p>
                <p className="text-4xl font-bold mt-1">{conversion.overall?.conversionRate ?? 0}%</p>
              </div>
              {/* Stage-by-Stage Funnel */}
              <div className="space-y-3">
                {(conversion.stages ?? []).map((s: any, i: number) => {
                  const prev = conversion.stages[i - 1];
                  const rate = prev ? Math.round((s.count / prev.count) * 100) : 100;
                  return (
                    <div key={s.stage} className="bg-white rounded-xl border border-gray-100 shadow-card p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{s.label || s.stage}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-gray-500">In: <strong className="text-gray-800">{s.prevStageCount ?? s.count}</strong></span>
                            {i > 0 && <span className="text-gray-400">→</span>}
                            <span className="text-gray-500">Out: <strong className="text-gray-800">{s.count}</strong></span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={cn('text-lg font-bold', rate >= 70 ? 'text-green-600' : rate >= 40 ? 'text-yellow-600' : 'text-red-500')}>{rate}%</div>
                          <p className="text-xs text-gray-400">conversion</p>
                        </div>
                      </div>
                      {/* Mini bar showing proportion */}
                      <div className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className={cn('h-full rounded-full transition-all', rate >= 70 ? 'bg-green-500' : rate >= 40 ? 'bg-yellow-500' : 'bg-red-500')} style={{ width: `${Math.min(rate, 100)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Avg Days in Stage */}
              {(conversion.avgDaysPerStage ?? []).length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-card">
                  <h2 className="font-semibold text-gray-900 mb-4">Average Days in Each Stage</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={conversion.avgDaysPerStage} layout="vertical" margin={{ left: 140 }}>
                      <XAxis type="number" tick={{ fontSize: 12 }} />
                      <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={130} />
                      <Tooltip formatter={(v) => [`${v} days`, 'Avg Time']} />
                      <Bar dataKey="days" name="Avg Days" radius={[0, 4, 4, 0]}>
                        {(conversion.avgDaysPerStage ?? []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ════ NEW TAB: Dashboard Overview ════ */}
          {tab === 'dashboard' && overview && (
            <div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <KpiCard title="New Leads (Today)" value={overview.newLeadsToday ?? 0} icon={<UserPlus size={18} />} color="blue" />
                <KpiCard title="New Leads (Week)" value={overview.newLeadsThisWeek ?? 0} icon={<Users size={18} />} color="purple" />
                <KpiCard title="New Leads (Month)" value={overview.newLeadsThisMonth ?? 0} icon={<BarChart3 size={18} />} color="blue" />
                <KpiCard title="Site Visits" value={overview.siteVisitsToday ?? 0} icon={<Eye size={18} />} color="orange" />
                <KpiCard title="Bookings" value={overview.bookingsThisMonth ?? 0} icon={<CalendarCheck size={18} />} color="green" />
                <KpiCard title="Revenue" value={formatCurrency(overview.revenueThisMonth ?? 0)} icon={<IndianRupee size={18} />} color="green" />
                <KpiCard title="Calls Made" value={overview.callsToday ?? 0} icon={<Phone size={18} />} color="blue" />
                <KpiCard title="Follow-ups Due" value={overview.followUpsDueToday ?? 0} icon={<Bell size={18} />} color="red" />
                <KpiCard title="Hot Leads" value={overview.hotLeads ?? 0} icon={<Zap size={18} />} color="red" />
                <KpiCard title="Pipeline Value" value={formatCurrency(overview.pipelineValue ?? 0)} icon={<DollarSign size={18} />} color="purple" />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
