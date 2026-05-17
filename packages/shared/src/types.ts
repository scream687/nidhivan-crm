import { Role, LeadStage, LeadSource, InvestmentPurpose, ActivityType, CallType, CallStatus, Priority } from './enums';

export interface UserPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LeadFilters {
  stage?: LeadStage;
  source?: LeadSource;
  assignedToId?: string;
  isHot?: boolean;
  isDuplicate?: boolean;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface KanbanColumn {
  stage: LeadStage;
  label: string;
  count: number;
  leads: LeadCard[];
}

export interface LeadCard {
  id: string;
  leadNumber: string;
  name: string;
  phone: string;
  city?: string;
  source: LeadSource;
  stage: LeadStage;
  leadScore: number;
  isHot: boolean;
  assignedTo?: { id: string; name: string; avatarUrl?: string };
  lastContactedAt?: string;
  nextFollowUpAt?: string;
  createdAt: string;
}

export interface DashboardKpis {
  totalLeads: number;
  leadsToday: number;
  hotLeads: number;
  pendingFollowUps: number;
  siteVisitsToday: number;
  closedThisMonth: number;
  revenueThisMonth: number;
  avgResponseTime: number;
}

export interface AgentStats {
  userId: string;
  name: string;
  avatarUrl?: string;
  totalLeads: number;
  callsToday: number;
  followUpsCompleted: number;
  conversions: number;
  productivityScore: number;
}

export interface SocketEvents {
  'lead:assigned': { leadId: string; agentId: string; leadNumber: string };
  'lead:stage_changed': { leadId: string; fromStage: LeadStage; toStage: LeadStage };
  'call:incoming': { callSid: string; fromNumber: string; leadId?: string };
  'dashboard:kpi_update': DashboardKpis;
  'notification:new': { id: string; title: string; body: string; type: string };
}
