'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { cn, timeAgo } from '@/lib/utils';
import { Search, MessageCircle, Phone, Users, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface LeadConversation {
  id: string;
  name: string;
  phone: string;
  source: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastMessageType?: string;
  unreadCount: number;
}

interface InboxSidebarProps {
  selectedLeadId: string | null;
  onSelectLead: (id: string) => void;
}

const SOURCE_AVATAR_COLORS: Record<string, string> = {
  FACEBOOK: 'bg-blue-500',
  INSTAGRAM: 'bg-pink-500',
  HOUSING_COM: 'bg-red-500',
  NINETYNINE_ACRES: 'bg-orange-500',
  BROKER_REFERRAL: 'bg-purple-500',
  WALK_IN: 'bg-teal-500',
  WHATSAPP: 'bg-green-500',
  WEBSITE: 'bg-slate-500',
  GOOGLE_ADS: 'bg-cyan-500',
  OTHER: 'bg-gray-500',
};

export default function InboxSidebar({ selectedLeadId, onSelectLead }: InboxSidebarProps) {
  const [conversations, setConversations] = useState<LeadConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/communication/leads', {
        params: { search: search || undefined },
      });
      setConversations(Array.isArray(data) ? data : Array.isArray(data.data) ? data.data : []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const filtered = search
    ? conversations.filter(
        (c) =>
          c.name?.toLowerCase().includes(search.toLowerCase()) ||
          c.phone?.includes(search),
      )
    : conversations;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search */}
      <div className="p-3 border-b border-gray-100">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or phone…"
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400 placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* List */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="space-y-1 p-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="h-3 bg-gray-200 rounded w-28" />
                  <div className="h-2.5 bg-gray-100 rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <MessageCircle size={36} className="text-gray-200 mb-3" />
            <p className="text-sm text-gray-400 font-medium">No communications yet</p>
            <p className="text-xs text-gray-300 mt-1">
              {search ? 'Try a different search term' : 'Incoming calls or messages will appear here'}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((lead) => (
              <button
                key={lead.id}
                onClick={() => onSelectLead(lead.id)}
                className={cn(
                  'w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors border-l-2',
                  selectedLeadId === lead.id
                    ? 'bg-blue-50 border-l-blue-500'
                    : 'border-l-transparent hover:bg-gray-50',
                  lead.unreadCount > 0 && !selectedLeadId && 'bg-blue-50/40',
                )}
              >
                {/* Avatar */}
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5',
                    SOURCE_AVATAR_COLORS[lead.source] || 'bg-gray-500',
                  )}
                >
                  {lead.name
                    ? lead.name.slice(0, 2).toUpperCase()
                    : lead.phone?.slice(0, 2)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {lead.name || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {lead.lastMessageAt ? timeAgo(lead.lastMessageAt) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{lead.phone}</p>
                  {lead.lastMessage && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      {lead.lastMessageType === 'CALL' && <Phone size={10} className="inline mr-0.5" />}
                      {lead.lastMessage}
                    </p>
                  )}
                </div>

                {/* Unread badge */}
                {lead.unreadCount > 0 && (
                  <div className="flex-shrink-0 mt-1">
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-blue-500 rounded-full">
                      {lead.unreadCount > 99 ? '99+' : lead.unreadCount}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
