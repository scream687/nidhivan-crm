'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { BarChart3, DollarSign, TrendingUp, Target } from 'lucide-react';

export default function CampaignROIPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('from', dateFrom);
    if (dateTo) params.set('to', dateTo);
    api.get(`/marketing/campaigns/roi?${params}`)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load ROI data'))
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  const totalSpend = data.reduce((s, r: any) => s + (r.cost ?? 0), 0);
  const totalRevenue = data.reduce((s, r: any) => s + (r.revenue ?? 0), 0);
  const totalLeads = data.reduce((s, r: any) => s + (r.leadsGenerated ?? 0), 0);
  const avgROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
  const totalBookings = data.reduce((s, r: any) => s + (r.bookings ?? 0), 0);

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Campaign ROI</h1>
        </div>
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">Campaign ROI</h1>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <DollarSign className="w-4 h-4" /> Total Spend
          </div>
          <p className="text-xl font-bold text-gray-900">₹{totalSpend.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <TrendingUp className="w-4 h-4" /> Total Revenue
          </div>
          <p className="text-xl font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Target className="w-4 h-4" /> Avg ROI
          </div>
          <p className={`text-xl font-bold ${avgROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {avgROI >= 0 ? '+' : ''}{avgROI.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <BarChart3 className="w-4 h-4" /> Total Bookings
          </div>
          <p className="text-xl font-bold text-gray-900">{totalBookings}</p>
        </div>
      </div>

      {/* Date filter */}
      <div className="flex gap-3 mb-4">
        <input type="date" value={dateFrom} onChange={e => { setLoading(true); setDateFrom(e.target.value); }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        <input type="date" value={dateTo} onChange={e => { setLoading(true); setDateTo(e.target.value); }}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline">
            Clear
          </button>
        )}
      </div>

      {data.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No campaign ROI data</p>
          <p className="text-sm mt-1">Data will appear once campaigns have leads and revenue tracking</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                <th className="px-4 py-3 text-left">Campaign</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-right">Leads</th>
                <th className="px-4 py-3 text-right">Bookings</th>
                <th className="px-4 py-3 text-right">Revenue</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">ROI %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((r: any) => {
                const roi = r.cost > 0 ? ((r.revenue - r.cost) / r.cost) * 100 : 0;
                return (
                  <tr key={r.id ?? r.name} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.name}</td>
                    <td className="px-4 py-3 text-gray-500 capitalize">{r.type?.toLowerCase?.() ?? '—'}</td>
                    <td className="px-4 py-3 text-right">{r.leadsGenerated ?? 0}</td>
                    <td className="px-4 py-3 text-right">{r.bookings ?? 0}</td>
                    <td className="px-4 py-3 text-right">₹{(r.revenue ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-red-600">₹{(r.cost ?? 0).toLocaleString()}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {roi >= 0 ? '+' : ''}{roi.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
