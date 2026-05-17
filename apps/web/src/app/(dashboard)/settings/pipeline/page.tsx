'use client';
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GitBranch, Plus, Trash2, GripVertical, Edit2, Check, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { cn } from '@/lib/utils';

type Stage = {
  id: string;
  name: string;
  label: string;
  color: string;
  bgColor: string;
  order: number;
  isDefault: boolean;
  isWon: boolean;
  isLost: boolean;
  isSystem: boolean;
  isActive: boolean;
};

const PRESET_COLORS = [
  { color: '#3b82f6', bg: '#eff6ff' },
  { color: '#10b981', bg: '#ecfdf5' },
  { color: '#ef4444', bg: '#fef2f2' },
  { color: '#f59e0b', bg: '#fffbeb' },
  { color: '#8b5cf6', bg: '#f5f3ff' },
  { color: '#06b6d4', bg: '#ecfeff' },
  { color: '#f97316', bg: '#fff7ed' },
  { color: '#a855f7', bg: '#faf5ff' },
  { color: '#64748b', bg: '#f8fafc' },
  { color: '#6b7280', bg: '#f9fafb' },
];

function ColorPicker({ color, bgColor, onChange }: { color: string; bgColor: string; onChange: (c: string, bg: string) => void }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {PRESET_COLORS.map((p) => (
        <button
          key={p.color}
          type="button"
          onClick={() => onChange(p.color, p.bg)}
          className={cn('w-5 h-5 rounded-full border-2 transition', color === p.color ? 'border-gray-900 scale-110' : 'border-transparent')}
          style={{ backgroundColor: p.color }}
        />
      ))}
    </div>
  );
}

function StageRow({ stage, onUpdate, onDelete, onDragStart, onDragOver, onDrop }: {
  stage: Stage;
  onUpdate: (id: string, data: Partial<Stage>) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(stage.label);
  const [color, setColor] = useState(stage.color);
  const [bgColor, setBgColor] = useState(stage.bgColor);

  function save() {
    onUpdate(stage.id, { label, color, bgColor });
    setEditing(false);
  }

  function cancel() {
    setLabel(stage.label);
    setColor(stage.color);
    setBgColor(stage.bgColor);
    setEditing(false);
  }

  return (
    <div
      draggable
      onDragStart={() => onDragStart(stage.id)}
      onDragOver={onDragOver}
      onDrop={() => onDrop(stage.id)}
      className="bg-white border border-gray-200 rounded-lg p-3 flex items-center gap-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition"
    >
      <GripVertical size={14} className="text-gray-300 flex-shrink-0" />

      <span
        className="px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0"
        style={{ color: stage.color, backgroundColor: stage.bgColor }}
      >
        {stage.label}
      </span>

      {editing ? (
        <div className="flex-1 space-y-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <ColorPicker color={color} bgColor={bgColor} onChange={(c, bg) => { setColor(c); setBgColor(bg); }} />
        </div>
      ) : (
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700">{stage.label}</p>
          <p className="text-xs text-gray-400 font-mono">{stage.name}</p>
        </div>
      )}

      <div className="flex items-center gap-2 flex-shrink-0">
        {stage.isWon && <span className="text-xs bg-green-100 text-green-600 px-1.5 py-0.5 rounded">Won</span>}
        {stage.isLost && <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Lost</span>}
        {stage.isSystem && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">System</span>}

        <button
          onClick={() => onUpdate(stage.id, { isActive: !stage.isActive })}
          className={cn('w-8 h-4 rounded-full transition-colors', stage.isActive ? 'bg-blue-500' : 'bg-gray-200')}
        >
          <div className={cn('w-3 h-3 bg-white rounded-full mx-0.5 transition-transform', stage.isActive ? 'translate-x-4' : 'translate-x-0')} />
        </button>

        {editing ? (
          <>
            <button onClick={save} className="text-green-500 hover:text-green-600"><Check size={14} /></button>
            <button onClick={cancel} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
          </>
        ) : (
          <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-blue-500"><Edit2 size={13} /></button>
        )}

        {!stage.isSystem && (
          <button onClick={() => onDelete(stage.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={13} /></button>
        )}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [newBgColor, setNewBgColor] = useState('#f3f4f6');
  const [newIsWon, setNewIsWon] = useState(false);
  const [newIsLost, setNewIsLost] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.get('/stages');
      setStages(r.data);
    } catch {
      toast.error('Failed to load stages');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleUpdate(id: string, data: Partial<Stage>) {
    try {
      const r = await api.patch(`/stages/${id}`, data);
      setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...r.data } : s)));
      toast.success('Stage updated');
    } catch {
      toast.error('Failed to update stage');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this stage? This cannot be undone.')) return;
    try {
      await api.delete(`/stages/${id}`);
      setStages((prev) => prev.filter((s) => s.id !== id));
      toast.success('Stage deleted');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to delete stage');
    }
  }

  async function handleCreate() {
    if (!newLabel.trim()) { toast.error('Label is required'); return; }
    setSaving(true);
    try {
      await api.post('/stages', {
        name: newLabel.toUpperCase().replace(/\s+/g, '_'),
        label: newLabel,
        color: newColor,
        bgColor: newBgColor,
        isWon: newIsWon,
        isLost: newIsLost,
      });
      setNewLabel(''); setNewColor('#6b7280'); setNewBgColor('#f3f4f6');
      setNewIsWon(false); setNewIsLost(false); setShowNew(false);
      await load();
      toast.success('Stage created');
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to create stage');
    } finally {
      setSaving(false);
    }
  }

  function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const reordered = [...stages];
    const fromIdx = reordered.findIndex((s) => s.id === dragId);
    const toIdx = reordered.findIndex((s) => s.id === targetId);
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    const withOrder = reordered.map((s, i) => ({ ...s, order: i }));
    setStages(withOrder);
    setDragId(null);
    api.patch('/stages/reorder', { items: withOrder.map((s) => ({ id: s.id, order: s.order })) })
      .catch(() => { toast.error('Failed to save order'); load(); });
  }

  return (
    <div className="p-6 max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch size={20} className="text-blue-600" />
          <h1 className="text-lg font-bold text-gray-900">Pipeline Stages</h1>
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3.5 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
          <Plus size={14} /> Add Stage
        </button>
      </div>

      <p className="text-sm text-gray-500">Drag to reorder. Toggle the switch to show/hide a stage. System stages cannot be deleted.</p>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-600" /></div>
      ) : (
        <div className="space-y-2">
          {stages.map((stage) => (
            <StageRow
              key={stage.id}
              stage={stage}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
              onDragStart={setDragId}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showNew && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-white border-2 border-blue-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-900">New Stage</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Label *</label>
                <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="e.g. Follow Up" className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Color</label>
                <ColorPicker color={newColor} bgColor={newBgColor} onChange={(c, bg) => { setNewColor(c); setNewBgColor(bg); }} />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={newIsWon} onChange={(e) => setNewIsWon(e.target.checked)} className="rounded" />
                Mark as Won
              </label>
              <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
                <input type="checkbox" checked={newIsLost} onChange={(e) => setNewIsLost(e.target.checked)} className="rounded" />
                Mark as Lost
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowNew(false)} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleCreate} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                Create
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
