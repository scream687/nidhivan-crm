'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Bot, Plus, Trash2, Loader2, MessageSquare, GripVertical, GitBranch, Zap, ToggleLeft, ToggleRight, Pencil } from 'lucide-react';

const MATCH_TYPES = [
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'EXACT', label: 'Exact match' },
  { value: 'STARTS_WITH', label: 'Starts with' },
];

// ── Add Rule Modal ─────────────────────────────────────────────────────────────

function AddRuleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [keyword, setKeyword] = useState('');
  const [response, setResponse] = useState('');
  const [matchType, setMatchType] = useState('CONTAINS');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!keyword.trim()) { toast.error('Keyword required'); return; }
    if (!response.trim()) { toast.error('Response required'); return; }
    setSaving(true);
    try {
      await api.post('/whatsapp/chatbot-rules', { keyword, response, matchType });
      toast.success('Rule created');
      onSaved(); onClose();
    } catch { toast.error('Failed'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">New Chatbot Rule</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Keyword / Phrase *</label>
            <input value={keyword} onChange={e => setKeyword(e.target.value)}
              placeholder="e.g. brochure, price, visit"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Match Type</label>
            <select value={matchType} onChange={e => setMatchType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {MATCH_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Auto-Reply Message *</label>
            <textarea value={response} onChange={e => setResponse(e.target.value)} rows={4}
              placeholder="Hi! Thanks for your message. Here is the brochure: [link]"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Rule
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New Flow Modal ─────────────────────────────────────────────────────────────

function NewFlowModal({ onClose, onSaved }: { onClose: () => void; onSaved: (id: string) => void }) {
  const [name, setName] = useState('');
  const [triggerKeyword, setTriggerKeyword] = useState('');
  const [matchType, setMatchType] = useState('CONTAINS');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) { toast.error('Name required'); return; }
    if (!triggerKeyword.trim()) { toast.error('Trigger keyword required'); return; }
    setSaving(true);
    try {
      const { data } = await api.post('/whatsapp/chatbot-flows', { name, triggerKeyword, matchType });
      toast.success('Flow created');
      onSaved(data.id);
    } catch { toast.error('Failed to create flow'); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">New Conversation Flow</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Flow Name *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Property Inquiry Flow"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Trigger Keyword *</label>
            <input value={triggerKeyword} onChange={e => setTriggerKeyword(e.target.value)}
              placeholder="e.g. hello, interested, property"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <p className="text-xs text-gray-400 mt-1">When a contact sends this keyword, this flow starts</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Match Type</label>
            <select value={matchType} onChange={e => setMatchType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {MATCH_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-lg text-sm">Cancel</button>
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Create & Edit
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sortable Rule Row ──────────────────────────────────────────────────────────

function SortableRule({
  rule, onToggle, onDelete,
}: {
  rule: any;
  onToggle: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: rule.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-3 p-4 bg-white rounded-xl border transition-shadow
        ${isDragging ? 'shadow-xl border-blue-300 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-300'}
        ${!rule.isActive ? 'opacity-50' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing touch-none flex-shrink-0"
        title="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <code className="text-sm font-semibold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
            {rule.keyword}
          </code>
          <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
            {MATCH_TYPES.find(m => m.value === rule.matchType)?.label}
          </span>
          {rule.hitCount > 0 && (
            <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">
              {rule.hitCount} hits
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 line-clamp-2">{rule.response}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onToggle(rule.id, rule.isActive)}
          className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${rule.isActive ? 'bg-blue-600' : 'bg-gray-200'}`}
          title={rule.isActive ? 'Disable' : 'Enable'}
        >
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.isActive ? 'translate-x-4' : ''}`} />
        </button>
        <button onClick={() => onDelete(rule.id)} className="text-gray-300 hover:text-red-500 transition p-0.5">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Flows Tab ──────────────────────────────────────────────────────────────────

function FlowsTab() {
  const router = useRouter();
  const [flows, setFlows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    try { const { data } = await api.get('/whatsapp/chatbot-flows'); setFlows(data); }
    finally { setLoading(false); }
  }

  async function toggle(id: string) {
    await api.patch(`/whatsapp/chatbot-flows/${id}/toggle`);
    setFlows(f => f.map(x => x.id === id ? { ...x, isActive: !x.isActive } : x));
  }

  async function remove(id: string, name: string) {
    if (!confirm(`Delete flow "${name}"?`)) return;
    await api.delete(`/whatsapp/chatbot-flows/${id}`);
    setFlows(f => f.filter(x => x.id !== id));
    toast.success('Deleted');
  }

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Visual multi-step conversation flows — flows take priority over Quick Rules</p>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus className="w-4 h-4" /> New Flow
        </button>
      </div>

      {flows.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GitBranch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No flows yet</p>
          <p className="text-sm mt-1">Create a flow to design multi-step WhatsApp conversations visually</p>
          <button onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            <Plus className="w-4 h-4" /> Create your first flow
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {flows.map(flow => (
            <div key={flow.id}
              className={`bg-white border rounded-xl p-4 flex items-start gap-4 transition ${flow.isActive ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                <GitBranch className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 truncate">{flow.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${flow.isActive ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {flow.isActive ? 'ACTIVE' : 'PAUSED'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <code className="text-gray-600">&quot;{flow.triggerKeyword}&quot;</code>
                    <span>{MATCH_TYPES.find(m => m.value === flow.matchType)?.label}</span>
                  </span>
                  {flow.sessionCount > 0 && (
                    <span>{flow.sessionCount} sessions</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button onClick={() => router.push(`/whatsapp/chatbot/flows/${flow.id}`)}
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => toggle(flow.id)}
                  className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                  title={flow.isActive ? 'Pause' : 'Activate'}>
                  {flow.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                </button>
                <button onClick={() => remove(flow.id, flow.name)}
                  className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NewFlowModal
          onClose={() => setShowModal(false)}
          onSaved={(flowId) => {
            setShowModal(false);
            router.push(`/whatsapp/chatbot/flows/${flowId}`);
          }}
        />
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function ChatbotPage() {
  const [tab, setTab] = useState<'rules' | 'flows'>('flows');
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  async function load() {
    try {
      const { data } = await api.get('/whatsapp/chatbot-rules');
      setRules(data);
    } finally { setLoading(false); }
  }

  async function toggle(id: string, isActive: boolean) {
    setRules(r => r.map(x => x.id === id ? { ...x, isActive: !isActive } : x));
    await api.post(`/whatsapp/chatbot-rules/${id}`, { isActive: !isActive });
  }

  async function remove(id: string) {
    if (!confirm('Delete this rule?')) return;
    setRules(r => r.filter(x => x.id !== id));
    await api.post(`/whatsapp/chatbot-rules/${id}/delete`);
    toast.success('Deleted');
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = rules.findIndex(r => r.id === active.id);
    const newIndex = rules.findIndex(r => r.id === over.id);
    const reordered = arrayMove(rules, oldIndex, newIndex);
    setRules(reordered);

    setSaving(true);
    try {
      await api.post('/whatsapp/chatbot-rules/reorder', { ids: reordered.map(r => r.id) });
    } catch { toast.error('Failed to save order'); load(); }
    finally { setSaving(false); }
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Chatbot</h1>
            <p className="text-sm text-gray-500">Visual flows & keyword auto-replies</p>
          </div>
        </div>
        {tab === 'rules' && (
          <div className="flex items-center gap-2">
            {saving && <span className="text-xs text-gray-400 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
              <Plus className="w-4 h-4" /> New Rule
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6">
        <button
          onClick={() => setTab('flows')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition ${tab === 'flows' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <GitBranch className="w-4 h-4" /> Flows
          <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded font-semibold">NEW</span>
        </button>
        <button
          onClick={() => setTab('rules')}
          className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition ${tab === 'rules' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <MessageSquare className="w-4 h-4" /> Quick Rules
        </button>
      </div>

      {/* Flows tab */}
      {tab === 'flows' && <FlowsTab />}

      {/* Quick Rules tab */}
      {tab === 'rules' && (
        <>
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 mb-5 text-sm text-blue-700 flex items-start gap-2">
            <GripVertical className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" />
            <span>
              Drag rules to reorder — rules at the <strong>top</strong> have higher priority and are checked first.
              Flows (above tab) take priority over all quick rules.
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
            </div>
          ) : rules.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No quick rules yet</p>
              <p className="text-sm mt-1">Add simple keyword rules for instant single-message replies</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={rules.map(r => r.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {rules.map((rule, i) => (
                    <div key={rule.id} className="flex items-start gap-2">
                      <span className="text-xs text-gray-300 font-mono mt-5 w-4 text-right flex-shrink-0">{i + 1}</span>
                      <div className="flex-1">
                        <SortableRule rule={rule} onToggle={toggle} onDelete={remove} />
                      </div>
                    </div>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      {showModal && <AddRuleModal onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  );
}
