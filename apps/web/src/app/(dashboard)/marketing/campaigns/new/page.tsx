'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Loader2 } from 'lucide-react';

function CampaignBuilderInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [segments, setSegments] = useState<any[]>([]);
  const [form, setForm] = useState({
    name: '',
    type: 'EMAIL',
    segmentId: searchParams.get('segmentId') ?? '',
    messageTemplate: '',
    subject: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/marketing/segments').then(r => setSegments(r.data));
  }, []);

  function set(key: string, val: string) { setForm(f => ({ ...f, [key]: val })); }

  async function save() {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (!form.messageTemplate.trim()) { toast.error('Message required'); return; }
    if (!form.segmentId) { toast.error('Select a segment'); return; }
    setSaving(true);
    try {
      await api.post('/marketing/campaigns', form);
      toast.success('Campaign created');
      router.push('/marketing/campaigns');
    } catch { toast.error('Failed to create campaign'); }
    finally { setSaving(false); }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Campaign</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Campaign Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Diwali Offer 2026"
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Type *</label>
          <div className="flex gap-3">
            {['EMAIL', 'WHATSAPP'].map(t => (
              <button key={t} onClick={() => set('type', t)}
                className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition ${form.type === t ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-blue-400'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Audience Segment *</label>
          <select value={form.segmentId} onChange={e => set('segmentId', e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">— Select segment —</option>
            {segments.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.leadCount} leads)</option>)}
          </select>
        </div>

        {form.type === 'EMAIL' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Subject</label>
            <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="Subject line"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
          <p className="text-xs text-gray-400 mb-1.5">Variables: {'{{name}}'}, {'{{phone}}'}</p>
          <textarea value={form.messageTemplate} onChange={e => set('messageTemplate', e.target.value)}
            rows={5} placeholder={`Hi {{name}}, we have an exclusive offer for you...`}
            className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
        </div>

        <button onClick={save} disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create Campaign
        </button>
      </div>
    </div>
  );
}

export default function NewCampaignPage() {
  return <Suspense><CampaignBuilderInner /></Suspense>;
}
