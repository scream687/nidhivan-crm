'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Plus, Play, Pause, Settings, Zap, Clock, Users, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const WORKFLOWS = [
  {
    id: '1', name: 'Auto-Assign New Leads', status: 'ACTIVE', trigger: 'Lead Created',
    runs: 1842, success: 1831, failed: 11, lastRun: '30 sec ago',
    actions: ['Check duplicate', 'Round-robin assign', 'Send WhatsApp welcome', 'Create follow-up task'],
  },
  {
    id: '2', name: 'Hot Lead Alert', status: 'ACTIVE', trigger: 'Lead marked HOT',
    runs: 214, success: 214, failed: 0, lastRun: '2h ago',
    actions: ['Notify manager (Socket.io)', 'Send SMS alert to agent', 'Create urgent task'],
  },
  {
    id: '3', name: 'SLA Breach Warning', status: 'ACTIVE', trigger: 'SLA response time > 30 min',
    runs: 87, success: 87, failed: 0, lastRun: '4h ago',
    actions: ['Flag lead as SLA_BREACHED', 'Notify admin', 'Escalate to manager'],
  },
  {
    id: '4', name: 'Site Visit Follow-up', status: 'ACTIVE', trigger: 'Stage: SITE_VISIT_COMPLETED',
    runs: 156, success: 153, failed: 3, lastRun: '1 day ago',
    actions: ['Wait 2 hours', 'Send WhatsApp feedback request', 'Create negotiation task'],
  },
  {
    id: '5', name: 'Monthly Report Generator', status: 'PAUSED', trigger: '1st of every month, 9 AM',
    runs: 6, success: 6, failed: 0, lastRun: '1 month ago',
    actions: ['Generate PDF report', 'Email to admin', 'Post summary to WhatsApp group'],
  },
];

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState(WORKFLOWS);
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => {
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, status: w.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' } : w));
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={20} className="text-indigo-600" />
          <h1 className="text-lg font-bold text-gray-900">Workflows</h1>
          <span className="bg-green-100 text-green-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {workflows.filter(w => w.status === 'ACTIVE').length} active
          </span>
        </div>
        <button className="flex items-center gap-1.5 bg-indigo-600 text-white text-sm px-3.5 py-2 rounded-lg hover:bg-indigo-700 transition font-medium">
          <Plus size={14} /> New Workflow
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Runs', value: workflows.reduce((s, w) => s + w.runs, 0).toLocaleString(), color: 'text-indigo-600 bg-indigo-50' },
          { label: 'Success Rate', value: `${Math.round((workflows.reduce((s, w) => s + w.success, 0) / workflows.reduce((s, w) => s + w.runs, 0)) * 100)}%`, color: 'text-green-600 bg-green-50' },
          { label: 'Failed', value: workflows.reduce((s, w) => s + w.failed, 0), color: 'text-red-600 bg-red-50' },
        ].map(({ label, value, color }) => (
          <div key={label} className={cn('rounded-xl p-4', color)}>
            <p className="text-xs font-medium mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Workflow list */}
      <div className="space-y-3">
        {workflows.map((wf, i) => (
          <motion.div key={wf.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            className={cn('bg-white rounded-xl border p-5 transition', wf.status === 'ACTIVE' ? 'border-gray-200' : 'border-gray-100 opacity-70')}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{wf.name}</h3>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', wf.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400')}>
                    {wf.status}
                  </span>
                  {wf.failed > 0 && <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-500">{wf.failed} errors</span>}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><Zap size={10} /> {wf.trigger}</span>
                  <span className="flex items-center gap-1"><CheckCircle2 size={10} /> {wf.success}/{wf.runs} success</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> {wf.lastRun}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setExpanded(expanded === wf.id ? null : wf.id)} className="text-xs text-blue-500 hover:underline">
                  {expanded === wf.id ? 'Hide' : 'View actions'}
                </button>
                <button onClick={() => toggle(wf.id)} className={cn('p-1.5 rounded-lg transition', wf.status === 'ACTIVE' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green-50 text-green-600 hover:bg-green-100')}>
                  {wf.status === 'ACTIVE' ? <Pause size={14} /> : <Play size={14} />}
                </button>
                <button className="p-1.5 rounded-lg bg-gray-50 text-gray-400 hover:bg-gray-100">
                  <Settings size={14} />
                </button>
              </div>
            </div>

            {expanded === wf.id && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 border-t border-gray-100 pt-3">
                <div className="flex flex-wrap gap-2">
                  {wf.actions.map((action, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 bg-indigo-50 rounded-lg px-3 py-1.5 text-xs text-indigo-700 font-medium">
                      <span className="w-4 h-4 rounded-full bg-indigo-200 text-indigo-700 flex items-center justify-center text-[9px] font-bold">{idx + 1}</span>
                      {action}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
