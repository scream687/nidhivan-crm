'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '@/lib/api';
import { Trophy, TrendingUp, Phone, Target, Users2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const COLORS = ['#f59e0b', '#94a3b8', '#92400e', '#3b82f6', '#10b981', '#8b5cf6', '#06b6d4'];

export default function EmployeesPage() {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setIsLoading(true);
    const { data } = await api.get('/users/leaderboard');
    setLeaderboard(data);
    setIsLoading(false);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Team Performance</h1>
        <p className="text-sm text-gray-500">Real-time leaderboard and agent stats</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {leaderboard.slice(0, 3).map((agent, i) => (
              <motion.div key={agent.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                className={cn('bg-white rounded-xl p-5 shadow-card border text-center',
                  i === 0 ? 'border-yellow-200 ring-2 ring-yellow-400/30' : 'border-gray-100')}>
                <div className="text-3xl mb-2">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-lg font-bold mx-auto mb-2">
                  {agent.name.slice(0, 2).toUpperCase()}
                </div>
                <p className="font-semibold text-gray-900">{agent.name}</p>
                <p className="text-xs text-gray-400 capitalize mb-3">{agent.role.toLowerCase().replace('_', ' ')}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div><p className="text-lg font-bold text-gray-900">{agent.totalLeads}</p><p className="text-xs text-gray-400">Leads</p></div>
                  <div><p className="text-lg font-bold text-green-600">{agent.conversions}</p><p className="text-xs text-gray-400">Won</p></div>
                  <div><p className="text-lg font-bold text-blue-600">{agent.callsToday}</p><p className="text-xs text-gray-400">Calls</p></div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Full table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-card overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Trophy size={16} className="text-yellow-500" /> Full Leaderboard</h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Rank', 'Agent', 'Role', 'Leads', 'Hot Leads', 'Calls Today', 'Conversions', 'Conv. Rate', 'Score'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((agent, i) => (
                  <motion.tr key={agent.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="border-b border-gray-50 hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <span className={`font-bold text-sm ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-400'}`}>{i + 1}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">{agent.name.slice(0, 2).toUpperCase()}</div>
                        <span className="text-sm font-medium text-gray-900">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">{agent.role.toLowerCase().replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-sm text-gray-700 font-medium">{agent.totalLeads}</td>
                    <td className="px-4 py-3 text-sm text-red-600 font-medium">{agent.hotLeads}</td>
                    <td className="px-4 py-3 text-sm text-blue-600 font-medium">{agent.callsToday}</td>
                    <td className="px-4 py-3 text-sm text-green-600 font-bold">{agent.conversions}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{agent.totalLeads ? ((agent.conversions / agent.totalLeads) * 100).toFixed(1) : 0}%</td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-800">{agent.productivityScore}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-card">
            <h2 className="font-semibold text-gray-900 mb-4">Leads by Agent</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={leaderboard} margin={{ left: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} tickFormatter={(v) => v.split(' ')[0]} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="totalLeads" name="Total Leads" radius={[4, 4, 0, 0]}>
                  {leaderboard.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
