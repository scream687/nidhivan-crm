'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn, timeAgo } from '@/lib/utils';
import {
  Phone,
  MessageSquare,
  FileText,
  RefreshCw,
  Briefcase,
  MapPin,
  CheckSquare,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Play,
  Image,
  File,
  Loader2,
  Inbox,
} from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { TimelineEntry, TimelineFilter } from '@nidhivan/shared';

const FILTERS: { key: TimelineFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'CALL', label: 'Calls' },
  { key: 'WHATSAPP', label: 'WhatsApp' },
  { key: 'NOTE', label: 'Notes' },
  { key: 'TASK', label: 'Tasks' },
  { key: 'SITE_VISIT', label: 'Visits' },
  { key: 'ACTIVITY', label: 'Activities' },
];

function formatDuration(seconds?: number) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getDateSeparator(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (target.getTime() === today.getTime()) return 'Today';
  if (target.getTime() === yesterday.getTime()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function entryIcon(type: string, entry?: TimelineEntry) {
  switch (type) {
    case 'CALL':
      return Phone;
    case 'WHATSAPP':
      return MessageSquare;
    case 'NOTE':
      return FileText;
    case 'TASK':
      return CheckSquare;
    case 'SITE_VISIT':
      return MapPin;
    case 'BOOKING':
      return FileCheck;
    case 'ACTIVITY':
      if (entry?.activityType === 'STAGE_CHANGE') return Briefcase;
      if (entry?.activityType === 'SITE_VISIT') return MapPin;
      return RefreshCw;
    default:
      return RefreshCw;
  }
}

function entryColor(type: string, entry?: TimelineEntry): string {
  switch (type) {
    case 'CALL':
      return entry?.direction === 'INCOMING' ? 'text-green-500' : 'text-blue-500';
    case 'WHATSAPP':
      return 'text-green-500';
    case 'NOTE':
      return 'text-amber-500';
    case 'TASK':
      return 'text-purple-500';
    case 'SITE_VISIT':
      return 'text-blue-500';
    case 'BOOKING':
      return 'text-amber-500';
    case 'ACTIVITY':
      if (entry?.activityType === 'STAGE_CHANGE') return 'text-purple-500';
      if (entry?.activityType === 'SITE_VISIT') return 'text-blue-500';
      return 'text-gray-400';
    default:
      return 'text-gray-400';
  }
}

function EntryCard({ entry }: { entry: TimelineEntry }) {
  const [expanded, setExpanded] = useState(false);
  const Icon = entryIcon(entry.type, entry);
  const color = entryColor(entry.type, entry);
  const hasLongContent = (entry.description?.length ?? 0) > 120 || (entry.content?.length ?? 0) > 120;
  const showExpand = hasLongContent;

  const body = entry.description || entry.content || entry.title || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3 group"
    >
      {/* Icon column */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div className={cn('w-8 h-8 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center', color)}>
          <Icon size={14} />
        </div>
        {/* Timeline line */}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow transition-shadow p-3.5">
          {/* Header */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-semibold text-gray-700 capitalize">
                {entry.type === 'CALL' ? 'Call' :
                 entry.type === 'WHATSAPP' ? 'WhatsApp' :
                 entry.type === 'NOTE' ? 'Note' :
                 entry.type === 'TASK' ? 'Task' :
                 entry.type === 'SITE_VISIT' ? 'Visit' :
                 entry.type === 'BOOKING' ? 'Booking' : 'Activity'}
              </span>
              {entry.direction && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                  entry.direction === 'INCOMING'
                    ? 'bg-green-50 text-green-600'
                    : 'bg-blue-50 text-blue-600',
                )}>
                  {entry.direction === 'INCOMING' ? 'Incoming' : 'Outgoing'}
                </span>
              )}
              {entry.type === 'CALL' && entry.callStatus && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                  entry.callStatus === 'COMPLETED' ? 'bg-green-50 text-green-600' :
                  entry.callStatus === 'NO_ANSWER' ? 'bg-yellow-50 text-yellow-600' :
                  entry.callStatus === 'FAILED' ? 'bg-red-50 text-red-600' :
                  'bg-gray-50 text-gray-500'
                )}>
                  {entry.callStatus.replace('_', ' ')}
                </span>
              )}
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0">
              {timeAgo(entry.createdAt)}
            </span>
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            {/* Title */}
            {entry.title && entry.type !== 'CALL' && (
              <p className="text-sm font-medium text-gray-800">{entry.title}</p>
            )}

            {/* Call-specific */}
            {entry.type === 'CALL' && (
              <div className="flex items-center gap-2 flex-wrap">
                {entry.phoneNumber && (
                  <span className="text-sm text-gray-700 font-medium">{entry.phoneNumber}</span>
                )}
                {entry.duration != null && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-mono">
                    {formatDuration(entry.duration)}
                  </span>
                )}
              </div>
            )}

            {/* WhatsApp media indicator */}
            {entry.type === 'WHATSAPP' && entry.mediaUrl && (
              <div className="flex items-center gap-1.5 text-xs text-blue-600">
                {entry.mediaType?.startsWith('image') ? (
                  <><Image size={12} /> Image</>
                ) : (
                  <><File size={12} /> Attachment</>
                )}
              </div>
            )}

            {/* Description/content */}
            {body && (
              <div>
                <p className={cn(
                  'text-sm text-gray-600 whitespace-pre-wrap',
                  !expanded && showExpand && 'line-clamp-3',
                )}>
                  {body}
                </p>
                {showExpand && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700 mt-1 font-medium"
                  >
                    {expanded ? (
                      <>Show less <ChevronUp size={12} /></>
                    ) : (
                      <>Show more <ChevronDown size={12} /></>
                    )}
                  </button>
                )}
              </div>
            )}

            {/* Recording play button */}
            {entry.type === 'CALL' && entry.recordingUrl && (
              <div className="mt-2">
                <audio controls src={entry.recordingUrl} className="w-full h-8 rounded" />
              </div>
            )}

            {/* User attribution */}
            {entry.user?.name && entry.type !== 'CALL' && (
              <p className="text-[11px] text-gray-400 mt-1">by {entry.user.name}</p>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface LeadTimelineProps {
  leadId: string;
  refreshKey?: number;
}

export default function LeadTimeline({ leadId, refreshKey }: LeadTimelineProps) {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<TimelineFilter>('ALL');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevScrollHeight = useRef(0);
  const observerRef = useRef<HTMLDivElement>(null);

  const loadTimeline = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
      setEntries([]);
      setCursor(null);
      setHasMore(true);
    } else {
      if (!hasMore || loadingMore) return;
      setLoadingMore(true);
    }

    try {
      const params: Record<string, string> = {};
      if (!isInitial && cursor) params.cursor = cursor;
      if (filter !== 'ALL') params.types = filter;

      const { data } = await api.get(`/communication/timeline/${leadId}`, { params });
      const list = Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : [];
      const nextCursor = data.nextCursor || null;

      if (isInitial) {
        setEntries(list);
      } else {
        // Prepend older entries (cursor pagination goes backward in time)
        setEntries((prev) => [...list, ...prev]);
      }
      setCursor(nextCursor);
      setHasMore(!!nextCursor);
    } catch {
      toast.error('Failed to load timeline');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [leadId, filter, cursor, hasMore, loadingMore]);

  useEffect(() => {
    loadTimeline(true);
  }, [leadId, filter, refreshKey]);

  // Intersection observer for "load more" at top
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasMore && !loading && !loadingMore) {
          prevScrollHeight.current = scrollRef.current?.scrollHeight || 0;
          loadTimeline(false);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore, loadTimeline]);

  // Maintain scroll position when prepending older entries
  useEffect(() => {
    if (!loadingMore && prevScrollHeight.current > 0 && scrollRef.current) {
      const newScrollHeight = scrollRef.current.scrollHeight;
      const diff = newScrollHeight - prevScrollHeight.current;
      scrollRef.current.scrollTop = diff;
      prevScrollHeight.current = 0;
    }
  }, [entries]);

  // Group entries by date
  const grouped = entries.reduce<Record<string, TimelineEntry[]>>((acc, entry) => {
    const key = getDateSeparator(new Date(entry.createdAt));
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      {/* Filter chips */}
      <div className="flex items-center gap-1.5 px-1 pb-3 border-b border-gray-100 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap',
              filter === f.key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-50 text-gray-500 hover:bg-gray-100',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline scroll area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3">
        {/* Load more sentinel */}
        <div ref={observerRef} className="flex justify-center py-2">
          {loadingMore && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Loader2 size={12} className="animate-spin" />
              Loading older…
            </div>
          )}
          {!hasMore && entries.length > 0 && (
            <p className="text-[10px] text-gray-300">Beginning of conversation</p>
          )}
        </div>

        {loading ? (
          <div className="space-y-4 px-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 animate-pulse">
                <div className="w-8 h-8 rounded-full bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-24" />
                  <div className="h-12 bg-gray-50 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Inbox size={40} className="text-gray-200 mb-3" />
            <p className="text-sm text-gray-400 font-medium">No entries yet</p>
            <p className="text-xs text-gray-300 mt-1">
              Communication for this lead will appear here
            </p>
          </div>
        ) : (
          <div className="px-4 space-y-0">
            {Object.entries(grouped).map(([dateLabel, dateEntries]) => (
              <div key={dateLabel}>
                {/* Date separator */}
                <div className="flex items-center gap-3 py-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex-shrink-0">
                    {dateLabel}
                  </span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>

                {/* Entries */}
                <div className="space-y-0">
                  {dateEntries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
