'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import {
  Mail, Target, Globe, Gift, TrendingUp, Users, Percent,
  ArrowRight, BarChart3, GitMerge, Megaphone, DollarSign,
} from 'lucide-react';

const links = [
  { href: '/marketing/campaigns', icon: Mail, label: 'Campaigns', desc: 'Email & WhatsApp campaigns' },
  { href: '/marketing/landing-pages', icon: Globe, label: 'Landing Pages', desc: 'Project landing pages' },
  { href: '/marketing/segments', icon: Target, label: 'Segments', desc: 'Targeted lead groups' },
  { href: '/marketing/nurture', icon: Megaphone, label: 'Nurture', desc: 'Automated sequences' },
  { href: '/marketing/referral', icon: Gift, label: 'Referral', desc: 'Referral codes' },
  { href: '/marketing/attribution', icon: GitMerge, label: 'Attribution', desc: 'Source tracking' },
  { href: '/marketing/campaigns/roi', icon: BarChart3, label: 'ROI', desc: 'Campaign ROI analysis' },
];

export default function MarketingDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/marketing/summary')
      .then(r => setStats(r.data))
      .catch(() => { /* summary API may not exist yet */ })
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: 'Active Campaigns', value: stats?.activeCampaigns ?? '—', icon: Mail, color: 'text-blue-600 bg-blue-50' },
    { label: 'Landing Pages', value: stats?.totalLandingPages ?? '—', icon: Globe, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Segments', value: stats?.totalSegments ?? '—', icon: Target, color: 'text-purple-600 bg-purple-50' },
    { label: 'Referral Codes', value: stats?.activeReferralCodes ?? '—', icon: Gift, color: 'text-amber-600 bg-amber-50' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <TrendingUp className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${c.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className="text-xl font-bold text-gray-900">
                  {loading ? <span className="inline-block w-6 h-4 bg-gray-200 rounded animate-pulse" /> : c.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Users className="w-4 h-4" /> Total Leads
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '—' : (stats?.totalLeads ?? '—')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Percent className="w-4 h-4" /> Conversion Rate
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '—' : (stats?.conversionRate != null ? `${stats.conversionRate}%` : '—')}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <DollarSign className="w-4 h-4" /> Total Attrib. Revenue
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {loading ? '—' : (stats?.attributedRevenue != null ? `₹${(stats.attributedRevenue / 100000).toFixed(1)}L` : '—')}
          </p>
        </div>
      </div>

      {/* Section links */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Sections</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {links.map(l => {
          const Icon = l.icon;
          return (
            <Link key={l.href} href={l.href}>
              <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all group cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{l.label}</p>
                    <p className="text-xs text-gray-400 truncate">{l.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
