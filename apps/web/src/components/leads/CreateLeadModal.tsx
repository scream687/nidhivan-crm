'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';
import { useLeadsStore } from '@/stores/leadsStore';
import { useUsersStore } from '@/stores/usersStore';
import { LeadSource, LEAD_SOURCE_LABELS } from '@nidhivan/shared';
import api from '@/lib/api';
import toast from 'react-hot-toast';


interface Props { onClose: () => void; }

const SOURCES = Object.entries(LEAD_SOURCE_LABELS);

export default function CreateLeadModal({ onClose }: Props) {
  const { createLead } = useLeadsStore();
  const { users, fetchUsers } = useUsersStore();
  const [loading, setLoading] = useState(false);
  const [stages, setStages] = useState<{ name: string; label: string }[]>([]);

  const [form, setForm] = useState({
    // Core
    name: '', phone: '', altPhone: '', email: '', city: '',
    source: LeadSource.FACEBOOK as string,
    stage: 'NEW',
    assignedToId: '',
    // Property
    budget: '', projectInterest: '', siteLocation: '', requirements: '',
    siteVisitDate: '',
    // Follow-up
    nextFollowUpAt: '', nextFollowUpInfo: '',
    // Extra
    description: '', reference: '', leadTitle: '',
    campaignName: '', campaignTeam: '',
    bookingDate: '', registryDoneDate: '',
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    fetchUsers();
    api.get('/stages/active').then(r => setStages(r.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) return toast.error('Name and phone are required');
    setLoading(true);
    try {
      await createLead({
        name: form.name, phone: form.phone,
        altPhone: form.altPhone || undefined,
        email: form.email || undefined,
        city: form.city || undefined,
        source: form.source,
        stage: form.stage,
        assignedToId: form.assignedToId || undefined,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        projectInterest: form.projectInterest || undefined,
        siteLocation: form.siteLocation || undefined,
        requirements: form.requirements || undefined,
        siteVisitDate: form.siteVisitDate || undefined,
        nextFollowUpAt: form.nextFollowUpAt || undefined,
        nextFollowUpInfo: form.nextFollowUpInfo || undefined,
        description: form.description || undefined,
        reference: form.reference || undefined,
        leadTitle: form.leadTitle || undefined,
        campaignName: form.campaignName || undefined,
        campaignTeam: form.campaignTeam || undefined,
        bookingDate: form.bookingDate || undefined,
        registryDoneDate: form.registryDoneDate || undefined,
      });
      toast.success('Lead created!');
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Create New Lead</h2>
            <p className="text-xs text-gray-500">Add a new prospect to your pipeline</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">

            {/* Lead Title / Qualification */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Lead Title</label>
              <input value={form.leadTitle} onChange={e => set('leadTitle', e.target.value)}
                placeholder="e.g. Interested, Hot Prospect…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Next Follow-up */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Next Follow-up On</label>
                <input type="datetime-local" value={form.nextFollowUpAt} onChange={e => set('nextFollowUpAt', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Next Follow-up Info</label>
                <input value={form.nextFollowUpInfo} onChange={e => set('nextFollowUpInfo', e.target.value)}
                  placeholder="NA"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Section: Lead Info */}
            <SectionHeading label="Lead Info" />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Contact Name *</label>
                <input required value={form.name} onChange={e => set('name', e.target.value)}
                  placeholder="Full name"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Mobile Number *</label>
                <input required value={form.phone} onChange={e => set('phone', e.target.value)}
                  placeholder="9876543210"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Alternate Number</label>
                <input value={form.altPhone} onChange={e => set('altPhone', e.target.value)}
                  placeholder="Alternate phone"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  placeholder="email@example.com"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Lead Stage</label>
                <select value={form.stage} onChange={e => set('stage', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {stages.map(s => <option key={s.name} value={s.name}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Lead Owner</label>
                <select value={form.assignedToId} onChange={e => set('assignedToId', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Auto-assign (Round Robin)</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Description</label>
                <input value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="Any notes or description…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Requirements</label>
                <input value={form.requirements} onChange={e => set('requirements', e.target.value)}
                  placeholder="e.g. 100 sq.yd plot"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Project Name</label>
                <input value={form.projectInterest} onChange={e => set('projectInterest', e.target.value)}
                  placeholder="Govardhan Heights…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Site Location</label>
                <input value={form.siteLocation} onChange={e => set('siteLocation', e.target.value)}
                  placeholder="Vrindavan, UP"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">When can you come for site visit</label>
                <input type="date" value={form.siteVisitDate} onChange={e => set('siteVisitDate', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Booking Date</label>
                <input type="date" value={form.bookingDate} onChange={e => set('bookingDate', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Budget (₹)</label>
                <input type="number" value={form.budget} onChange={e => set('budget', e.target.value)}
                  placeholder="5000000"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">City</label>
                <input value={form.city} onChange={e => set('city', e.target.value)}
                  placeholder="Jaipur"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Registry Done Date</label>
                <input type="date" value={form.registryDoneDate} onChange={e => set('registryDoneDate', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            {/* Section: Source Info */}
            <SectionHeading label="Source Info" />
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Lead Source</label>
                <select value={form.source} onChange={e => set('source', e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {SOURCES.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Campaign Name</label>
                <input value={form.campaignName} onChange={e => set('campaignName', e.target.value)}
                  placeholder="Apr_Govardhan_Heights"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Campaign Team</label>
                <input value={form.campaignTeam} onChange={e => set('campaignTeam', e.target.value)}
                  placeholder="Marketing Team"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Reference</label>
                <input value={form.reference} onChange={e => set('reference', e.target.value)}
                  placeholder="Who referred this lead"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="px-5 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex items-center gap-2 px-6 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Create & Sync Lead
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{label}</p>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}
