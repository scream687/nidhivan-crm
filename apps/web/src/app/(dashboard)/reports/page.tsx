'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { Download, BarChart3, TrendingUp, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#84cc16', '#f59e0b', '#6366f1', '#14b8a6'];

export default function ReportsPage() {
  const [tab, setTab] = useState<'funnel' | 'sources' | 'agents' | 'aging'>('funnel');
  const [funnel, setFunnel] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [aging, setAging] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { loadData(tab); }, [tab]);

  async function loadData(t: string) {
    setIsLoading(true);
    try {
      if (t === 'funnel') { const { data } = await api.get('/reports/sales-funnel'); setFunnel(data); }
      if (t === 'sources') { const { data } = await api.get('/reports/source-breakdown'); setSources(data.filter((s: any) => s.total > 0)); }
      if (t === 'agents') { const { data } = await api.get('/reports/agent-performance'); setAgents(data); }
      if (t === 'aging') { const { data } = await api.get('/reports/lead-aging'); setAging(data.filter((d: any) => d.count > 0)); }
    } finally { setIsLoading(false); }
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

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {[{ k: 'funnel', l: 'Sales Funnel' }, { k: 'sources', l: 'Lead Sources' }, { k: 'agents', l: 'Agent Performance' }, { k: 'aging', l: 'Lead Aging' }].map(({ k, l }) => (
          <button key={k} onClick={() => setTab(k as any)}
            className={cn('px-4 py-1.5 text-sm font-medium rounded-lg transition', tab === k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
