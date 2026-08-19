'use client';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  MapPin, Phone, User, Clock, Camera, CheckCircle2,
  ChevronDown, ChevronUp, Navigation, Calendar,
} from 'lucide-react';

type VisitStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface VisitCardProps {
  visit: {
    id: string;
    project: string;
    visitDate: string;
    status: VisitStatus;
    feedback?: string;
    rating?: number;
    lead: { id: string; name: string; leadNumber: string; phone?: string };
    assignedTo: { id: string; name: string };
    address?: string;
    propertyShown?: string;
    driverName?: string;
    driverPhone?: string;
    pickupLocation?: string;
    checkInTime?: string;
    photoCount?: number;
    createdAt: string;
  };
}

const STATUS_BADGE: Record<VisitStatus, { label: string; classes: string }> = {
  SCHEDULED: { label: 'Scheduled', classes: 'bg-[#F3F4F6] text-[#111113]' },
  COMPLETED: { label: 'Completed', classes: 'bg-[#E7F6EE] text-[#047857]' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-[#F3F4F6] text-[#5A6470]' },
  NO_SHOW: { label: 'No Show', classes: 'bg-[#FDECE6] text-[#C02F12]' },
};

export function VisitCard({ visit }: VisitCardProps) {
  const [expanded, setExpanded] = useState(false);
  const d = new Date(visit.visitDate);
  const badge = STATUS_BADGE[visit.status];

  const mapsUrl = visit.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(visit.address)}`
    : null;

  return (
    <div
      className={cn(
        'bg-white rounded-xl border p-4 hover:shadow-sm transition cursor-pointer shadow-sm',
        visit.status === 'SCHEDULED' ? 'border-[#E5E7EB]' : 'border-[#E5E7EB]',
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Always-visible summary row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-[#111113] text-sm">{visit.project}</span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold', badge.classes)}>
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-[#111113] mt-0.5 font-medium">{visit.lead.name}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-[#626B76]">
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={11} />
              {d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span>· {visit.assignedTo.name}</span>
          </div>
        </div>

        {/* Right side: photo count + expand */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {visit.photoCount != null && visit.photoCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-[#5A6470] bg-[#F3F4F6] px-2 py-1 rounded-lg">
              <Camera size={12} />
              {visit.photoCount}
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-[#626B76]" /> : <ChevronDown size={16} className="text-[#626B76]" />}
        </div>
      </div>

      {/* Check-in status (always visible, subtle) */}
      {visit.checkInTime ? (
        <p className="text-xs text-[#047857] mt-2 flex items-center gap-1">
          <CheckCircle2 size={11} />
          Checked in at {new Date(visit.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      ) : visit.status === 'SCHEDULED' ? (
        <p className="text-xs text-[#626B76] mt-2">Not checked in</p>
      ) : null}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-[#F3F4F6] space-y-2.5">
          {/* Feedback */}
          {visit.feedback && (
            <p className="text-sm text-[#5A6470] italic bg-[#F3F4F6] rounded-lg px-3 py-2">
              "{visit.feedback}"
            </p>
          )}

          {/* Rating stars */}
          {visit.status === 'COMPLETED' && visit.rating && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <span key={s} className={s <= visit.rating! ? 'text-[#E04020]' : 'text-[#E5E7EB]'}>★</span>
              ))}
            </div>
          )}

          {/* Property shown */}
          {visit.propertyShown && (
            <div className="text-xs text-[#5A6470]">
              <span className="font-medium text-[#111113]">Property:</span> {visit.propertyShown}
            </div>
          )}

          {/* Address */}
          {visit.address && (
            <div className="text-xs text-[#5A6470]">
              <span className="font-medium text-[#111113]">Address:</span> {visit.address}
            </div>
          )}

          {/* Driver info */}
          {visit.driverName && (
            <div className="text-xs text-[#5A6470] flex items-center gap-1.5">
              <User size={12} />
              <span className="font-medium text-[#111113]">Driver:</span> {visit.driverName}
              {visit.driverPhone && <span>· {visit.driverPhone}</span>}
            </div>
          )}

          {/* Pickup location */}
          {visit.pickupLocation && (
            <div className="text-xs text-[#5A6470] flex items-center gap-1.5">
              <MapPin size={12} />
              <span className="font-medium text-[#111113]">Pickup:</span> {visit.pickupLocation}
            </div>
          )}

          {/* Lead contact */}
          <div className="text-xs text-[#5A6470] flex items-center gap-1.5">
            <Phone size={12} />
            <span className="font-medium text-[#111113]">Contact:</span> {visit.lead.phone || visit.lead.leadNumber}
          </div>

          {/* Maps button */}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs bg-[#FDECE6] text-[#C02F12] px-3 py-1.5 rounded-full hover:bg-[#FADFD4] transition font-semibold"
            >
              <Navigation size={12} />
              Open in Google Maps
            </a>
          )}
        </div>
      )}
    </div>
  );
}