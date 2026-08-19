'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useLeadsStore } from '@/stores/leadsStore';
import { LeadKanbanBoard } from '@/components/leads/LeadKanbanBoard';
import { cn } from '@/lib/utils';
import { LEAD_SOURCE_LABELS, LEAD_STAGE_LABELS, LeadSource, LeadStage } from '@nidhivan/shared';
import { STAGE_COLORS } from '@/lib/utils';
import { Plus, Search, Filter, Download, Upload, Kanban, List, X, Save, Bookmark, ChevronDown, Brain, Inbox } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import CreateLeadModal from '@/components/leads/CreateLeadModal';
import ImportLeadsModal from '@/components/leads/ImportLeadsModal';
import api, { toList } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

type ViewMode = 'kanban' | 'list';

type SavedFilter = { id: string; name: string; filters: any; isShared: boolean; user?: { name: string } };

const STAGE_LIST = Object.values(LeadStage).map((s) => ({ name: s, label: LEAD_STAGE_LABELS[s] }));

const SOURCES = Object.values(LeadSource);

export default function LeadsPage() {
  const { kanban, leads, total, isLoading, fetchKanban, fetchLeads } = useLeadsStore();
  const { user } = useAuthStore();
  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [view, setView] = useState<ViewMode>('kanban');
  const [search, setSearch] = useState('');
  const filteredLeads = search
    ? leads.filter(lead => {
        const q = search.toLowerCase();
        return (
          lead.name.toLowerCase().includes(q) ||
          lead.phone.toLowerCase().includes(q) ||
          ((lead as any).city || '').toLowerCase().includes(q)
        );
      })
    : leads;
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
  // stages come from the shared enum — no API call needed

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
    api.get('/saved-filters').then(r => setSavedFilters(r.data)).catch(() => toast.error('Failed to load saved filters'));
    api.get('/users').then(r => setAgents(toList(r.data))).catch(() => toast.error('Failed to load agents'));
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
          <h1 className="text-xl font-bold text-[#111113] tracking-tight">Leads</h1>
          <p className="text-xs text-gray-500">{total.toLocaleString()} total</p>
        </div>        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads, phone, city..."
            className="w-full pl-8 pr-4 py-1.5 text-xs border border-[#e5e7eb] rounded-lg focus:outline-none focus:border-[#9ca3af] bg-white text-[#111827] placeholder-[#9ca3af]"
          />
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <button
            onClick={() => setShowFilters(v => !v)}
            className={cn('btn-frappe-secondary', (showFilters || activeFilterCount > 0) && 'bg-gray-100 font-semibold text-[#111827]')}
          >
            <Filter size={12} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="bg-[#111827] text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold font-mono">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Saved Filters */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowSavedMenu(v => !v)}
              className="btn-frappe-secondary"
            >
              <Bookmark size={12} />
              <ChevronDown size={11} />
            </button>
            {showSavedMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-xl shadow-lg border border-[#e5e7eb] z-20 overflow-hidden">
                <div className="px-3 py-2 border-b border-[#e5e7eb] flex items-center justify-between bg-[#f9fafb]">
                  <span className="text-xs font-semibold text-[#111827]">Saved Views</span>
                  <button onClick={() => { setShowSavedMenu(false); setShowSaveFilter(true); }}
                    className="text-xs text-[#E04020] hover:underline font-medium">+ Save view</button>
                </div>
                {savedFilters.length === 0 ? (
                  <p className="text-xs text-[#9ca3af] px-3 py-4 text-center">No saved views yet</p>
                ) : (
                  savedFilters.map(sf => (
                    <div key={sf.id} className="flex items-center justify-between px-3 py-2 hover:bg-[#f9fafb] text-xs">
                      <button onClick={() => applyPreset(sf)} className="text-[#111113] text-left flex-1 hover:text-[#E04020] font-medium">{sf.name}</button>
                      <button onClick={() => deletePreset(sf.id)} aria-label="Delete preset" className="text-[#9ca3af] hover:text-red-500 ml-2"><X size={12} /></button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <button onClick={() => setShowImport(true)} aria-label="Import CSV" className="btn-frappe-secondary">
            <Upload size={12} />
            <span className="hidden sm:inline">Import</span>
          </button>

          <button onClick={exportCsv} aria-label="Export CSV" className="btn-frappe-secondary">
            <Download size={12} />
            <span className="hidden sm:inline">Export</span>
          </button>

          <div className="flex items-center bg-[#f3f4f6] rounded-lg p-0.5 border border-[#e5e7eb]">
            <button onClick={() => setView('kanban')} aria-label="Kanban view" className={cn('p-1.5 rounded-md transition', view === 'kanban' ? 'bg-white shadow-sm text-[#111827]' : 'text-[#6b7280]')}>
              <Kanban size={13} />
            </button>
            <button onClick={() => setView('list')} aria-label="List view" className={cn('p-1.5 rounded-md transition', view === 'list' ? 'bg-white shadow-sm text-[#111827]' : 'text-[#6b7280]')}>
              <List size={13} />
            </button>
          </div>

          {isManager && (
            <button
              onClick={async () => {
                toast.loading('Batch scoring leads…');
                try {
                  await api.post('/ai/score/batch');
                  toast.dismiss();
                  toast.success('Scoring complete');
                  fetchLeads(buildParams());
                  fetchKanban();
                } catch {
                  toast.dismiss();
                  toast.error('Batch scoring failed');
                }
              }}
              className="btn-frappe-secondary"
            >
              <Brain size={12} />
              <span>Score</span>
            </button>
          )}

          <button
            onClick={() => setShowCreate(true)}
            className="btn-frappe-primary"
          >
            <Plus size={12} />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="px-6 py-3 bg-[#F3F4F6] border-b border-[#E5E7EB] space-y-3">
          {/* Stage filter */}
          <div>
            <p className="text-xs font-semibold text-[#5A6470] mb-1.5">Stage</p>
            <div className="flex gap-1.5 flex-wrap">
              {STAGE_LIST.map(s => (
                <button key={s.name} onClick={() => toggleStage(s.name)}
                  className={cn('px-2.5 py-1 rounded-sm text-xs font-medium border transition',
                    filters.stages.includes(s.name)
                      ? STAGE_COLORS[s.name] + ' border-[#111113]'
                      : 'border-[#E5E7EB] bg-white text-[#5A6470] hover:border-[#111113]/40'
                  )}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Source</label>
              <select value={filters.source} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}
                className="w-full border border-[#E5E7EB] rounded-sm px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#111113]">
                <option value="">All Sources</option>
                {SOURCES.map(s => <option key={s} value={s}>{LEAD_SOURCE_LABELS[s] || s}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Hot Lead</label>
              <select value={filters.isHot} onChange={e => setFilters(f => ({ ...f, isHot: e.target.value }))}
                className="w-full border border-[#E5E7EB] rounded-sm px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#111113]">
                <option value="">All</option>
                <option value="true">Hot Only</option>
                <option value="false">Not Hot</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Agent</label>
              <select value={filters.assignedToId} onChange={e => setFilters(f => ({ ...f, assignedToId: e.target.value }))}
                className="w-full border border-[#E5E7EB] rounded-sm px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#111113]">
                <option value="">All Agents</option>
                {agents.filter(a => ['SALES_AGENT','TELECALLER','MANAGER'].includes(a.role)).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">City</label>
              <input value={filters.city} onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                placeholder="City…"
                className="w-full border border-[#E5E7EB] rounded-sm px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#111113]" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Budget Min (₹)</label>
              <input type="number" value={filters.budgetMin} onChange={e => setFilters(f => ({ ...f, budgetMin: e.target.value }))}
                placeholder="500000"
                className="w-full border border-[#E5E7EB] rounded-sm px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#111113]" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Budget Max (₹)</label>
              <input type="number" value={filters.budgetMax} onChange={e => setFilters(f => ({ ...f, budgetMax: e.target.value }))}
                placeholder="5000000"
                className="w-full border border-[#E5E7EB] rounded-sm px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#111113]" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Created From</label>
              <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
                className="w-full border border-[#E5E7EB] rounded-sm px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#111113]" />
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Created To</label>
              <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
                className="w-full border border-[#E5E7EB] rounded-sm px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#111113]" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1">
                <X size={11} /> Clear all filters
              </button>
            )}
            <button onClick={() => setShowSaveFilter(v => !v)} className="text-xs text-[#E04020] hover:underline flex items-center gap-1 ml-auto">
              <Save size={11} /> Save as preset
            </button>
          </div>

          {showSaveFilter && (
            <div className="flex items-center gap-2">
              <input value={saveFilterName} onChange={e => setSaveFilterName(e.target.value)}
                placeholder="Filter name…"
                className="border border-[#E5E7EB] rounded-sm px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#111113]" />
              <button onClick={saveCurrentFilter} className="px-3 py-1.5 bg-[#111113] text-white text-sm rounded-sm hover:bg-black">Save</button>
              <button onClick={() => setShowSaveFilter(false)} aria-label="Close" className="text-gray-400 hover:text-gray-600"><X size={14} /></button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {isLoading && kanban.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-[#111113] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === 'kanban' ? (
          <LeadKanbanBoard />
        ) : leads.length === 0 ? (
          <EmptyState icon={Inbox} title="No leads yet" description="Create your first lead to get started" action={{ label: 'Add Lead', onClick: () => setShowCreate(true) }} />
        ) : (
          <div className="bg-white rounded-sm border border-[#E5E7EB] overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px]">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F3F4F6]">
                  {['Lead Owner', 'Lead Date', 'Contact Name', 'Mobile Number', 'Lead Stage', 'AI Score', 'Project Name', 'Site Location', 'Next Follow-Up On', 'Next Follow-Up Info', 'Requirements', 'Description'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-[#5A6470] px-3 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => (
                    <tr key={lead.id} onClick={() => router.push(`/leads/${lead.id}`)}
                      className="border-b border-[#F3F4F6] hover:bg-[#F3F4F6] cursor-pointer transition">
                      <td className="px-3 py-3 text-sm text-[#111113] whitespace-nowrap">{lead.assignedTo?.name || '—'}</td>
                      <td className="px-3 py-3 text-xs text-[#5A6470] whitespace-nowrap">{new Date(lead.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-3 py-3">
                        <p className="text-sm font-medium text-[#111113] whitespace-nowrap">{lead.name}</p>
                        <p className="text-xs text-[#5A6470]">{lead.leadNumber}</p>
                      </td>
                      <td className="px-3 py-3 text-sm text-[#111113] whitespace-nowrap">{lead.phone}</td>
                      <td className="px-3 py-3">
                        <span className={cn('text-xs px-2 py-0.5 rounded-sm font-medium whitespace-nowrap', STAGE_COLORS[lead.stage] || 'bg-[#F3F4F6] text-[#5A6470]')}>
                          {LEAD_STAGE_LABELS[lead.stage as LeadStage] || lead.stage}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {(lead as any).aiScore != null ? (
                          <span className={cn(
                            'inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-sm',
                            (lead as any).aiScore >= 70
                              ? 'bg-[#F3F4F6] text-[#111113]'
                              : (lead as any).aiScore >= 40
                                ? 'bg-white text-[#111113] border border-[#E5E7EB]'
                                : 'bg-white text-[#E04020] border border-[#E04020]',
                          )}>
                            <Brain size={10} />
                            {(lead as any).aiScore}
                          </span>
                        ) : (
                          <span className="text-[10px] text-[#626B76] font-mono">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-sm text-[#5A6470] max-w-[120px] truncate">{(lead as any).projectInterest || '—'}</td>
                      <td className="px-3 py-3 text-sm text-[#5A6470] max-w-[120px] truncate">{(lead as any).siteLocation || '—'}</td>
                      <td className="px-3 py-3 text-xs text-[#5A6470] whitespace-nowrap">
                        {lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                      <td className="px-3 py-3 text-sm text-[#5A6470] max-w-[140px] truncate">{(lead as any).nextFollowUpInfo || '—'}</td>
                      <td className="px-3 py-3 text-sm text-[#5A6470] max-w-[140px] truncate">{(lead as any).requirements || '—'}</td>
                      <td className="px-3 py-3 text-sm text-[#5A6470] max-w-[160px] truncate">{(lead as any).description || '—'}</td>
                    </tr>
                ))}
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
