'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Package, Plus, MapPin, Layers, Building, Home, X, Save, Loader2,
  Globe, Link2, Eye, Upload, Trash2, FileText, Video, Tag, ChevronDown,
  Image as ImageIcon, Map, BookOpen, Download, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import api from '@/lib/api';
import { toast } from 'sonner';
import GalleryModal from '@/components/inventory/GalleryModal';

const STATUS_COLORS = {
  available: 'bg-green-500',
  blocked: 'bg-orange-400',
  booked: 'bg-yellow-400',
  sold: 'bg-gray-400',
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  PLOT: <Layers size={16} />,
  TOWNSHIP: <Building size={16} />,
  APARTMENT: <Home size={16} />,
  VILLA: <Home size={16} />,
};

const PROJECT_TYPES = ['PLOT', 'TOWNSHIP', 'APARTMENT', 'VILLA'];

interface Project {
  id: string;
  name: string;
  slug: string;
  type: string;
  location: string;
  city: string;
  totalUnits: number;
  available: number;
  blocked: number;
  booked: number;
  sold: number;
  pricePerSqft: string | null;
  priceMin: string | null;
  priceMax: string | null;
  reraNumber: string | null;
  description: string | null;
  images: string[];
  brochureUrl: string | null;
  masterPlanUrl: string | null;
  videoUrl: string | null;
  amenities: string[];
  highlights: string[];
  possession: string | null;
  isPublished: boolean;
  isActive: boolean;
}

// Strip /api/v1 suffix — images are served from the API root, not under /api/v1
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/v\d+\/?$/, '');

export default function InventoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Project | null>(null);
  const [managing, setManaging] = useState<Project | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [gallery, setGallery] = useState<{ project: Project; index: number } | null>(null);
  const [masterPlan, setMasterPlan] = useState<Project | null>(null);
  const masterPlanRef = useFocusTrap(masterPlan !== null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/inventory');
      setProjects(data || []);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totals = projects.reduce(
    (acc, p) => ({
      available: acc.available + p.available,
      blocked: acc.blocked + p.blocked,
      booked: acc.booked + p.booked,
      sold: acc.sold + p.sold,
    }),
    { available: 0, blocked: 0, booked: 0, sold: 0 }
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package size={20} className="text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Property Inventory</h1>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3.5 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          <Plus size={14} /> Add Project
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Available', value: totals.available, color: 'text-green-600 bg-green-50' },
          { label: 'Blocked', value: totals.blocked, color: 'text-orange-600 bg-orange-50' },
          { label: 'Booked', value: totals.booked, color: 'text-yellow-600 bg-yellow-50' },
          { label: 'Sold', value: totals.sold, color: 'text-gray-600 bg-gray-100' },
        ].map(({ label, value, color }) => (
          <div key={label} className={cn('rounded-xl p-4 text-center', color)}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-blue-600" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Package size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No projects yet. Add your first project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-shadow overflow-hidden group"
            >
              {/* Cover image with overlay */}
              <Link href={`/inventory/${project.id}`} className="block relative h-36 overflow-hidden">
                {project.images.length > 0 ? (
                  <img
                    src={`${API_URL}${project.images[0]}`}
                    alt={project.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                    <ImageIcon size={28} className="text-gray-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-white bg-black/40 rounded-full px-2 py-0.5">
                  <ImageIcon size={10} />
                  {project.images.length}
                </div>
              </Link>

              <div className="p-4">
                <Link href={`/inventory/${project.id}`} className="block">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-blue-500">{TYPE_ICONS[project.type] || <Package size={14} />}</span>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wide">{project.type}</span>
                        {project.isPublished ? (
                          <span className="flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">
                            <Globe size={8} /> Published
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full font-medium">Draft</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm hover:text-blue-600 transition-colors">{project.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                        <MapPin size={10} />
                        <span>{project.location}</span>
                      </div>
                    </div>
                    {project.priceMin && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-blue-600">
                          ₹{Number(project.priceMin).toLocaleString('en-IN')}
                        </p>
                        {project.priceMax && (
                          <p className="text-[10px] text-gray-400">– ₹{Number(project.priceMax).toLocaleString('en-IN')}</p>
                        )}
                      </div>
                    )}
                  </div>
                </Link>

                {/* Quick stats row */}
                <div className="grid grid-cols-4 gap-1 mt-2">
                  {[
                    { label: 'Avail', value: project.available, color: 'text-green-700 bg-green-50' },
                    { label: 'Blocked', value: project.blocked, color: 'text-orange-700 bg-orange-50' },
                    { label: 'Booked', value: project.booked, color: 'text-yellow-700 bg-yellow-50' },
                    { label: 'Sold', value: project.sold, color: 'text-gray-700 bg-gray-100' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className={cn('rounded-lg py-1.5 text-center', color)}>
                      <p className="text-sm font-bold">{value}</p>
                      <p className="text-[9px] font-medium opacity-75">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Unit status bar */}
                <div className="mt-2">
                  <div className="flex h-1.5 rounded-full overflow-hidden gap-0.5">
                    {(['available', 'booked', 'blocked', 'sold'] as const).map(status => {
                      const val = project[status];
                      const pct = project.totalUnits > 0 ? (val / project.totalUnits) * 100 : 0;
                      return pct > 0 ? (
                        <div
                          key={status}
                          className={cn('h-full rounded-full', STATUS_COLORS[status])}
                          style={{ width: `${pct}%` }}
                          title={`${status}: ${val}`}
                        />
                      ) : null;
                    })}
                  </div>
                </div>

                {project.reraNumber && (
                  <p className="text-[10px] text-gray-300 mt-1.5">RERA: {project.reraNumber}</p>
                )}

                {/* Actions row */}
                <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-50">
                  <Link
                    href={`/inventory/${project.id}`}
                    className="flex items-center gap-1 text-[11px] text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition"
                  >
                    <ChevronRight size={12} /> Details
                  </Link>
                  {project.images.length > 0 && (
                    <button
                      onClick={() => setGallery({ project, index: 0 })}
                      className="flex items-center gap-1 text-[11px] text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition"
                    >
                      <ImageIcon size={11} /> Gallery
                    </button>
                  )}
                  {project.masterPlanUrl && (
                    <button
                      onClick={() => setMasterPlan(project)}
                      className="flex items-center gap-1 text-[11px] text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition"
                    >
                      <Map size={11} /> Master Plan
                    </button>
                  )}
                  {project.brochureUrl && (
                    <a
                      href={`${API_URL}${project.brochureUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition"
                    >
                      <Download size={11} /> Brochure
                    </a>
                  )}
                  <button
                    onClick={() => setSelected(project)}
                    className="text-[11px] text-gray-600 border border-gray-200 rounded-lg px-2.5 py-1.5 hover:bg-gray-50 transition"
                  >
                    Unit Grid
                  </button>
                  <button
                    onClick={() => setManaging(project)}
                    className="text-[11px] text-blue-600 border border-blue-200 rounded-lg px-2.5 py-1.5 hover:bg-blue-50 transition font-medium"
                  >
                    Manage
                  </button>
                </div>

                {project.isPublished && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/p/${project.slug}`);
                      toast.success('Link copied!');
                    }}
                    className="mt-2 w-full flex items-center justify-center gap-1.5 text-[11px] text-green-700 bg-green-50 rounded-lg py-1.5 hover:bg-green-100 transition"
                  >
                    <Link2 size={11} /> Copy share link
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {selected && (
        <UnitGridModal
          project={selected}
          onClose={() => setSelected(null)}
          onUpdated={(updated) => {
            setProjects(ps => ps.map(p => p.id === updated.id ? updated : p));
            setSelected(updated);
          }}
        />
      )}

      {managing && (
        <ProjectManageModal
          project={managing}
          onClose={() => setManaging(null)}
          onUpdated={(updated) => {
            setProjects(ps => ps.map(p => p.id === updated.id ? updated : p));
            setManaging(updated);
          }}
        />
      )}

      {showAdd && (
        <AddProjectModal
          onClose={() => setShowAdd(false)}
          onCreated={(created) => { setShowAdd(false); load(); setManaging(created); }}
        />
      )}

      {gallery && (
        <GalleryModal
          images={gallery.project.images}
          index={gallery.index}
          onClose={() => setGallery(null)}
          onPrev={() => setGallery(g => g ? { ...g, index: g.index === 0 ? g.project.images.length - 1 : g.index - 1 } : null)}
          onNext={() => setGallery(g => g ? { ...g, index: g.index === g.project.images.length - 1 ? 0 : g.index + 1 } : null)}
        />
      )}

      {masterPlan && masterPlan.masterPlanUrl && (
        <div
          ref={masterPlanRef} tabIndex={-1}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setMasterPlan(null)}
        >
          <button onClick={() => setMasterPlan(null)} aria-label="Close" className="absolute top-4 right-4 text-white/80 hover:text-white z-10">
            <X size={24} />
          </button>
          <div className="max-w-[95vw] max-h-[95vh] overflow-auto bg-white rounded-xl" onClick={e => e.stopPropagation()}>)
            <img
              src={`${API_URL}${masterPlan.masterPlanUrl}`}
              alt={`${masterPlan.name} Master Plan`}
              className="max-w-full max-h-[90vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Project Modal ──────────────────────────────────────────────────────────

function AddProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Project) => void }) {
  const trapRef = useFocusTrap(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', type: 'PLOT', location: '', city: '',
    totalUnits: '', pricePerSqft: '', priceMin: '', priceMax: '',
    reraNumber: '', description: '', possession: '',
  });

  function set(k: string, v: string) { setForm(prev => ({ ...prev, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.location.trim()) {
      toast.error('Project name and location are required');
      return;
    }
    const units = Number(form.totalUnits);
    if (!form.totalUnits || isNaN(units) || units < 1) {
      toast.error('Total units must be at least 1');
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post('/inventory', {
        name: form.name.trim(),
        type: form.type,
        location: form.location.trim(),
        city: form.city.trim() || undefined,
        totalUnits: units,
        pricePerSqft: form.pricePerSqft ? Number(form.pricePerSqft) : undefined,
        priceMin: form.priceMin ? Number(form.priceMin) : undefined,
        priceMax: form.priceMax ? Number(form.priceMax) : undefined,
        reraNumber: form.reraNumber.trim() || undefined,
        description: form.description.trim() || undefined,
        possession: form.possession.trim() || undefined,
      });
      toast.success('Project created! Add images and publish it.');
      onCreated(data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(msg ? `Error: ${msg}` : 'Failed to create project. Check your connection and permissions.');
      console.error('[create project]', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <motion.div
        ref={trapRef} tabIndex={-1}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">Add New Project</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={submit} noValidate className="p-5 space-y-4">
          <Field label="Project Name *">
            <input value={form.name} onChange={e => set('name', e.target.value)}
              className={inputCls} placeholder="Nidhivan Valley Phase 2" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Type">
              <select value={form.type} onChange={e => set('type', e.target.value)} className={inputCls}>
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="City">
              <input value={form.city} onChange={e => set('city', e.target.value)} className={inputCls} placeholder="e.g. Vrindavan" />
            </Field>
          </div>

          <Field label="Location *">
            <input value={form.location} onChange={e => set('location', e.target.value)}
              className={inputCls} placeholder="e.g. Goverdhan Road, Vrindavan" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Total Units *">
              <input type="number" value={form.totalUnits} onChange={e => set('totalUnits', e.target.value)}
                className={inputCls} placeholder="120" />
            </Field>
            <Field label="Price/sq.ft (₹)">
              <input type="number" value={form.pricePerSqft} onChange={e => set('pricePerSqft', e.target.value)}
                className={inputCls} placeholder="2800" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Min Price (₹)">
              <input type="number" value={form.priceMin} onChange={e => set('priceMin', e.target.value)}
                className={inputCls} placeholder="4500000" min="0" />
            </Field>
            <Field label="Max Price (₹)">
              <input type="number" value={form.priceMax} onChange={e => set('priceMax', e.target.value)}
                className={inputCls} placeholder="12000000" min="0" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Possession">
              <input value={form.possession} onChange={e => set('possession', e.target.value)}
                className={inputCls} placeholder="Ready to Move" />
            </Field>
            <Field label="RERA Number (optional)">
              <input value={form.reraNumber} onChange={e => set('reraNumber', e.target.value)}
                className={inputCls} placeholder="RAJ/2024/001" />
            </Field>
          </div>

          <Field label="Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={2} className={cn(inputCls, 'resize-none')} placeholder="Optional project description…" />
          </Field>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save & Add Media
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Project Manage Modal ───────────────────────────────────────────────────────

function ProjectManageModal({ project, onClose, onUpdated }: {
  project: Project;
  onClose: () => void;
  onUpdated: (p: Project) => void;
}) {
  const trapRef = useFocusTrap(true);
  const [tab, setTab] = useState<'media' | 'details' | 'publish'>('media');
  const [uploading, setUploading] = useState(false);
  const [amenityInput, setAmenityInput] = useState('');
  const [highlightInput, setHighlightInput] = useState('');
  const [details, setDetails] = useState({
    amenities: project.amenities ?? [],
    highlights: project.highlights ?? [],
    videoUrl: project.videoUrl ?? '',
    possession: project.possession ?? '',
    description: project.description ?? '',
    priceMin: project.priceMin ?? '',
    priceMax: project.priceMax ?? '',
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);
  const brochureRef = useRef<HTMLInputElement>(null);

  async function refreshProject() {
    const { data } = await api.get(`/inventory/${project.id}`);
    onUpdated(data);
  }

  async function uploadImages(files: FileList) {
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        await api.post(`/inventory/${project.id}/upload-image`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      toast.success(`${files.length} image(s) uploaded`);
      await refreshProject();
    } catch {
      toast.error('Image upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function removeImage(url: string) {
    try {
      await api.delete(`/inventory/${project.id}/images?url=${encodeURIComponent(url)}`);
      await refreshProject();
    } catch {
      toast.error('Failed to remove image');
    }
  }

  async function uploadBrochure(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/inventory/${project.id}/upload-brochure`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Brochure uploaded');
      await refreshProject();
    } catch {
      toast.error('Brochure upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function saveDetails() {
    setSavingDetails(true);
    try {
      const { data } = await api.patch(`/inventory/${project.id}`, {
        amenities: details.amenities,
        highlights: details.highlights,
        videoUrl: details.videoUrl.trim() || undefined,
        possession: details.possession.trim() || undefined,
        description: details.description.trim() || undefined,
        priceMin: details.priceMin ? Number(details.priceMin) : undefined,
        priceMax: details.priceMax ? Number(details.priceMax) : undefined,
      });
      onUpdated(data);
      toast.success('Details saved');
    } catch {
      toast.error('Failed to save details');
    } finally {
      setSavingDetails(false);
    }
  }

  async function togglePublish() {
    try {
      const { data } = project.isPublished
        ? await api.delete(`/inventory/${project.id}/publish`)
        : await api.post(`/inventory/${project.id}/publish`);
      onUpdated(data);
      toast.success(project.isPublished ? 'Page unpublished' : 'Page published!');
    } catch {
      toast.error('Failed to update publish state');
    }
  }

  function addTag(type: 'amenities' | 'highlights', value: string) {
    const trimmed = value.trim();
    if (!trimmed || details[type].includes(trimmed)) return;
    setDetails(d => ({ ...d, [type]: [...d[type], trimmed] }));
  }

  function removeTag(type: 'amenities' | 'highlights', value: string) {
    setDetails(d => ({ ...d, [type]: d[type].filter(t => t !== value) }));
  }

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${project.slug}`;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <motion.div
        ref={trapRef} tabIndex={-1}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-semibold text-gray-900">{project.name}</h2>
            <p className="text-xs text-gray-400">{project.location} · {project.type}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-5 flex-shrink-0">
          {(['media', 'details', 'publish'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('px-4 py-3 text-sm font-medium capitalize border-b-2 transition',
                tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
              {t === 'media' ? 'Images & Brochure' : t === 'details' ? 'Details & Amenities' : 'Publish & Share'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto p-5">

          {tab === 'media' && (
            <div className="space-y-5">
              {/* Image upload */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">Project Images</p>
                  <button
                    onClick={() => imgRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
                  >
                    {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                    Upload Images
                  </button>
                  <input ref={imgRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => e.target.files && uploadImages(e.target.files)} />
                </div>

                {project.images.length === 0 ? (
                  <div
                    onClick={() => imgRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 transition"
                  >
                    <Upload size={24} className="mx-auto text-gray-300 mb-2" />
                    <p className="text-sm text-gray-400">Click or drag images here</p>
                    <p className="text-xs text-gray-300 mt-1">Max 5 MB per image</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {project.images.map((url, i) => (
                      <div key={i} className="relative group rounded-lg overflow-hidden aspect-video bg-gray-100">
                        <img src={`${API_URL}${url}`} alt="" className="w-full h-full object-cover" />
                        {i === 0 && (
                          <span className="absolute top-1.5 left-1.5 text-[9px] bg-blue-600 text-white px-1.5 py-0.5 rounded font-semibold">
                            Cover
                          </span>
                        )}
                        <button
                          onClick={() => removeImage(url)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition"
                        >
                          <Trash2 size={10} />
                        </button>
                      </div>
                    ))}
                    <div
                      onClick={() => imgRef.current?.click()}
                      className="border-2 border-dashed border-gray-200 rounded-lg aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 transition"
                    >
                      <Plus size={16} className="text-gray-300" />
                      <p className="text-[10px] text-gray-300 mt-1">Add more</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Brochure */}
              <div className="border-t border-gray-50 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Brochure PDF</p>
                  <button
                    onClick={() => brochureRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                  >
                    <FileText size={11} /> Upload PDF
                  </button>
                  <input ref={brochureRef} type="file" accept=".pdf" className="hidden"
                    onChange={e => e.target.files?.[0] && uploadBrochure(e.target.files[0])} />
                </div>
                {project.brochureUrl ? (
                  <a href={`${API_URL}${project.brochureUrl}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                    <FileText size={14} /> View brochure
                  </a>
                ) : (
                  <p className="text-xs text-gray-400">No brochure uploaded yet</p>
                )}
              </div>
            </div>
          )}

          {tab === 'details' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Min Price (₹)">
                  <input type="number" value={details.priceMin} onChange={e => setDetails(d => ({ ...d, priceMin: e.target.value }))}
                    className={inputCls} placeholder="4500000" />
                </Field>
                <Field label="Max Price (₹)">
                  <input type="number" value={details.priceMax} onChange={e => setDetails(d => ({ ...d, priceMax: e.target.value }))}
                    className={inputCls} placeholder="12000000" />
                </Field>
              </div>

              <Field label="Possession">
                <input value={details.possession} onChange={e => setDetails(d => ({ ...d, possession: e.target.value }))}
                  className={inputCls} placeholder="Ready to Move / Dec 2025" />
              </Field>

              <Field label="Description">
                <textarea value={details.description} onChange={e => setDetails(d => ({ ...d, description: e.target.value }))}
                  rows={3} className={cn(inputCls, 'resize-none')} placeholder="Describe the project…" />
              </Field>

              <Field label="Video URL (YouTube)">
                <div className="relative">
                  <Video size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={details.videoUrl} onChange={e => setDetails(d => ({ ...d, videoUrl: e.target.value }))}
                    className={cn(inputCls, 'pl-8')} placeholder="https://youtube.com/watch?v=..." />
                </div>
              </Field>

              <TagInput
                label="Amenities"
                placeholder="e.g. Swimming Pool"
                tags={details.amenities}
                input={amenityInput}
                onInputChange={setAmenityInput}
                onAdd={() => { addTag('amenities', amenityInput); setAmenityInput(''); }}
                onRemove={v => removeTag('amenities', v)}
              />

              <TagInput
                label="Highlights"
                placeholder="e.g. 24/7 Security"
                tags={details.highlights}
                input={highlightInput}
                onInputChange={setHighlightInput}
                onAdd={() => { addTag('highlights', highlightInput); setHighlightInput(''); }}
                onRemove={v => removeTag('highlights', v)}
              />

              <button
                onClick={saveDetails}
                disabled={savingDetails}
                className="flex items-center gap-2 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {savingDetails ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                Save Details
              </button>
            </div>
          )}

          {tab === 'publish' && (
            <div className="space-y-5">
              {/* Publish toggle */}
              <div className={cn('rounded-xl p-5 border-2', project.isPublished ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50')}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {project.isPublished ? 'Page is Live' : 'Page is Draft'}
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {project.isPublished
                        ? 'Clients can view and book a site visit via the public link.'
                        : 'Publish to make this project visible to clients.'}
                    </p>
                  </div>
                  <button
                    onClick={togglePublish}
                    className={cn(
                      'flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition',
                      project.isPublished
                        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    )}
                  >
                    <Globe size={14} />
                    {project.isPublished ? 'Unpublish' : 'Publish Now'}
                  </button>
                </div>
              </div>

              {project.isPublished && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">Share with clients</p>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    <p className="text-sm text-blue-600 flex-1 truncate">{shareUrl}</p>
                    <button
                      onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success('Link copied!'); }}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition flex-shrink-0"
                    >
                      <Link2 size={13} /> Copy
                    </button>
                  </div>
                  <a
                    href={`/p/${project.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                  >
                    <Eye size={14} /> Preview public page
                  </a>
                </div>
              )}

              {!project.isPublished && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                  <p className="text-sm font-medium text-amber-800 mb-1">Before publishing, make sure you have:</p>
                  <ul className="text-sm text-amber-700 space-y-0.5">
                    <li className={cn(project.images.length > 0 ? 'line-through text-amber-400' : '')}>
                      ✦ At least one project image
                    </li>
                    <li className={cn(project.description ? 'line-through text-amber-400' : '')}>
                      ✦ Project description
                    </li>
                    <li className={cn((project.priceMin || project.priceMax) ? 'line-through text-amber-400' : '')}>
                      ✦ Price range
                    </li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Unit Grid Modal ────────────────────────────────────────────────────────────

const STATUS_CYCLE = ['available', 'blocked', 'booked', 'sold'] as const;

function UnitGridModal({ project, onClose, onUpdated }: {
  project: Project;
  onClose: () => void;
  onUpdated?: (p: Project) => void;
}) {
  const trapRef = useFocusTrap(true);
  const initStatuses = (): string[] => {
    const s: string[] = [];
    for (let i = 0; i < project.sold; i++) s.push('sold');
    for (let i = 0; i < project.booked; i++) s.push('booked');
    for (let i = 0; i < project.blocked; i++) s.push('blocked');
    while (s.length < project.totalUnits) s.push('available');
    return s.slice(0, project.totalUnits);
  };

  const [statuses, setStatuses] = useState<string[]>(initStatuses);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  function toggleUnit(i: number) {
    setStatuses(prev => {
      const next = [...prev];
      const idx = STATUS_CYCLE.indexOf(next[i] as typeof STATUS_CYCLE[number]);
      next[i] = STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
      return next;
    });
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      const counts = {
        available: statuses.filter(s => s === 'available').length,
        blocked: statuses.filter(s => s === 'blocked').length,
        booked: statuses.filter(s => s === 'booked').length,
        sold: statuses.filter(s => s === 'sold').length,
      };
      const { data } = await api.patch(`/inventory/${project.id}`, counts);
      onUpdated?.(data);
      setDirty(false);
      toast.success('Unit statuses saved');
    } catch {
      toast.error('Failed to save unit statuses');
    } finally {
      setSaving(false);
    }
  }

  const counts = {
    available: statuses.filter(s => s === 'available').length,
    blocked: statuses.filter(s => s === 'blocked').length,
    booked: statuses.filter(s => s === 'booked').length,
    sold: statuses.filter(s => s === 'sold').length,
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        ref={trapRef} tabIndex={-1}
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">{project.name} — Unit Grid</h2>
            <p className="text-xs text-gray-400">{project.totalUnits} units · click any unit to change its status</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        {/* Legend + live counts */}
        <div className="px-5 py-3 flex flex-wrap gap-4 text-xs border-b border-gray-100 bg-gray-50">
          {STATUS_CYCLE.map(s => (
            <span key={s} className="flex items-center gap-1.5 capitalize font-medium">
              <span className={cn('w-3 h-3 rounded', STATUS_COLORS[s])} />
              {s}: <span className="text-gray-700">{counts[s]}</span>
            </span>
          ))}
          <span className="ml-auto text-gray-400 italic text-[11px]">Click to cycle: available → blocked → booked → sold</span>
        </div>

        <div className="overflow-y-auto p-5 flex-1">
          <div className="grid grid-cols-10 gap-1.5">
            {statuses.map((status, i) => (
              <button
                key={i}
                type="button"
                onClick={() => toggleUnit(i)}
                title={`Unit ${i + 1}: ${status} — click to change`}
                className={cn(
                  'w-full aspect-square rounded flex items-center justify-center text-[9px] font-medium transition hover:scale-110 hover:shadow-md active:scale-95 text-white cursor-pointer',
                  STATUS_COLORS[status as keyof typeof STATUS_COLORS]
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between flex-shrink-0 bg-white">
          <p className={cn('text-xs font-medium', dirty ? 'text-amber-600' : 'text-gray-400')}>
            {dirty ? '● Unsaved changes' : 'No changes'}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              {dirty ? 'Discard' : 'Close'}
            </button>
            <button
              onClick={save}
              disabled={!dirty || saving}
              className="flex items-center gap-2 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function TagInput({ label, placeholder, tags, input, onInputChange, onAdd, onRemove }: {
  label: string; placeholder: string; tags: string[]; input: string;
  onInputChange: (v: string) => void; onAdd: () => void; onRemove: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
          className={inputCls}
          placeholder={placeholder}
        />
        <button type="button" onClick={onAdd}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition flex-shrink-0 font-medium">
          <Plus size={13} /> Add
        </button>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">Type and click Add (or press Enter)</p>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {tags.map(tag => (
            <span key={tag} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full border border-blue-200">
              {tag}
              <button type="button" onClick={() => onRemove(tag)} aria-label={`Remove tag ${tag}`} className="text-blue-400 hover:text-red-500 transition ml-0.5">
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </Field>
  );
}
