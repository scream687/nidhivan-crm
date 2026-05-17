'use client';
import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, MessageSquare, CheckCheck, Reply, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const PERIODS = [{ label: '7 Days', days: 7 }, { label: '30 Days', days: 30 }, { label: '90 Days', days: 90 }];

export default function WhatsAppAnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    setLoading(true);
    api.get(`/whatsapp/analytics?days=${days}`)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [days]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={20} className="text-green-600" />
          <h1 className="text-lg font-bold text-gray-900">WhatsApp Analytics</h1>
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
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-green-600" /></div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            {[
              { label: 'Sent', value: data?.totalSent || 0, color: 'bg-blue-50 text-blue-600' },
              { label: 'Read', value: data?.totalRead || 0, color: 'bg-green-50 text-green-600' },
              { label: 'Replied', value: data?.totalReplied || 0, color: 'bg-purple-50 text-purple-600' },
              { label: 'Read Rate', value: `${data?.readRate || 0}%`, color: 'bg-amber-50 text-amber-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className={cn('rounded-xl p-4 text-center', color)}>
                <p className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString('en-IN') : value}</p>
                <p className="text-xs mt-0.5 font-medium">{label}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Daily Message Volume</h2>
            {(data?.daily || []).every((d: any) => d.sent === 0) ? (
              <p className="text-center text-gray-400 text-sm py-10">No messages sent yet in this period.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data?.daily || []} barSize={10}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="sent" fill="#3b82f6" name="Sent" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="delivered" fill="#10b981" name="Delivered" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="read" fill="#8b5cf6" name="Read" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="replied" fill="#f59e0b" name="Replies" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-2">Reply Rate Trend</h2>
            <p className="text-xs text-gray-400 mb-4">Replies received per day</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={data?.daily || []}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="replied" stroke="#10b981" strokeWidth={2} dot={false} name="Replies" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
