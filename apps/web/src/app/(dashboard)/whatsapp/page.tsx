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
  CONNECTED: 'bg-blue-100 text-blue-600',
  INTERESTED: 'bg-purple-100 text-purple-600',
  HOT: 'bg-red-100 text-red-600',
  SITE_VISIT_SCHEDULED: 'bg-indigo-100 text-indigo-600',
  SITE_VISIT_COMPLETED: 'bg-emerald-100 text-emerald-700',
  NEGOTIATION: 'bg-amber-100 text-amber-700',
  BOOKING_PENDING: 'bg-pink-100 text-pink-700',
  LOAN_PROCESSING: 'bg-blue-100 text-blue-600',
  DOCUMENTATION_PENDING: 'bg-purple-100 text-purple-500',
  PAYMENT_PENDING: 'bg-amber-100 text-amber-600',
  CLOSED_WON: 'bg-green-100 text-green-700',
  CLOSED_LOST: 'bg-gray-100 text-gray-700',
  DUPLICATE: 'bg-orange-100 text-orange-600',
  FUTURE_PROSPECT: 'bg-indigo-100 text-indigo-700',
};

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
    try {
      const { data } = await api.get('/whatsapp/conversations');
      setConversations(data || []);
      if (data?.length > 0 && !selected) {
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
    <div className="flex h-screen bg-white">
      {/* Conversation list */}
      <div className="w-80 border-r border-gray-200 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <MessageSquare size={16} className="text-white" />
              </div>
              <h1 className="font-bold text-gray-900">WhatsApp Inbox</h1>
              {totalUnread > 0 && (
                <span className="bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{totalUnread}</span>
              )}
            </div>
            <button onClick={loadConversations} aria-label="Refresh conversations" className="text-gray-400 hover:text-gray-600">
              <RefreshCw size={14} />
            </button>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
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
              <Link href={`/leads/${selected.lead.id}`} className="text-xs text-blue-600 hover:underline">
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
                      msg.status === 'read' ? <CheckCheck size={12} className="text-blue-500" /> :
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
