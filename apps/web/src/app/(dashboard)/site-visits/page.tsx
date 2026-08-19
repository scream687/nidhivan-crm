'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { EmptyState } from '@/components/ui/empty-state';
import { cn, timeAgo } from '@/lib/utils';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import {
  MapPin, CalendarCheck, Clock, CheckCircle2, XCircle, AlertCircle,
  Star, Plus, LayoutList, CalendarDays,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { VisitCard } from '@/components/site-visits/VisitCard';
import { VisitCalendar } from '@/components/site-visits/VisitCalendar';

type SiteVisit = {
  id: string;
  project: string;
  visitDate: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
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

type Filter = 'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
type ViewMode = 'list' | 'calendar';

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-[#F3F4F6] text-[#111113]', icon: <Clock size={13} /> },
  COMPLETED: { label: 'Completed', color: 'bg-[#E7F6EE] text-[#047857]', icon: <CheckCircle2 size={13} /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-white text-[#5A6470] border border-[#E5E7EB]', icon: <XCircle size={13} /> },
  NO_SHOW: { label: 'No Show', color: 'bg-[#FDECE6] text-[#C02F12]', icon: <AlertCircle size={13} /> },
};

export default function SiteVisitsPage() {
  const { user } = useAuthStore();
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [view, setView] = useState<ViewMode>('list');
  const [updating, setUpdating] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{ visit: SiteVisit; status: string } | null>(null);
  const feedbackTrapRef = useFocusTrap(feedbackModal !== null);
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);

  const isManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  useEffect(() => { loadVisits(); }, []);

  async function loadVisits() {
    setIsLoading(true);
    try {
      const { data } = await api.get('/site-visits');
      setVisits(data);
    } catch {
      toast.error('Failed to load site visits');
    } finally {
      setIsLoading(false);
    }
  }

  async function updateStatus(id: string, status: string, fb?: string, rt?: number) {
    setUpdating(id);
    try {
      await api.patch(`/site-visits/${id}/status`, { status, feedback: fb, rating: rt });
      toast.success(`Visit marked as ${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label}`);
      setFeedbackModal(null);
      setFeedback('');
      setRating(0);
      await loadVisits();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
    }
  }

  const filtered = filter === 'ALL' ? visits : visits.filter(v => v.status === filter);

  const counts = {
    ALL: visits.length,
    SCHEDULED: visits.filter(v => v.status === 'SCHEDULED').length,
    COMPLETED: visits.filter(v => v.status === 'COMPLETED').length,
    CANCELLED: visits.filter(v => v.status === 'CANCELLED').length,
    NO_SHOW: visits.filter(v => v.status === 'NO_SHOW').length,
  };

  const upcomingToday = visits.filter(v => {
    if (v.status !== 'SCHEDULED') return false;
    const d = new Date(v.visitDate);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#111113] tracking-tight">Site Visits & Field Dispatches</h1>
            {upcomingToday > 0 && (
              <span className="bg-[#F3F4F6] text-[#111113] border border-[#E5E7EB] text-[10px] font-mono font-bold px-2 py-0.5 rounded-sm">
                {upcomingToday} today
              </span>
            )}
          </div>
          <p className="text-xs text-[#5A6470] font-medium mt-0.5">{visits.length} recorded field visits</p>
        </div>

        {/* View toggle */}
        <div className="flex items-center bg-[#F3F4F6] rounded-sm p-0.5 border border-[#E5E7EB]">
          <button
            onClick={() => setView('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition',
              view === 'list' ? 'bg-white border border-[#111113] text-[#111113] font-semibold' : 'text-[#5A6470]',
            )}
          >
            <LayoutList size={13} />
            <span>List</span>
          </button>
          <button
            onClick={() => setView('calendar')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition',
              view === 'calendar' ? 'bg-white border border-[#111113] text-[#111113] font-semibold' : 'text-[#5A6470]',
            )}
          >
            <CalendarDays size={13} />
            <span>Calendar</span>
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {view === 'list' && (
        <div className="px-6 py-3 bg-[#F3F4F6] border-b border-[#E5E7EB] flex items-center gap-3">
          {(Object.keys(STATUS_CONFIG) as Filter[]).map((s) => (
            <div key={s} className={cn('px-3 py-1.5 rounded-sm text-xs font-medium flex items-center gap-2 cursor-pointer transition',
              filter === s ? 'bg-white border border-[#111113] text-[#111113]' : 'text-[#5A6470] hover:text-[#111113]')}
              onClick={() => setFilter(s)}>
              <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', STATUS_CONFIG[s].color)}>
                {counts[s]}
              </span>
              {STATUS_CONFIG[s].label}
            </div>
          ))}
          <div key="ALL" className={cn('px-3 py-1.5 rounded-sm text-xs font-medium flex items-center gap-2 cursor-pointer transition ml-auto',
            filter === 'ALL' ? 'bg-white border border-[#111113] text-[#111113]' : 'text-[#5A6470] hover:text-[#111113]')}
            onClick={() => setFilter('ALL')}>
            All ({counts.ALL})
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-[#111113] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : view === 'calendar' ? (
          <VisitCalendar visits={visits} />
        ) : filtered.length === 0 ? (
          <EmptyState icon={MapPin} title={filter === 'ALL' ? 'No site visits' : `No ${filter.toLowerCase()} site visits`} description="Schedule visits from a lead's detail page." />
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {filtered.map((visit, i) => {
                const cfg = STATUS_CONFIG[visit.status];
                const visitDate = new Date(visit.visitDate);
                const isPast = visitDate < new Date();
                const isToday = visitDate.toDateString() === new Date().toDateString();

                return (
                  <motion.div key={visit.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
                    {visit.status === 'SCHEDULED' && (
                      <div className={cn(
                        'rounded-sm border p-3 mb-2',
                        isToday ? 'border-[#E04020] ring-1 ring-[#FDECE6] bg-white' :
                        isPast ? 'border-[#E5E7EB] bg-[#F3F4F6]' : 'border-[#E5E7EB]',
                      )}>
                        {/* Today/overdue alert */}
                        {visit.status === 'SCHEDULED' && isToday && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[11px] px-2 py-0.5 rounded-sm font-bold bg-[#C02F12] text-white">TODAY</span>
                          </div>
                        )}
                        {visit.status === 'SCHEDULED' && isPast && !isToday && (
                          <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[11px] px-2 py-0.5 rounded-sm font-bold bg-white text-[#C02F12] border border-[#C02F12]">OVERDUE</span>
                          </div>
                        )}

                        {/* Actions for scheduled visits */}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setFeedbackModal({ visit, status: 'COMPLETED' })}
                            disabled={updating === visit.id}
                            className="text-xs bg-[#C02F12] text-white px-3 py-1.5 rounded-full hover:bg-[#A82717] transition font-semibold flex items-center gap-1">
                            <CheckCircle2 size={12} /> Mark Completed
                          </button>
                          <button
                            onClick={() => updateStatus(visit.id, 'NO_SHOW')}
                            disabled={updating === visit.id}
                            className="text-xs bg-white text-[#5A6470] px-3 py-1.5 rounded-sm border border-[#E5E7EB] hover:bg-[#F3F4F6] transition font-medium">
                            No Show
                          </button>
                          <button
                            onClick={() => updateStatus(visit.id, 'CANCELLED')}
                            disabled={updating === visit.id}
                            className="text-xs text-[#E04020] hover:text-[#C02F12] px-2 py-1.5 transition">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    <VisitCard visit={visit} />

                    {/* Feedback display */}
                    {visit.feedback && (
                      <p className="text-sm text-[#5A6470] italic bg-[#F3F4F6] border border-[#F3F4F6] rounded-sm px-3 py-2 mt-1">
                        "{visit.feedback}"
                      </p>
                    )}

                    {/* Rating stars if completed */}
                    {visit.status === 'COMPLETED' && visit.rating && (
                      <div className="flex items-center gap-0.5 mt-1 ml-1">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star key={s} size={13} className={s <= visit.rating! ? 'text-[#E04020] fill-[#E04020]' : 'text-[#E5E7EB]'} />
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Feedback/Complete modal */}
      {feedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div ref={feedbackTrapRef} tabIndex={-1} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-[#111113] text-lg mb-1">Complete Site Visit</h3>
            <p className="text-sm text-[#5A6470] mb-5">
              {feedbackModal.visit.project} · {feedbackModal.visit.lead.name}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-[#5A6470] mb-2">Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)} type="button">
                    <Star size={24} className={s <= rating ? 'text-[#E04020] fill-[#E04020]' : 'text-[#E5E7EB] hover:text-[#E04020]'} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-[#5A6470] mb-2">Feedback (optional)</label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="How did the visit go? Client's interest level, concerns…"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-sm focus:outline-none focus:ring-2 focus:ring-[#111113] resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setFeedbackModal(null); setFeedback(''); setRating(0); }}
                className="flex-1 px-4 py-2.5 border border-[#E5E7EB] rounded-sm text-sm font-medium text-[#5A6470] hover:bg-[#F3F4F6] transition">
                Cancel
              </button>
              <button
                onClick={() => updateStatus(feedbackModal.visit.id, 'COMPLETED', feedback || undefined, rating || undefined)}
                disabled={updating === feedbackModal.visit.id}
                className="flex-1 px-4 py-2.5 bg-[#C02F12] text-white rounded-full text-sm font-semibold hover:bg-[#A82717] transition disabled:opacity-60">
                {updating ? 'Saving…' : 'Mark Completed'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
