'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search, Users2, MapPin, Phone, Calculator, Package, BarChart3,
  FileCheck, CalendarClock, Settings, MessageCircle, Plus,
  Layers, CheckSquare, Shield, ArrowRight, CornerDownLeft, Command,
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface SearchItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Actions' | 'CRM' | 'Settings';
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  badge?: string;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateLead?: () => void;
  onScheduleVisit?: () => void;
}

export function CommandPalette({ open, onOpenChange, onCreateLead, onScheduleVisit }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const items: SearchItem[] = useMemo(() => [
    // Fast Actions
    {
      id: 'act-new-lead',
      title: 'Create New Lead',
      subtitle: 'Add a prospective client or buyer profile',
      category: 'Actions',
      icon: Plus,
      action: () => {
        onOpenChange(false);
        if (onCreateLead) onCreateLead();
        else router.push('/leads?create=true');
      },
      badge: 'Action',
    },
    {
      id: 'act-site-visit',
      title: 'Schedule Site Visit',
      subtitle: 'Book property viewing & allocate agent/driver',
      category: 'Actions',
      icon: MapPin,
      action: () => {
        onOpenChange(false);
        if (onScheduleVisit) onScheduleVisit();
        else router.push('/site-visits?schedule=true');
      },
      badge: 'Action',
    },
    {
      id: 'act-calculator',
      title: 'Open EMI & Stamp Duty Calculator',
      subtitle: 'Compute loan EMI, circle rate & down payments',
      category: 'Actions',
      icon: Calculator,
      href: '/calculator',
      badge: 'Tool',
    },

    // CRM Core
    { id: 'nav-dashboard', title: 'Executive Dashboard', subtitle: 'Pipeline metrics, revenue targets, conversion rates', category: 'CRM', icon: Layers, href: '/dashboard' },
    { id: 'nav-leads', title: 'Leads Pipeline & Kanban', subtitle: 'Manage deal stages, follow-ups, and customer profiles', category: 'CRM', icon: Users2, href: '/leads' },
    { id: 'nav-site-visits', title: 'Site Visits & Dispatch', subtitle: 'Track ongoing, scheduled, and completed site visits', category: 'CRM', icon: MapPin, href: '/site-visits' },
    { id: 'nav-inventory', title: 'Property Inventory', subtitle: 'Live plot/flat availability, pricing matrix & brochures', category: 'CRM', icon: Package, href: '/inventory' },
    { id: 'nav-telephony', title: 'Telephony & Call Logs', subtitle: 'Outbound power dialer, call disposition records', category: 'CRM', icon: Phone, href: '/telephony' },
    { id: 'nav-communication', title: 'WhatsApp & Communication', subtitle: 'Client chats, template broadcasts, SMS logs', category: 'CRM', icon: MessageCircle, href: '/communication' },
    { id: 'nav-bookings', title: 'Bookings & Token Management', subtitle: 'Token advances, registry tracking, booking forms', category: 'CRM', icon: FileCheck, href: '/bookings' },
    { id: 'nav-follow-ups', title: 'Follow-ups & Reminders', subtitle: 'Scheduled callbacks, meeting tasks, client queues', category: 'CRM', icon: CalendarClock, href: '/follow-ups' },
    { id: 'nav-tasks', title: 'Team Tasks', subtitle: 'Assigned agent action items and checklist items', category: 'CRM', icon: CheckSquare, href: '/tasks' },

    // Analytics & Admin
    { id: 'nav-reports', title: 'Analytics & Revenue Reports', subtitle: 'Campaign ROI, telecaller metrics, stage conversion', category: 'Navigation', icon: BarChart3, href: '/reports' },
    { id: 'nav-employees', title: 'Employee Leaderboard', subtitle: 'Agent performance, call counts, deal closures', category: 'Navigation', icon: Users2, href: '/employees' },
    { id: 'nav-settings', title: 'Settings & Integrations', subtitle: 'WhatsApp Cloud API, Facebook Webhooks, Telephony', category: 'Settings', icon: Settings, href: '/settings' },
  ], [router, onOpenChange, onCreateLead, onScheduleVisit]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return items;
    const lower = query.toLowerCase();
    return items.filter(
      item =>
        item.title.toLowerCase().includes(lower) ||
        item.subtitle?.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower)
    );
  }, [items, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = useCallback((item: SearchItem) => {
    onOpenChange(false);
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  }, [router, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + (filteredItems.length || 1)) % (filteredItems.length || 1));
      } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredItems[selectedIndex]);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, filteredItems, selectedIndex, handleSelect]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white rounded-2xl border border-black/[0.08] shadow-2xl focus:outline-none">
        {/* Search header */}
        <div className="flex items-center px-4 py-3.5 border-b border-black/[0.08] bg-[#f5f5f7]/60">
          <Search className="w-5 h-5 text-[#86868b] mr-3 flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, search pages, leads, tools..."
            className="w-full bg-transparent text-sm text-[#1d1d1f] placeholder:text-[#86868b] focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium text-[#86868b] bg-black/[0.04] border border-black/[0.08] rounded">
            <Command className="w-3 h-3" /> ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[380px] overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-[#86868b]">
              No results found for &ldquo;<span className="text-[#1d1d1f] font-medium">{query}</span>&rdquo;
            </div>
          ) : (
            <div className="space-y-1">
              {filteredItems.map((item, index) => {
                const Icon = item.icon;
                const isSelected = index === selectedIndex;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-[#FDECE6] text-[#E04020]'
                        : 'text-[#1d1d1f] hover:bg-black/[0.03]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-[#C02F12] text-white'
                            : 'bg-black/[0.04] text-[#6e6e73]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium truncate ${isSelected ? 'text-[#E04020]' : 'text-[#1d1d1f]'}`}>
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/[0.06] text-[#86868b] font-medium">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <p className="text-xs text-[#86868b] truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <span className="text-[11px] text-[#86868b] hidden sm:inline">
                        {item.category}
                      </span>
                      {isSelected && <CornerDownLeft className="w-3.5 h-3.5 text-[#E04020]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-black/[0.06] bg-[#f5f5f7] flex items-center justify-between text-[11px] text-[#86868b]">
          <div className="flex items-center gap-3">
            <span>Use <kbd className="px-1.5 py-0.5 bg-white border border-black/[0.08] rounded text-[10px]">↑</kbd> <kbd className="px-1.5 py-0.5 bg-white border border-black/[0.08] rounded text-[10px]">↓</kbd> to navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border border-black/[0.08] rounded text-[10px]">↵</kbd> to select</span>
          </div>
          <span className="font-medium text-[#1d1d1f]">Nidhivan CRM</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
