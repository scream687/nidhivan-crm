'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Phone, MessageSquare, FileText, RefreshCw } from 'lucide-react';
import InboxSidebar from '@/components/communication/InboxSidebar';
import LeadTimeline from '@/components/communication/LeadTimeline';
import api from '@/lib/api';
import toast from 'react-hot-toast';

export default function CommunicationPage() {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loadingUnread, setLoadingUnread] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/communication/unread-count');
        setUnreadTotal(typeof data === 'number' ? data : data?.count ?? 0);
      } catch {
        toast.error('Failed to load unread count');
      } finally {
        setLoadingUnread(false);
      }
    })();
  }, [selectedLeadId]);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <MessageCircle size={18} className="text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg font-bold text-gray-900">Communication</h1>
              {!loadingUnread && unreadTotal > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-white bg-blue-500 rounded-full">
                  {unreadTotal > 99 ? '99+' : unreadTotal} unread
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400">
              {selectedLeadId ? 'Viewing lead conversation' : 'All lead communications'}
            </p>
          </div>
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Inbox Sidebar (wider) */}
        <div className="w-80 lg:w-96 border-r border-gray-200 flex-shrink-0 overflow-hidden">
          <InboxSidebar
            selectedLeadId={selectedLeadId}
            onSelectLead={setSelectedLeadId}
          />
        </div>

        {/* Right Panel - Timeline / Default state */}
        <div className="flex-1 overflow-hidden bg-gray-50/50">
          {selectedLeadId ? (
            <LeadTimeline leadId={selectedLeadId} />
          ) : (
            <DefaultState />
          )}
        </div>
      </div>
    </div>
  );
}

function DefaultState() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-sm"
      >
        <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-5">
          <MessageCircle size={36} className="text-blue-300" />
        </div>
        <h2 className="text-lg font-bold text-gray-800 mb-2">Select a lead to view communication</h2>
        <p className="text-sm text-gray-400 leading-relaxed">
          Choose a conversation from the sidebar to see the full timeline of calls, WhatsApp messages, notes, and activities.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3 max-w-xs mx-auto">
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <Phone size={18} className="text-green-400 mx-auto mb-1" />
            <p className="text-[10px] text-green-600 font-medium">Calls</p>
          </div>
          <div className="bg-green-50 rounded-xl p-3 text-center">
            <MessageSquare size={18} className="text-green-400 mx-auto mb-1" />
            <p className="text-[10px] text-green-600 font-medium">WhatsApp</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-3 text-center">
            <FileText size={18} className="text-amber-400 mx-auto mb-1" />
            <p className="text-[10px] text-amber-600 font-medium">Notes</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <RefreshCw size={18} className="text-purple-400 mx-auto mb-1" />
            <p className="text-[10px] text-purple-600 font-medium">Activities</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
