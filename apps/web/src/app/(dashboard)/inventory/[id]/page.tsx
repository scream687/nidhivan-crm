'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, FileText, Video, Plus, Upload, Loader2, X, Save,
  Search, Edit3, Trash2, Filter, Grid3X3, List, CornerDownRight,
  ArrowUpDown, Download, Globe, CheckSquare, Square,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import api from '@/lib/api';
import { toast } from 'sonner';
import GalleryModal from '@/components/inventory/GalleryModal';
import PlotFacing from '@/components/inventory/PlotFacing';
import NearbyPlaces, { type NearbyPlace } from '@/components/inventory/NearbyPlaces';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000').replace(/\/api\/v\d+\/?$/, '');

// ── Types ──────────────────────────────────────────────────────────────────────

interface Project {
  id: string; name: string; slug: string; type: string;
  location: string; city: string;
  totalUnits: number; available: number; blocked: number; booked: number; sold: number;
  pricePerSqft: string | null; priceMin: string | null; priceMax: string | null;
  reraNumber: string | null; description: string | null;
  images: string[]; brochureUrl: string | null; videoUrl: string | null;
  amenities: string[]; highlights: string[]; possession: string | null;
  isPublished: boolean; isActive: boolean;
  masterPlanUrl?: string | null;
  nearbyPlaces?: NearbyPlace[];
  gpsLat?: number | null; gpsLng?: number | null;
}

interface Plot {
  id: string; projectId: string;
  block: string; road: string; plotNumber: string; facing: string;
  dimensions: string | null; area: number; ratePerUnit: number;
  status: string; isCorner: boolean; isAvenue: boolean;
  roadWidth: number | null; gpsLat: number | null; gpsLng: number | null;
  totalPrice: number;
}

const PLOT_STATUSES = ['AVAILABLE', 'BLOCKED', 'RESERVED', 'BOOKED', 'SOLD'] as const;
const PLOT_FACINGS = ['NORTH', 'SOUTH', 'EAST', 'WEST', 'NORTHEAST', 'NORTHWEST', 'SOUTHEAST', 'SOUTHWEST'];

const STATUS_BADGE: Record<string, string> = {
  AVAILABLE: 'bg-green-100 text-green-700 border-green-200',
  BLOCKED: 'bg-orange-100 text-orange-700 border-orange-200',
  RESERVED: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  BOOKED: 'bg-blue-100 text-blue-700 border-blue-200',
  SOLD: 'bg-red-100 text-red-700 border-red-200',
};

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [loading, setLoading] = useState(true);

  // Gallery
  const [galleryIdx, setGalleryIdx] = useState<number | null>(null);

  // Master Plan modal
  const [showMasterPlan, setShowMasterPlan] = useState(false);

  // Plot filter/search
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFacing, setFilterFacing] = useState('');
  const [filterBlock, setFilterBlock] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Bulk selection
  const [selectedPlotIds, setSelectedPlotIds] = useState<Set<string>>(new Set());
  const [bulkStatus, setBulkStatus] = useState('');

  // Add/Edit plot modal
  const [plotModal, setPlotModal] = useState<{ open: boolean; edit?: Plot }>({ open: false });

  // Upload refs
  const imgRef = useRef<HTMLInputElement>(null);
  const brochureRef = useRef<HTMLInputElement>(null);
  const masterPlanRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [projRes, plotRes] = await Promise.all([
        api.get(`/inventory/${id}`),
        api.get(`/inventory/${id}/plots`),
      ]);
      setProject(projRes.data);
      setPlots(plotRes.data || []);
    } catch {
      toast.error('Failed to load project');
      router.push('/inventory');
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  const masterPlanTrapRef = useFocusTrap(!!showMasterPlan);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-blue-600" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Loader2 size={24} className="animate-spin text-blue-600 mb-4" />
        <p className="text-sm">Project not found. Redirecting...</p>
      </div>
    );
  }

  // ── Derivations ──────────────────────────────────────────────────────────────

  const uniqueBlocks = [...new Set(plots.map(p => p.block).filter(Boolean))];
  const filteredPlots = plots.filter(p => {
    if (search && !p.plotNumber.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus && p.status !== filterStatus) return false;
    if (filterFacing && p.facing !== filterFacing) return false;
    if (filterBlock && p.block !== filterBlock) return false;
    return true;
  });

  function toggleSelect(id: string) {
    setSelectedPlotIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedPlotIds.size === filteredPlots.length) {
      setSelectedPlotIds(new Set());
    } else {
      setSelectedPlotIds(new Set(filteredPlots.map(p => p.id)));
    }
  }

  async function applyBulkStatus() {
    if (!bulkStatus || selectedPlotIds.size === 0) return;
    try {
      await api.patch(`/inventory/${id}/plots/bulk-status`, {
        ids: Array.from(selectedPlotIds),
        status: bulkStatus,
      });
      toast.success(`${selectedPlotIds.size} plots updated`);
      setSelectedPlotIds(new Set());
      setBulkStatus('');
      load();
    } catch {
      toast.error('Bulk update failed');
    }
  }

  // ── Upload helpers ───────────────────────────────────────────────────────────

  async function uploadImages(files: FileList) {
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append('file', file);
      await api.post(`/inventory/${project.id}/upload-image`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    toast.success(`${files.length} image(s) uploaded`);
    load();
  }

  async function removeImage(url: string) {
    await api.delete(`/inventory/${project.id}/images?url=${encodeURIComponent(url)}`);
    load();
  }

  async function uploadBrochure(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    await api.post(`/inventory/${project.id}/upload-brochure`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    toast.success('Brochure uploaded');
    load();
  }

  async function uploadMasterPlan(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    await api.post(`/inventory/${project.id}/upload-master-plan`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    toast.success('Master plan uploaded');
    load();
  }

  // ── Plot CRUD ────────────────────────────────────────────────────────────────

  async function savePlot(data: Partial<Plot>) {
    try {
      if (data.id) {
        await api.patch(`/inventory/${id}/plots/${data.id}`, data);
      } else {
        await api.post(`/inventory/${id}/plots`, data);
      }
      toast.success(data.id ? 'Plot updated' : 'Plot added');
      setPlotModal({ open: false });
      load();
    } catch {
      toast.error('Failed to save plot');
    }
  }

  async function deletePlot(plotId: string) {
    try {
      await api.delete(`/inventory/${id}/plots/${plotId}`);
      toast.success('Plot deleted');
      load();
    } catch {
      toast.error('Failed to delete plot');
    }
  }

  // ── Nearby Places ────────────────────────────────────────────────────────────

  async function saveNearbyPlaces(places: NearbyPlace[]) {
    try {
      await api.put(`/inventory/${id}/nearby-places`, { places });
      load();
    } catch {
      toast.error('Failed to save nearby places');
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <button
            onClick={() => router.push('/inventory')}
            className="mt-0.5 text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
              <MapPin size={14} />
              <span>{project.location}</span>
              {project.city && <span>· {project.city}</span>}
              <span className="text-gray-300">·</span>
              <span className="uppercase text-[11px] font-medium text-gray-400">{project.type}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project.reraNumber && (
            <span className="text-[11px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">
              RERA: {project.reraNumber}
            </span>
          )}
          {project.isPublished ? (
            <span className="flex items-center gap-1 text-[11px] text-green-700 bg-green-50 px-2.5 py-1 rounded-full border border-green-200 font-medium">
              <Globe size={11} /> Published
            </span>
          ) : (
            <span className="text-[11px] text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-200">Draft</span>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total Plots', value: plots.length, color: 'text-gray-900 bg-gray-50' },
          { label: 'Available', value: plots.filter(p => p.status === 'AVAILABLE').length, color: 'text-green-600 bg-green-50' },
          { label: 'Blocked', value: plots.filter(p => p.status === 'BLOCKED').length, color: 'text-orange-600 bg-orange-50' },
          { label: 'Booked / Reserved', value: plots.filter(p => p.status === 'BOOKED' || p.status === 'RESERVED').length, color: 'text-blue-600 bg-blue-50' },
          { label: 'Sold', value: plots.filter(p => p.status === 'SOLD').length, color: 'text-red-600 bg-red-50' },
        ].map(({ label, value, color }) => (
          <div key={label} className={cn('rounded-xl p-3 text-center', color)}>
            <p className="text-xl font-bold">{value}</p>
            <p className="text-[10px] mt-0.5 font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-gray-600 leading-relaxed max-w-3xl">{project.description}</p>
      )}

      {/* ── Gallery Section ──────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Gallery</h2>
          <button
            onClick={() => imgRef.current?.click()}
            className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition"
          >
            <Upload size={11} /> Upload
          </button>
          <input ref={imgRef} type="file" accept="image/*" multiple className="hidden"
            onChange={e => e.target.files && uploadImages(e.target.files)} />
        </div>
        {project.images.length === 0 ? (
          <div
            onClick={() => imgRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-300 transition"
          >
            <Upload size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Click to upload project images</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
            {project.images.map((url, i) => (
              <div
                key={i}
                className="relative group rounded-lg overflow-hidden aspect-[4/3] bg-gray-100 cursor-pointer"
                onClick={() => setGalleryIdx(i)}
              >
                <img src={`${API_URL}${url}`} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={(e) => { e.stopPropagation(); removeImage(url); }}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded p-0.5 opacity-0 group-hover:opacity-100 transition"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Master Plan Section ──────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Master Plan</h2>
          <button
            onClick={() => masterPlanRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
          >
            <Upload size={11} /> Upload
          </button>
          <input ref={masterPlanRef} type="file" accept="image/*" className="hidden"
            onChange={e => e.target.files?.[0] && uploadMasterPlan(e.target.files[0])} />
        </div>
        {project.masterPlanUrl ? (
          <div
            className="relative rounded-xl overflow-hidden border border-gray-200 cursor-pointer bg-gray-50"
            onClick={() => setShowMasterPlan(true)}
          >
            <img
              src={`${API_URL}${project.masterPlanUrl}`}
              alt="Master Plan"
              className="w-full max-h-80 object-contain"
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition flex items-center justify-center">
              <span className="opacity-0 hover:opacity-100 text-white bg-black/50 px-3 py-1.5 rounded-lg text-sm">
                Click to zoom
              </span>
            </div>
          </div>
        ) : (
          <div
            onClick={() => masterPlanRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-300 transition"
          >
            <Upload size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Click to upload master plan image</p>
          </div>
        )}
      </section>

      {/* ── Brochure Section ─────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Brochure</h2>
          <button
            onClick={() => brochureRef.current?.click()}
            className="flex items-center gap-1.5 text-xs text-gray-600 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
          >
            <Upload size={11} /> Upload PDF
          </button>
          <input ref={brochureRef} type="file" accept=".pdf" className="hidden"
            onChange={e => e.target.files?.[0] && uploadBrochure(e.target.files[0])} />
        </div>
        {project.brochureUrl ? (
          <a
            href={`${API_URL}${project.brochureUrl}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline bg-blue-50 rounded-lg px-4 py-3 border border-blue-100"
          >
            <FileText size={16} />
            <span className="font-medium">Download Brochure</span>
            <Download size={14} className="ml-auto" />
          </a>
        ) : (
          <div
            onClick={() => brochureRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-300 transition"
          >
            <FileText size={24} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">Click to upload brochure PDF</p>
          </div>
        )}
      </section>

      {/* ── Nearby Places ────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Nearby Places</h2>
        </div>
        <NearbyPlaces
          places={project.nearbyPlaces || []}
          onChange={saveNearbyPlaces}
        />
      </section>

      {/* ── Virtual Tour ─────────────────────────────────────────────────────── */}
      {project.videoUrl && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Video size={14} className="text-blue-600" />
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Virtual Tour</h2>
          </div>
          <div className="aspect-video rounded-xl overflow-hidden border border-gray-200">
            <iframe
              src={project.videoUrl.replace('watch?v=', 'embed/')}
              className="w-full h-full"
              allowFullScreen
              title="Virtual Tour"
            />
          </div>
        </section>
      )}

      {/* ── Google Maps ──────────────────────────────────────────────────────── */}
      {(project.gpsLat && project.gpsLng) ? (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <MapPin size={14} className="text-blue-600" />
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">Location</h2>
          </div>
          <div className="aspect-[21/9] rounded-xl overflow-hidden border border-gray-200">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              src={`https://www.google.com/maps?q=${project.gpsLat},${project.gpsLng}&z=15&output=embed`}
              allowFullScreen
              title="Project Location"
            />
          </div>
        </section>
      ) : null}

      {/* ── Plots Grid ────────────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
            Plots <span className="text-gray-400 font-normal">({filteredPlots.length})</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(v => v === 'grid' ? 'list' : 'grid')}
              className="text-gray-400 hover:text-gray-600 p-1"
              title={viewMode === 'grid' ? 'List view' : 'Grid view'}
            >
              {viewMode === 'grid' ? <List size={16} /> : <Grid3X3 size={16} />}
            </button>
            <button
              onClick={() => setPlotModal({ open: true })}
              className="flex items-center gap-1.5 text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium"
            >
              <Plus size={12} /> Add Plot
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search plot #..."
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Status</option>
            {PLOT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={filterFacing} onChange={e => setFilterFacing(e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Facing</option>
            {PLOT_FACINGS.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={filterBlock} onChange={e => setFilterBlock(e.target.value)}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Blocks</option>
            {uniqueBlocks.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          {(search || filterStatus || filterFacing || filterBlock) && (
            <button
              onClick={() => { setSearch(''); setFilterStatus(''); setFilterFacing(''); setFilterBlock(''); }}
              className="text-xs text-red-600 hover:text-red-800 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Bulk action bar */}
        {selectedPlotIds.size > 0 && (
          <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 mb-3">
            <span className="text-xs font-medium text-blue-700">{selectedPlotIds.size} selected</span>
            <select
              value={bulkStatus}
              onChange={e => setBulkStatus(e.target.value)}
              className="border border-blue-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Set status…</option>
              {PLOT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button
              onClick={applyBulkStatus}
              disabled={!bulkStatus}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-40 font-medium"
            >
              Apply
            </button>
            <button
              onClick={() => setSelectedPlotIds(new Set())}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        )}

        {/* Plot list */}
        {filteredPlots.length === 0 ? (
          <div className="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <p className="text-sm">No plots match your filters.</p>
          </div>
        ) : viewMode === 'list' ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase">
                <tr>
                  <th className="px-3 py-2.5 text-left w-8">
                    <button onClick={toggleSelectAll} className="text-gray-400 hover:text-gray-600">
                      {selectedPlotIds.size === filteredPlots.length ? <CheckSquare size={14} /> : <Square size={14} />}
                    </button>
                  </th>
                  <th className="px-3 py-2.5 text-left">Plot #</th>
                  <th className="px-3 py-2.5 text-left">Block</th>
                  <th className="px-3 py-2.5 text-left">Road</th>
                  <th className="px-3 py-2.5 text-left">Facing</th>
                  <th className="px-3 py-2.5 text-right">Area (sq.yd)</th>
                  <th className="px-3 py-2.5 text-right">Rate/sq.yd</th>
                  <th className="px-3 py-2.5 text-right">Total Price</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                  <th className="px-3 py-2.5 text-center w-16">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPlots.map(plot => (
                  <tr
                    key={plot.id}
                    className={cn(
                      'hover:bg-gray-50 transition cursor-pointer',
                      selectedPlotIds.has(plot.id) && 'bg-blue-50/50',
                    )}
                  >
                    <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => toggleSelect(plot.id)} className="text-gray-400 hover:text-gray-600">
                        {selectedPlotIds.has(plot.id) ? <CheckSquare size={14} className="text-blue-600" /> : <Square size={14} />}
                      </button>
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900">{plot.plotNumber}</td>
                    <td className="px-3 py-2 text-gray-600">{plot.block || '—'}</td>
                    <td className="px-3 py-2 text-gray-600">{plot.road || '—'}</td>
                    <td className="px-3 py-2">
                      <PlotFacing facing={plot.facing} />
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">{plot.area}</td>
                    <td className="px-3 py-2 text-right text-gray-600">₹{plot.ratePerUnit.toLocaleString('en-IN')}</td>
                    <td className="px-3 py-2 text-right font-medium text-gray-900">
                      ₹{(plot.area * plot.ratePerUnit).toLocaleString('en-IN')}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={cn('inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold', STATUS_BADGE[plot.status] || 'bg-gray-100 text-gray-600')}>
                        {plot.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setPlotModal({ open: true, edit: plot })}
                          aria-label="Edit plot"
                          className="text-blue-600 hover:bg-blue-50 p-1 rounded"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          onClick={() => deletePlot(plot.id)}
                          aria-label="Delete plot"
                          className="text-red-500 hover:bg-red-50 p-1 rounded"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {filteredPlots.map(plot => (
              <motion.div
                key={plot.id}
                layout
                className={cn(
                  'rounded-lg border p-3 cursor-pointer transition hover:shadow-sm',
                  selectedPlotIds.has(plot.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white',
                )}
                onClick={() => toggleSelect(plot.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold text-gray-900">{plot.plotNumber}</span>
                  <span className={cn('rounded-full border px-1.5 py-0.5 text-[9px] font-semibold', STATUS_BADGE[plot.status] || 'bg-gray-100 text-gray-600')}>
                    {plot.status}
                  </span>
                </div>
                <div className="space-y-0.5 text-[11px] text-gray-500">
                  {plot.block && <p>Block: {plot.block}</p>}
                  <div className="flex items-center gap-1">
                    <PlotFacing facing={plot.facing} />
                  </div>
                  <p>{plot.area} sq.yd</p>
                  <p className="font-medium text-gray-800">₹{(plot.area * plot.ratePerUnit).toLocaleString('en-IN')}</p>
                </div>
                <div className="flex gap-1 mt-2 pt-2 border-t border-gray-50">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPlotModal({ open: true, edit: plot }); }}
                    className="flex-1 text-[10px] text-blue-600 hover:bg-blue-50 rounded py-1 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deletePlot(plot.id); }}
                    className="flex-1 text-[10px] text-red-500 hover:bg-red-50 rounded py-1 transition"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      {/* Gallery Lightbox */}
      {galleryIdx !== null && (
        <GalleryModal
          images={project.images}
          index={galleryIdx}
          onClose={() => setGalleryIdx(null)}
          onPrev={() => setGalleryIdx(i => (i === 0 ? project.images.length - 1 : i - 1))}
          onNext={() => setGalleryIdx(i => (i === project.images.length - 1 ? 0 : i + 1))}
        />
      )}

      {/* Master Plan Modal */}
      {showMasterPlan && project.masterPlanUrl && (
        <div
          ref={masterPlanTrapRef} tabIndex={-1}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setShowMasterPlan(false)}
        >
          <button
            onClick={() => setShowMasterPlan(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white z-10"
          >
            <X size={24} />
          </button>
          <div
            className="max-w-[95vw] max-h-[95vh] overflow-auto bg-white rounded-xl"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={`${API_URL}${project.masterPlanUrl}`}
              alt="Master Plan"
              className="max-w-full max-h-[90vh] object-contain"
              style={{ imageRendering: 'auto' }}
            />
          </div>
        </div>
      )}

      {/* Add/Edit Plot Modal */}
      {plotModal.open && (
        <PlotFormModal
          plot={plotModal.edit}
          onClose={() => setPlotModal({ open: false })}
          onSave={savePlot}
        />
      )}
    </div>
  );
}

// ── Plot Form Modal ─────────────────────────────────────────────────────────────

function PlotFormModal({
  plot,
  onClose,
  onSave,
}: {
  plot?: Plot;
  onClose: () => void;
  onSave: (data: Partial<Plot>) => Promise<void>;
}) {
  const trapRef = useFocusTrap(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    block: plot?.block || '',
    road: plot?.road || '',
    plotNumber: plot?.plotNumber || '',
    facing: plot?.facing || 'NORTH',
    dimensions: plot?.dimensions || '',
    area: plot?.area?.toString() || '',
    ratePerUnit: plot?.ratePerUnit?.toString() || '',
    isCorner: plot?.isCorner || false,
    isAvenue: plot?.isAvenue || false,
    roadWidth: plot?.roadWidth?.toString() || '',
    gpsLat: plot?.gpsLat?.toString() || '',
    gpsLng: plot?.gpsLng?.toString() || '',
  });

  function set(k: string, v: string | boolean) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.plotNumber.trim()) { toast.error('Plot number is required'); return; }
    const area = parseFloat(form.area);
    if (!form.area || isNaN(area) || area <= 0) { toast.error('Valid area is required'); return; }
    const rate = parseFloat(form.ratePerUnit);
    if (!form.ratePerUnit || isNaN(rate) || rate <= 0) { toast.error('Valid rate per unit is required'); return; }

    setSaving(true);
    try {
      await onSave({
        id: plot?.id,
        block: form.block.trim() || undefined,
        road: form.road.trim() || undefined,
        plotNumber: form.plotNumber.trim(),
        facing: form.facing,
        dimensions: form.dimensions.trim() || undefined,
        area,
        ratePerUnit: rate,
        isCorner: form.isCorner,
        isAvenue: form.isAvenue,
        roadWidth: form.roadWidth ? parseFloat(form.roadWidth) : undefined,
        gpsLat: form.gpsLat ? parseFloat(form.gpsLat) : undefined,
        gpsLng: form.gpsLng ? parseFloat(form.gpsLng) : undefined,
      });
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
          <h2 className="font-semibold text-gray-900">{plot ? 'Edit Plot' : 'Add Plot'}</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <form onSubmit={submit} noValidate className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Plot Number *">
              <input value={form.plotNumber} onChange={e => set('plotNumber', e.target.value)}
                className={inputCls} placeholder="B-101" />
            </Field>
            <Field label="Block">
              <input value={form.block} onChange={e => set('block', e.target.value)}
                className={inputCls} placeholder="A" />
            </Field>
            <Field label="Road">
              <input value={form.road} onChange={e => set('road', e.target.value)}
                className={inputCls} placeholder="Main Road" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Facing">
              <select value={form.facing} onChange={e => set('facing', e.target.value)} className={inputCls}>
                {PLOT_FACINGS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </Field>
            <Field label="Dimensions">
              <input value={form.dimensions} onChange={e => set('dimensions', e.target.value)}
                className={inputCls} placeholder="30x40" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Area (sq.yd) *">
              <input type="number" step="0.01" value={form.area} onChange={e => set('area', e.target.value)}
                className={inputCls} placeholder="1200" />
            </Field>
            <Field label="Rate per sq.yd (₹) *">
              <input type="number" step="0.01" value={form.ratePerUnit} onChange={e => set('ratePerUnit', e.target.value)}
                className={inputCls} placeholder="35000" />
            </Field>
          </div>

          <Field label="Road Width (ft)">
            <input type="number" value={form.roadWidth} onChange={e => set('roadWidth', e.target.value)}
              className={inputCls} placeholder="40" />
          </Field>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.isCorner} onChange={e => set('isCorner', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Corner Plot
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={form.isAvenue} onChange={e => set('isAvenue', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              Avenue Plot
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="GPS Latitude">
              <input type="number" step="any" value={form.gpsLat} onChange={e => set('gpsLat', e.target.value)}
                className={inputCls} placeholder="27.5833" />
            </Field>
            <Field label="GPS Longitude">
              <input type="number" step="any" value={form.gpsLng} onChange={e => set('gpsLng', e.target.value)}
                className={inputCls} placeholder="77.7000" />
            </Field>
          </div>

          {/* Total price preview */}
          {form.area && form.ratePerUnit && (
            <div className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">Total Price</p>
              <p className="text-lg font-bold text-blue-600">
                ₹{(parseFloat(form.area) * parseFloat(form.ratePerUnit)).toLocaleString('en-IN')}
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {plot ? 'Update Plot' : 'Add Plot'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Shared ──────────────────────────────────────────────────────────────────────

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      {children}
    </div>
  );
}
