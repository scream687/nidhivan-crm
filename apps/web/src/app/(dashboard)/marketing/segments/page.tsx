'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Target, Plus, Trash2, Eye, Users2 } from 'lucide-react';

export default function SegmentsPage() {
  const [segments, setSegments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load() {
    try {
      const { data } = await api.get('/marketing/segments');
      setSegments(data);
    } finally { setLoading(false); }
  }

  async function deleteSegment(id: string, name: string) {
    if (!confirm(`Delete segment "${name}"?`)) return;
    await api.delete(`/marketing/segments/${id}`);
    toast.success('Segment deleted');
    load();
  }

  async function preview(id: string) {
    const { data } = await api.get(`/marketing/segments/${id}/preview`);
    toast.success(`${data.count} leads match this segment`);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Segments</h1>
        </div>
        <button onClick={() => router.push('/marketing/segments/new')}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus className="w-4 h-4" /> New Segment
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-36 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : segments.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No segments yet</p>
          <p className="text-sm mt-1">Create your first segment to target specific leads</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {segments.map((seg: any) => (
            <div key={seg.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{seg.name}</h3>
                  {seg.description && <p className="text-sm text-gray-500 mt-0.5">{seg.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-blue-600 font-medium text-sm">
                <Users2 className="w-4 h-4" />
                {seg.leadCount.toLocaleString()} leads
              </div>
              <p className="text-xs text-gray-400">By {seg.createdBy?.name} · {new Date(seg.createdAt).toLocaleDateString()}</p>
              <div className="flex gap-2 pt-1">
                <button onClick={() => preview(seg.id)}
                  className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600 border border-gray-200 rounded-lg px-3 py-1.5 transition">
                  <Eye className="w-3 h-3" /> Preview
                </button>
                <button onClick={() => router.push(`/marketing/campaigns/new?segmentId=${seg.id}`)}
                  className="flex-1 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg px-3 py-1.5 transition">
                  Use in Campaign
                </button>
                <button onClick={() => deleteSegment(seg.id, seg.name)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
