import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function timeAgo(date: string | Date) {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(amount: number | string) {
  const val = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

const NEUTRAL = 'bg-[#F3F4F6] text-[#111113]';
const NEUTRAL_MUTED = 'bg-[#F3F4F6] text-[#5A6470]';
const ACCENT = 'bg-[#FDECE6] text-[#C02F12]';
const ACCENT_SOLID = 'bg-[#E04020] text-white';
const DIM = 'bg-white text-[#5A6470] border border-[#E5E7EB]';

export const STAGE_COLORS: Record<string, string> = {
  NEW: NEUTRAL,
  ATTEMPTED: NEUTRAL,
  NOT_REACHABLE: NEUTRAL_MUTED,
  WRONG_NUMBER: DIM,
  CONNECTED: NEUTRAL,
  INTERESTED: NEUTRAL,
  HOT: ACCENT_SOLID,
  SITE_VISIT_SCHEDULED: NEUTRAL,
  SITE_VISIT_COMPLETED: NEUTRAL,
  NEGOTIATION: ACCENT,
  BOOKING_PENDING: NEUTRAL,
  LOAN_PROCESSING: NEUTRAL,
  DOCUMENTATION_PENDING: NEUTRAL,
  PAYMENT_PENDING: ACCENT_SOLID,
  CLOSED_WON: ACCENT,
  CLOSED_LOST: DIM,
  DUPLICATE: DIM,
  FUTURE_PROSPECT: NEUTRAL,
};

export const COLUMN_HEADER_COLORS: Record<string, string> = {
  NEW: 'bg-[#F3F4F6]',
  ATTEMPTED: 'bg-[#F3F4F6]',
  NOT_REACHABLE: 'bg-[#F3F4F6]',
  WRONG_NUMBER: 'bg-[#F3F4F6]',
  CONNECTED: 'bg-[#F3F4F6]',
  INTERESTED: 'bg-[#F3F4F6]',
  HOT: 'bg-[#FDECE6]',
  SITE_VISIT_SCHEDULED: 'bg-[#F3F4F6]',
  SITE_VISIT_COMPLETED: 'bg-[#F3F4F6]',
  NEGOTIATION: 'bg-[#FDECE6]',
  BOOKING_PENDING: 'bg-[#F3F4F6]',
  LOAN_PROCESSING: 'bg-[#F3F4F6]',
  DOCUMENTATION_PENDING: 'bg-[#F3F4F6]',
  PAYMENT_PENDING: 'bg-[#FDECE6]',
  CLOSED_WON: 'bg-[#FDECE6]',
  CLOSED_LOST: 'bg-[#F3F4F6]',
  DUPLICATE: 'bg-[#F3F4F6]',
  FUTURE_PROSPECT: 'bg-[#F3F4F6]',
};

export const SOURCE_COLORS: Record<string, string> = {
  FACEBOOK: 'bg-[#F3F4F6] text-[#111113]',
  INSTAGRAM: 'bg-[#F3F4F6] text-[#111113]',
  HOUSING_COM: 'bg-[#F3F4F6] text-[#111113]',
  NINETYNINE_ACRES: 'bg-[#F3F4F6] text-[#111113]',
  WHATSAPP: 'bg-[#FDECE6] text-[#C02F12]',
  WEBSITE: 'bg-[#F3F4F6] text-[#111113]',
};
