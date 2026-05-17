'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { GitBranch, Plus, Play, Pause, Trash2, Loader2, Zap, CheckCircle2, Clock } from 'lucide-react';

const TRIGGERS = [
  { value: 'LEAD_CREATED', label: 'Lead Created' },
  { value: 'STAGE_CHANGED', label: 'Stage Changed' },
  { value: 'MARKED_HOT', label: 'Lead Marked Hot' },
  { value: 'TASK_DUE', label: 'Task Due' },
];
const STAGES = ['NEW','CONTACTED','INTERESTED','SITE_VISIT_SCHEDULED','SITE_VISIT_DONE','NEGOTIATION','CLOSED_WON','CLOSED_LOST'];
const ACTION_TYPES = [
  { value: 'SEND_NOTIFICATION', label: 'Send Notification' },
  { value: 'CREATE_TASK', label: 'Create Task' },
  { value: 'CHANGE_STAGE', label: 'Change Stage' },
];

function NewWorkflowModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [trigger, setTrigger] = useState('LEAD_CREATED');
  const [triggerStage, setTriggerStage] = useState('');
  const [actions, setActions] = useState<{ type: string; config: Record<string, any> }[]>([{ type: 'SEND_NOTIFICATION', config: { title: '', body: '' } }]);
  const [saving, setSaving] = useState(false);

  function addAction() { setActions(a => [...a, { type: 'SEND_NOTIFICATION', config: { title: '', body: '' } }]); }
  function setActionType(i: number, type: string) {
    setActions(a => a.map((ac, idx) => idx === i ? { type, config: {} as Record<string, any> } : ac));
  }
  function setActionConfig(i: number, key: string, val: string) {
    setActions(a => a.map((ac, idx) => idx === i ? { ...ac, config: { ...ac.config, [key]: val } } : ac));
  }

  async function save() {
    if (!name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      const triggerConfig = trigger === 'STAGE_CHANGED' && triggerStage ? { stage: triggerStage } : undefined;
      await api.post('/workflows', { name, trigger, triggerConfig, actions });
      toast.success('Workflow created');
      onSaved(); onClose();
    } catch { toast.error('Failed to create'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">New Workflow</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Auto-assign new leads"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Trigger</label>
            <select value={trigger} onChange={e => setTrigger(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {TRIGGERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {trigger === 'STAGE_CHANGED' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">When stage becomes</label>
              <select value={triggerStage} onChange={e => setTriggerStage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="">— Any stage —</option>
                {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Actions</label>
              <button onClick={addAction} className="text-xs text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>
            <div className="space-y-3">
              {actions.map((action, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <select value={action.type} onChange={e => setActionType(i, e.target.value)}
                    className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500">
                    {ACTION_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                  </select>

                  {action.type === 'SEND_NOTIFICATION' && (
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Title" value={(action.config as any).title ?? ''}
                        onChange={e => setActionConfig(i, 'title', e.target.value)}
                        className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      <input placeholder="Body ({{name}})" value={(action.config as any).body ?? ''}
                        onChange={e => setActionConfig(i, 'body', e.target.value)}
                        className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                  )}
                  {action.type === 'CREATE_TASK' && (
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Task title ({{name}})" value={(action.config as any).title ?? ''}
                        onChange={e => setActionConfig(i, 'title', e.target.value)}
                        className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                      <input type="number" placeholder="Due in X days" value={(action.config as any).dueDays ?? ''}
                        onChange={e => setActionConfig(i, 'dueDays', e.target.value)}
                        className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                    </div>
                  )}
                  {action.type === 'CHANGE_STAGE' && (
                    <select value={(action.config as any).stage ?? ''} onChange={e => setActionConfig(i, 'stage', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500">
                      <option value="">— Select stage —</option>
                      {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  async function load() {
    try { const { data } = await api.get('/workflows'); setWorkflows(data); }
    finally { setLoading(false); }
  }

  async function toggle(id: string, isActive: boolean) {
    await api.patch(`/workflows/${id}`, { isActive: !isActive });
    load();
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete workflow "${name}"?`)) return;
    await api.delete(`/workflows/${id}`);
    toast.success('Deleted'); load();
  }

  useEffect(() => { load(); }, []);

  const triggerLabel = (t: string) => TRIGGERS.find(x => x.value === t)?.label ?? t;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GitBranch className="w-6 h-6 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          {workflows.length > 0 && (
            <span className="bg-green-100 text-green-600 text-xs font-medium px-2 py-0.5 rounded-full">
              {workflows.filter(w => w.isActive).length} active
            </span>
          )}
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus className="w-4 h-4" /> New Workflow
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : workflows.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No workflows yet</p>
          <p className="text-sm mt-1">Automate actions when leads are created, stages change, or tasks are due</p>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((wf, i) => (
            <motion.div key={wf.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`bg-white rounded-xl border p-5 transition ${wf.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{wf.name}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${wf.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                      {wf.isActive ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Zap className="w-3 h-3" /> {triggerLabel(wf.trigger)}{wf.triggerConfig?.stage ? ` → ${wf.triggerConfig.stage.replace(/_/g,' ')}` : ''}</span>
                    <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {wf.runCount} runs</span>
                    {wf.lastRunAt && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(wf.lastRunAt).toLocaleDateString()}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setExpanded(expanded === wf.id ? null : wf.id)} className="text-xs text-blue-500 hover:underline">
                    {expanded === wf.id ? 'Hide' : 'Actions'}
                  </button>
                  <button onClick={() => toggle(wf.id, wf.isActive)}
                    className={`p-1.5 rounded-lg transition ${wf.isActive ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                    {wf.isActive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                  <button onClick={() => remove(wf.id, wf.name)} className="p-1.5 text-gray-400 hover:text-red-500 transition">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {expanded === wf.id && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                  {(wf.actions as any[]).map((action: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-indigo-50 rounded-lg px-3 py-1.5 text-xs text-indigo-700 font-medium">
                      <span className="w-4 h-4 rounded-full bg-indigo-200 flex items-center justify-center text-[9px] font-bold">{idx + 1}</span>
                      {ACTION_TYPES.find(a => a.value === action.type)?.label ?? action.type}
                      {action.config?.title ? `: ${action.config.title}` : ''}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {showModal && <NewWorkflowModal onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  );
}
