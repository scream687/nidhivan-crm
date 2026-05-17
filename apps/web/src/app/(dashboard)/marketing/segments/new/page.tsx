'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Users2, Loader2 } from 'lucide-react';

const STAGES = ['NEW', 'CONTACTED', 'INTERESTED', 'SITE_VISIT_SCHEDULED', 'SITE_VISIT_DONE', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST'];
const SOURCES = ['FACEBOOK','INSTAGRAM','HOUSING_COM','NINETYNINE_ACRES','BROKER_REFERRAL','WALK_IN','WHATSAPP','WEBSITE','GOOGLE_ADS','OTHER'];

export default function SegmentBuilderPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [preview, setPreview] = useState<{ count: number; sample: any[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  function toggleArr(key: string, val: string) {
    setFilters(f => {
      const cur: string[] = f[key] ?? [];
      return { ...f, [key]: cur.includes(val) ? cur.filter(v => v !== val) : [...cur, val] };
    });
    setPreview(null);
  }

  async function runPreview() {
    if (!Object.keys(filters).length) { toast.error('Add at least one filter'); return; }
    setPreviewing(true);
    try {
      const { data } = await api.post('/marketing/segments', { name: '__preview__', filters });
      const { data: prev } = await api.get(`/marketing/segments/${data.id}/preview`);
      await api.delete(`/marketing/segments/${data.id}`);
      setPreview(prev);
    } catch { toast.error('Preview failed'); }
    finally { setPreviewing(false); }
  }

  async function save() {
    if (!name.trim()) { toast.error('Name is required'); return; }
    if (!Object.keys(filters).length) { toast.error('Add at least one filter'); return; }
    setSaving(true);
    try {
      await api.post('/marketing/segments', { name, description, filters });
      toast.success('Segment saved');
      router.push('/marketing/segments');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  const chip = (active: boolean) =>
    `px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition ${active ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'}`;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">New Segment</h1>

      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Segment Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hot Facebook Leads"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
          <h2 className="font-semibold text-gray-900">Filters</h2>

          <div>
            <p className="text-sm text-gray-600 mb-2">Stage</p>
            <div className="flex flex-wrap gap-2">
              {STAGES.map(s => (
                <span key={s} className={chip((filters.stage ?? []).includes(s))} onClick={() => toggleArr('stage', s)}>
                  {s.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600 mb-2">Source</p>
            <div className="flex flex-wrap gap-2">
              {SOURCES.map(s => (
                <span key={s} className={chip((filters.source ?? []).includes(s))} onClick={() => toggleArr('source', s)}>
                  {s.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Hot leads only</label>
            <button onClick={() => { setFilters(f => ({ ...f, isHot: !f.isHot })); setPreview(null); }}
              className={`w-10 h-6 rounded-full transition ${filters.isHot ? 'bg-blue-600' : 'bg-gray-200'} relative`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${filters.isHot ? 'translate-x-4' : ''}`} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Budget Min (₹)</label>
              <input type="number" placeholder="0" value={filters.budgetMin ?? ''}
                onChange={e => { setFilters(f => ({ ...f, budgetMin: e.target.value ? Number(e.target.value) : undefined })); setPreview(null); }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Budget Max (₹)</label>
              <input type="number" placeholder="∞" value={filters.budgetMax ?? ''}
                onChange={e => { setFilters(f => ({ ...f, budgetMax: e.target.value ? Number(e.target.value) : undefined })); setPreview(null); }}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        {preview && (
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
              <Users2 className="w-4 h-4" /> {preview.count.toLocaleString()} leads match
            </div>
            {preview.sample.length > 0 && (
              <ul className="text-sm text-blue-600 space-y-1">
                {preview.sample.map((l: any) => <li key={l.id}>· {l.name} — {l.stage}</li>)}
                {preview.count > 5 && <li className="text-blue-400">…and {preview.count - 5} more</li>}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={runPreview} disabled={previewing}
            className="flex items-center gap-2 border border-gray-200 text-gray-700 hover:border-blue-400 px-4 py-2.5 rounded-lg text-sm transition">
            {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users2 className="w-4 h-4" />} Preview
          </button>
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Save Segment
          </button>
        </div>
      </div>
    </div>
  );
}
