'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';
import api from '@/lib/api';
import { KpiCard } from '@/components/dashboard/KpiCard';
import {
  Users2, TrendingUp, Flame, Clock, Trophy,
  MapPin, ChevronRight
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const INK = '#111113';
const ACCENT = '#E04020';
const RULE = '#E5E7EB';
const MUTED = '#5A6470';
const FAINT = '#626B76';
const CANVAS = '#F3F4F6';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { socket, connected } = useSocketStore();
  const [kpis, setKpis] = useState<any>(null);
  const [funnel, setFunnel] = useState<any[]>([]);
  const [sources, setSources] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
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
      setLoading(true);
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
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const townshipProjects = [
    { name: 'Govardhan Greens Township', location: 'NH-19, Mathura Expressway', avail: 34, blocked: 8, booked: 46, sold: 32, price: '₹22.50L', rera: 'UPRERAPRJ984712' },
    { name: 'Vrindavan Heritage Heights', location: 'Near Prem Mandir, Raman Reti', avail: 17, blocked: 4, booked: 35, sold: 24, price: '₹48.00L', rera: 'UPRERAPRJ554109' },
    { name: 'Radha Rani Enclave Phase 2', location: 'Barsana Road, Chhatikara Ring Road', avail: 62, blocked: 12, booked: 54, sold: 32, price: '₹16.80L', rera: 'UPRERAPRJ231908' },
  ];

  const funnelData = funnel.length > 0 ? funnel : [
    { stage: 'New Inquiries', count: 4 },
    { stage: 'Connected', count: 2 },
    { stage: 'Site Visit', count: 1 },
    { stage: 'Negotiation', count: 0 },
  ];
  const maxStageIndex = funnelData.reduce(
    (max, d, i) => (d.count > (funnelData[max]?.count ?? -1) ? i : max),
    funnelData.length > 0 ? 0 : -1,
  );
  const totalSource = sources.reduce((sum, s) => sum + s.total, 0);
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const kpiCards = [
    { title: 'Total Leads', value: kpis?.totalLeads ?? 7, icon: <Users2 size={16} />, sub: <>+{kpis?.leadsToday ?? 0} new today</>, color: 'blue' as const },
    { title: 'Hot Leads', value: kpis?.hotLeads ?? 4, icon: <Flame size={16} />, sub: <>Immediate callback required</>, color: 'red' as const },
    { title: 'Gross Pipeline', value: '₹332L', icon: <TrendingUp size={16} />, sub: <>126 units across 3 projects</>, color: 'green' as const },
    { title: 'Pending Follow-ups', value: kpis?.pendingFollowUps ?? 0, icon: <Clock size={16} />, sub: kpis?.pendingFollowUps ? <>Due now in {kpis?.pendingFollowUps} dispatches</> : <>All dispatches on schedule</>, color: 'blue' as const },
  ];

  return (
    <div className="space-y-6">
      {/* Cockpit header & actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-[#111113] tracking-tight">
            Sales Cockpit
          </h1>
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wide ${connected ? 'bg-[#E7F6EE] text-[#047857]' : 'bg-[#F3F4F6] text-[#5A6470]'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#047857]' : 'bg-[#5A6470]'}`} />
            {connected ? 'Live' : 'Reconnecting'}
          </span>
          <span className="text-[11px] text-[#626B76] font-medium hidden sm:inline">{today}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="btn-frappe-secondary"
            title="Refresh Data"
          >
            <TrendingUp size={12} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            href="/leads"
            className="btn-frappe-primary"
          >
            <Users2 size={12} />
            <span>View Leads</span>
          </Link>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((k) => (
          <KpiCard key={k.title} title={k.title} value={k.value} icon={k.icon} sub={k.sub} color={k.color} />
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Funnel + Townships */}
        <div className="lg:col-span-2 space-y-6">
          {/* Deal flow */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-xs font-bold text-[#111113] uppercase tracking-wider">
                  Deal Flow & Pipeline
                </h3>
                <p className="text-[11px] text-[#5A6470] mt-0.5">Leads across the sales cycle</p>
              </div>
              <Link href="/leads" className="text-xs text-[#111113] hover:text-[#E04020] hover:underline font-medium flex items-center gap-0.5">
                <span>Kanban Board</span>
                <ChevronRight size={12} />
              </Link>
            </div>

            <div className="p-5 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ left: 80, right: 20 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: INK }} width={120} axisLine={false} tickLine={false}
                    tickFormatter={(v) => v.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())} />
                  <Tooltip cursor={{ fill: CANVAS }} contentStyle={{ borderRadius: '8px', border: `1px solid ${RULE}`, fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                    {funnelData.map((_, i) => <Cell key={i} fill={i === maxStageIndex ? ACCENT : INK} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Township inventory */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-xs font-bold text-[#111113] uppercase tracking-wider">
                  Active Township Projects & Inventory
                </h3>
                <p className="text-[11px] text-[#5A6470] mt-0.5">Real-time unit allocation and registry pipeline</p>
              </div>
              <Link href="/inventory" className="text-xs text-[#111113] hover:text-[#E04020] hover:underline font-medium flex items-center gap-0.5">
                <span>Manage Inventory</span>
                <ChevronRight size={12} />
              </Link>
            </div>

            <div className="p-5 space-y-4">
              {townshipProjects.map((project) => {
                const total = project.avail + project.blocked + project.booked + project.sold;
                const bookedPct = Math.round(((project.booked + project.sold) / total) * 100);

                return (
                  <div key={project.name} className="border-b border-[#F3F4F6] last:border-0">
                    <div className="flex items-start justify-between gap-2 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-[#111113]">{project.name}</h4>
                          <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-[#F3F4F6] text-[#5A6470] font-medium">
                            {project.rera}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-[#5A6470] mt-0.5">
                          <MapPin size={11} className="text-[#626B76]" />
                          <span>{project.location}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold font-mono tabular-nums text-[#111113]">From {project.price}</span>
                        <p className="text-[11px] text-[#5A6470]">{bookedPct}% Booked</p>
                      </div>
                    </div>

                    {/* Allocation bar */}
                    <div className="pb-3">
                      <div className="w-full h-1.5 flex rounded-full overflow-hidden">
                        <div style={{ width: `${Math.round((project.avail / total) * 100)}%` }} className="bg-[#E5E7EB]" title={`Available: ${project.avail}`} />
                        <div style={{ width: `${Math.round(((project.booked + project.sold) / total) * 100)}%` }} className="bg-[#E04020]" title={`Booked + Registered: ${project.booked + project.sold}`} />
                        <div style={{ width: `${Math.round((project.blocked / total) * 100)}%` }} className="bg-[#626B76]" title={`Blocked: ${project.blocked}`} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#5A6470] mt-1.5">
                        <span className="text-[#111113] font-semibold">{project.avail} Available</span>
                        <span>{project.blocked} Blocked</span>
                        <span className="text-[#E04020] font-semibold">{project.booked + project.sold} Booked / Registered</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Sources + Leaderboard + Pulse */}
        <div className="space-y-6">
          {/* Lead sources */}
          {sources.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm">
              <div className="px-5 py-3 border-b border-[#E5E7EB]">
                <h3 className="text-xs font-bold text-[#111113] uppercase tracking-wider">
                  Lead Acquisition Sources
                </h3>
              </div>
              <div className="p-5 space-y-0 text-[11px]">
                {sources.slice(0, 4).map((s) => {
                  const pct = totalSource > 0 ? Math.round((s.total / totalSource) * 100) : 0;
                  return (
                    <div key={s.source} className="flex items-center justify-between py-1.5 border-b border-[#F3F4F6] last:border-0">
                      <span className="text-[#5A6470] truncate">{s.source}</span>
                      <span className="flex items-center gap-2 font-mono tabular-nums">
                        <span className="text-[#626B76]">{pct}%</span>
                        <span className="font-semibold text-[#111113] w-8 text-right">{s.total}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Top performers */}
          {leaderboard.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-1.5">
                  <Trophy size={13} className="text-[#E04020]" />
                  <h3 className="text-xs font-bold text-[#111113] uppercase tracking-wider">
                    Top Sales Performers
                  </h3>
                </div>
                <span className="text-[11px] text-[#5A6470]">This Month</span>
              </div>

              <div className="p-5 space-y-0">
                {leaderboard.slice(0, 4).map((agent, i) => (
                  <div key={agent.id} className="flex items-center justify-between py-1.5 border-b border-[#F3F4F6] last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-5 text-[11px] font-mono tabular-nums text-[#626B76]">{String(i + 1).padStart(2, '0')}</span>
                      <p className="text-xs font-semibold text-[#111113] truncate">{agent.name}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs font-bold text-[#E04020] font-mono tabular-nums">{agent.conversions} won</span>
                      <p className="text-[11px] text-[#626B76]">{agent.totalLeads} leads · {agent.callsToday} calls</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live operations pulse */}
          <div className="bg-white border border-[#E5E7EB] rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-5 py-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-[#111113] uppercase tracking-wider">
                  Live Operations Pulse
                </h3>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide ${connected ? 'text-[#047857]' : 'text-[#5A6470]'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-[#047857]' : 'bg-[#5A6470]'}`} />
                {connected ? 'Connected' : 'Reconnecting'}
              </span>
            </div>

            <div className="p-5 space-y-0 text-xs">
              <div className="flex items-start gap-2.5 py-2 border-b border-[#F3F4F6] last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[#111113] mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-[#111113]">Site Visit Scheduled</p>
                  <p className="text-[11px] text-[#5A6470]">Govardhan Greens · Plot #42 (Rajesh Agrawal)</p>
                  <span className="text-[11px] text-[#626B76]">4 mins ago</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 py-2 border-b border-[#F3F4F6] last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E04020] mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-[#111113]">Token Advance Received</p>
                  <p className="text-[11px] text-[#5A6470]">₹2,50,000 via RTGS for Vrindavan Heights</p>
                  <span className="text-[11px] text-[#626B76]">18 mins ago</span>
                </div>
              </div>
              <div className="flex items-start gap-2.5 py-2 border-b border-[#F3F4F6] last:border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-[#111113] mt-1.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-[#111113]">WhatsApp Inflow Processed</p>
                  <p className="text-[11px] text-[#5A6470]">200 sq.yd corner plot inquiry auto-assigned</p>
                  <span className="text-[11px] text-[#626B76]">35 mins ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}