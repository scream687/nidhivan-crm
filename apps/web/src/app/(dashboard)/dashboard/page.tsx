'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { LivePulseFeed } from '@/components/dashboard/LivePulseFeed';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';
import api from '@/lib/api';
import { Users2, Flame, Clock, TrendingUp, Trophy } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const [kpis, setKpis] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => {
    loadData();
    if (socket) {
      socket.on('dashboard:kpi_update', (data: any) => setKpis(data));
      socket.on('lead:created', () => loadData());
      socket.on('lead:stage_changed', () => loadData());
    }
    return () => {
      socket?.off('dashboard:kpi_update');
      socket?.off('lead:created');
      socket?.off('lead:stage_changed');
    };
  }, [socket]);

  async function loadData() {
    try {
      const [kpisRes, funnelRes] = await Promise.all([
        api.get('/leads/kpis'),
        api.get('/reports/sales-funnel'),
      ]);
      setKpis(kpisRes.data);
      setFunnel(funnelRes.data.slice(0, 8));
      if (isAdmin) {
        const [lbRes, srcRes] = await Promise.all([
          api.get('/users/leaderboard'),
          api.get('/reports/source-breakdown'),
        ]);
        setLeaderboard(lbRes.data);
        setSources(srcRes.data.filter((s: any) => s.total > 0));
      }
    } catch {}
  }

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">Here's what's happening in your CRM today</p>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              { title: 'Total Leads', value: kpis?.totalLeads?.toLocaleString() || '—', icon: <Users2 size={18} />, color: 'blue' as const, delay: 0.1 },
              { title: 'Leads Today', value: kpis?.leadsToday || '—', icon: <TrendingUp size={18} />, color: 'green' as const, delay: 0.2 },
              { title: 'Hot Leads', value: kpis?.hotLeads || '—', icon: <Flame size={18} />, color: 'red' as const, delay: 0.3 },
              { title: 'Pending Follow-ups', value: kpis?.pendingFollowUps || '—', icon: <Clock size={18} />, color: 'orange' as const, delay: 0.4 },
            ].map(({ title, value, icon, color, delay }) => (
              <motion.div key={title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
                <KpiCard title={title} value={value} icon={icon} color={color} />
              </motion.div>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card className="shadow-sm border-gray-100 overflow-hidden">
              <CardHeader className="border-b border-gray-50 bg-gray-50/30">
                <CardTitle className="text-sm font-bold text-gray-700">LEAD PIPELINE</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={funnel} layout="vertical" margin={{ left: 60 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} hide />
                    <YAxis type="category" dataKey="stage" tick={{ fontSize: 10 }} width={110}
                      tickFormatter={(v) => v.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                      {funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {isAdmin && sources.length > 0 && (
              <Card className="shadow-sm border-gray-100 overflow-hidden">
                <CardHeader className="border-b border-gray-50 bg-gray-50/30">
                  <CardTitle className="text-sm font-bold text-gray-700">LEAD SOURCES</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="flex items-center">
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={sources} dataKey="total" nameKey="source" cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5}>
                          {sources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-1/2 space-y-2">
                      {sources.slice(0, 4).map((s, i) => (
                        <div key={s.source} className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-2">
                            <div className="size-2 rounded-full" style={{ background: COLORS[i] }} />
                            <span className="text-gray-500 font-medium truncate max-w-[80px]">{s.source}</span>
                          </div>
                          <span className="font-bold text-gray-700">{s.total}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {isAdmin && leaderboard.length > 0 && (
            <Card className="shadow-sm border-gray-100">
              <CardHeader className="flex flex-row items-center justify-between border-b border-gray-50 bg-gray-50/30">
                <div className="flex items-center gap-2">
                  <Trophy size={16} className="text-yellow-500" />
                  <CardTitle className="text-sm font-bold text-gray-700">AGENT LEADERBOARD</CardTitle>
                </div>
                <Badge variant="outline" className="text-[10px] font-bold">TOP PERFORMERS</Badge>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {leaderboard.slice(0, 6).map((agent, i) => (
                    <motion.div key={agent.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 border border-transparent hover:border-gray-100 hover:bg-white transition-all">
                      <div className="relative">
                        <div className="size-10 rounded-full bg-white border-2 border-white shadow-sm flex items-center justify-center text-blue-700 text-xs font-bold ring-2 ring-blue-50">
                          {agent.name.slice(0, 2).toUpperCase()}
                        </div>
                        {i < 3 && (
                          <div className={`absolute -top-1 -right-1 size-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${i === 0 ? 'bg-yellow-400' : i === 1 ? 'bg-gray-300' : 'bg-amber-500'}`}>
                            {i + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{agent.name}</p>
                        <p className="text-[10px] text-gray-500">{agent.totalLeads} leads · {agent.callsToday} calls today</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-green-600">{agent.conversions} won</p>
                        <p className="text-[10px] text-gray-400">Score: {agent.productivityScore}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="w-full lg:w-80 space-y-6">
          <div className="sticky top-6">
            <LivePulseFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
