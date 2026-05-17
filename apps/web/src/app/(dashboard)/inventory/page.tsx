'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Package, Plus, MapPin, Layers, Building, Home, X, Save, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';

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
  type: string;
  location: string;
  city: string;
  totalUnits: number;
  available: number;
  blocked: number;
  booked: number;
  sold: number;
  pricePerSqft: string | null;
  reraNumber: string | null;
  description: string | null;
  isActive: boolean;
}

export default function InventoryPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Project | null>(null);
  const [showAdd, setShowAdd] = useState(false);

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
              onClick={() => setSelected(project)}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md cursor-pointer transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-blue-500">{TYPE_ICONS[project.type] || <Package size={16} />}</span>
                    <span className="text-xs text-gray-400 uppercase tracking-wide">{project.type}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                    <MapPin size={10} />
                    <span>{project.location}</span>
                  </div>
                </div>
                {project.pricePerSqft && (
                  <div className="text-right">
                    <p className="text-sm font-bold text-blue-600">
                      ₹{Number(project.pricePerSqft).toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-400">per sq.ft</p>
                  </div>
                )}
              </div>

              {/* Unit status bar */}
              <div className="mt-3">
                <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
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
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <span>{project.totalUnits} total units</span>
                  <span className="text-green-600 font-medium">{project.available} available</span>
                </div>
              </div>

              {/* Status pills */}
              <div className="flex gap-3 mt-3 flex-wrap">
                {(Object.keys(STATUS_COLORS) as Array<keyof typeof STATUS_COLORS>).map(status => {
                  const val = project[status];
                  if (!val) return null;
                  return (
                    <span key={status} className="flex items-center gap-1 text-xs text-gray-600">
                      <span className={cn('w-2 h-2 rounded-full inline-block', STATUS_COLORS[status])} />
                      {val} {status}
                    </span>
                  );
                })}
              </div>

              {project.reraNumber && (
                <p className="text-xs text-gray-300 mt-3">RERA: {project.reraNumber}</p>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {selected && (
        <UnitGridModal project={selected} onClose={() => setSelected(null)} />
      )}

      {showAdd && (
        <AddProjectModal
          onClose={() => setShowAdd(false)}
          onCreated={() => { setShowAdd(false); load(); }}
        />
      )}
    </div>
  );
}

function AddProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'PLOT',
    location: '',
    city: 'Jaipur',
    totalUnits: '',
    pricePerSqft: '',
    reraNumber: '',
    description: '',
  });

  function set(k: string, v: string) {
    setForm(prev => ({ ...prev, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.location.trim() || !form.totalUnits) {
      toast.error('Name, location, and total units are required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/inventory', {
        name: form.name.trim(),
        type: form.type,
        location: form.location.trim(),
        city: form.city.trim(),
        totalUnits: Number(form.totalUnits),
        pricePerSqft: form.pricePerSqft ? Number(form.pricePerSqft) : undefined,
        reraNumber: form.reraNumber.trim() || undefined,
        description: form.description.trim() || undefined,
      });
      toast.success('Project added');
      onCreated();
    } catch {
      toast.error('Failed to add project');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Add New Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Project Name *</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nidhivan Valley Phase 2"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={form.type}
                onChange={e => set('type', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
              <input
                value={form.city}
                onChange={e => set('city', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Jaipur"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Location *</label>
              <input
                value={form.location}
                onChange={e => set('location', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ajmer Road, Jaipur"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Units *</label>
              <input
                type="number"
                value={form.totalUnits}
                onChange={e => set('totalUnits', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="120"
                min="1"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Price per sq.ft (₹)</label>
              <input
                type="number"
                value={form.pricePerSqft}
                onChange={e => set('pricePerSqft', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2800"
                min="0"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">RERA Number</label>
              <input
                value={form.reraNumber}
                onChange={e => set('reraNumber', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="RAJ/2024/001"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Optional project description…"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save Project
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function UnitGridModal({ project, onClose }: { project: Project; onClose: () => void }) {
  const units = Array.from({ length: project.totalUnits }, (_, i) => {
    const status =
      i < project.sold ? 'sold' :
      i < project.sold + project.booked ? 'booked' :
      i < project.sold + project.booked + project.blocked ? 'blocked' :
      'available';
    return { id: i + 1, number: `${Math.floor(i / 20) + 1}-${(i % 20) + 1}`, status };
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">{project.name} — Unit Grid</h2>
            <p className="text-xs text-gray-400">{project.totalUnits} units · {project.location}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 flex gap-4 text-xs border-b border-gray-50">
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <span key={s} className="flex items-center gap-1.5 capitalize">
              <span className={cn('w-3 h-3 rounded', c)} />{s}
            </span>
          ))}
        </div>

        <div className="overflow-y-auto p-5">
          <div className="grid grid-cols-10 gap-1.5">
            {units.map(unit => (
              <div
                key={unit.id}
                title={`Unit ${unit.number} — ${unit.status}`}
                className={cn(
                  'w-full aspect-square rounded flex items-center justify-center text-[9px] font-medium cursor-default hover:opacity-80 transition text-white',
                  STATUS_COLORS[unit.status as keyof typeof STATUS_COLORS]
                )}
              >
                {unit.id}
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
