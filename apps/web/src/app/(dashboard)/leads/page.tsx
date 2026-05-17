'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadsStore } from '@/stores/leadsStore';
import { LeadKanbanBoard } from '@/components/leads/LeadKanbanBoard';
import { cn } from '@/lib/utils';
import { LEAD_SOURCE_LABELS, LeadSource } from '@nidhivan/shared';
import { Plus, Search, Filter, Download, Upload, Kanban, List, X, Save, Bookmark, ChevronDown } from 'lucide-react';
import CreateLeadModal from '@/components/leads/CreateLeadModal';
import ImportLeadsModal from '@/components/leads/ImportLeadsModal';
import api from '@/lib/api';
import toast from 'react-hot-toast';

type ViewMode = 'kanban' | 'list';

type Stage = { id: string; name: string; label: string; color: string; bgColor: string };
type SavedFilter = { id: string; name: string; filters: any; isShared: boolean; user?: { name: string } };

const SOURCES = Object.values(LeadSource);

export default function LeadsPage() {
  const { kanban, leads, total, isLoading, fetchKanban, fetchLeads } = useLeadsStore();
  const [view, setView] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [stages, setStages] = useState<Stage[]>([]);
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [showSaveFilter, setShowSaveFilter] = useState(false);
  const [saveFilterName, setSaveFilterName] = useState('');
  const [showSavedMenu, setShowSavedMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Active filters
  const [filters, setFilters] = useState<{
    stages: string[]; source: string; assignedToId: string;
    isHot: string; city: string; budgetMin: string; budgetMax: string;
    dateFrom: string; dateTo: string;
  }>({ stages: [], source: '', assignedToId: '', isHot: '', city: '', budgetMin: '', budgetMax: '', dateFrom: '', dateTo: '' });

  const [agents, setAgents] = useState<any[]>([]);

  const activeFilterCount = [
    filters.stages.length > 0, filters.source, filters.isHot,
    filters.city, filters.budgetMin, filters.budgetMax, filters.dateFrom, filters.dateTo,
  ].filter(Boolean).length;

  const buildParams = useCallback(() => {
    const p: any = {};
    if (search) p.search = search;
    if (filters.stages.length) p.stages = filters.stages.join(',');
    if (filters.source) p.source = filters.source;
    if (filters.assignedToId) p.assignedToId = filters.assignedToId;
    if (filters.isHot === 'true') p.isHot = 'true';
    if (filters.isHot === 'false') p.isHot = 'false';
    if (filters.city) p.city = filters.city;
    if (filters.budgetMin) p.budgetMin = filters.budgetMin;
    if (filters.budgetMax) p.budgetMax = filters.budgetMax;
    if (filters.dateFrom) p.dateFrom = filters.dateFrom;
    if (filters.dateTo) p.dateTo = filters.dateTo;
    return p;
  }, [search, filters]);

  useEffect(() => {
    fetchKanban();
    fetchLeads();
    api.get('/stages/active').then(r => setStages(r.data)).catch(() => {});
    api.get('/saved-filters').then(r => setSavedFilters(r.data)).catch(() => {});
    api.get('/users').then(r => setAgents(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchLeads(buildParams()), 300);
    return () => clearTimeout(t);
  }, [search, filters]);

  function clearFilters() {
    setFilters({ stages: [], source: '', assignedToId: '', isHot: '', city: '', budgetMin: '', budgetMax: '', dateFrom: '', dateTo: '' });
  }

  function toggleStage(name: string) {
    setFilters(f => ({ ...f, stages: f.stages.includes(name) ? f.stages.filter(s => s !== name) : [...f.stages, name] }));
  }

  async function saveCurrentFilter() {
    if (!saveFilterName.trim()) { toast.error('Name required'); return; }
    try {
      const r = await api.post('/saved-filters', { name: saveFilterName, filters: { ...filters, search } });
      setSavedFilters(prev => [r.data, ...prev]);
      setSaveFilterName(''); setShowSaveFilter(false);
      toast.success('Filter saved');
    } catch { toast.error('Failed to save filter'); }
  }

  function applyPreset(sf: SavedFilter) {
    const f = sf.filters;
    setFilters({
      stages: f.stages || [], source: f.source || '', assignedToId: f.assignedToId || '',
      isHot: f.isHot || '', city: f.city || '', budgetMin: f.budgetMin || '',
      budgetMax: f.budgetMax || '', dateFrom: f.dateFrom || '', dateTo: f.dateTo || '',
    });
    if (f.search) setSearch(f.search);
    setShowSavedMenu(false);
  }

  async function deletePreset(id: string) {
    try { await api.delete(`/saved-filters/${id}`); setSavedFilters(p => p.filter(f => f.id !== id)); toast.success('Filter deleted'); }
    catch { toast.error('Failed to delete'); }
  }

  async function exportCsv() {
    try {
      const r = await api.get('/leads/export/csv', { params: buildParams(), responseType: 'blob' });
      const url = window.URL.createObjectURL(r.data);
      const a = document.createElement('a'); a.href = url; a.download = 'leads.csv'; a.click();
    } catch { toast.error('Export failed'); }
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Leads</h1>
          <p className="text-xs text-gray-500">{total.toLocaleString()} total</p>
        </div>

        <div className="relative flex-1 max-w-sm mx-3">
          <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name, phone, lead#…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => setShowFilters(v => !v)}
            className={cn('flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition', showFilters || activeFilterCount > 0 ? 'bg-blue-50 border-blue-300 text-blue-600' : 'border-gray-200 text-gray-600 hover:bg-gray-50')}>
            <Filter size={13} />
            Filters
            {activeFilterCount > 0 && <span className="bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">{activeFilterCount}</span>}
          </button>

          {/* Saved Filters */}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowSavedMenu(v => !v)}
              className="flex items-center gap-1 px-3 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition">
              <Bookmark size={13} />
              <ChevronDown size={11} />
            </button>
            {showSavedMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">Saved Filters</span>
                  <button onClick={() => { setShowSavedMenu(false); setShowSaveFilter(true); }}
                    className="text-xs text-blue-600 hover:underline">+ Save current</button>
                </div>
                {savedFilters.length === 0 ? (
                  <p className="text-xs text-gray-400 px-3 py-4 text-center">No saved filters yet</p>
                ) : (
                  savedFilters.map(sf => (
                    <div key={sf.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                      <button onClick={() => applyPreset(sf)} className="text-sm text-gray-700 text-left flex-1 hover:text-blue-600">{sf.name}</button>
                      <button onClick={() => deletePreset(sf.id)} className="text-gray-300 hover:text-red-400 ml-2"><X size={12} /></button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button onClick={() => setShowImport(true)} title="Import CSV"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
            <Upload size={14} />
          </button>
          <button onClick={exportCsv} title="Export CSV"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
            <Download size={14} />
          </button>

          <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setView('kanban')} className={cn('p-1.5 rounded-md transition', view === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
              <Kanban size={14} />
            </button>
            <button onClick={() => setView('list')} className={cn('p-1.5 rounded-md transition', view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500')}>
              <List size={14} />
            </button>
          </div>

          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition">
            <Plus size={14} /> Add Lead
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="px-6 py-3 bg-blue-50/60 border-b border-blue-100 space-y-3">
          {/* Stage filter */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-1.5">Stage</p>
            <div className="flex gap-1.5 flex-wrap">
              {stages.map(s => (
                <button key={s.name} onClick={() => toggleStage(s.name)}
                  className={cn('px-2.5 py-1 rounded-full text-xs font-medium border transition',
                    filters.stages.includes(s.name) ? 'border-transparent text-white' : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  )}
                  style={filters.stages.includes(s.name) ? { backgroundColor: s.color, borderColor: s.color } : {}}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Source</label>
              <select value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Sources</option>
                {SOURCES.map(s => <option key={s} value={s}>{LEAD_SOURCE_LABELS[s] || s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Hot Lead</label>
              <select value={filters.isHot} onChange={e => setFilters(f => ({ ...f, isHot: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All</option>
                <option value="true">Hot Only</option>
                <option value="false">Not Hot</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Agent</label>
              <select value={filters.assignedToId} onChange={e => setFilters(f => ({ ...f, assignedToId: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">All Agents</option>
                {agents.filter(a => ['SALES_AGENT','TELECALLER','MANAGER'].includes(a.role)).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">City</label>
              <input value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                placeholder="Jaipur…"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Budget Min (₹)</label>
              <input type="number" value={filters.budgetMin} onChange={e => setFilters(f => ({ ...f, budgetMin: e.target.value }))}
                placeholder="500000"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Budget Max (₹)</label>
              <input type="number" value={filters.budgetMax} onChange={e => setFilters(f => ({ ...f, budgetMax: e.target.value }))}
                placeholder="5000000"
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Created From</label>
              <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Created To</label>
              <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                <X size={11} /> Clear all filters
              </button>
            )}
            <button onClick={() => setShowSaveFilter(v => !v)} className="text-xs text-blue-600 hover:underline flex items-center gap-1 ml-auto">
              <Save size={11} /> Save as preset
            </button>
          </div>

          {showSaveFilter && (
            <div className="flex items-center gap-2">
              <input value={saveFilterName} onChange={e => setSaveFilterName(e.target.value)}
                placeholder="Filter name…"
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button onClick={saveCurrentFilter} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Save</button>
              <button onClick={() => setShowSaveFilter(false)} className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading && kanban.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === 'kanban' ? (
          <LeadKanbanBoard />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Lead Owner', 'Lead Date', 'Contact Name', 'Mobile Number', 'Lead Stage', 'Project Name', 'Site Location', 'Next Follow-Up On', 'Next Follow-Up Info', 'Requirements', 'Description'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 px-3 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const stageConfig = stages.find(s => s.name === lead.stage);
                  return (
                    <tr key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)}
                      className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition">
                      <td className="px-3 py-3 text-sm text-gray-700 whitespace-nowrap">{lead.assignedTo?.name || '—'}</td>
                      <td className="px-3 py-3 text-xs text-gray-400 whitespace-nowrap">{new Date(lead.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-3 py-3">
                        <p className="text-sm font-medium text-gray-900 whitespace-nowrap">{lead.name}</p>
                        <p className="text-xs text-gray-400">{lead.leadNumber}</p>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{lead.phone}</td>
                      <td className="px-3 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                          style={stageConfig ? { color: stageConfig.color, backgroundColor: stageConfig.bgColor } : { color: '#6b7280', backgroundColor: '#f3f4f6' }}>
                          {stageConfig?.label || lead.stage}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 max-w-[120px] truncate">{(lead as any).projectInterest || '—'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 max-w-[120px] truncate">{(lead as any).siteLocation || '—'}</td>
                      <td className="px-3 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600 max-w-[140px] truncate">{(lead as any).nextFollowUpInfo || '—'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 max-w-[140px] truncate">{(lead as any).requirements || '—'}</td>
                      <td className="px-3 py-3 text-sm text-gray-600 max-w-[160px] truncate">{(lead as any).description || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>

      {showCreate && <CreateLeadModal onClose={() => setShowCreate(false)} />}
      {showImport && (
        <ImportLeadsModal
          onClose={() => setShowImport(false)}
          onImported={() => { fetchLeads(buildParams()); fetchKanban(); }}
        />
      )}
    </div>
  );
}
