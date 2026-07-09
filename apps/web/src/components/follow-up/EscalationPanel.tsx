'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, ChevronUp, ChevronDown, CheckCircle } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface Escalation {
  id: string;
  title: string;
  escalationLevel: number;
  escalatedAt: string;
  lead?: { id: string; name: string; phone?: string } | null;
  assignedTo?: { id: string; name: string } | null;
  followupType?: string | null;
  dueDate?: string | null;
}

export function EscalationPanel() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/follow-ups/escalations');
      setEscalations(Array.isArray(data) ? data : []);
    } catch {
      setEscalations([]);
    } finally {
      setLoading(false);
    }
  }

  async function resolve(taskId: string) {
    try {
      await api.post(`/follow-ups/${taskId}/mark-done`);
      toast.success('Escalation resolved');
      setEscalations(prev => prev.filter(e => e.id !== taskId));
    } catch {
      toast.error('Could not resolve');
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (escalations.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <AlertTriangle size={36} className="mx-auto mb-2 opacity-30" />
        <p className="text-sm font-medium text-gray-500">No Escalations</p>
        <p className="text-xs mt-1">All follow-ups are being handled.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {escalations.map((item, i) => {
        const isExpanded = expanded === item.id;
        return (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className="bg-white border border-red-200 rounded-xl overflow-hidden"
          >
            <div
              className="flex items-start gap-3 p-3 cursor-pointer"
              onClick={() => setExpanded(isExpanded ? null : item.id)}
            >
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white',
                item.escalationLevel >= 3 ? 'bg-red-500' : item.escalationLevel >= 2 ? 'bg-orange-500' : 'bg-amber-500'
              )}>
                L{item.escalationLevel}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{item.title}</p>
                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                  {item.lead && (
                    <a href={`/leads/${item.lead.id}`} className="text-blue-500 hover:underline" onClick={e => e.stopPropagation()}>
                      {item.lead.name}
                    </a>
                  )}
                  {item.assignedTo && <span>· {item.assignedTo.name}</span>}
                  {item.escalatedAt && <span>· {timeAgo(item.escalatedAt)}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); resolve(item.id); }}
                  className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium border border-green-200 rounded-lg px-2 py-1 transition"
                >
                  <CheckCircle size={11} />
                  Resolve
                </button>
                {isExpanded ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
              </div>
            </div>
            {isExpanded && item.lead?.phone && (
              <div className="px-3 pb-3 border-t border-red-50 pt-2 text-xs text-gray-500">
                Phone: {item.lead.phone}
                {item.followupType && <> · Type: {item.followupType}</>}
                {item.dueDate && <> · Due: {new Date(item.dueDate).toLocaleDateString('en-IN')}</>}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
