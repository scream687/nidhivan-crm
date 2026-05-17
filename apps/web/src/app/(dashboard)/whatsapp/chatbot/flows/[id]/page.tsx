'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ReactFlow,
  addEdge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  MarkerType,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { TriggerNode } from '@/components/chatbot/nodes/TriggerNode';
import { MessageNode } from '@/components/chatbot/nodes/MessageNode';
import { QuestionNode } from '@/components/chatbot/nodes/QuestionNode';
import { ConditionNode } from '@/components/chatbot/nodes/ConditionNode';
import { ActionNode } from '@/components/chatbot/nodes/ActionNode';
import { EndNode } from '@/components/chatbot/nodes/EndNode';

const nodeTypes = {
  trigger: TriggerNode,
  message: MessageNode,
  question: QuestionNode,
  condition: ConditionNode,
  action: ActionNode,
  end: EndNode,
};

const PALETTE = [
  { type: 'message', label: 'Message', color: 'bg-blue-100 text-blue-700 border-blue-200', desc: 'Bot sends text' },
  { type: 'question', label: 'Question', color: 'bg-purple-100 text-purple-700 border-purple-200', desc: 'Ask & wait for reply' },
  { type: 'condition', label: 'Condition', color: 'bg-amber-100 text-amber-700 border-amber-200', desc: 'Branch on keyword' },
  { type: 'action', label: 'Action', color: 'bg-gray-100 text-gray-700 border-gray-200', desc: 'CRM action' },
  { type: 'end', label: 'End', color: 'bg-red-100 text-red-600 border-red-200', desc: 'Finish conversation' },
];

const STAGES = ['NEW','CONTACTED','INTERESTED','SITE_VISIT_SCHEDULED','SITE_VISIT_DONE','NEGOTIATION','CLOSED_WON','CLOSED_LOST'];
const MATCH_TYPES = ['CONTAINS','EXACT','STARTS_WITH'];
const ACTION_TYPES = ['ASSIGN_LEAD','CHANGE_STAGE','NOTIFY_AGENT'];

// ── Property Panel ────────────────────────────────────────────────────────────

function PropertyPanel({ node, onChange, onDelete }: {
  node: Node | null;
  onChange: (id: string, data: Record<string, any>) => void;
  onDelete: (id: string) => void;
}) {
  if (!node) {
    return (
      <div className="w-64 border-l border-gray-100 bg-gray-50 flex items-center justify-center p-6">
        <p className="text-sm text-gray-400 text-center">Click a node to edit its properties</p>
      </div>
    );
  }

  const d = node.data as Record<string, any>;

  function set(key: string, value: any) {
    onChange(node.id, { ...d, [key]: value });
  }

  return (
    <div className="w-72 border-l border-gray-100 bg-white overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-800 capitalize">{node.type} Node</span>
        {node.type !== 'trigger' && (
          <button onClick={() => onDelete(node.id)} className="text-gray-300 hover:text-red-500 transition">
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 space-y-4 flex-1">
        {/* Trigger */}
        {node.type === 'trigger' && (
          <>
            <Field label="Trigger Keyword *">
              <input value={d.keyword ?? ''} onChange={e => set('keyword', e.target.value)}
                placeholder="e.g. hello, brochure, price"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400" />
            </Field>
            <Field label="Match Type">
              <select value={d.matchType ?? 'CONTAINS'} onChange={e => set('matchType', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400">
                {MATCH_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
          </>
        )}

        {/* Message */}
        {node.type === 'message' && (
          <Field label="Message Text *">
            <textarea value={d.text ?? ''} onChange={e => set('text', e.target.value)} rows={4}
              placeholder="Hi {{name}}, thanks for reaching out!"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            <p className="text-[11px] text-gray-400 mt-1">Use {'{{name}}'} for contact name</p>
          </Field>
        )}

        {/* Question */}
        {node.type === 'question' && (
          <>
            <Field label="Question Text *">
              <textarea value={d.text ?? ''} onChange={e => set('text', e.target.value)} rows={3}
                placeholder="What is your budget range?"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none" />
            </Field>
            <Field label="Save reply as variable">
              <input value={d.variableName ?? ''} onChange={e => set('variableName', e.target.value)}
                placeholder="e.g. budget"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </Field>
            <Field label="Quick Reply Buttons (optional)">
              <div className="space-y-1.5">
                {(d.buttons ?? []).map((b: string, i: number) => (
                  <div key={i} className="flex gap-1">
                    <input value={b} onChange={e => {
                      const btns = [...(d.buttons ?? [])];
                      btns[i] = e.target.value;
                      set('buttons', btns);
                    }} placeholder={`Button ${i + 1}`}
                      className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400" />
                    <button onClick={() => set('buttons', (d.buttons ?? []).filter((_: any, j: number) => j !== i))}
                      className="text-gray-300 hover:text-red-400 transition px-1">×</button>
                  </div>
                ))}
                <button onClick={() => set('buttons', [...(d.buttons ?? []), ''])}
                  className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add button
                </button>
              </div>
            </Field>
          </>
        )}

        {/* Condition */}
        {node.type === 'condition' && (
          <Field label="Branches">
            <div className="space-y-2">
              {(d.branches ?? []).map((b: any, i: number) => (
                <div key={i} className="bg-amber-50 border border-amber-100 rounded-lg p-2 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-medium text-amber-700">Branch {i + 1}</span>
                    <button onClick={() => set('branches', (d.branches ?? []).filter((_: any, j: number) => j !== i))}
                      className="text-gray-300 hover:text-red-400 transition text-xs">×</button>
                  </div>
                  <input value={b.keyword ?? ''} onChange={e => {
                    const branches = [...(d.branches ?? [])];
                    branches[i] = { ...branches[i], keyword: e.target.value };
                    set('branches', branches);
                  }} placeholder="Keyword" className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400" />
                  <div className="flex gap-1">
                    <select value={b.matchType ?? 'CONTAINS'} onChange={e => {
                      const branches = [...(d.branches ?? [])];
                      branches[i] = { ...branches[i], matchType: e.target.value };
                      set('branches', branches);
                    }} className="flex-1 px-1.5 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400">
                      {MATCH_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <input value={b.label ?? ''} onChange={e => {
                    const branches = [...(d.branches ?? [])];
                    branches[i] = { ...branches[i], label: e.target.value };
                    set('branches', branches);
                  }} placeholder="Edge label (e.g. Yes, 50L+)" className="w-full px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-amber-400" />
                </div>
              ))}
              <button onClick={() => set('branches', [...(d.branches ?? []), { keyword: '', matchType: 'CONTAINS', label: '' }])}
                className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add branch
              </button>
            </div>
          </Field>
        )}

        {/* Action */}
        {node.type === 'action' && (
          <>
            <Field label="Action Type">
              <select value={d.actionType ?? ''} onChange={e => set('actionType', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="">— Select —</option>
                {ACTION_TYPES.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
              </select>
            </Field>
            {d.actionType === 'CHANGE_STAGE' && (
              <Field label="Target Stage">
                <select value={d.config?.stage ?? ''} onChange={e => set('config', { ...d.config, stage: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400">
                  <option value="">— Select stage —</option>
                  {STAGES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </Field>
            )}
          </>
        )}

        {/* End */}
        {node.type === 'end' && (
          <Field label="Farewell Message (optional)">
            <textarea value={d.text ?? ''} onChange={e => set('text', e.target.value)} rows={3}
              placeholder="Thank you! Our team will reach out soon."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
          </Field>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ── Main Canvas Page ──────────────────────────────────────────────────────────

let nodeIdCounter = 100;
function newId() { return `node-${++nodeIdCounter}`; }

export default function FlowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [flowName, setFlowName] = useState('');
  const [triggerKeyword, setTriggerKeyword] = useState('');
  const [matchType, setMatchType] = useState('CONTAINS');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get(`/whatsapp/chatbot-flows/${id}`).then(({ data }) => {
      setFlowName(data.name);
      setTriggerKeyword(data.triggerKeyword);
      setMatchType(data.matchType);
      setNodes((data.nodes as Node[]) ?? []);
      setEdges((data.edges as Edge[]) ?? []);
    }).catch(() => toast.error('Failed to load flow'))
      .finally(() => setLoading(false));
  }, [id]);

  const onConnect = useCallback((connection: Connection) => {
    setEdges(eds => addEdge({
      ...connection,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2 },
    }, eds));
  }, [setEdges]);

  function addNode(type: string) {
    const id = newId();
    const centerX = (reactFlowWrapper.current?.clientWidth ?? 600) / 2 - 100;
    const centerY = (reactFlowWrapper.current?.clientHeight ?? 400) / 2;
    const newNode: Node = {
      id,
      type,
      position: { x: centerX + Math.random() * 60 - 30, y: centerY + Math.random() * 60 - 30 },
      data: {},
    };
    setNodes(nds => [...nds, newNode]);
    setSelectedNodeId(id);
  }

  function updateNodeData(nodeId: string, data: Record<string, any>) {
    setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data } : n));
    // Sync trigger keyword to flow header if trigger node changed
    if (nodes.find(n => n.id === nodeId)?.type === 'trigger') {
      if (data.keyword) setTriggerKeyword(data.keyword);
      if (data.matchType) setMatchType(data.matchType);
    }
  }

  function deleteNode(nodeId: string) {
    setNodes(nds => nds.filter(n => n.id !== nodeId));
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNodeId(null);
  }

  async function save() {
    setSaving(true);
    try {
      await api.put(`/whatsapp/chatbot-flows/${id}`, {
        name: flowName,
        triggerKeyword,
        matchType,
        nodes,
        edges,
      });
      toast.success('Flow saved');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-200 bg-white z-10 flex-shrink-0">
        <button onClick={() => router.push('/whatsapp/chatbot')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="w-px h-4 bg-gray-200" />
        <input
          value={flowName}
          onChange={e => setFlowName(e.target.value)}
          className="text-sm font-semibold text-gray-900 bg-transparent border-none outline-none focus:bg-gray-50 focus:px-2 rounded transition w-48"
          placeholder="Flow name"
        />
        <div className="flex-1" />
        <span className="text-xs text-gray-400 hidden sm:block">Trigger: <strong>{triggerKeyword || '—'}</strong></span>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Left palette */}
        <div className="w-48 border-r border-gray-100 bg-gray-50 flex flex-col flex-shrink-0 overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-3 pt-3 pb-2">Add Node</p>
          <div className="px-2 space-y-1.5 pb-4">
            {PALETTE.map(item => (
              <button
                key={item.type}
                onClick={() => addNode(item.type)}
                className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm font-medium transition hover:shadow-sm ${item.color}`}
              >
                <div>{item.label}</div>
                <div className="text-[10px] opacity-70 font-normal mt-0.5">{item.desc}</div>
              </button>
            ))}
          </div>

          <div className="mt-auto border-t border-gray-200 px-3 py-3 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Trigger</p>
            <input value={triggerKeyword} onChange={e => {
              setTriggerKeyword(e.target.value);
              setNodes(nds => nds.map(n => n.type === 'trigger' ? { ...n, data: { ...n.data, keyword: e.target.value } } : n));
            }} placeholder="Trigger keyword"
              className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400" />
            <select value={matchType} onChange={e => {
              setMatchType(e.target.value);
              setNodes(nds => nds.map(n => n.type === 'trigger' ? { ...n, data: { ...n.data, matchType: e.target.value } } : n));
            }} className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-blue-400">
              {MATCH_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
            fitView
            defaultEdgeOptions={{
              markerEnd: { type: MarkerType.ArrowClosed },
              style: { strokeWidth: 2, stroke: '#94a3b8' },
            }}
          >
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
            <Controls />
            <MiniMap nodeColor={(n) => {
              const colors: Record<string, string> = { trigger: '#22c55e', message: '#3b82f6', question: '#a855f7', condition: '#f59e0b', action: '#6b7280', end: '#f87171' };
              return colors[n.type ?? ''] ?? '#94a3b8';
            }} pannable zoomable />
          </ReactFlow>

          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-400">
                <p className="text-lg font-medium">Empty canvas</p>
                <p className="text-sm mt-1">Add nodes from the left panel to build your flow</p>
              </div>
            </div>
          )}
        </div>

        {/* Right property panel */}
        <PropertyPanel
          node={selectedNode}
          onChange={updateNodeData}
          onDelete={deleteNode}
        />
      </div>
    </div>
  );
}
