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
  SCHEDULED: { label: 'Scheduled', classes: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Completed', classes: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', classes: 'bg-gray-100 text-gray-500' },
  NO_SHOW: { label: 'No Show', classes: 'bg-red-100 text-red-600' },
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
        'bg-white rounded-xl border p-4 hover:shadow-sm transition cursor-pointer',
        visit.status === 'SCHEDULED' ? 'border-blue-200' : 'border-gray-200',
      )}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Always-visible summary row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{visit.project}</span>
            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', badge.classes)}>
              {badge.label}
            </span>
          </div>
          <p className="text-sm text-gray-700 mt-0.5 font-medium">{visit.lead.name}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
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
            <span className="flex items-center gap-1 text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
              <Camera size={12} />
              {visit.photoCount}
            </span>
          )}
          {expanded ? <ChevronUp size={16} className="text-gray-300" /> : <ChevronDown size={16} className="text-gray-300" />}
        </div>
      </div>

      {/* Check-in status (always visible, subtle) */}
      {visit.checkInTime ? (
        <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
          <CheckCircle2 size={11} />
          Checked in at {new Date(visit.checkInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </p>
      ) : visit.status === 'SCHEDULED' ? (
        <p className="text-xs text-gray-400 mt-2">Not checked in</p>
      ) : null}

      {/* Expanded details */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2.5">
          {/* Feedback */}
          {visit.feedback && (
            <p className="text-sm text-gray-600 italic bg-gray-50 rounded-lg px-3 py-2">
              "{visit.feedback}"
            </p>
          )}

          {/* Rating stars */}
          {visit.status === 'COMPLETED' && visit.rating && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <span key={s} className={s <= visit.rating! ? 'text-yellow-400' : 'text-gray-200'}>★</span>
              ))}
            </div>
          )}

          {/* Property shown */}
          {visit.propertyShown && (
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">Property:</span> {visit.propertyShown}
            </div>
          )}

          {/* Address */}
          {visit.address && (
            <div className="text-xs text-gray-500">
              <span className="font-medium text-gray-700">Address:</span> {visit.address}
            </div>
          )}

          {/* Driver info */}
          {visit.driverName && (
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <User size={12} />
              <span className="font-medium text-gray-700">Driver:</span> {visit.driverName}
              {visit.driverPhone && <span>· {visit.driverPhone}</span>}
            </div>
          )}

          {/* Pickup location */}
          {visit.pickupLocation && (
            <div className="text-xs text-gray-500 flex items-center gap-1.5">
              <MapPin size={12} />
              <span className="font-medium text-gray-700">Pickup:</span> {visit.pickupLocation}
            </div>
          )}

          {/* Lead contact */}
          <div className="text-xs text-gray-500 flex items-center gap-1.5">
            <Phone size={12} />
            <span className="font-medium text-gray-700">Contact:</span> {visit.lead.phone || visit.lead.leadNumber}
          </div>

          {/* Maps button */}
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition font-medium"
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
