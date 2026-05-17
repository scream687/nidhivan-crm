'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { cn, timeAgo } from '@/lib/utils';
import { MapPin, CalendarCheck, Clock, CheckCircle2, XCircle, AlertCircle, Star, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

type SiteVisit = {
  id: string;
  project: string;
  visitDate: string;
  status: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  feedback?: string;
  rating?: number;
  lead: { id: string; name: string; leadNumber: string };
  assignedTo: { id: string; name: string };
  createdAt: string;
};

type Filter = 'ALL' | 'SCHEDULED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

const STATUS_CONFIG = {
  SCHEDULED: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700', icon: <Clock size={13} /> },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={13} /> },
  CANCELLED: { label: 'Cancelled', color: 'bg-gray-100 text-gray-500', icon: <XCircle size={13} /> },
  NO_SHOW: { label: 'No Show', color: 'bg-red-100 text-red-600', icon: <AlertCircle size={13} /> },
};

export default function SiteVisitsPage() {
  const { user } = useAuthStore();
  const [visits, setVisits] = useState<SiteVisit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');
  const [updating, setUpdating] = useState<string | null>(null);
  const [feedbackModal, setFeedbackModal] = useState<{ visit: SiteVisit; status: string } | null>(null);
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
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-blue-600" />
            <h1 className="text-lg font-bold text-gray-900">Site Visits</h1>
            {upcomingToday > 0 && (
              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                {upcomingToday} today
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{visits.length} total visits</p>
        </div>
      </div>

      {/* Summary strip */}
      <div className="px-6 py-3 bg-gray-50 border-b border-gray-100 flex items-center gap-3">
        {(Object.keys(STATUS_CONFIG) as Filter[]).map((s) => (
          <div key={s} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition',
            filter === s ? 'bg-white shadow-sm border border-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700')}
            onClick={() => setFilter(s)}>
            <span className={cn('px-1.5 py-0.5 rounded-full text-[10px] font-bold', STATUS_CONFIG[s].color)}>
              {counts[s]}
            </span>
            {STATUS_CONFIG[s].label}
          </div>
        ))}
        <div key="ALL" className={cn('px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer transition ml-auto',
          filter === 'ALL' ? 'bg-white shadow-sm border border-gray-200 text-gray-900' : 'text-gray-500 hover:text-gray-700')}
          onClick={() => setFilter('ALL')}>
          All ({counts.ALL})
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <MapPin size={48} className="mx-auto mb-3 opacity-20" />
            <p className="font-medium">No {filter === 'ALL' ? '' : filter.toLowerCase()} site visits</p>
            <p className="text-sm mt-1">Schedule visits from a lead's detail page</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((visit, i) => {
              const cfg = STATUS_CONFIG[visit.status];
              const visitDate = new Date(visit.visitDate);
              const isPast = visitDate < new Date();
              const isToday = visitDate.toDateString() === new Date().toDateString();

              return (
                <motion.div key={visit.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className={cn('bg-white rounded-xl border p-5 flex items-start gap-4 hover:shadow-sm transition',
                    visit.status === 'SCHEDULED' && isToday ? 'border-blue-300 ring-1 ring-blue-200' :
                    visit.status === 'SCHEDULED' && isPast ? 'border-orange-200' : 'border-gray-200'
                  )}>
                  {/* Date block */}
                  <div className={cn('flex flex-col items-center justify-center w-14 h-14 rounded-xl flex-shrink-0 text-center',
                    visit.status === 'COMPLETED' ? 'bg-green-50' :
                    visit.status === 'SCHEDULED' ? 'bg-blue-50' : 'bg-gray-50')}>
                    <p className="text-lg font-bold text-gray-900 leading-none">{visitDate.getDate()}</p>
                    <p className="text-[10px] text-gray-500 font-medium uppercase">
                      {visitDate.toLocaleString('en-IN', { month: 'short' })}
                    </p>
                    <p className="text-[9px] text-gray-400">{visitDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">{visit.project}</span>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold flex items-center gap-1', cfg.color)}>
                            {cfg.icon} {cfg.label}
                          </span>
                          {visit.status === 'SCHEDULED' && isToday && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-600 text-white">TODAY</span>
                          )}
                          {visit.status === 'SCHEDULED' && isPast && !isToday && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-orange-100 text-orange-600">OVERDUE</span>
                          )}
                        </div>
                        <a href={`/leads/${visit.lead.id}`} className="text-sm text-blue-600 hover:underline mt-0.5 block">
                          {visit.lead.name} · {visit.lead.leadNumber}
                        </a>
                        <p className="text-xs text-gray-400 mt-0.5">Assigned to: {visit.assignedTo.name}</p>
                      </div>

                      {/* Rating stars if completed */}
                      {visit.status === 'COMPLETED' && visit.rating && (
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} size={13} className={s <= visit.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
                          ))}
                        </div>
                      )}
                    </div>

                    {visit.feedback && (
                      <p className="text-sm text-gray-600 italic bg-gray-50 rounded-lg px-3 py-2 mb-2">"{visit.feedback}"</p>
                    )}

                    {/* Actions — only for scheduled visits */}
                    {visit.status === 'SCHEDULED' && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => setFeedbackModal({ visit, status: 'COMPLETED' })}
                          disabled={updating === visit.id}
                          className="text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition font-medium flex items-center gap-1">
                          <CheckCircle2 size={12} /> Mark Completed
                        </button>
                        <button
                          onClick={() => updateStatus(visit.id, 'NO_SHOW')}
                          disabled={updating === visit.id}
                          className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition font-medium">
                          No Show
                        </button>
                        <button
                          onClick={() => updateStatus(visit.id, 'CANCELLED')}
                          disabled={updating === visit.id}
                          className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5 transition">
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feedback/Complete modal */}
      {feedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Complete Site Visit</h3>
            <p className="text-sm text-gray-500 mb-5">
              {feedbackModal.visit.project} · {feedbackModal.visit.lead.name}
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)} type="button">
                    <Star size={24} className={s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200 hover:text-yellow-300'} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm font-medium text-gray-700 mb-2">Feedback (optional)</label>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                placeholder="How did the visit go? Client's interest level, concerns…"
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button onClick={() => { setFeedbackModal(null); setFeedback(''); setRating(0); }}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={() => updateStatus(feedbackModal.visit.id, 'COMPLETED', feedback || undefined, rating || undefined)}
                disabled={updating === feedbackModal.visit.id}
                className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 transition disabled:opacity-60">
                {updating ? 'Saving…' : 'Mark Completed'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
