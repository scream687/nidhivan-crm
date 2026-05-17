'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/layout/NotificationBell';
import {
  LayoutDashboard, Package, Users2, CheckSquare,
  Zap, BarChart3, Phone, PhoneCall, TrendingUp, Trophy,
  MessageSquare, Megaphone, Bot, BarChart2,
  Settings, LogOut, Building2, MapPin, Calculator, FileCheck,
  GitBranch, UserCog, StickyNote,
  type LucideIcon,
} from 'lucide-react';

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
  exact?: boolean;
  adminOnly?: boolean;
};

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: 'CRM',
    items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboards' },
      { href: '/leads', icon: Users2, label: 'Leads' },
      { href: '/notes', icon: StickyNote, label: 'Notes' },
      { href: '/site-visits', icon: MapPin, label: 'Site Visits' },
      { href: '/tasks', icon: CheckSquare, label: 'Tasks' },
      { href: '/workflows', icon: GitBranch, label: 'Workflows' },
      { href: '/inventory', icon: Package, label: 'Inventory' },
      { href: '/bookings', icon: FileCheck, label: 'Bookings' },
      { href: '/calculator', icon: Calculator, label: 'Calculator' },
      { href: '/reports', icon: BarChart3, label: 'Reports', adminOnly: true },
      { href: '/settings/integrations', icon: Zap, label: 'Integrations', adminOnly: true },
    ],
  },
  {
    label: 'Calls',
    items: [
      { href: '/telephony', icon: Phone, label: 'Call History' },
      { href: '/telephony/analytics', icon: TrendingUp, label: 'Call Analytics' },
      { href: '/telephony/toppers', icon: Trophy, label: 'Call Toppers' },
    ],
  },
  {
    label: 'WhatsApp',
    items: [
      { href: '/whatsapp', icon: MessageSquare, label: 'Inbox', exact: true },
      { href: '/whatsapp/campaigns', icon: Megaphone, label: 'Campaigns' },
      { href: '/whatsapp/automation', icon: Zap, label: 'Automation' },
      { href: '/whatsapp/chatbot', icon: Bot, label: 'Chatbot' },
      { href: '/whatsapp/analytics', icon: BarChart2, label: 'Analytics' },
    ],
  },
  {
    label: 'Account',
    items: [
      { href: '/settings', icon: Settings, label: 'Settings', exact: true },
      { href: '/settings/pipeline', icon: PhoneCall, label: 'Pipeline', adminOnly: true },
      { href: '/users', icon: UserCog, label: 'User Management', adminOnly: true },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside className="w-56 bg-[#0f1e36] flex flex-col h-screen fixed left-0 top-0 z-30 overflow-y-auto">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">NIDHIVAN</p>
            <p className="text-blue-300 text-[10px]">Property CRM</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest px-2 mb-1">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, icon: Icon, label, exact, adminOnly }) => {
                const isAdmin = user?.role === 'ADMIN' || user?.role === 'MANAGER';
                if (adminOnly && !isAdmin) return null;
                
                const active = isActive(href, exact);
                return (
                  <Link key={href} href={href}>
                    <motion.div
                      whileHover={{ x: 2 }}
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-colors cursor-pointer',
                        active
                          ? 'bg-blue-600 text-white font-medium'
                          : 'text-gray-400 hover:text-white hover:bg-white/5',
                      )}
                    >
                      <Icon size={15} className="flex-shrink-0" />
                      <span className="truncate">{label}</span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="px-2 py-3 border-t border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user?.name?.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <p className="text-gray-500 text-[10px] capitalize">{user?.role?.toLowerCase().replace('_', ' ')}</p>
          </div>
          <NotificationBell />
          <button onClick={logout} className="text-gray-500 hover:text-red-400 transition flex-shrink-0">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
