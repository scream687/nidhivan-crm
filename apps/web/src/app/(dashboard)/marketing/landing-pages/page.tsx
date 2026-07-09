'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Globe, Plus, ExternalLink, Copy, Edit3, Trash2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LandingPageBuilder } from '@/components/marketing/LandingPageBuilder';

const PUBLIC_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export default function LandingPagesPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  async function load() {
    try {
      const { data } = await api.get('/marketing/landing-pages');
      setPages(data);
    } finally { setLoading(false); }
  }

  async function toggleActive(id: string, current: boolean) {
    await api.patch(`/marketing/landing-pages/${id}`, { isActive: !current });
    toast.success(current ? 'Unpublished' : 'Published');
    load();
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete landing page "${title}"?`)) return;
    await api.delete(`/marketing/landing-pages/${id}`);
    toast.success('Landing page deleted');
    load();
  }

  function copyUrl(slug: string) {
    const url = `${PUBLIC_URL}/lp/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('URL copied to clipboard');
  }

  function openBuilder(page?: any) {
    setEditing(page ?? null);
    setShowBuilder(true);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Landing Pages</h1>
        </div>
        <Button onClick={() => openBuilder()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Landing Page
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-44 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : pages.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Globe className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No landing pages yet</p>
          <p className="text-sm mt-1">Create pages for your projects to capture leads</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pages.map((p: any) => (
            <Card key={p.id} size="sm">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="truncate">{p.title}</CardTitle>
                    <CardDescription>
                      {p.project?.name ?? '—'} · /lp/{p.slug}
                    </CardDescription>
                  </div>
                  <Badge variant={p.isActive ? 'default' : 'secondary'}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-gray-600">
                  <span><strong className="text-gray-900">{(p.visitorCount ?? 0).toLocaleString()}</strong> visitors</span>
                  <span><strong className="text-gray-900">{p.leadsGenerated ?? 0}</strong> leads</span>
                </div>
              </CardContent>
              <CardFooter>
                <div className="flex gap-2 w-full">
                  <Button variant="ghost" size="sm" onClick={() => copyUrl(p.slug)}>
                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy URL
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => window.open(`/lp/${p.slug}`, '_blank')}>
                    <ExternalLink className="w-3.5 h-3.5 mr-1" /> View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openBuilder(p)}>
                    <Edit3 className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(p.id, p.isActive)}>
                    {p.isActive ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
                    {p.isActive ? 'Unpub' : 'Pub'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(p.id, p.title)} className="text-red-500 hover:text-red-600 ml-auto">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {showBuilder && (
        <LandingPageBuilder
          open={showBuilder}
          onClose={() => { setShowBuilder(false); setEditing(null); }}
          onSaved={load}
          edit={editing}
        />
      )}
    </div>
  );
}
