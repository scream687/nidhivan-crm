'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, Plus, ToggleLeft, ToggleRight, Clock, MessageSquare, User, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

const AUTOMATIONS = [
  {
    id: '1', name: 'New Lead Welcome', trigger: 'Lead Created', action: 'Send Template: welcome_message',
    status: true, runs: 1420, lastRun: '2 min ago',
    steps: ['Lead arrives from Facebook', 'Wait 30 seconds', 'Send: "Hello {name}, thanks for your interest..."'],
  },
  {
    id: '2', name: 'Follow-up Day 1', trigger: 'Lead Stage: CONNECTED', action: 'Send Template: followup_d1',
    status: true, runs: 892, lastRun: '1h ago',
    steps: ['Stage changes to CONNECTED', 'Wait 1 day', 'Send: "Hi {name}, following up on..."'],
  },
  {
    id: '3', name: 'Site Visit Confirmation', trigger: 'Stage: SITE_VISIT_SCHEDULED', action: 'Send Template: site_visit_confirm',
    status: true, runs: 214, lastRun: '3h ago',
    steps: ['Stage → SITE_VISIT_SCHEDULED', 'Immediately', 'Send confirmation + location link'],
  },
  {
    id: '4', name: 'Lost Lead Re-engage', trigger: 'Lead Stage: CLOSED_LOST', action: 'Drip: reactivation_30day',
    status: false, runs: 67, lastRun: '2 days ago',
    steps: ['Stage → CLOSED_LOST', 'Wait 30 days', 'Send re-engagement offer'],
  },
];

export default function AutomationPage() {
  const [automations, setAutomations] = useState(AUTOMATIONS);
  const [expanded, setExpanded] = useState<string | null>(null);

  const toggle = (id: string) => {
    setAutomations(prev => prev.map(a => a.id === id ? { ...a, status: !a.status } : a));
  };

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={20} className="text-amber-500" />
          <h1 className="text-lg font-bold text-gray-900">WhatsApp Automation</h1>
          <span className="bg-green-100 text-green-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {automations.filter(a => a.status).length} active
          </span>
        </div>
        <button className="flex items-center gap-1.5 bg-amber-500 text-white text-sm px-3.5 py-2 rounded-lg hover:bg-amber-600 transition font-medium">
          <Plus size={14} /> New Flow
        </button>
      </div>

      <div className="space-y-3">
        {automations.map((auto, i) => (
          <motion.div key={auto.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className={cn('bg-white rounded-xl border p-5 transition', auto.status ? 'border-gray-200' : 'border-gray-100 opacity-70')}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{auto.name}</h3>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', auto.status ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400')}>
                    {auto.status ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><GitBranch size={10} /> {auto.trigger}</span>
                  <span className="flex items-center gap-1"><MessageSquare size={10} /> {auto.action}</span>
                  <span className="flex items-center gap-1"><Clock size={10} /> Last: {auto.lastRun}</span>
                  <span className="flex items-center gap-1"><User size={10} /> {auto.runs} runs</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setExpanded(expanded === auto.id ? null : auto.id)} className="text-xs text-blue-500 hover:underline">
                  {expanded === auto.id ? 'Hide steps' : 'View steps'}
                </button>
                <button onClick={() => toggle(auto.id)}>
                  {auto.status
                    ? <ToggleRight size={24} className="text-green-500" />
                    : <ToggleLeft size={24} className="text-gray-300" />}
                </button>
              </div>
            </div>

            {expanded === auto.id && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="mt-4 border-t border-gray-100 pt-3">
                <div className="space-y-2">
                  {auto.steps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</div>
                      <p className="text-gray-600">{step}</p>
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
