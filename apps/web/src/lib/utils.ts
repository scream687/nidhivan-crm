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

export const STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  ATTEMPTED: 'bg-yellow-100 text-yellow-700',
  NOT_REACHABLE: 'bg-gray-100 text-gray-500',
  WRONG_NUMBER: 'bg-red-100 text-red-700',
  CONNECTED: 'bg-cyan-100 text-cyan-700',
  INTERESTED: 'bg-purple-100 text-purple-700',
  HOT: 'bg-red-100 text-red-700',
  SITE_VISIT_SCHEDULED: 'bg-orange-100 text-orange-700',
  SITE_VISIT_COMPLETED: 'bg-emerald-100 text-emerald-700',
  NEGOTIATION: 'bg-amber-100 text-amber-700',
  BOOKING_PENDING: 'bg-pink-100 text-pink-700',
  LOAN_PROCESSING: 'bg-blue-100 text-blue-600',
  DOCUMENTATION_PENDING: 'bg-purple-100 text-purple-500',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-600',
  CLOSED_WON: 'bg-green-100 text-green-700',
  CLOSED_LOST: 'bg-gray-100 text-gray-700',
  DUPLICATE: 'bg-orange-100 text-orange-600',
  FUTURE_PROSPECT: 'bg-indigo-100 text-indigo-700',
};

export const COLUMN_HEADER_COLORS: Record<string, string> = {
  NEW: 'bg-blue-50',
  ATTEMPTED: 'bg-yellow-50',
  NOT_REACHABLE: 'bg-gray-50',
  WRONG_NUMBER: 'bg-red-50',
  CONNECTED: 'bg-cyan-50',
  INTERESTED: 'bg-purple-50',
  HOT: 'bg-red-50',
  SITE_VISIT_SCHEDULED: 'bg-orange-50',
  SITE_VISIT_COMPLETED: 'bg-emerald-50',
  NEGOTIATION: 'bg-amber-50',
  BOOKING_PENDING: 'bg-pink-50',
  LOAN_PROCESSING: 'bg-blue-50',
  DOCUMENTATION_PENDING: 'bg-purple-50',
  PAYMENT_PENDING: 'bg-amber-50',
  CLOSED_WON: 'bg-emerald-50',
  CLOSED_LOST: 'bg-red-50',
  DUPLICATE: 'bg-orange-50',
  FUTURE_PROSPECT: 'bg-indigo-50',
};

export const SOURCE_COLORS: Record<string, string> = {
  FACEBOOK: 'bg-blue-50 text-blue-600',
  INSTAGRAM: 'bg-pink-50 text-pink-600',
  HOUSING_COM: 'bg-red-50 text-red-600',
  NINETYNINE_ACRES: 'bg-orange-50 text-orange-600',
  WHATSAPP: 'bg-green-50 text-green-600',
  WEBSITE: 'bg-slate-50 text-slate-600',
};
