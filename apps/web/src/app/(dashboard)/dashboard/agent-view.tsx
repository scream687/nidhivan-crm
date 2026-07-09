'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useAuthStore } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Phone, CalendarClock, CheckSquare, MapPin, Flame, TrendingUp, Clock } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function AgentView() {
  const { user } = useAuthStore();
  const { socket } = useSocketStore();
  const [kpis, setKpis] = useState<any>(null);
  const [myTasks, setMyTasks] = useState<any[]>([]);
  const [myVisits, setMyVisits] = useState<any[]>([]);

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
      const [kpisRes, tasksRes, visitsRes] = await Promise.all([
        api.get('/leads/kpis'),
        api.get('/tasks?isCompleted=false&limit=5'),
        api.get('/site-visits?upcoming=true&limit=5'),
      ]);
      setKpis(kpisRes.data);
      setMyTasks(Array.isArray(tasksRes.data) ? tasksRes.data : tasksRes.data?.tasks ?? []);
      setMyVisits(Array.isArray(visitsRes.data) ? visitsRes.data : visitsRes.data?.visits ?? []);
    } catch { toast.error('Failed to load dashboard data'); }
  }

  return (
    <div className="p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Here's your day ahead</p>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mt-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <KpiCard title="Calls Today" value={kpis?.leadsToday ?? '—'} icon={<Phone size={18} />} color="blue" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <KpiCard title="Follow-ups Due" value={kpis?.pendingFollowUps ?? '—'} icon={<Clock size={18} />} color="orange" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <KpiCard title="Today's Visits" value={kpis?.siteVisitsToday ?? '—'} icon={<MapPin size={18} />} color="green" />
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <KpiCard title="Hot Leads" value={kpis?.hotLeads ?? '—'} icon={<Flame size={18} />} color="red" />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-gray-100">
            <CardHeader className="border-b border-gray-50 bg-gray-50/30 pb-3">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <CheckSquare size={14} className="text-blue-500" /> MY OPEN TASKS
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {myTasks.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No pending tasks</p>
              ) : (
                <ul className="space-y-2">
                  {myTasks.map((t: any) => (
                    <li key={t.id} className="flex items-start gap-2 text-sm">
                      <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${t.priority === 'HIGH' ? 'bg-red-400' : t.priority === 'MEDIUM' ? 'bg-yellow-400' : 'bg-gray-300'}`} />
                      <div>
                        <p className="text-gray-800 font-medium leading-tight">{t.title}</p>
                        {t.dueDate && <p className="text-xs text-gray-400 mt-0.5">{new Date(t.dueDate).toLocaleDateString()}</p>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-100">
            <CardHeader className="border-b border-gray-50 bg-gray-50/30 pb-3">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <MapPin size={14} className="text-green-500" /> UPCOMING SITE VISITS
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3">
              {myVisits.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No upcoming visits</p>
              ) : (
                <ul className="space-y-2">
                  {myVisits.map((v: any) => (
                    <li key={v.id} className="flex items-start gap-2 text-sm">
                      <CalendarClock size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-gray-800 font-medium leading-tight">{v.project}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(v.visitDate).toLocaleDateString()}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-gray-100">
            <CardHeader className="border-b border-gray-50 bg-gray-50/30 pb-3">
              <CardTitle className="text-sm font-bold text-gray-700">QUICK ACTIONS</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              <Link href="/leads">
                <Button variant="default" size="sm" className="w-full justify-start text-xs bg-blue-500 hover:bg-blue-600">
                  <Phone className="size-3.5 mr-2" /> Call a Lead
                </Button>
              </Link>
              <Link href="/leads">
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  <CalendarClock className="size-3.5 mr-2" /> Schedule Visit
                </Button>
              </Link>
              <Link href="/leads">
                <Button variant="outline" size="sm" className="w-full justify-start text-xs">
                  <svg className="size-3.5 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                  WhatsApp Lead
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-gray-100">
            <CardHeader className="border-b border-gray-50 bg-gray-50/30 pb-3">
              <CardTitle className="text-sm font-bold text-gray-700">MY PERFORMANCE</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Leads Assigned</span>
                <span className="font-bold text-gray-800">{kpis?.totalLeads ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Today's Activity</span>
                <span className="font-bold text-gray-800">{kpis?.leadsToday ?? 0} leads</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Follow-ups Pending</span>
                <span className="font-bold text-amber-600">{kpis?.pendingFollowUps ?? 0}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Hot Leads</span>
                <span className={`font-bold ${(kpis?.hotLeads ?? 0) > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                  {kpis?.hotLeads ?? 0}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
