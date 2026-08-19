'use client';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, Send, Check, CheckCheck, RefreshCw, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import Link from 'next/link';
import toast from 'react-hot-toast';

const STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-500',
  ATTEMPTED: 'bg-yellow-100 text-yellow-700',
  NOT_REACHABLE: 'bg-gray-100 text-gray-500',
  WRONG_NUMBER: 'bg-red-100 text-red-700',
  CONNECTED: 'bg-[#FDECE6] text-[#E04020]',
  INTERESTED: 'bg-purple-100 text-purple-600',
  HOT: 'bg-red-100 text-red-600',
  SITE_VISIT_SCHEDULED: 'bg-[#FDECE6] text-[#E04020]',
  SITE_VISIT_COMPLETED: 'bg-emerald-100 text-emerald-700',
  NEGOTIATION: 'bg-amber-100 text-amber-700',
  BOOKING_PENDING: 'bg-pink-100 text-pink-700',
  LOAN_PROCESSING: 'bg-[#FDECE6] text-[#E04020]',
  DOCUMENTATION_PENDING: 'bg-purple-100 text-purple-500',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-600',
  CLOSED_WON: 'bg-green-100 text-green-700',
  CLOSED_LOST: 'bg-gray-100 text-gray-700',
  DUPLICATE: 'bg-orange-100 text-orange-600',
  FUTURE_PROSPECT: 'bg-[#FDECE6] text-[#C02F12]',
};

// Numbers are stored with varying country-code/format prefixes; match on the last 10 digits.
function samePhone(a?: string, b?: string) {
  if (!a || !b) return false;
  const digits = (s: string) => s.replace(/\D/g, '').slice(-10);
  return digits(a) === digits(b);
}

export default function WhatsAppInboxPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [message, setMessage] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [hasConfig, setHasConfig] = useState<boolean | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkConfig();
    loadConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function checkConfig() {
    try {
      const { data } = await api.get('/whatsapp/config');
      setHasConfig(!!data?.phoneNumberId);
    } catch {
      setHasConfig(false);
    }
  }

  async function loadConversations() {
    setLoading(true);
    // Deep link from a lead: /whatsapp?phone=…&name=… opens (or drafts) that thread
    const params = new URLSearchParams(window.location.search);
    const targetPhone = params.get('phone');
    try {
      const { data } = await api.get('/whatsapp/conversations');
      setConversations(data || []);
      if (targetPhone) {
        const match = (data || []).find((c: any) => samePhone(c.phone, targetPhone));
        if (match) selectConversation(match);
        else {
          setSelected({ id: null, phone: targetPhone, name: params.get('name') || targetPhone });
          setMessages([]);
        }
        return;
      }
      if (data && data.length > 0 && !selected) {
        selectConversation(data[0]);
      }
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }

  async function selectConversation(conv: any) {
    setSelected(conv);
    setMessages([]);
    if (!conv.id) return; // draft thread — nothing to fetch yet
    try {
      const { data } = await api.get(`/whatsapp/conversations/${conv.id}/messages`);
      setMessages(data || []);
      // Update unread count locally
      setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, unreadCount: 0 } : c));
    } catch {
      toast.error('Could not load messages');
    }
  }

  async function sendMessage() {
    if (!message.trim() || !selected) return;
    setSending(true);
    const body = message.trim();
    setMessage('');
    try {
      const { data } = await api.post('/whatsapp/send', { to: selected.phone, body });
      setMessages(prev => [...prev, data]);
      if (!selected.id) loadConversations(); // first message on a draft thread — pull the real conversation in
    } catch {
      toast.error('Failed to send message');
      setMessage(body);
    } finally {
      setSending(false);
    }
  }

  const filtered = conversations.filter(c =>
    !search || (c.name || c.phone).toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  );

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  if (hasConfig === false) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center">
          <MessageSquare size={28} className="text-green-600" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900">WhatsApp not configured</h2>
        <p className="text-sm text-gray-500 max-w-sm">
          Connect your WhatsApp Business API to start sending and receiving messages.
        </p>
        <Link href="/settings" className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          Go to Settings → WhatsApp API
        </Link>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-100px)] frappe-card overflow-hidden">
      {/* Conversation list */}
      <div className="w-80 border-r border-[#e5e7eb] flex flex-col flex-shrink-0 bg-white">
        <div className="p-3.5 border-b border-[#e5e7eb]">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-emerald-500 text-white rounded-md flex items-center justify-center">
                <MessageSquare size={13} />
              </div>
              <h1 className="text-xl font-bold text-[#111113] tracking-tight">WhatsApp Inbox</h1>
              {totalUnread > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.2 rounded font-mono">{totalUnread}</span>
              )}
            </div>
            <button onClick={loadConversations} aria-label="Refresh conversations" className="text-[#9ca3af] hover:text-[#111827]">
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-7 pr-3 py-1.5 text-xs bg-[#f3f4f6] border border-transparent focus:border-[#d1d5db] focus:bg-white rounded-lg focus:outline-none text-[#111827] placeholder-[#9ca3af]"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-[#111827] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-[#9ca3af] text-xs font-mono">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-30" />
              No conversations yet.
            </div>
          )}
          {filtered.map(conv => (
            <div key={conv.id} onClick={() => selectConversation(conv)}
              className={cn('flex items-start gap-3 px-4 py-3.5 cursor-pointer border-b border-gray-50 hover:bg-gray-50 transition',
                selected?.id === conv.id ? 'bg-green-50 border-l-2 border-l-green-500' : '')}>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm flex-shrink-0">
                {(conv.name || conv.phone).slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 truncate">{conv.name || conv.phone}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {conv.latestMessage?.timestamp
                      ? new Date(conv.latestMessage.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-500 truncate mt-0.5">{conv.latestMessage?.body || ''}</p>
                <div className="flex items-center justify-between mt-1">
                  {conv.lead?.stage && (
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-medium', STAGE_COLORS[conv.lead.stage] || 'bg-gray-100 text-gray-500')}>
                      {conv.lead.stage.replace(/_/g, ' ')}
                    </span>
                  )}
                  {conv.unreadCount > 0 && (
                    <span className="bg-green-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center ml-auto">{conv.unreadCount}</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat window */}
      {selected ? (
        <div className="flex-1 flex flex-col">
          <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                {(selected.name || selected.phone).slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{selected.name || selected.phone}</p>
                <p className="text-xs text-gray-400">{selected.phone}</p>
              </div>
            </div>
            {selected.lead && (
              <Link href={`/leads/${selected.lead.id}`} className="text-xs text-[#E04020] hover:underline">
                View Lead →
              </Link>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#efeae2]">
            {messages.map(msg => (
              <div key={msg.id} className={cn('flex', msg.direction === 'out' ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-xs lg:max-w-md rounded-xl px-4 py-2.5 shadow-sm',
                  msg.direction === 'out' ? 'bg-[#d9fdd3] text-gray-800 rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm')}>
                  <p className="text-sm whitespace-pre-line">{msg.body}</p>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] text-gray-400">
                      {new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {msg.direction === 'out' && (
                      msg.status === 'read' ? <CheckCheck size={12} className="text-[#E04020]" /> :
                      msg.status === 'delivered' ? <CheckCheck size={12} className="text-gray-400" /> :
                      <Check size={12} className="text-gray-400" />
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="p-4 border-t border-gray-200 bg-white flex items-end gap-3">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5">
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Type a message…" rows={1}
                className="w-full bg-transparent text-sm text-gray-700 resize-none focus:outline-none" />
            </div>
            <button onClick={sendMessage} disabled={sending || !message.trim()}
              className="w-10 h-10 bg-green-500 hover:bg-green-600 disabled:opacity-40 rounded-full flex items-center justify-center text-white transition flex-shrink-0">
              <Send size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <MessageSquare size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm">Select a conversation</p>
          </div>
        </div>
      )}
    </div>
  );
}
