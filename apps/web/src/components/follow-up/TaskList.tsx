'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  followupType?: string | null;
  dueDate?: string | null;
  priority: string;
  isCompleted: boolean;
  assignedTo?: { id: string; name: string } | null;
  lead?: { id: string; name: string; phone?: string } | null;
  description?: string | null;
  reminderNote?: string | null;
  escalationLevel?: number;
}

interface Props {
  tasks: Task[];
  onRefresh: () => void;
  compact?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  CALL: 'bg-blue-100 text-blue-700',
  VISIT: 'bg-purple-100 text-purple-700',
  WHATSAPP: 'bg-green-100 text-green-700',
  EMAIL: 'bg-amber-100 text-amber-700',
  SMS: 'bg-gray-100 text-gray-600',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: 'text-red-500',
  MEDIUM: 'text-amber-500',
  LOW: 'text-gray-400',
};

export function TaskList({ tasks, onRefresh, compact }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = tasks.filter(t => {
    if (typeFilter !== 'all' && t.followupType !== typeFilter) return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      t.title.toLowerCase().includes(q) ||
      t.lead?.name?.toLowerCase().includes(q) ||
      t.assignedTo?.name?.toLowerCase().includes(q)
    );
  });

  async function toggleDone(task: Task) {
    try {
      if (task.lead?.id) {
        await api.patch(`/leads/${task.lead.id}/tasks/${task.id}/complete`);
      } else {
        await api.post(`/follow-ups/${task.id}/mark-done`);
      }
      toast.success('Task completed');
      onRefresh();
    } catch {
      toast.error('Could not complete task');
    }
  }

  const types = ['all', ...new Set(tasks.map(t => t.followupType).filter(Boolean))] as string[];

  return (
    <div className="space-y-3">
      {/* Search + filter */}
      {!compact && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, lead, or agent..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Filter size={13} />
            {types.map(t => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={cn(
                  'px-2 py-1 rounded-lg transition',
                  typeFilter === t ? 'bg-blue-50 text-blue-600 font-medium' : 'hover:text-gray-700'
                )}
              >
                {t === 'all' ? 'All' : t}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* List */}
      <div className="space-y-1">
        {filtered.map((task, i) => {
          const isExpanded = expandedId === task.id;
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={cn(
                'bg-white border rounded-xl transition',
                task.isCompleted ? 'border-gray-100 opacity-60' : 'border-gray-200',
                isExpanded && 'ring-1 ring-blue-200'
              )}
            >
              <div className="flex items-start gap-3 p-3">
                <button
                  onClick={() => !task.isCompleted && toggleDone(task)}
                  className="mt-0.5 flex-shrink-0"
                  disabled={task.isCompleted}
                >
                  {task.isCompleted
                    ? <CheckCircle2 size={16} className="text-green-500" />
                    : <Circle size={16} className="text-gray-300 hover:text-blue-400 transition" />
                  }
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn('text-sm font-medium', task.isCompleted ? 'line-through text-gray-400' : 'text-gray-900')}>
                      {task.title}
                    </span>
                    {task.followupType && (
                      <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', TYPE_COLORS[task.followupType] || 'bg-gray-100 text-gray-500')}>
                        {task.followupType}
                      </span>
                    )}
                    <span className={cn('text-[10px] font-medium', PRIORITY_COLORS[task.priority] || 'text-gray-400')}>
                      {task.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5 flex-wrap">
                    {task.lead && (
                      <a href={`/leads/${task.lead.id}`} className="text-blue-500 hover:underline">
                        {task.lead.name}
                      </a>
                    )}
                    {task.assignedTo && (
                      <span>{task.assignedTo.name}</span>
                    )}
                    {task.dueDate && (
                      <span>
                        Due: {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setExpandedId(isExpanded ? null : task.id)}
                  className="text-gray-300 hover:text-gray-500 flex-shrink-0"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-0 border-t border-gray-50 mt-2 space-y-1.5">
                  {task.description && (
                    <p className="text-xs text-gray-600">{task.description}</p>
                  )}
                  {task.reminderNote && (
                    <p className="text-xs text-amber-600">Reminder: {task.reminderNote}</p>
                  )}
                  {task.lead?.phone && (
                    <p className="text-xs text-gray-400">Phone: {task.lead.phone}</p>
                  )}
                  {task.escalationLevel && task.escalationLevel > 0 && (
                    <p className="text-xs text-red-500">Escalation Level: {task.escalationLevel}</p>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Search size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No tasks match your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
