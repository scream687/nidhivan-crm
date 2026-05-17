'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Megaphone, Plus, Send, Users, CheckCheck, Clock, Play, Pause, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const CAMPAIGNS = [
  { id: '1', name: 'Diwali Offer 2024', template: 'diwali_offer', status: 'COMPLETED', sent: 1240, delivered: 1198, read: 876, replied: 43, scheduled: '2024-11-01', target: 'HOT leads' },
  { id: '2', name: 'New Year Plot Launch', template: 'ny_launch', status: 'RUNNING', sent: 540, delivered: 521, read: 312, replied: 28, scheduled: '2025-01-01', target: 'INTERESTED leads' },
  { id: '3', name: 'Site Visit Reminder', template: 'site_visit_reminder', status: 'SCHEDULED', sent: 0, delivered: 0, read: 0, replied: 0, scheduled: '2025-01-15', target: 'SITE_VISIT_SCHEDULED' },
  { id: '4', name: 'Follow-up Drip Week 1', template: 'followup_w1', status: 'DRAFT', sent: 0, delivered: 0, read: 0, replied: 0, scheduled: '', target: 'NEW leads' },
];

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-600',
  RUNNING: 'bg-blue-100 text-blue-600',
  SCHEDULED: 'bg-amber-100 text-amber-600',
  DRAFT: 'bg-gray-100 text-gray-500',
};

export default function CampaignsPage() {
  const [showNew, setShowNew] = useState(false);

  const totalSent = CAMPAIGNS.reduce((s, c) => s + c.sent, 0);
  const totalRead = CAMPAIGNS.reduce((s, c) => s + c.read, 0);
  const totalReplied = CAMPAIGNS.reduce((s, c) => s + c.replied, 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone size={20} className="text-green-600" />
          <h1 className="text-lg font-bold text-gray-900">WhatsApp Campaigns</h1>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 bg-green-600 text-white text-sm px-3.5 py-2 rounded-lg hover:bg-green-700 transition font-medium">
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Sent', value: totalSent.toLocaleString(), icon: Send, color: 'text-blue-600 bg-blue-50' },
          { label: 'Read Rate', value: totalSent ? `${Math.round((totalRead / totalSent) * 100)}%` : '0%', icon: CheckCheck, color: 'text-green-600 bg-green-50' },
          { label: 'Reply Rate', value: totalSent ? `${Math.round((totalReplied / totalSent) * 100)}%` : '0%', icon: Users, color: 'text-purple-600 bg-purple-50' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={cn('rounded-xl p-4', color)}>
            <div className="flex items-center gap-2 mb-1">
              <Icon size={16} />
              <span className="text-xs font-medium">{label}</span>
            </div>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      <div className="space-y-3">
        {CAMPAIGNS.map((c, i) => (
          <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900">{c.name}</h3>
                  <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[c.status])}>{c.status}</span>
                </div>
                <p className="text-xs text-gray-400">Template: <span className="font-mono text-gray-600">{c.template}</span> · Target: {c.target}</p>
                {c.scheduled && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Clock size={10} /> {c.scheduled}</p>}
              </div>
              <div className="flex gap-2">
                {c.status === 'RUNNING' && <button className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><Pause size={14} /></button>}
                {c.status === 'SCHEDULED' && <button className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"><Play size={14} /></button>}
                {c.status === 'DRAFT' && <button className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"><Send size={14} /></button>}
                <button className="p-1.5 rounded-lg bg-red-50 text-red-400 hover:bg-red-100"><Trash2 size={14} /></button>
              </div>
            </div>

            {c.sent > 0 && (
              <div className="mt-4 grid grid-cols-4 gap-4 text-center text-sm">
                {[['Sent', c.sent, 'text-gray-700'], ['Delivered', c.delivered, 'text-blue-600'], ['Read', c.read, 'text-green-600'], ['Replied', c.replied, 'text-purple-600']].map(([label, val, cls]) => (
                  <div key={label as string}>
                    <p className={cn('font-bold text-lg', cls as string)}>{(val as number).toLocaleString()}</p>
                    <p className="text-xs text-gray-400">{label as string}</p>
                  </div>
                ))}
              </div>
            )}

            {c.sent > 0 && (
              <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
                <div className="bg-blue-400 h-full rounded-full" style={{ width: `${(c.delivered / c.sent) * 100}%` }} />
                <div className="bg-green-400 h-full rounded-full" style={{ width: `${(c.read / c.sent) * 100}%` }} />
                <div className="bg-purple-400 h-full rounded-full" style={{ width: `${(c.replied / c.sent) * 100}%` }} />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {showNew && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="font-semibold text-gray-900 mb-1">New Campaign</h2>
            <p className="text-sm text-gray-500 mb-4">Connect WhatsApp Business API to send bulk campaigns. Full campaign builder available once API credentials are configured.</p>
            <button onClick={() => setShowNew(false)} className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium">Got it</button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
