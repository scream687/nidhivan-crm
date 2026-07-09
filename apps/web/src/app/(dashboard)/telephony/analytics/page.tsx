'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#6b7280', '#3b82f6'];
const PERIODS = [{ label: '7 Days', days: 7 }, { label: '30 Days', days: 30 }, { label: '90 Days', days: 90 }];

function fmtDuration(secs: number) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function CallAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    setLoading(true);
    api.get(`/telephony/analytics?days=${days}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [days]);

  const totalCalls = data?.daily?.reduce((s: number, d: any) => s + d.incoming + d.outgoing, 0) || 0;
  const totalDuration = data?.daily?.reduce((s: number, d: any) => s + (d.totalDuration || 0), 0) || 0;
  const totalMissed = data?.daily?.reduce((s: number, d: any) => s + d.missed, 0) || 0;

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Call Analytics</h1>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODS.map(p => (
            <button key={p.days} onClick={() => setDays(p.days)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition', days === p.days ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-blue-600" /></div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Total Calls', value: totalCalls.toLocaleString(), color: 'bg-blue-50 text-blue-600' },
              { label: 'Total Duration', value: `${Math.floor(totalDuration / 3600)}h ${Math.floor((totalDuration % 3600) / 60)}m`, color: 'bg-purple-50 text-purple-600' },
              { label: 'Missed', value: totalMissed.toLocaleString(), color: 'bg-red-50 text-red-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className={cn('rounded-xl p-4 text-center', color)}>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily Call Volume</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data?.daily || []} barSize={12}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="incoming" fill="#10b981" name="Incoming" radius={[3, 3, 0, 0]} />
                <Bar dataKey="outgoing" fill="#3b82f6" name="Outgoing" radius={[3, 3, 0, 0]} />
                <Bar dataKey="missed" fill="#ef4444" name="Missed" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Call Outcomes</h2>
              {(data?.outcomes || []).length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">No data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data?.outcomes || []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                      {(data?.outcomes || []).map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-5 overflow-auto">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Agent Performance</h2>
              {(data?.agents || []).length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-10">No calls logged yet</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Agent', 'Calls', 'Avg', 'Connected', 'Deals'].map(h => (
                        <th key={h} className="text-left py-2 pr-3 text-gray-400 font-semibold uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.agents || []).map((a: any, i: number) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 pr-3 font-medium text-gray-800">{a.name}</td>
                        <td className="py-2 pr-3 text-gray-600">{a.calls}</td>
                        <td className="py-2 pr-3 text-gray-600">{fmtDuration(a.avgDuration)}</td>
                        <td className="py-2 pr-3 text-gray-600">{a.connected}</td>
                        <td className="py-2 pr-3 text-green-600 font-medium">{a.deals}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
