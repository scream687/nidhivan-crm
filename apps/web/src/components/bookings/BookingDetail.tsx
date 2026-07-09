'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  X,
  Download,
  ChevronDown,
  CheckCircle,
  Loader2,
  FileCheck,
  IndianRupee,
  User,
  Building2,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import BookingTimeline from './BookingTimeline';
import DocumentUpload from './DocumentUpload';

const STATUS_STYLES: Record<string, string> = {
  CONFIRMED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-600',
  COMPLETED: 'bg-blue-100 text-blue-700',
};

const REGISTRY_STYLES: Record<string, string> = {
  TOKEN: 'bg-purple-100 text-purple-700',
  AGREEMENT: 'bg-blue-100 text-blue-700',
  REGISTRATION_PENDING: 'bg-amber-100 text-amber-700',
  REGISTERED: 'bg-green-100 text-green-700',
};

const COMMISSION_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  PAID: 'bg-green-100 text-green-700',
};

function inr(n: number | string) {
  return '₹' + Number(n).toLocaleString('en-IN');
}

export default function BookingDetail({
  booking,
  onClose,
  onUpdated,
}: {
  booking: any;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const docs = Array.isArray(booking.documents)
    ? booking.documents
    : typeof booking.documents === 'string'
      ? JSON.parse(booking.documents || '[]')
      : [];
  const timeline = Array.isArray(booking.bookingTimeline)
    ? booking.bookingTimeline
    : typeof booking.bookingTimeline === 'string'
      ? JSON.parse(booking.bookingTimeline || '[]')
      : [];

  async function updateRegistryStatus(val: string) {
    setSaving(true);
    try {
      await api.patch(`/bookings/${booking.id}`, {
        registryStatus: val,
      });
      toast.success('Registry status updated');
      onUpdated();
    } catch {
      toast.error('Update failed');
    } finally {
      setSaving(false);
    }
  }

  async function payCommission() {
    if (!confirm('Mark commission as PAID?')) return;
    setSaving(true);
    try {
      await api.patch(`/bookings/${booking.id}`, {
        commissionStatus: 'PAID',
        commissionPaidAt: new Date().toISOString(),
      });
      toast.success('Commission marked as paid');
      onUpdated();
    } catch {
      toast.error('Failed to update commission');
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-white rounded-xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <FileCheck size={18} className="text-blue-600" />
          <div>
            <h2 className="font-semibold text-gray-900">
              {booking.bookingNumber}
            </h2>
            <p className="text-xs text-gray-400">
              Created{' '}
              {new Date(booking.createdAt).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-100">
        {/* Left: Customer & Project */}
        <div className="p-5 space-y-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Customer
            </p>
            <div className="flex items-center gap-2">
              <User size={14} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-900">
                {booking.lead?.name}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 ml-6">
              {booking.lead?.phone}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Property
            </p>
            <div className="flex items-center gap-2">
              <Building2 size={14} className="text-gray-400" />
              <span className="text-sm text-gray-700">
                {booking.project?.name}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5 ml-6">
              {booking.unitNumber} · {booking.unitType}
              {booking.unitArea ? ` · ${booking.unitArea} sq.yd` : ''}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Agent
            </p>
            <p className="text-sm text-gray-700">{booking.agent?.name || '—'}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Status
            </p>
            <div className="flex gap-2">
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  STATUS_STYLES[booking.status] || 'bg-gray-100 text-gray-500',
                )}
              >
                {booking.status}
              </span>
              <span
                className={cn(
                  'text-xs px-2 py-0.5 rounded-full font-medium',
                  REGISTRY_STYLES[booking.registryStatus] ||
                    'bg-gray-100 text-gray-500',
                )}
              >
                {booking.registryStatus || 'TOKEN'}
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Timeline + Payment */}
        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Booking Timeline
            </p>
            <BookingTimeline
              registryStatus={booking.registryStatus || 'TOKEN'}
              timeline={timeline}
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Payment
            </p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Token Amount</span>
                <span className="font-medium">
                  {booking.tokenAmount ? inr(booking.tokenAmount) : '—'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Booking Amount</span>
                <span className="font-medium">{inr(booking.bookingAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-semibold text-gray-900">
                  {inr(booking.totalAmount)}
                </span>
              </div>
              {booking.notes && (
                <p className="text-xs text-gray-400 mt-2 italic">
                  {booking.notes}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Commission + Registry + Docs */}
        <div className="p-5 space-y-4">
          {/* Commission */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Commission
            </p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {booking.agentCommission
                    ? inr(booking.agentCommission)
                    : '—'}
                </p>
                {booking.commissionStatus && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded-full font-medium inline-block mt-1',
                      COMMISSION_STYLES[booking.commissionStatus],
                    )}
                  >
                    {booking.commissionStatus}
                  </span>
                )}
              </div>
              {booking.commissionStatus === 'PENDING' &&
                booking.agentCommission && (
                  <button
                    onClick={payCommission}
                    disabled={saving}
                    className="flex items-center gap-1 text-xs bg-green-600 text-white px-2.5 py-1.5 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CheckCircle size={12} />
                    )}
                    Pay
                  </button>
                )}
            </div>
          </div>

          {/* Registry Status */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Registry Status
            </p>
            <select
              value={booking.registryStatus || 'TOKEN'}
              onChange={(e) => updateRegistryStatus(e.target.value)}
              disabled={saving}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm"
            >
              {['TOKEN', 'AGREEMENT', 'REGISTRATION_PENDING', 'REGISTERED'].map(
                (s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ),
              )}
            </select>
            {booking.registryDate && (
              <p className="text-xs text-gray-400 mt-1">
                Registry date:{' '}
                {new Date(booking.registryDate).toLocaleDateString('en-IN')}
              </p>
            )}
            {booking.registryNumber && (
              <p className="text-xs text-gray-400 mt-0.5">
                Registry #: {booking.registryNumber}
              </p>
            )}
          </div>

          {/* Documents */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Documents
            </p>
            <DocumentUpload
              bookingId={booking.id}
              documents={docs}
              onUpdate={onUpdated}
            />
          </div>
        </div>
      </div>

      {/* Actions footer */}
      <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50">
        <div className="text-xs text-gray-400">
          {booking.bookingLetterUrl && (
            <a
              href={booking.bookingLetterUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
            >
              <Download size={12} /> Booking Letter
            </a>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-100 transition"
          >
            Close
          </button>
        </div>
      </div>
    </motion.div>
  );
}
