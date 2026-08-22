'use client';
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';
import type { WebhookDelivery } from './types';

const STATUS_STYLES: Record<string, string> = {
  created: 'bg-green-100 text-green-700',
  duplicate: 'bg-amber-100 text-amber-700',
  rejected: 'bg-orange-100 text-orange-700',
  error: 'bg-red-100 text-red-700',
};

interface Props {
  configType: string | null;
  name: string;
  onClose: () => void;
}

export function DeliveryLogDialog({ configType, name, onClose }: Props) {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configType) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    api
      .get('/integrations/deliveries', { params: { source: configType, take: 50 } })
      .then((r) => {
        if (!cancelled) setDeliveries(r.data || []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(
          e?.response?.status === 403
            ? 'Only admins can view webhook delivery logs.'
            : 'Could not load delivery logs. Please try again.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [configType]);

  return (
    <Dialog open={!!configType} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Webhook deliveries — {name}</DialogTitle>
        </DialogHeader>

        <div className="py-2 max-h-96 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-gray-500">
              <Loader2 size={16} className="animate-spin" /> Loading deliveries…
            </div>
          )}

          {!loading && error && (
            <p role="alert" className="py-10 text-center text-sm text-red-600">{error}</p>
          )}

          {!loading && !error && deliveries.length === 0 && (
            <p className="py-10 text-center text-sm text-gray-500">
              Nothing received yet. Deliveries appear here the moment the portal posts its first lead.
            </p>
          )}

          {!loading && !error && deliveries.length > 0 && (
            <div className="space-y-2">
              {deliveries.map((d) => (
                <details key={d.id} className="rounded-lg border bg-gray-50 p-3 text-sm">
                  <summary className="flex cursor-pointer items-center justify-between gap-3 list-none">
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-gray-500">
                        {new Date(d.createdAt).toLocaleString()}
                      </span>
                      {d.error && <p className="mt-0.5 truncate text-xs text-red-600">{d.error}</p>}
                      {d.leadId && !d.error && (
                        <p className="mt-0.5 text-xs text-gray-400">Lead {d.leadId}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[d.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {d.status}
                    </span>
                  </summary>
                  <pre className="mt-3 max-h-48 overflow-auto rounded bg-white p-2 text-xs leading-relaxed text-gray-700">
                    {JSON.stringify(d.payload, null, 2)}
                  </pre>
                </details>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
