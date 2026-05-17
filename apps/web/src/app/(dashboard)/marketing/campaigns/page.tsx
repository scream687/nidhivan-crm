'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Mail, Plus, CheckCircle2, Clock, AlertCircle, Loader2, PauseCircle } from 'lucide-react';

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SCHEDULED: 'bg-yellow-100 text-yellow-700',
  RUNNING: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  PAUSED: 'bg-orange-100 text-orange-700',
  FAILED: 'bg-red-100 text-red-700',
};

const STATUS_ICON: Record<string, any> = {
  DRAFT: Clock, SCHEDULED: Clock, RUNNING: Loader2, COMPLETED: CheckCircle2, PAUSED: PauseCircle, FAILED: AlertCircle,
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load() {
    try {
      const { data } = await api.get('/marketing/campaigns');
      setCampaigns(data);
    } finally { setLoading(false); }
  }

  async function launch(id: string) {
    await api.post(`/marketing/campaigns/${id}/launch`);
    load();
  }

  async function pause(id: string) {
    await api.patch(`/marketing/campaigns/${id}/pause`);
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
        </div>
        <button onClick={() => router.push('/marketing/campaigns/new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus className="w-4 h-4" /> New Campaign
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Mail className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No campaigns yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c: any) => {
            const Icon = STATUS_ICON[c.status] ?? Clock;
            const pct = c.totalCount > 0 ? Math.round((c.sentCount / c.totalCount) * 100) : 0;
            return (
              <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_STYLES[c.status]}`}>
                      <Icon className={`inline w-3 h-3 mr-1 ${c.status === 'RUNNING' ? 'animate-spin' : ''}`} />
                      {c.status}
                    </span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{c.type}</span>
                  </div>
                  <div className="flex gap-2">
                    {c.status === 'DRAFT' && (
                      <button onClick={() => launch(c.id)}
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition">
                        Launch
                      </button>
                    )}
                    {c.status === 'RUNNING' && (
                      <button onClick={() => pause(c.id)}
                        className="text-xs border border-orange-300 text-orange-600 hover:bg-orange-50 px-3 py-1.5 rounded-lg transition">
                        Pause
                      </button>
                    )}
                    <button onClick={() => router.push(`/marketing/campaigns/${c.id}`)}
                      className="text-xs border border-gray-200 text-gray-600 hover:border-blue-400 px-3 py-1.5 rounded-lg transition">
                      Details
                    </button>
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{c.name}</h3>
                <p className="text-xs text-gray-400 mb-3">
                  {c.segment ? `Segment: ${c.segment.name}` : 'Custom audience'} · By {c.createdBy?.name}
                </p>
                {c.totalCount > 0 && (
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{c.sentCount} sent · {c.deliveredCount} delivered · {c.failedCount} failed</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
