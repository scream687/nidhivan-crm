'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Phone, Clock, TrendingUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';

const PERIODS = [
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'All Time', value: 'all' },
];

const SCORE_COLOR = (score: number) =>
  score >= 80 ? 'text-green-600 bg-green-50' : score >= 60 ? 'text-blue-600 bg-blue-50' : 'text-gray-600 bg-gray-100';

export default function CallToppersPage() {
  const [toppers, setToppers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    setLoading(true);
    api.get(`/telephony/toppers?period=${period}`)
      .then(r => setToppers(r.data || []))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-amber-500" />
          <h1 className="text-lg font-bold text-gray-900">Call Toppers</h1>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {PERIODS.map(p => (
            <button key={p.value} onClick={() => setPeriod(p.value)}
              className={cn('px-3 py-1.5 text-xs font-medium rounded-lg transition', period === p.value ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 size={24} className="animate-spin text-blue-600" /></div>
      ) : toppers.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Trophy size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No call data for this period yet.</p>
        </div>
      ) : (
        <>
          {/* Top 3 podium */}
          {toppers.length >= 3 && (
            <div className="grid grid-cols-3 gap-4">
              {[toppers[1], toppers[0], toppers[2]].map((t, i) => {
                const heights = ['h-28', 'h-36', 'h-24'];
                const golds = ['bg-gray-100', 'bg-amber-50 border-amber-200', 'bg-orange-50 border-orange-200'];
                return t ? (
                  <motion.div key={t.rank} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                    className={cn('rounded-xl border p-4 flex flex-col items-center justify-end text-center', heights[i], golds[i])}>
                    <span className="text-2xl mb-1">{t.badge}</span>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.calls} calls</p>
                    <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full mt-1', SCORE_COLOR(t.score))}>{t.score}</span>
                  </motion.div>
                ) : <div key={i} />;
              })}
            </div>
          )}

          {/* Full leaderboard */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Rank', 'Agent', 'Calls', 'Duration', 'Connected', 'Conversions', 'Score'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {toppers.map((t) => (
                  <motion.tr key={t.rank} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm font-bold text-gray-400">{t.badge || t.rank}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 text-sm">{t.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{t.calls}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t.duration}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{t.connected}</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-medium">{t.conversions}</td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', SCORE_COLOR(t.score))}>{t.score}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
