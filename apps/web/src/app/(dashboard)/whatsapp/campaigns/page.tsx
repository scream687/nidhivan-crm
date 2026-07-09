'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Megaphone, Plus, Send, Users, CheckCheck, Clock, Play, Pause, Trash2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: 'bg-green-100 text-green-600',
  RUNNING: 'bg-blue-100 text-blue-600',
  SCHEDULED: 'bg-amber-100 text-amber-600',
  DRAFT: 'bg-gray-100 text-gray-500',
  PAUSED: 'bg-orange-100 text-orange-600',
  FAILED: 'bg-red-100 text-red-600',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load() {
    try {
      const { data } = await api.get('/marketing/campaigns');
      setCampaigns(data.filter((c: any) => c.type === 'WHATSAPP'));
    } catch { toast.error('Failed to load campaigns'); }
    finally { setLoading(false); }
  }

  async function launch(id: string) {
    try {
      await api.post(`/marketing/campaigns/${id}/launch`);
      toast.success('Campaign launched');
      load();
    } catch { toast.error('Failed to launch'); }
  }

  async function pause(id: string) {
    try {
      await api.patch(`/marketing/campaigns/${id}/pause`);
      toast.success('Campaign paused');
      load();
    } catch { toast.error('Failed to pause'); }
  }

  useEffect(() => { load(); }, []);

  const totalSent = campaigns.reduce((s, c) => s + (c.sentCount ?? 0), 0);
  const totalDelivered = campaigns.reduce((s, c) => s + (c.deliveredCount ?? 0), 0);
  const totalFailed = campaigns.reduce((s, c) => s + (c.failedCount ?? 0), 0);

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone size={20} className="text-green-600" />
          <h1 className="text-lg font-bold text-gray-900">WhatsApp Campaigns</h1>
        </div>
        <button onClick={() => router.push('/marketing/campaigns/new')}
          className="flex items-center gap-1.5 bg-green-600 text-white text-sm px-3.5 py-2 rounded-lg hover:bg-green-700 transition font-medium">
          <Plus size={14} /> New Campaign
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Sent', value: totalSent.toLocaleString(), icon: Send, color: 'text-blue-600 bg-blue-50' },
          { label: 'Delivered', value: totalDelivered.toLocaleString(), icon: CheckCheck, color: 'text-green-600 bg-green-50' },
          { label: 'Failed', value: totalFailed.toLocaleString(), icon: Users, color: 'text-red-600 bg-red-50' },
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
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No WhatsApp campaigns yet</p>
          <p className="text-sm mt-1">Create your first campaign to reach customers on WhatsApp</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', STATUS_STYLES[c.status])}>{c.status}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {c.segment ? `Segment: ${c.segment.name}` : 'Custom audience'} · By {c.createdBy?.name ?? 'Unknown'}
                  </p>
                  {c.scheduledAt && <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Clock size={10} /> {new Date(c.scheduledAt).toLocaleDateString()}</p>}
                </div>
                <div className="flex gap-2">
                  {c.status === 'RUNNING' && (
                    <button onClick={() => pause(c.id)} className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100"><Pause size={14} /></button>
                  )}
                  {(c.status === 'SCHEDULED' || c.status === 'DRAFT') && (
                    <button onClick={() => launch(c.id)} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"><Play size={14} /></button>
                  )}
                  <button onClick={() => router.push(`/marketing/campaigns/${c.id}`)}
                    className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-medium">Details</button>
                </div>
              </div>

              {c.totalCount > 0 && (
                <>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center text-sm">
                    {[['Sent', c.sentCount ?? 0, 'text-gray-700'], ['Delivered', c.deliveredCount ?? 0, 'text-blue-600'], ['Failed', c.failedCount ?? 0, 'text-red-600']].map(([label, val, cls]) => (
                      <div key={label as string}>
                        <p className={cn('font-bold text-lg', cls as string)}>{(val as number).toLocaleString()}</p>
                        <p className="text-xs text-gray-400">{label as string}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="bg-green-400 h-full rounded-full" style={{ width: `${((c.deliveredCount ?? 0) / c.totalCount) * 100}%` }} />
                  </div>
                </>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
