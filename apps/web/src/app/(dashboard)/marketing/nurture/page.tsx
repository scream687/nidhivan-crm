'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Megaphone, Plus, Trash2, Loader2 } from 'lucide-react';

const STAGES = ['NEW','CONTACTED','INTERESTED','SITE_VISIT_SCHEDULED','SITE_VISIT_DONE','NEGOTIATION','CLOSED_WON','CLOSED_LOST'];
const STEP_TYPES = ['EMAIL', 'WHATSAPP'];

function StepRow({ step, onChange, onRemove }: { step: any; onChange: (s: any) => void; onRemove: () => void }) {
  return (
    <div className="flex gap-3 items-start bg-gray-50 rounded-lg p-3">
      <div className="flex-1 grid grid-cols-3 gap-2">
        <div>
          <label className="text-xs text-gray-500">Delay (days)</label>
          <input type="number" min={0} value={step.delayDays ?? 0}
            onChange={e => onChange({ ...step, delayDays: Number(e.target.value) })}
            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <div>
          <label className="text-xs text-gray-500">Type</label>
          <select value={step.type} onChange={e => onChange({ ...step, type: e.target.value })}
            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500">
            {STEP_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">Template</label>
          <input value={step.template ?? ''} onChange={e => onChange({ ...step, template: e.target.value })}
            placeholder="Hi {{name}}…"
            className="w-full mt-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
      </div>
      <button onClick={onRemove} className="mt-6 text-gray-400 hover:text-red-500 transition">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function NewSequenceModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [triggerStage, setTriggerStage] = useState(STAGES[0]);
  const [steps, setSteps] = useState([{ delayDays: 0, type: 'EMAIL', template: '' }]);
  const [saving, setSaving] = useState(false);

  function addStep() { setSteps(s => [...s, { delayDays: 1, type: 'EMAIL', template: '' }]); }
  function updateStep(i: number, s: any) { setSteps(prev => prev.map((p, idx) => idx === i ? s : p)); }
  function removeStep(i: number) { setSteps(s => s.filter((_, idx) => idx !== i)); }

  async function save() {
    if (!name.trim()) { toast.error('Name required'); return; }
    setSaving(true);
    try {
      await api.post('/marketing/nurture', { name, triggerStage, steps });
      toast.success('Sequence created');
      onSaved();
      onClose();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">New Nurture Sequence</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Post Site Visit Follow-Up"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Trigger Stage</label>
            <select value={triggerStage} onChange={e => setTriggerStage(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Steps</label>
              <button onClick={addStep} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add step
              </button>
            </div>
            <div className="space-y-2">
              {steps.map((s, i) => <StepRow key={i} step={s} onChange={ns => updateStep(i, ns)} onRemove={() => removeStep(i)} />)}
            </div>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NurturePage() {
  const [sequences, setSequences] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    try { const { data } = await api.get('/marketing/nurture'); setSequences(data); }
    finally { setLoading(false); }
  }

  async function toggle(id: string, isActive: boolean) {
    await api.patch(`/marketing/nurture/${id}`, { isActive: !isActive });
    load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Megaphone className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Nurture Sequences</h1>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus className="w-4 h-4" /> New Sequence
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : sequences.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No sequences yet</p>
          <p className="text-sm mt-1">Auto-message leads when they enter a stage</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sequences.map((seq: any) => (
            <div key={seq.id} className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{seq.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Triggers when stage → <span className="font-medium text-blue-600">{seq.triggerStage.replace(/_/g, ' ')}</span>
                  {' · '}{(seq.steps as any[]).length} steps
                  {' · '}{seq._count?.enrollments ?? 0} enrolled
                </p>
              </div>
              <button onClick={() => toggle(seq.id, seq.isActive)}
                className={`w-11 h-6 rounded-full transition relative flex-shrink-0 ${seq.isActive ? 'bg-blue-600' : 'bg-gray-200'}`}>
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${seq.isActive ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          ))}
        </div>
      )}
      {showModal && <NewSequenceModal onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  );
}
