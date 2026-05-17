'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ArrowLeft, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const STATUS_DOT: Record<string, string> = {
  SENT: 'bg-blue-500', DELIVERED: 'bg-green-500', FAILED: 'bg-red-500', PENDING: 'bg-gray-300',
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.get(`/marketing/campaigns/${id}/stats`).then(r => setData(r.data));
  }, [id]);

  if (!data) return <div className="p-6 text-gray-400">Loading…</div>;
  const { campaign: c, logs } = data;

  const pieData = [
    { name: 'Sent', value: c.sentCount, color: '#3b82f6' },
    { name: 'Delivered', value: c.deliveredCount, color: '#10b981' },
    { name: 'Failed', value: c.failedCount, color: '#ef4444' },
  ].filter(d => d.value > 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{c.name}</h1>
          <p className="text-sm text-gray-500 mt-1">{c.type} · {c.status} · {c.totalCount} total recipients</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Delivery Stats</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No sends yet</div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-gray-900 mb-4">Summary</h2>
          {[
            { label: 'Total', value: c.totalCount, icon: Clock, color: 'text-gray-600' },
            { label: 'Sent', value: c.sentCount, icon: CheckCircle2, color: 'text-blue-600' },
            { label: 'Delivered', value: c.deliveredCount, icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Failed', value: c.failedCount, icon: XCircle, color: 'text-red-600' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="flex items-center justify-between">
              <div className={`flex items-center gap-2 text-sm ${color}`}>
                <Icon className="w-4 h-4" /> {label}
              </div>
              <span className="font-semibold text-gray-900">{value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100 font-semibold text-gray-900">Send Log (last 50)</div>
        <div className="divide-y divide-gray-50">
          {logs.length === 0 ? (
            <div className="p-6 text-center text-gray-400 text-sm">No logs yet</div>
          ) : logs.map((l: any) => (
            <div key={l.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <span className={`w-2 h-2 rounded-full ${STATUS_DOT[l.status] ?? 'bg-gray-300'}`} />
                <span className="text-sm text-gray-700">{l.contact}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400">{l.status}</span>
                {l.error && <span className="text-xs text-red-500 max-w-xs truncate">{l.error}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
