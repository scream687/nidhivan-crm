'use client';
import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Gift, Plus, Copy, ToggleLeft, ToggleRight, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

function generateCode() {
  return 'NIDHI-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export default function ReferralPage() {
  const [codes, setCodes] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ code: generateCode(), name: '', phone: '', projectId: '', discountType: 'PERCENTAGE', discountValue: '', maxUses: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/marketing/referral');
      setCodes(data);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    api.get('/projects').then(r => setProjects(r.data)).catch(() => toast.error('Failed to load projects'));
  }, [load]);

  async function toggle(id: string, isActive: boolean) {
    await api.patch(`/marketing/referral/${id}`, { isActive: !isActive });
    toast.success(isActive ? 'Deactivated' : 'Activated');
    load();
  }

  async function remove(id: string, code: string) {
    if (!confirm(`Delete referral code "${code}"?`)) return;
    await api.delete(`/marketing/referral/${id}`);
    toast.success('Referral code deleted');
    load();
  }

  function copy(code: string) {
    navigator.clipboard.writeText(code);
    toast.success('Code copied');
  }

  function resetForm() {
    setForm({ code: generateCode(), name: '', phone: '', projectId: '', discountType: 'PERCENTAGE', discountValue: '', maxUses: '' });
  }

  async function save() {
    if (!form.code.trim() || !form.name.trim() || !form.discountValue) {
      toast.error('Code, name, and discount value required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/marketing/referral', {
        ...form,
        discountValue: Number(form.discountValue),
        maxUses: form.maxUses ? Number(form.maxUses) : null,
      });
      toast.success('Referral code created');
      setShowModal(false);
      resetForm();
      load();
    } catch {
      toast.error('Failed to create code');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Gift className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Referral Codes</h1>
        </div>
        <Button onClick={() => { resetForm(); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-1" /> Create Referral Code
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : codes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Gift className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No referral codes yet</p>
          <p className="text-sm mt-1">Create codes for partners and customers to track referrals</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 text-left">Code</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Phone</th>
                <th className="px-4 py-3 text-left">Project</th>
                <th className="px-4 py-3 text-left">Discount</th>
                <th className="px-4 py-3 text-left">Uses</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {codes.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <code className="text-blue-600 font-medium text-xs bg-blue-50 px-1.5 py-0.5 rounded">{c.code}</code>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.phone ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{c.project?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {c.discountType === 'PERCENTAGE'
                      ? <span>{c.discountValue}%</span>
                      : <span>₹{c.discountValue?.toLocaleString()}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{c.uses ?? 0}/{c.maxUses ?? '∞'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={c.isActive ? 'default' : 'secondary'}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => copy(c.code)} title="Copy code">
                        <Copy className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => toggle(c.id, c.isActive)} title="Toggle status">
                        {c.isActive ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                      </Button>
                      <Button variant="ghost" size="icon-sm" onClick={() => remove(c.id, c.code)} className="text-red-500 hover:text-red-600" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Referral Code</DialogTitle>
            <DialogDescription>Generate a referral code for a partner or customer.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
              <div className="flex gap-2">
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))} placeholder="NIDHI-XXXX" />
                <Button variant="outline" size="sm" onClick={() => setForm(f => ({ ...f, code: generateCode() }))}>
                  Regenerate
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Partner name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91..." />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
              <Select value={form.projectId} onValueChange={v => setForm(f => ({ ...f, projectId: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Any / All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any / All</SelectItem>
                  {projects.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type</label>
                <Select value={form.discountType} onValueChange={v => setForm(f => ({ ...f, discountType: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENTAGE">%</SelectItem>
                    <SelectItem value="FIXED">Fixed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                <Input type="number" min={0} value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                  placeholder={form.discountType === 'PERCENTAGE' ? '10' : '50000'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Uses</label>
                <Input type="number" min={0} value={form.maxUses} onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))} placeholder="Unlimited" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
