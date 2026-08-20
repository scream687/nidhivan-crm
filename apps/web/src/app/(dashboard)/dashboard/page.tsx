'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';
import api, { toList } from '@/lib/api';
import { timeAgo } from '@/lib/utils';
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
  const [projects, setProjects] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<number | null>(null);
  const [pulse, setPulse] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

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
      setLoadError(false);

      // /leads/kpis, /inventory and /activities are auth-only, so every role can
      // read them. Everything under /reports plus /users/leaderboard is
      // @Roles(ADMIN, MANAGER) and 403s for agents and telecallers — keeping
      // those in a separate request set stops one 403 from blanking the whole
      // cockpit, which is what used to push this page onto placeholder numbers.
      const [kpisRes, projectsRes, pulseRes] = await Promise.all([
        api.get('/leads/kpis'),
        api.get('/inventory'),
        api.get('/activities', { params: { limit: 5 } }),
      ]);
      setKpis(kpisRes.data);
      setProjects(toList(projectsRes.data));
      setPulse(toList(pulseRes.data));

      if (isAdmin) {
        const [funnelRes, lbRes, srcRes, pipeRes] = await Promise.all([
          api.get('/reports/sales-funnel'),
          api.get('/users/leaderboard'),
          api.get('/reports/source-breakdown'),
          api.get('/reports/pipeline-value'),
        ]);
        setFunnel(toList(funnelRes.data).slice(0, 8));
        setLeaderboard(toList(lbRes.data));
        setSources(toList(srcRes.data).filter((s: any) => s.total > 0));
        setPipeline(pipeRes.data?.totalExpectedRevenue ?? 0);
      }
    } catch (e) {
      console.error(e);
      // Surfaced rather than swallowed: a dashboard that silently renders zeros
      // after a failed fetch is indistinguishable from a genuinely empty CRM.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }

  // Unit totals come from the same four status counts the allocation bar draws,
  // rather than Project.totalUnits, so the headline figure can never disagree
  // with the bar directly beneath it.
  const unitsOf = (p: any) =>
    (p.available ?? 0) + (p.blocked ?? 0) + (p.booked ?? 0) + (p.sold ?? 0);
  const totalUnits = projects.reduce((sum, p) => sum + unitsOf(p), 0);

  const lakhs = (v: number) =>
    `₹${(v / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}L`;

  const funnelData = funnel;
  const maxStageIndex = funnelData.reduce(
    (max, d, i) => (d.count > (funnelData[max]?.count ?? -1) ? i : max),
    funnelData.length > 0 ? 0 : -1,
  );
  const totalSource = sources.reduce((sum, s) => sum + s.total, 0);
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  const kpiCards = [
    { title: 'Total Leads', value: kpis?.totalLeads ?? 0, icon: <Users2 size={16} />, sub: <>+{kpis?.leadsToday ?? 0} new today</>, color: 'blue' as const },
    { title: 'Hot Leads', value: kpis?.hotLeads ?? 0, icon: <Flame size={16} />, sub: kpis?.hotLeads ? <>Immediate callback required</> : <>None flagged hot</>, color: 'red' as const },
    // Admin/manager only: /reports/pipeline-value is role-guarded, so for an
    // agent there is no honest number to show here and the card is omitted
    // rather than filled with a placeholder.
    ...(isAdmin
      ? [{
          title: 'Gross Pipeline',
          value: pipeline == null ? '—' : lakhs(pipeline),
          icon: <TrendingUp size={16} />,
          sub: projects.length
            ? <>{totalUnits} units across {projects.length} project{projects.length === 1 ? '' : 's'}</>
            : <>No projects in inventory</>,
          color: 'green' as const,
        }]
      : []),
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

      {loadError && (
        <div role="alert" className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border border-[#F0C2B4] bg-[#FDECE6]">
          <p className="text-xs text-[#C02F12]">
            Could not load live figures. The numbers below may be incomplete or out of date.
          </p>
          <button onClick={() => loadData()} className="text-xs font-semibold text-[#C02F12] hover:underline flex-shrink-0">
            Retry
          </button>
        </div>
      )}

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
              {funnelData.length === 0 ? (
                <EmptyState>
                  {loading ? 'Loading pipeline…' : 'No leads yet — the funnel fills in as leads are added.'}
                </EmptyState>
              ) : (
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
              )}
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
              {projects.length === 0 && (
                <EmptyState>
                  {loading
                    ? 'Loading inventory…'
                    : <>No projects yet. <Link href="/inventory" className="text-[#E04020] hover:underline font-medium">Add one in Inventory</Link>.</>}
                </EmptyState>
              )}
              {projects.map((project) => {
                const avail = project.available ?? 0;
                const blocked = project.blocked ?? 0;
                const booked = project.booked ?? 0;
                const sold = project.sold ?? 0;
                const total = unitsOf(project);
                // A project can legitimately exist with no units loaded yet;
                // without this guard every percentage below becomes NaN.
                const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
                const bookedPct = pct(booked + sold);

                return (
                  <div key={project.id} className="border-b border-[#F3F4F6] last:border-0">
                    <div className="flex items-start justify-between gap-2 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-[#111113]">{project.name}</h4>
                          {project.reraNumber && (
                            <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-[#F3F4F6] text-[#5A6470] font-medium">
                              {project.reraNumber}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-[#5A6470] mt-0.5">
                          <MapPin size={11} className="text-[#626B76]" />
                          <span>{project.location}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        {project.priceMin != null && (
                          <span className="text-xs font-bold font-mono tabular-nums text-[#111113]">
                            From {lakhs(Number(project.priceMin))}
                          </span>
                        )}
                        <p className="text-[11px] text-[#5A6470]">
                          {total > 0 ? `${bookedPct}% Booked` : 'No units loaded'}
                        </p>
                      </div>
                    </div>

                    {/* Allocation bar */}
                    <div className="pb-3">
                      <div className="w-full h-1.5 flex rounded-full overflow-hidden bg-[#F3F4F6]">
                        <div style={{ width: `${pct(avail)}%` }} className="bg-[#E5E7EB]" title={`Available: ${avail}`} />
                        <div style={{ width: `${pct(booked + sold)}%` }} className="bg-[#E04020]" title={`Booked + Registered: ${booked + sold}`} />
                        <div style={{ width: `${pct(blocked)}%` }} className="bg-[#626B76]" title={`Blocked: ${blocked}`} />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-[#5A6470] mt-1.5">
                        <span className="text-[#111113] font-semibold">{avail} Available</span>
                        <span>{blocked} Blocked</span>
                        <span className="text-[#E04020] font-semibold">{booked + sold} Booked / Registered</span>
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
              {pulse.length === 0 ? (
                <EmptyState>
                  {loading ? 'Loading activity…' : 'No activity recorded yet.'}
                </EmptyState>
              ) : pulse.map((a, i) => (
                <div key={a.id} className="flex items-start gap-2.5 py-2 border-b border-[#F3F4F6] last:border-0">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${i === 0 ? 'bg-[#E04020]' : 'bg-[#111113]'}`} />
                  <div className="min-w-0">
                    <p className="font-medium text-[#111113]">{a.title}</p>
                    {(a.description || a.lead?.name) && (
                      <p className="text-[11px] text-[#5A6470] truncate">
                        {a.description || `${a.lead.name}${a.lead.leadNumber ? ` · ${a.lead.leadNumber}` : ''}`}
                      </p>
                    )}
                    <span className="text-[11px] text-[#626B76]">
                      {timeAgo(a.createdAt)}{a.user?.name ? ` · ${a.user.name}` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full flex items-center justify-center py-6">
      <p className="text-[11px] text-[#5A6470] text-center">{children}</p>
    </div>
  );
}
