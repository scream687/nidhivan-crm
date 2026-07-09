'use client';
import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ChevronLeft, ChevronRight, MapPin, Clock, CalendarDays,
} from 'lucide-react';
import { VisitCard } from './VisitCard';

type VisitStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface Visit {
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
}

interface Props {
  visits: Visit[];
}

const STATUS_DOT: Record<VisitStatus, string> = {
  SCHEDULED: 'bg-blue-500',
  COMPLETED: 'bg-green-500',
  CANCELLED: 'bg-gray-300',
  NO_SHOW: 'bg-orange-500',
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function VisitCalendar({ visits }: Props) {
  const today = useMemo(() => new Date(), []);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  // Build a map of date string → visits
  const visitsByDate = useMemo(() => {
    const map: Record<string, Visit[]> = {};
    visits.forEach(v => {
      const key = new Date(v.visitDate).toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(v);
    });
    return map;
  }, [visits]);

  // Visits for the selected date
  const selectedVisits = selectedDate ? (visitsByDate[selectedDate] || []) : [];

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
    setSelectedDate(null);
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
    setSelectedDate(null);
  }

  // Generate calendar grid
  const grid: (number | null)[] = [];
  // Empty cells before first day
  for (let i = 0; i < firstDayOfWeek; i++) grid.push(null);
  // Day cells
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Calendar grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 lg:w-[400px] flex-shrink-0">
        {/* Month/Year header */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <ChevronLeft size={18} className="text-gray-500" />
          </button>
          <h3 className="font-semibold text-gray-900 text-sm">
            {MONTHS[currentMonth]} {currentYear}
          </h3>
          <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <ChevronRight size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7">
          {grid.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;

            const date = new Date(currentYear, currentMonth, day);
            const dateStr = date.toDateString();
            const dayVisits = visitsByDate[dateStr] || [];
            const isToday = date.toDateString() === today.toDateString();
            const isSelected = dateStr === selectedDate;
            const isPast = date < new Date(today.toDateString());

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                className={cn(
                  'relative flex flex-col items-center justify-center h-10 rounded-lg text-xs transition cursor-pointer',
                  isSelected && 'bg-blue-50 ring-1 ring-blue-300',
                  !isSelected && isToday && 'bg-blue-50',
                  !isSelected && !isToday && 'hover:bg-gray-50',
                  isPast && !isSelected && !isToday && 'text-gray-400',
                  !isPast && !isSelected && 'text-gray-900',
                )}
              >
                <span className={cn(
                  'text-xs font-medium',
                  isToday && !isSelected && 'text-blue-600 font-bold',
                )}>
                  {day}
                </span>
                {/* Visit dots */}
                {dayVisits.length > 0 && (
                  <div className="flex items-center gap-0.5 mt-0.5">
                    {dayVisits.slice(0, 4).map(v => (
                      <span key={v.id} className={cn('w-1.5 h-1.5 rounded-full', STATUS_DOT[v.status])} />
                    ))}
                    {dayVisits.length > 4 && (
                      <span className="text-[8px] text-gray-400 font-medium">+{dayVisits.length - 4}</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
          {(Object.keys(STATUS_DOT) as VisitStatus[]).map(s => (
            <div key={s} className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <span className={cn('w-2 h-2 rounded-full', STATUS_DOT[s])} />
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </div>
          ))}
        </div>

        {/* Day summary */}
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          {Object.keys(visitsByDate).length} days with visits
          <span className="mx-1">·</span>
          {visits.length} total
        </div>
      </div>

      {/* Selected day's visits */}
      <div className="flex-1 min-w-0">
        {selectedDate ? (
          <>
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={16} className="text-blue-600" />
              <h3 className="font-semibold text-gray-900 text-sm">
                {new Date(selectedDate).toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                })}
              </h3>
              <span className="text-xs text-gray-400">
                {selectedVisits.length} visit{selectedVisits.length !== 1 ? 's' : ''}
              </span>
            </div>

            {selectedVisits.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <MapPin size={36} className="mx-auto mb-2 opacity-20" />
                <p className="font-medium text-sm">No visits on this day</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-3">
                  {selectedVisits.map((v, i) => (
                    <motion.div
                      key={v.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <VisitCard visit={v} />
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <CalendarDays size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">Select a date to view visits</p>
            <p className="text-sm mt-1">Days with visits have colored dots</p>
          </div>
        )}
      </div>
    </div>
  );
}
