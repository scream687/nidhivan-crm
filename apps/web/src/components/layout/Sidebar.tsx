'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard, Package, Users2, CheckSquare,
  Zap, BarChart3, Phone, TrendingUp, Trophy,
  MessageSquare, Megaphone, Bot,
  Settings, LogOut, Building2, MapPin, Calculator, FileCheck,
  GitBranch, UserCog, StickyNote, ChevronDown, Sparkles,
  type LucideIcon,
} from 'lucide-react';

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
  adminOnly?: boolean;
  badge?: string;
};

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: 'VIEWS',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
      { href: '/leads', icon: Users2, label: 'Leads & Deals', badge: 'Active' },
      { href: '/inventory', icon: Package, label: 'Property Inventory' },
      { href: '/bookings', icon: FileCheck, label: 'Bookings & Registry' },
    ],
  },
  {
    label: 'ACTIVITIES',
    items: [
      { href: '/site-visits', icon: MapPin, label: 'Site Visits & Dispatch' },
      { href: '/tasks', icon: CheckSquare, label: 'Tasks & Reminders' },
      { href: '/notes', icon: StickyNote, label: 'Quick Notes' },
      { href: '/calculator', icon: Calculator, label: 'EMI & Rate Calculator' },
    ],
  },
  {
    label: 'COMMUNICATIONS',
    items: [
      { href: '/whatsapp', icon: MessageSquare, label: 'WhatsApp Inbox' },
      { href: '/telephony', icon: Phone, label: 'Call Logs & Dialer' },
      { href: '/workflows', icon: GitBranch, label: 'Automation Flows' },
    ],
  },
  {
    label: 'INSIGHTS & SETTINGS',
    items: [
      { href: '/reports', icon: BarChart3, label: 'Reports & Analytics', adminOnly: true },
      { href: '/users', icon: UserCog, label: 'User Directory', adminOnly: true },
      { href: '/settings', icon: Settings, label: 'Settings', exact: true },
    ],
  },
];

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const isActive = (href: string, exact?: boolean) => {
    const current = pathname || '';
    if (exact) return current === href;
    if (href === '/') return current === '/';
    return current === href || current.startsWith(href + '/');
  };

  return (
    <aside className="w-60 bg-white border-r border-[#E5E7EB] flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Workspace Switcher Header */}
      <div className="px-3.5 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#C02F12] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
            N
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#111113] truncate leading-tight">Nidhivan CRM</p>
            <p className="text-[11px] text-[#5A6470] font-medium truncate">Real Estate Growth</p>
          </div>
        </div>
        <div className="px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#5A6470] text-[11px] font-medium">
          v2.4
        </div>
      </div>

      {/* Nav Section Links */}
      <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[11px] font-semibold text-[#626B76] tracking-wider px-2 mb-1 uppercase font-mono">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, icon: Icon, label, exact, adminOnly, badge }) => {
                const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
                if (adminOnly && !isAdmin) return null;
                
                const active = isActive(href, exact);
                return (
                  <Link key={href} href={href} onClick={onClose}>
                    <div
                      className={cn(
                        'flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer group font-medium',
                        active
                          ? 'bg-[#FDECE6] text-[#C02F12] font-semibold'
                          : 'text-[#5A6470] hover:text-[#111113] hover:bg-[#F3F4F6]',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon size={14} className={cn('flex-shrink-0', active ? 'text-[#E04020]' : 'text-[#5A6470] group-hover:text-[#111113]')} />
                        <span className="truncate">{label}</span>
                      </div>
                      {badge && !active && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-[#FDE7E1] text-[#C02F12] font-semibold uppercase tracking-wide">
                          {badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer Profile */}
      <div className="p-2.5 border-t border-[#E5E7EB] bg-[#F3F4F6]">
        <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-full bg-[#C02F12] text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
              {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#111113] truncate leading-tight">{user?.name}</p>
              <p className="text-[11px] text-[#5A6470] capitalize font-medium truncate">{user?.role?.toLowerCase().replace('_', ' ')}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1 rounded-lg text-[#626B76] hover:text-[#E04020] hover:bg-white transition-colors"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}