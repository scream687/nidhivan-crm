'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';
import { useLeadsStore } from '@/stores/leadsStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { NotificationBell } from '@/components/layout/NotificationBell';
import CopilotChat from '@/components/ai/CopilotChat';
import { Menu, Search, Plus, Sparkles, ChevronRight, Bell, Command } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, fetchMe } = useAuthStore();
  const { socket, connected, connect } = useSocketStore();
  const { setupSocketListeners } = useLeadsStore();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    fetchMe();
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
      return;
    }
    if (user) {
      const token = localStorage.getItem('accessToken');
      if (token) connect(token);
    }
  }, [user, isLoading]);

  useEffect(() => {
    if (socket) {
      setupSocketListeners(socket);
    }
  }, [socket, setupSocketListeners]);

  // Close sidebar on Escape key
  useEffect(() => {
    if (!sidebarOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSidebar();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [sidebarOpen, closeSidebar]);

  // Open command palette with ⌘K / Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F3F4F6] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#111113] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const pathParts = pathname.split('/').filter(Boolean);
  const currentTitle = pathParts.length > 0 
    ? pathParts[pathParts.length - 1].replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    : 'Overview';

  return (
    <div className="min-h-screen bg-[#F3F4F6] text-[#111113]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 z-30 transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar onClose={closeSidebar} />
      </div>

      {/* Main App Container */}
      <div className="lg:pl-60 flex flex-col min-h-screen">
        {/* Frappe Desk Topbar */}
        <header className="h-12 bg-white border-b border-[#E5E7EB] px-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-1.5 text-[#5A6470] hover:text-[#111113] rounded-lg hover:bg-[#F3F4F6]"
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>

            {/* Breadcrumb Trail */}
            <div className="flex items-center gap-1.5 text-xs text-[#5A6470]">
              <Link href="/dashboard" className="hover:text-[#111113] font-medium transition-colors">
                Nidhivan
              </Link>
              <ChevronRight size={12} className="text-[#626B76]" />
              <span className="text-[#111113] font-semibold">{currentTitle}</span>
            </div>
          </div>

          {/* Central Search Bar */}
          <div className="hidden md:flex items-center w-80 max-w-sm">
            <button
              type="button"
              onClick={() => setCommandOpen(true)}
              className="relative w-full text-left"
              aria-label="Search or type a command"
            >
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#626B76]" />
              <span className="block w-full bg-[#F3F4F6] hover:bg-white text-xs pl-9 pr-12 py-2 rounded-full border border-[#E5E7EB] hover:border-[#E04020] focus-within:ring-2 focus-within:ring-[#E04020]/20 transition-all text-[#626B76] whitespace-nowrap overflow-hidden">
                Search or type a command...
              </span>
              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white border border-[#E5E7EB] text-[11px] font-mono text-[#5A6470]">
                ⌘K
              </span>
            </button>
          </div>

          {/* Top Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/leads"
              className="btn-frappe-primary"
            >
              <Plus size={13} />
              <span>New Lead</span>
            </Link>

            <NotificationBell />

            <div className="hidden sm:flex items-center gap-1 pl-2 border-l border-[#E5E7EB]">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-[#047857]' : 'bg-[#626B76]'}`} title={connected ? 'Connected to Real-Time Cloud' : 'Reconnecting'} />
              <span className="text-[11px] text-[#5A6470] font-medium">{connected ? 'Live' : 'Reconnecting'}</span>
            </div>
          </div>
        </header>

        {/* Page Main Content */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <CopilotChat />
    </div>
  );
}