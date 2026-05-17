'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { GitMerge } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#a78bfa'];

export default function AttributionPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get('/marketing/attribution').then(r => setData(r.data));
  }, []);

  if (!data) return <div className="p-6 text-gray-400">Loading…</div>;

  const chartData = data.bySource.map((r: any) => ({
    name: r.source.replace(/_/g, ' '),
    Total: r.total,
    Converted: r.converted,
    'Conv. Rate': r.total > 0 ? +((r.converted / r.total) * 100).toFixed(1) : 0,
  }));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <GitMerge className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Marketing Attribution</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Leads by Source</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 0, right: 20, bottom: 20, left: 0 }}>
            <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Total" fill="#3b82f6" radius={[4,4,0,0]}>
              {chartData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Bar>
            <Bar dataKey="Converted" fill="#10b981" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100 font-semibold text-gray-900">Source Breakdown</div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase border-b border-gray-50">
                <th className="px-4 py-2 text-left">Source</th>
                <th className="px-4 py-2 text-right">Leads</th>
                <th className="px-4 py-2 text-right">Converted</th>
                <th className="px-4 py-2 text-right">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.bySource.map((r: any, i: number) => (
                <tr key={r.source} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: COLORS[i % COLORS.length] }} />
                    {r.source.replace(/_/g, ' ')}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium">{r.total}</td>
                  <td className="px-4 py-2.5 text-right text-green-600">{r.converted}</td>
                  <td className="px-4 py-2.5 text-right text-gray-500">
                    {r.total > 0 ? ((r.converted / r.total) * 100).toFixed(1) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {data.byUtmCampaign.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-100 font-semibold text-gray-900">Top UTM Campaigns</div>
            <div className="divide-y divide-gray-50">
              {data.byUtmCampaign.map((r: any) => (
                <div key={r.utmCampaign} className="flex items-center justify-between px-4 py-3">
                  <span className="text-sm text-gray-700 truncate">{r.utmCampaign}</span>
                  <span className="text-sm font-semibold text-blue-600 ml-2">{r._count.id}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
