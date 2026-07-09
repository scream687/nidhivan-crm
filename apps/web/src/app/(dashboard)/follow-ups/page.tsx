'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, timeAgo } from '@/lib/utils';
import { CalendarClock, RefreshCw, AlertTriangle, CheckCircle, Phone, MapPin, MessageSquare, Mail, MessageCircle, Clock, ChevronDown, ChevronUp, ArrowUpRight } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { FollowUpForm } from '@/components/follow-up/FollowUpForm';
import { EscalationPanel } from '@/components/follow-up/EscalationPanel';
import { TaskList } from '@/components/follow-up/TaskList';

type Tab = 'today' | 'week' | 'overdue' | 'all';

const TABS: { k: Tab; l: string }[] = [
  { k: 'today', l: "Today" },
  { k: 'week', l: "This Week" },
  { k: 'overdue', l: "Overdue" },
  { k: 'all', l: "All" },
];

const TYPE_COLORS: Record<string, string> = {
  CALL: 'bg-blue-100 text-blue-700',
  VISIT: 'bg-purple-100 text-purple-700',
  WHATSAPP: 'bg-green-100 text-green-700',
  EMAIL: 'bg-amber-100 text-amber-700',
  SMS: 'bg-gray-100 text-gray-600',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  CALL: <Phone size={12} />,
  VISIT: <MapPin size={12} />,
  WHATSAPP: <MessageSquare size={12} />,
  EMAIL: <Mail size={12} />,
  SMS: <MessageCircle size={12} />,
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'bg-red-50 text-red-600 border-red-200',
  MEDIUM: 'bg-amber-50 text-amber-600 border-amber-200',
  LOW: 'bg-green-50 text-green-600 border-green-200',
};

function daysOverdue(dueDate: string) {
  const diff = Date.now() - new Date(dueDate).getTime();
  return Math.floor(diff / 86_400_000);
}

export default function FollowUpsPage() {
  const [tab, setTab] = useState<Tab>('today');
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [showEscalations, setShowEscalations] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      let data: any[] = [];

      if (tab === 'today') {
        const { data: d } = await api.get('/follow-ups/pending');
        data = Array.isArray(d) ? d : [];
      } else if (tab === 'overdue') {
        const { data: d } = await api.get('/follow-ups/overdue');
        data = Array.isArray(d) ? d : [];
      } else if (tab === 'week') {
        // Get this week's pending — fetch 7 days
        const promises = [];
        const today = new Date();
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          const dateStr = date.toISOString().split('T')[0];
          promises.push(
            api.get('/follow-ups/pending', { params: { date: dateStr } })
              .then(r => r.data)
              .catch(() => [])
          );
        }
        const results = await Promise.all(promises);
        data = results.flat();
      } else {
        // All — fetch tasks with followupType set
        const { data: d } = await api.get('/tasks', { params: { per_page: 200 } });
        const list = Array.isArray(d.data) ? d.data : (Array.isArray(d) ? d : []);
        data = list.filter((t: any) => t.followupType != null);
      }

      // Deduplicate by ID
      const seen = new Set<string>();
      data = data.filter((t: any) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      });

      // Sort by due date
      data.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

      setTasks(data);
    } catch {
      toast.error('Failed to load follow-ups');
    } finally {
      setIsLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function handleRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    toast.success('Refreshed');
  }

  async function markDone(taskId: string, leadId?: string | null) {
    try {
      if (leadId) {
        await api.patch(`/leads/${leadId}/tasks/${taskId}/complete`);
      } else {
        await api.post(`/follow-ups/${taskId}/mark-done`);
      }
      toast.success('Marked as done');
      setTasks(prev => prev.filter(t => t.id !== taskId));
    } catch {
      toast.error('Could not complete');
    }
  }

  async function escalate(taskId: string) {
    try {
      await api.post(`/follow-ups/${taskId}/escalate`);
      toast.success('Escalated');
      load();
    } catch {
      toast.error('Could not escalate');
    }
  }

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-IN');

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalendarClock size={20} className="text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Follow-ups</h1>
          {tasks.length > 0 && tab === 'today' && (
            <span className="bg-blue-100 text-blue-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {tasks.length} today
            </span>
          )}
          {tasks.length > 0 && tab === 'overdue' && (
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {tasks.length} overdue
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEscalations(v => !v)}
            className={cn(
              'flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border transition',
              showEscalations
                ? 'bg-red-50 border-red-200 text-red-600'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            <AlertTriangle size={14} />
            Escalations
          </button>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
          >
            + New Follow-up
          </button>
        </div>
      </div>

      {/* Escalations panel */}
      <AnimatePresence>
        {showEscalations && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={15} className="text-red-500" />
                <h3 className="text-sm font-semibold text-red-700">Escalations</h3>
              </div>
              <EscalationPanel />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(({ k, l }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              'px-4 py-1.5 text-sm font-medium rounded-lg transition',
              tab === k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        /* Empty state */
        <div className="text-center py-16">
          <div className="text-5xl mb-3">🎉</div>
          <p className="text-base font-medium text-gray-700">All caught up!</p>
          <p className="text-sm text-gray-400 mt-1">
            {tab === 'overdue' ? 'No overdue follow-ups.' : 'No follow-ups scheduled.'}
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
          >
            + Schedule Follow-up
          </button>
        </div>
      ) : tab === 'overdue' ? (
        /* Overdue view — red left border cards */
        <div className="space-y-2">
          {tasks.map((task, i) => {
            const overdue = daysOverdue(task.dueDate);
            const isExpanded = expandedCard === task.id;
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className="bg-white rounded-xl border border-red-200 border-l-4 border-l-red-500 overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{task.title}</span>
                        {task.followupType && (
                          <span className={cn('flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium', TYPE_COLORS[task.followupType] || 'bg-gray-100')}>
                            {TYPE_ICONS[task.followupType]}{task.followupType}
                          </span>
                        )}
                      </div>
                      {task.lead && (
                        <a href={`/leads/${task.lead.id}`} className="text-xs text-blue-500 hover:underline mt-0.5 block">
                          {task.lead.name}{task.lead.phone ? ` · ${task.lead.phone}` : ''}
                        </a>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium text-red-500 flex items-center gap-0.5">
                          <AlertTriangle size={11} />
                          {overdue}d overdue
                        </span>
                        {task.assignedTo && (
                          <span className="text-xs text-gray-400">· {task.assignedTo.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => markDone(task.id, task.lead?.id)}
                        className="flex items-center gap-1 text-xs text-green-600 font-medium border border-green-200 rounded-lg px-2 py-1 hover:bg-green-50 transition"
                      >
                        <CheckCircle size={11} />
                        Mark Done
                      </button>
                      <button
                        onClick={() => escalate(task.id)}
                        className="flex items-center gap-1 text-xs text-red-600 font-medium border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 transition"
                      >
                        <ArrowUpRight size={11} />
                        Escalate
                      </button>
                      <button onClick={() => setExpandedCard(isExpanded ? null : task.id)} className="text-gray-300 hover:text-gray-500">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                      {task.description && <p>{task.description}</p>}
                      {task.dueDate && <p>Due: {new Date(task.dueDate).toLocaleString('en-IN')}</p>}
                      {task.reminderNote && <p className="text-amber-600">Reminder: {task.reminderNote}</p>}
                      {task.lead?.phone && <p>Phone: {task.lead.phone}</p>}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* Today, Week, All — grouped cards */
        <div className="space-y-2">
          {tasks.map((task, i) => {
            const isExpanded = expandedCard === task.id;
            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className={cn(
                  'bg-white rounded-xl border overflow-hidden',
                  task.isCompleted ? 'border-gray-100 opacity-60' : 'border-gray-200'
                )}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-sm font-semibold', task.isCompleted ? 'line-through text-gray-400' : 'text-gray-900')}>
                          {task.title}
                        </span>
                        {task.followupType && (
                          <span className={cn('flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium', TYPE_COLORS[task.followupType])}>
                            {TYPE_ICONS[task.followupType]}{task.followupType}
                          </span>
                        )}
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium border', PRIORITY_COLORS[task.priority] || 'border-gray-200 text-gray-500')}>
                          {task.priority}
                        </span>
                      </div>
                      {task.lead && (
                        <a href={`/leads/${task.lead.id}`} className="text-xs text-blue-500 hover:underline mt-0.5 block">
                          {task.lead.name}{task.lead.phone ? ` · ${task.lead.phone}` : ''}
                        </a>
                      )}
                      {task.lead?.projectInterest && (
                        <p className="text-xs text-gray-400 mt-0.5">{task.lead.projectInterest}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                        {task.dueDate && (
                          <span className="flex items-center gap-0.5">
                            <Clock size={10} />
                            {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {task.assignedTo && (
                          <span>· {task.assignedTo.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      {!task.isCompleted && (
                        <>
                          <button
                            onClick={() => markDone(task.id, task.lead?.id)}
                            className="flex items-center gap-1 text-xs text-green-600 font-medium border border-green-200 rounded-lg px-2 py-1 hover:bg-green-50 transition"
                          >
                            <CheckCircle size={11} />
                            Done
                          </button>
                          <button
                            onClick={() => escalate(task.id)}
                            className="flex items-center gap-1 text-xs text-amber-600 font-medium border border-amber-200 rounded-lg px-2 py-1 hover:bg-amber-50 transition"
                        >
                            <ArrowUpRight size={11} />
                            Escalate
                          </button>
                        </>
                      )}
                      <button onClick={() => setExpandedCard(isExpanded ? null : task.id)} className="text-gray-300 hover:text-gray-500 ml-1">
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                      {task.description && <p>{task.description}</p>}
                      {task.reminderNote && <p className="text-amber-600">Reminder note: {task.reminderNote}</p>}
                      {task.lead?.phone && <p>Phone: {task.lead.phone}</p>}
                      {task.createdAt && <p>Created: {timeAgo(task.createdAt)}</p>}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Follow-up Modal */}
      {showForm && (
        <FollowUpForm
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); load(); }}
        />
      )}
    </div>
  );
}
