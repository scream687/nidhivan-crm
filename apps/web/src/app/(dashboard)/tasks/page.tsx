'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import { CheckSquare, Clock, CheckCircle2, AlertCircle, User, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';

type Filter = 'all' | 'pending' | 'overdue' | 'done';

interface CreateForm {
  title: string;
  description: string;
  dueDate: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  assignedToId: string;
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CreateForm>({
    title: '', description: '', dueDate: '', priority: 'MEDIUM', assignedToId: '',
  });

  useEffect(() => { loadTasks(); }, [filter]);
  useEffect(() => {
    api.get('/users').then(r => setUsers(r.data)).catch(() => {});
  }, []);

  async function loadTasks() {
    setIsLoading(true);
    try {
      const params: Record<string, any> = {};
      if (filter === 'done') params.isCompleted = true;
      if (filter === 'pending' || filter === 'overdue') params.isCompleted = false;
      const { data } = await api.get('/tasks', { params });
      const list: any[] = Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []);
      list.sort((a, b) => {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });
      setTasks(list);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }

  async function completeTask(taskId: string, leadId?: string | null) {
    try {
      if (leadId) {
        await api.patch(`/leads/${leadId}/tasks/${taskId}/complete`);
      } else {
        await api.patch(`/tasks/${taskId}/complete`);
      }
      toast.success('Task completed!');
      loadTasks();
    } catch {
      toast.error('Could not complete task');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.assignedToId) {
      toast.error('Title and assignee are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/tasks', {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        dueDate: form.dueDate || undefined,
        priority: form.priority,
        assignedToId: form.assignedToId,
      });
      toast.success('Task created');
      setShowCreate(false);
      setForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM', assignedToId: '' });
      loadTasks();
    } catch {
      toast.error('Could not create task');
    } finally {
      setSaving(false);
    }
  }

  const now = new Date();
  const filtered = tasks.filter(t => {
    if (filter === 'overdue') return !t.isCompleted && t.dueDate && new Date(t.dueDate) < now;
    return true;
  });
  const overdueCount = tasks.filter(t => !t.isCompleted && t.dueDate && new Date(t.dueDate) < now).length;

  const TABS: { k: Filter; l: string }[] = [
    { k: 'pending', l: 'Pending' },
    { k: 'overdue', l: 'Overdue' },
    { k: 'done', l: 'Completed' },
    { k: 'all', l: 'All' },
  ];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare size={20} className="text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Tasks</h1>
          {overdueCount > 0 && (
            <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {overdueCount} overdue
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition"
        >
          <Plus size={15} />
          New Task
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(({ k, l }) => (
          <button key={k} onClick={() => setFilter(k)}
            className={cn('px-4 py-1.5 text-sm font-medium rounded-lg transition',
              filter === k ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task, i) => {
            const isOverdue = !task.isCompleted && task.dueDate && new Date(task.dueDate) < now;
            const priorityColor = task.priority === 'HIGH'
              ? 'text-red-500'
              : task.priority === 'MEDIUM'
              ? 'text-amber-500'
              : 'text-gray-400';

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={cn(
                  'bg-white rounded-xl border p-4 flex items-start gap-3 transition-shadow hover:shadow-sm',
                  task.isCompleted ? 'border-gray-100 opacity-60' : isOverdue ? 'border-red-200' : 'border-gray-200'
                )}
              >
                <button
                  onClick={() => !task.isCompleted && completeTask(task.id, task.lead?.id)}
                  className="mt-0.5 flex-shrink-0"
                  disabled={task.isCompleted}
                >
                  {task.isCompleted
                    ? <CheckCircle2 size={18} className="text-green-500" />
                    : (
                      <div
                        className={cn('rounded-full border-2', isOverdue ? 'border-red-400' : 'border-gray-300')}
                        style={{ width: 18, height: 18 }}
                      />
                    )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={cn('text-sm font-medium', task.isCompleted ? 'line-through text-gray-400' : 'text-gray-900')}>
                    {task.title}
                  </p>
                  {task.lead && (
                    <a href={`/leads/${task.lead.id}`} className="text-xs text-blue-500 hover:underline mt-0.5 block">
                      {task.lead.name}{task.lead.leadNumber ? ` · ${task.lead.leadNumber}` : ''}
                    </a>
                  )}
                  {task.assignedTo?.name && (
                    <div className="flex items-center gap-1 mt-1">
                      <User size={10} className="text-gray-400" />
                      <span className="text-xs text-gray-400">{task.assignedTo.name}</span>
                    </div>
                  )}
                </div>

                <div className="text-right flex-shrink-0 space-y-1">
                  {task.dueDate && (
                    <div className={cn('flex items-center gap-1 text-xs justify-end', isOverdue ? 'text-red-500' : 'text-gray-400')}>
                      {isOverdue && <AlertCircle size={11} />}
                      <Clock size={11} />
                      {new Date(task.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </div>
                  )}
                  {task.priority && (
                    <span className={cn('text-xs block', priorityColor)}>
                      {task.priority}
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}

          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <CheckSquare size={40} className="mx-auto mb-3 opacity-30" />
              <p>No {filter} tasks.</p>
            </div>
          )}
        </div>
      )}

      {/* Create Task Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-base font-semibold text-gray-900">New Task</h2>
                <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="What needs to be done?"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="Optional details..."
                    rows={2}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
                    <select
                      value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: e.target.value as any }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Assign To *</label>
                  <select
                    value={form.assignedToId}
                    onChange={e => setForm(f => ({ ...f, assignedToId: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select agent...</option>
                    {users.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="flex-1 border border-gray-200 text-gray-600 text-sm font-medium py-2 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg transition"
                  >
                    {saving ? 'Creating...' : 'Create Task'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
