'use client';
import { create } from 'zustand';
import api from '@/lib/api';

interface LeadsState {
  kanban: any[];
  leads: any[];
  total: number;
  currentLead: any | null;
  isLoading: boolean;
  fetchKanban: () => Promise<void>;
  fetchLeads: (filters?: any) => Promise<void>;
  fetchLead: (id: string) => Promise<void>;
  changeStage: (leadId: string, stage: string, reason?: string) => Promise<void>;
  toggleHot: (leadId: string, isHot: boolean) => Promise<void>;
  assignLead: (leadId: string, userId: string) => Promise<void>;
  createLead: (data: any) => Promise<any>;
  updateLead: (leadId: string, data: any) => Promise<void>;
  setupSocketListeners: (socket: any) => void;
}

export const useLeadsStore = create<LeadsState>((set, get) => ({
  kanban: [],
  leads: [],
  total: 0,
  currentLead: null,
  isLoading: false,

  createLead: async (data) => {
    const { data: lead } = await api.post('/leads', data);
    return lead;
  },

  assignLead: async (leadId, userId) => {
    const { data: updated } = await api.patch(`/leads/${leadId}/assign`, { assignedToId: userId });
    if (get().currentLead?.id === leadId) set({ currentLead: updated });
  },

  fetchKanban: async () => {
    set({ isLoading: true });
    const { data } = await api.get('/leads/kanban');
    set({ kanban: data, isLoading: false });
  },

  fetchLeads: async (filters = {}) => {
    set({ isLoading: true });
    const { data } = await api.get('/leads', { params: filters });
    set({ leads: data.data, total: data.total, isLoading: false });
  },

  fetchLead: async (id) => {
    set({ isLoading: true });
    const { data } = await api.get(`/leads/${id}`);
    set({ currentLead: data, isLoading: false });
  },

  changeStage: async (leadId, stage, reason) => {
    const { data } = await api.patch(`/leads/${leadId}/stage`, { stage, reason });
    const { kanban } = get();
    const updated = kanban.map((col) => ({
      ...col,
      leads: col.leads.filter((l: any) => l.id !== leadId),
      count: col.stage === data.stage ? col.count + 1 : col.leads.some((l: any) => l.id === leadId) ? col.count - 1 : col.count,
    }));
    set({ kanban: updated });
    if (get().currentLead?.id === leadId) set({ currentLead: { ...get().currentLead, stage } });
  },

  toggleHot: async (leadId, isHot) => {
    await api.patch(`/leads/${leadId}/hot`, { isHot });
    if (get().currentLead?.id === leadId) set({ currentLead: { ...get().currentLead, isHot } });
  },

  updateLead: async (leadId, data) => {
    const { data: updated } = await api.patch(`/leads/${leadId}`, data);
    if (get().currentLead?.id === leadId) set({ currentLead: updated });
  },

  setupSocketListeners: (socket) => {
    socket.on('lead:created', (lead) => {
      set((state) => ({ 
        leads: [lead, ...state.leads],
        total: state.total + 1 
      }));
    });

    socket.on('lead:updated', (updatedLead) => {
      set((state) => ({
        leads: state.leads.map((l) => l.id === updatedLead.id ? updatedLead : l),
        currentLead: state.currentLead?.id === updatedLead.id ? updatedLead : state.currentLead
      }));
    });

    socket.on('lead:stage_changed', ({ leadId, stage, updated }) => {
      // Update kanban state
      set((state) => {
        const newKanban = state.kanban.map((col) => {
          if (col.stage === stage) {
            // Add to target column if not already there
            if (!col.leads.some((l: any) => l.id === leadId)) {
              return { ...col, leads: [updated, ...col.leads], count: col.count + 1 };
            }
          } else {
            // Remove from other columns
            const filteredLeads = col.leads.filter((l: any) => l.id !== leadId);
            if (filteredLeads.length !== col.leads.length) {
              return { ...col, leads: filteredLeads, count: col.count - 1 };
            }
          }
          return col;
        });
        return { kanban: newKanban };
      });

      // Update current lead if open
      if (get().currentLead?.id === leadId) {
        set({ currentLead: updated });
      }
    });
  },
}));

