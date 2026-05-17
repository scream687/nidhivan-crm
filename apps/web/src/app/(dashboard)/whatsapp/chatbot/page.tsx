'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Bot, Plus, Trash2, Loader2, MessageSquare } from 'lucide-react';

const MATCH_TYPES = [
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'EXACT', label: 'Exact match' },
  { value: 'STARTS_WITH', label: 'Starts with' },
];

function AddRuleModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [keyword, setKeyword] = useState('');
  const [response, setResponse] = useState('');
  const [matchType, setMatchType] = useState('CONTAINS');
  const [priority, setPriority] = useState(0);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!keyword.trim()) { toast.error('Keyword required'); return; }
    if (!response.trim()) { toast.error('Response required'); return; }
    setSaving(true);
    try {
      await api.post('/whatsapp/chatbot-rules', { keyword, response, matchType, priority });
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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Keyword / Phrase *</label>
            <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="e.g. brochure, price, visit"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Match Type</label>
            <select value={matchType} onChange={e => setMatchType(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {MATCH_TYPES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {matchType === 'CONTAINS' && 'Triggers if message contains the keyword anywhere'}
              {matchType === 'EXACT' && 'Triggers only if the whole message matches exactly'}
              {matchType === 'STARTS_WITH' && 'Triggers if message starts with the keyword'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Auto-Reply Message *</label>
            <textarea value={response} onChange={e => setResponse(e.target.value)} rows={4}
              placeholder="Hi! Thanks for your message. Here is the brochure: [link]"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority (higher = checked first)</label>
            <input type="number" value={priority} onChange={e => setPriority(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
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

export default function ChatbotPage() {
  const [rules, setRules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  async function load() {
    try { const { data } = await api.get('/whatsapp/chatbot-rules'); setRules(data); }
    finally { setLoading(false); }
  }

  async function toggle(id: string, isActive: boolean) {
    await api.post(`/whatsapp/chatbot-rules/${id}`, { isActive: !isActive });
    load();
  }

  async function remove(id: string) {
    if (!confirm('Delete this rule?')) return;
    await api.post(`/whatsapp/chatbot-rules/${id}/delete`);
    toast.success('Deleted'); load();
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp Chatbot</h1>
            <p className="text-sm text-gray-500 mt-0.5">Keyword-based auto-replies for incoming WhatsApp messages</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <Plus className="w-4 h-4" /> New Rule
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-700">
        <strong>How it works:</strong> When a lead sends a WhatsApp message containing your keyword, the bot automatically replies with your message. Rules are checked in priority order — highest priority first.
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : rules.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No chatbot rules yet</p>
          <p className="text-sm mt-1">Add keyword rules to auto-respond to WhatsApp messages</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {rules.map((rule: any) => (
            <div key={rule.id} className={`flex items-start gap-4 p-4 ${!rule.isActive ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-sm font-mono">{rule.keyword}</span>
                  <span className="text-xs text-gray-400">{MATCH_TYPES.find(m => m.value === rule.matchType)?.label}</span>
                  <span className="text-xs text-gray-400">· Priority {rule.priority}</span>
                  <span className="text-xs text-gray-400">· {rule.hitCount} hits</span>
                </div>
                <p className="text-sm text-gray-600 truncate">{rule.response}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggle(rule.id, rule.isActive)}
                  className={`w-9 h-5 rounded-full transition relative ${rule.isActive ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${rule.isActive ? 'translate-x-4' : ''}`} />
                </button>
                <button onClick={() => remove(rule.id)} className="text-gray-400 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <AddRuleModal onClose={() => setShowModal(false)} onSaved={load} />}
    </div>
  );
}
