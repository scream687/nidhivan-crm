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

export interface NearbyPlace {
  name: string;
  type: string;
  distance: string;
  icon?: string;
}

export interface Plot {
  id: string;
  projectId: string;
  block?: string;
  road?: string;
  plotNumber: string;
  facing?: string;
  dimensions?: string;
  area?: number;
  areaUnit: string;
  ratePerUnit?: number;
  totalPrice?: number;
  status: string;
  isCorner: boolean;
  isAvenue: boolean;
  roadWidth?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlotFilters {
  status?: string;
  facing?: string;
  block?: string;
  priceMin?: number;
  priceMax?: number;
}

export interface TimelineEntry {
  id: string;
  type: 'CALL' | 'WHATSAPP' | 'NOTE' | 'TASK' | 'ACTIVITY' | 'SITE_VISIT' | 'BOOKING';
  direction?: 'INCOMING' | 'OUTGOING';
  title?: string;
  description?: string;
  content?: string;
  createdAt: string;
  user?: { id: string; name: string };
  // Call-specific
  phoneNumber?: string;
  duration?: number;
  recordingUrl?: string;
  callStatus?: string;
  // WhatsApp-specific
  mediaUrl?: string;
  mediaType?: string;
  // Activity-specific
  activityType?: string;
  // Task-specific
  isCompleted?: boolean;
  dueDate?: string;
  // Visit-specific
  visitStatus?: string;
  visitOutcome?: string;
  // Booking-specific
  bookingNumber?: string;
  bookingStatus?: string;
}

export interface TimelineResponse {
  items: TimelineEntry[];
  nextCursor: string | null;
  total: number;
}

export type TimelineFilter = 'ALL' | 'CALL' | 'WHATSAPP' | 'NOTE' | 'ACTIVITY' | 'TASK' | 'SITE_VISIT' | 'BOOKING';

export interface SocketEvents {
  'lead:assigned': { leadId: string; agentId: string; leadNumber: string };
  'lead:stage_changed': { leadId: string; fromStage: LeadStage; toStage: LeadStage };
  'call:incoming': { callSid: string; fromNumber: string; leadId?: string };
  'dashboard:kpi_update': DashboardKpis;
  'notification:new': { id: string; title: string; body: string; type: string };
}
