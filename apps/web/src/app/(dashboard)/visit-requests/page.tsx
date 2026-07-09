'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface VisitRequest {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  preferredDate: string | null;
  message: string | null;
  status: string;
  createdAt: string;
  project: {
    id: string;
    name: string;
    location: string;
    slug: string;
  };
}

const STATUS_TABS = ['ALL', 'PENDING', 'CONTACTED', 'SCHEDULED', 'REJECTED'] as const;

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  PENDING:   { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pending' },
  CONTACTED: { bg: 'bg-blue-100',   text: 'text-blue-800',   label: 'Contacted' },
  SCHEDULED: { bg: 'bg-green-100',  text: 'text-green-800',  label: 'Scheduled' },
  REJECTED:  { bg: 'bg-red-100',    text: 'text-red-800',    label: 'Rejected' },
};

export default function VisitRequestsPage() {
  const [requests, setRequests] = useState<VisitRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<typeof STATUS_TABS[number]>('ALL');
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = activeTab !== 'ALL' ? { status: activeTab } : {};
      const { data } = await api.get('/visit-requests', { params });
      setRequests(data);
    } catch {
      toast.error('Failed to load visit requests');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    try {
      await api.patch(`/visit-requests/${id}`, { status });
      toast.success(`Marked as ${STATUS_STYLES[status]?.label || status}`);
      fetchRequests();
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdating(null);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Visit Requests</h1>
        <p className="text-gray-500 text-sm mt-1">Inbound site visit requests from public project pages</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-6">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'ALL' ? 'All' : STATUS_STYLES[tab]?.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No visit requests</p>
          <p className="text-sm mt-1">
            {activeTab === 'ALL' ? 'Requests submitted from public project pages will appear here.' : `No ${STATUS_STYLES[activeTab]?.label.toLowerCase()} requests.`}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Project</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Preferred Date</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Received</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {requests.map(r => {
                const style = STATUS_STYLES[r.status];
                return (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{r.name}</p>
                      <p className="text-gray-500 text-xs">{r.phone}</p>
                      {r.email && <p className="text-gray-400 text-xs">{r.email}</p>}
                      {r.message && (
                        <p className="text-gray-400 text-xs mt-1 italic max-w-xs truncate" title={r.message}>
                          "{r.message}"
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{r.project.name}</p>
                      <p className="text-gray-400 text-xs">{r.project.location}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {r.preferredDate ? formatDate(r.preferredDate) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{formatDate(r.createdAt)}</td>
                    <td className="px-4 py-3">
                      {style ? (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                          {style.label}
                        </span>
                      ) : (
                        <span className="text-gray-400">{r.status}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        {r.status !== 'CONTACTED' && r.status !== 'REJECTED' && r.status !== 'SCHEDULED' && (
                          <ActionButton
                            label="Contacted"
                            color="blue"
                            loading={updating === r.id}
                            onClick={() => updateStatus(r.id, 'CONTACTED')}
                          />
                        )}
                        {r.status !== 'SCHEDULED' && r.status !== 'REJECTED' && (
                          <ActionButton
                            label="Scheduled"
                            color="green"
                            loading={updating === r.id}
                            onClick={() => updateStatus(r.id, 'SCHEDULED')}
                          />
                        )}
                        {r.status !== 'REJECTED' && (
                          <ActionButton
                            label="Reject"
                            color="red"
                            loading={updating === r.id}
                            onClick={() => updateStatus(r.id, 'REJECTED')}
                          />
                        )}
                      </div>
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

function ActionButton({
  label, color, loading, onClick,
}: { label: string; color: 'blue' | 'green' | 'red'; loading: boolean; onClick: () => void }) {
  const colors = {
    blue:  'border-blue-200 text-blue-700 hover:bg-blue-50',
    green: 'border-green-200 text-green-700 hover:bg-green-50',
    red:   'border-red-200 text-red-700 hover:bg-red-50',
  };
  return (
    <button
      disabled={loading}
      onClick={onClick}
      className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors disabled:opacity-50 ${colors[color]}`}
    >
      {label}
    </button>
  );
}
