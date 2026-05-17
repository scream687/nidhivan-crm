'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, Plus, MessageSquare, GitBranch, ChevronRight, Play, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const FLOWS = [
  { id: '1', name: 'Lead Qualification Bot', status: 'ACTIVE', sessions: 312, completions: 198, nodes: 8, lastEdited: '3 days ago' },
  { id: '2', name: 'Brochure Request Handler', status: 'ACTIVE', sessions: 156, completions: 143, nodes: 5, lastEdited: '1 week ago' },
  { id: '3', name: 'Site Visit Scheduler', status: 'DRAFT', sessions: 0, completions: 0, nodes: 11, lastEdited: 'Today' },
];

const DEMO_FLOW = [
  { id: 'start', type: 'trigger', label: 'Incoming Message', color: 'bg-green-500' },
  { id: 'greet', type: 'message', label: 'Send greeting + menu', color: 'bg-blue-500' },
  { id: 'cond', type: 'condition', label: 'User selects option', color: 'bg-amber-500' },
  { id: 'info', type: 'message', label: 'Send project info', color: 'bg-blue-500' },
  { id: 'capture', type: 'action', label: 'Capture lead to CRM', color: 'bg-purple-500' },
  { id: 'assign', type: 'action', label: 'Assign to agent', color: 'bg-purple-500' },
];

export default function ChatbotPage() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Chatbot Flows</h1>
        </div>
        <button className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3.5 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
          <Plus size={14} /> New Flow
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Flow list */}
        <div className="space-y-3">
          {FLOWS.map((flow, i) => (
            <motion.div key={flow.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
              onClick={() => setSelected(flow.id)}
              className={cn('bg-white rounded-xl border p-4 cursor-pointer transition-shadow hover:shadow-md', selected === flow.id ? 'border-blue-400 shadow-md' : 'border-gray-200')}>
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">{flow.name}</h3>
                <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', flow.status === 'ACTIVE' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500')}>
                  {flow.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                <span>{flow.sessions} sessions</span>
                <span>{flow.nodes} nodes</span>
                <span>{flow.completions} completions</span>
                <span>{flow.lastEdited}</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg hover:bg-green-100">
                  <Play size={10} /> Run
                </button>
                <button className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg hover:bg-blue-100">
                  <Settings size={10} /> Edit
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Flow preview */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <GitBranch size={16} className="text-gray-400" />
            <h2 className="font-medium text-gray-700 text-sm">Flow Preview — Lead Qualification Bot</h2>
          </div>
          <div className="flex flex-col items-center gap-2">
            {DEMO_FLOW.map((node, i) => (
              <div key={node.id} className="flex flex-col items-center">
                <div className={cn('rounded-xl px-5 py-3 text-white text-sm font-medium shadow-sm flex items-center gap-2 min-w-[220px] justify-center', node.color)}>
                  {node.type === 'trigger' && <MessageSquare size={14} />}
                  {node.type === 'condition' && <GitBranch size={14} />}
                  {node.label}
                </div>
                {i < DEMO_FLOW.length - 1 && <ChevronRight size={16} className="text-gray-300 rotate-90 my-0.5" />}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">Visual flow builder coming soon — drag-and-drop node canvas with React Flow</p>
        </div>
      </div>
    </div>
  );
}
