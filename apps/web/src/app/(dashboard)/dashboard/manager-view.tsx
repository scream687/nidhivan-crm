'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { LivePulseFeed } from '@/components/dashboard/LivePulseFeed';
import { AlertsWidget } from '@/components/dashboard/AlertsWidget';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSocketStore } from '@/stores/socketStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Users2, Flame, Clock, TrendingUp, Trophy, MapPin, IndianRupee, CheckSquare, AlertTriangle } from 'lucide-react';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899'];

const METRICS = [
  { key: 'leadsToday', label: 'Leads Today', icon: <TrendingUp size={18} />, color: 'green' as const },
  { key: 'hotLeads', label: 'Hot Leads', icon: <Flame size={18} />, color: 'red' as const },
  { key: 'pendingFollowUps', label: 'Pending Follow-ups', icon: <Clock size={18} />, color: 'orange' as const },
  { key: 'siteVisitsToday', label: 'Site Visits Today', icon: <MapPin size={18} />, color: 'blue' as const },
  { key: 'pipelineValue', label: 'Pipeline Value', icon: <IndianRupee size={18} />, color: 'purple' as const, format: (v: number) => `₹${(v / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L` },
  { key: 'revenueThisMonth', label: 'Revenue This Month', icon: <TrendingUp size={18} />, color: 'green' as const, format: (v: number) => `₹${(v / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L` },
  { key: 'closedThisMonth', label: 'Closed This Month', icon: <CheckSquare size={18} />, color: 'green' as const },
  { key: 'totalLeads', label: 'Total Leads', icon: <Users2 size={18} />, color: 'blue' as const },
];

interface PipelineHealth {
  stuckDeals: number;
  stageAging: { stage: string; label: string; avgDays: number; count: number }[];
  topLostReasons: { reason: string; count: number }[];
  avgDaysPerStage: { stage: string; label: string; avgDays: number }[];
}

export function ManagerView() {
  const { socket } = useSocketStore();
  const [kpis, setKpis] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [pipelineValue, setPipelineValue] = useState<{ stages: any[]; totalExpectedRevenue: number } | null>(null);
  const [pipelineHealth, setPipelineHealth] = useState<PipelineHealth | null>(null);

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
      const [kpisRes, funnelRes, lbRes, srcRes, pvRes, phRes] = await Promise.all([
        api.get('/leads/kpis'),
        api.get('/reports/sales-funnel'),
        api.get('/users/leaderboard'),
        api.get('/reports/source-breakdown'),
        api.get('/reports/pipeline-value'),
        api.get('/leads/pipeline-health'),
      ]);
      setKpis(kpisRes.data);
      setFunnel(funnelRes.data.slice(0, 8));
      setLeaderboard(lbRes.data);
      setSources(srcRes.data.filter((s: any) => s.total > 0));
      setPipelineValue(pvRes.data);
      setPipelineHealth(phRes.data);
    } catch { toast.error('Failed to load dashboard data'); }
  }

  function metricValue(metric: typeof METRICS[number]) {
    const raw = kpis?.[metric.key] ?? '—';
    if (typeof raw === 'number' && metric.format) return metric.format(raw);
    return typeof raw === 'number' ? raw.toLocaleString() : raw;
  }

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {METRICS.map((m, i) => (
              <motion.div key={m.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <KpiCard title={m.label} value={metricValue(m)} icon={m.icon} color={m.color} />
              </motion.div>
            ))}
          </div>

          {pipelineHealth && (pipelineHealth.stuckDeals > 0 || pipelineHealth.topLostReasons.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pipelineHealth.stuckDeals > 0 && (
                <Card className="shadow-sm border-gray-100">
                  <CardHeader className="border-b border-gray-50 bg-gray-50/30 pb-3">
                    <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-amber-500" /> STUCK DEALS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <p className="text-3xl font-bold text-amber-600">{pipelineHealth.stuckDeals}</p>
                    <p className="text-xs text-gray-500 mt-1">Leads with no stage change in 14+ days</p>
                  </CardContent>
                </Card>
              )}
              {pipelineHealth.stageAging.length > 0 && (
                <Card className="shadow-sm border-gray-100 md:col-span-2">
                  <CardHeader className="border-b border-gray-50 bg-gray-50/30 pb-3">
                    <CardTitle className="text-sm font-bold text-gray-700">STAGE AGING</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2">
                    {pipelineHealth.stageAging.slice(0, 5).map((s) => (
                      <div key={s.stage} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 font-medium truncate max-w-[180px]">{s.label}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-gray-400">{s.count} leads</span>
                          <span className={`font-bold ${s.avgDays > 14 ? 'text-red-500' : s.avgDays > 7 ? 'text-amber-500' : 'text-gray-700'}`}>
                            {s.avgDays}d avg
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              {pipelineHealth.topLostReasons.length > 0 && (
                <Card className="shadow-sm border-gray-100">
                  <CardHeader className="border-b border-gray-50 bg-gray-50/30 pb-3">
                    <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <AlertTriangle size={14} className="text-red-400" /> LOST REASONS
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-2">
                    {pipelineHealth.topLostReasons.map((r) => (
                      <div key={r.reason} className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 truncate max-w-[200px]">{r.reason}</span>
                        <Badge variant="secondary" className="text-[10px]">{r.count}</Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

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
                      tickFormatter={(v) => v.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                      {funnel.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {sources.length > 0 && (
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

          {pipelineValue && pipelineValue.stages.length > 0 && (
            <Card className="shadow-sm border-gray-100 overflow-hidden">
              <CardHeader className="border-b border-gray-50 bg-gray-50/30">
                <CardTitle className="text-sm font-bold text-gray-700 flex items-center justify-between">
                  <span>REVENUE PIPELINE</span>
                  <span className="text-blue-600 text-base font-bold">
                    ₹{(pipelineValue.totalExpectedRevenue).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={Math.max(180, pipelineValue.stages.length * 40)}>
                  <BarChart data={pipelineValue.stages} layout="vertical" margin={{ left: 100 }}>
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 10 }} width={130} />
                    <Tooltip cursor={{ fill: 'transparent' }}
                      formatter={(v: number) => [`₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, 'Expected']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="expectedRevenue" radius={[0, 4, 4, 0]} barSize={18}>
                      {pipelineValue.stages.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.8} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {leaderboard.length > 0 && (
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
                  {leaderboard.slice(0, 6).map((agent: any, i: number) => (
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
          <div className="sticky top-6 space-y-6">
            <AlertsWidget />
            <LivePulseFeed />
          </div>
        </div>
      </div>
    </div>
  );
}
