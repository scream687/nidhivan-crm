'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { useSocketStore } from '@/stores/socketStore';
import { useLeadsStore } from '@/stores/leadsStore';
import { Sidebar } from '@/components/layout/Sidebar';
import CopilotChat from '@/components/ai/CopilotChat';
import { Menu } from 'lucide-react';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, fetchMe } = useAuthStore();
  const { socket, connect } = useSocketStore();
  const { setupSocketListeners } = useLeadsStore();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
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

  // Prevent body scrolling when sidebar open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Skip to main content */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[60] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      {/* Mobile menu toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-3 left-3 z-50 p-3 bg-[#0f1e36] text-white rounded-lg shadow-lg"
        aria-label="Open menu"
        aria-expanded={sidebarOpen}
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'}
        `}
        role={sidebarOpen ? 'dialog' : undefined}
        aria-modal={sidebarOpen ? true : undefined}
        aria-label="Navigation sidebar"
      >
        <Sidebar onNavigate={closeSidebar} onClose={closeSidebar} />
      </div>

      <main id="main-content" className="flex-1 lg:ml-56 min-h-screen overflow-auto pt-12 lg:pt-0">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <CopilotChat />
    </div>
  );
}
