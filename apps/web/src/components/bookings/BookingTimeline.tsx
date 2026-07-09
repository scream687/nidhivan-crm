'use client';
import { motion } from 'framer-motion';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STAGES = [
  { key: 'TOKEN', label: 'Token' },
  { key: 'AGREEMENT', label: 'Agreement' },
  { key: 'REGISTRATION_PENDING', label: 'Registration Pending' },
  { key: 'REGISTERED', label: 'Registered' },
];

interface TimelineEntry {
  stage: string;
  date?: string;
  notes?: string;
  performedBy?: string;
}

export default function BookingTimeline({
  registryStatus = 'TOKEN',
  timeline = [],
}: {
  registryStatus?: string;
  timeline?: TimelineEntry[];
}) {
  const currentIdx = STAGES.findIndex((s) => s.key === registryStatus);

  return (
    <div className="space-y-0">
      {STAGES.map((stage, i) => {
        const entry = timeline.find((t) => t.stage === stage.key);
        const isCompleted = i < currentIdx;
        const isCurrent = i === currentIdx;
        const isPending = i > currentIdx;

        return (
          <div key={stage.key} className="flex gap-3">
            {/* Dot + line */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center ring-2 ring-white z-10',
                  isCompleted && 'bg-green-500',
                  isCurrent && 'bg-blue-500 animate-pulse',
                  isPending && 'bg-gray-200',
                )}
              >
                {isCompleted ? (
                  <Check size={12} className="text-white" />
                ) : isCurrent ? (
                  <div className="w-2 h-2 rounded-full bg-white" />
                ) : (
                  <Circle size={12} className="text-gray-400" />
                )}
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className={cn(
                    'w-0.5 h-8',
                    isCompleted ? 'bg-green-300' : 'bg-gray-200',
                  )}
                />
              )}
            </div>

            {/* Content */}
            <div className={cn('pb-6', isPending && 'opacity-40')}>
              <p
                className={cn(
                  'text-sm font-medium',
                  isCompleted && 'text-green-700',
                  isCurrent && 'text-blue-700',
                  isPending && 'text-gray-400',
                )}
              >
                {stage.label}
              </p>
              {entry?.date && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(entry.date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </p>
              )}
              {entry?.notes && (
                <p className="text-xs text-gray-400 mt-0.5">{entry.notes}</p>
              )}
              {entry?.performedBy && (
                <p className="text-[10px] text-gray-400 mt-0.5">
                  by {entry.performedBy}
                </p>
              )}
              {!entry && isCurrent && (
                <p className="text-xs text-blue-400 mt-0.5">In progress…</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
