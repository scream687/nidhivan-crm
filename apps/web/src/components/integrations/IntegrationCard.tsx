'use client';
import { useState, type ReactNode } from 'react';
import { Card, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Settings2, Loader2, RefreshCw, ScrollText, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { IntegrationDef, IntegrationStatus } from './types';

interface Props {
  integration: IntegrationDef;
  icon: ReactNode;
  status?: IntegrationStatus;
  webhookUrl: string | null;
  onSecretRotated: () => void;
  onOpenMapping: () => void;
  onOpenLogs: () => void;
  onOpenSetupEmail: () => void;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/** Status is derived from real data — never a hardcoded "ready to connect". */
function StatusLine({ status }: { status?: IntegrationStatus }) {
  if (!status) {
    return <span className="text-xs text-gray-400">Checking status…</span>;
  }

  if (!status.configured) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-gray-500">
        <span className="h-2 w-2 rounded-full bg-gray-300" />
        Not configured
      </span>
    );
  }

  const failed = status.lastDelivery && status.lastDelivery.status !== 'created';

  return (
    <span className="flex items-center gap-1.5 text-xs">
      <span className={`h-2 w-2 rounded-full ${failed ? 'bg-amber-400' : 'bg-green-500'}`} />
      <span className={failed ? 'text-amber-700' : 'text-green-700'}>
        {failed ? `Last delivery: ${status.lastDelivery!.status}` : 'Connected'}
      </span>
      <span className="text-gray-400">
        {status.lastLeadAt
          ? `· last lead ${relativeTime(status.lastLeadAt)} · ${status.leadCount30d} in 30d`
          : '· no leads received yet'}
      </span>
    </span>
  );
}

export function IntegrationCard({
  integration,
  icon,
  status,
  webhookUrl,
  onSecretRotated,
  onOpenMapping,
  onOpenLogs,
  onOpenSetupEmail,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [rotating, setRotating] = useState(false);

  async function rotateSecret() {
    setRotating(true);
    try {
      await api.post(`/integrations/config/${integration.configType}/secret`);
      onSecretRotated();
      toast.success('New webhook URL generated — send it to the portal');
    } catch (e: any) {
      toast.error(
        e?.response?.status === 403
          ? 'Only admins can generate webhook URLs'
          : 'Could not generate webhook URL',
      );
    } finally {
      setRotating(false);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card className="overflow-hidden border-gray-200 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex flex-col md:flex-row">
        <div className="border-b border-gray-100 p-6 md:w-2/3 md:border-b-0 md:border-r">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-lg bg-gray-50 p-2">{icon}</div>
            <div className="min-w-0">
              <CardTitle>{integration.name}</CardTitle>
              <div className="mt-1"><StatusLine status={status} /></div>
            </div>
          </div>

          <CardDescription className="mb-6 text-sm leading-relaxed">
            {integration.description}
          </CardDescription>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Webhook URL
              </label>
              {webhookUrl ? (
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="bg-gray-50 font-mono text-xs" />
                  <Button variant="outline" size="icon" onClick={() => copy(webhookUrl)} aria-label="Copy webhook URL">
                    {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  No URL yet. <strong>Email account manager</strong> generates one and sends it to
                  your {integration.name} contact in a single step.
                </p>
              )}
              <p className="text-xs leading-relaxed text-gray-400">{integration.setupNote}</p>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Button
                variant="link"
                className="h-auto p-0 text-sm text-[#E04020]"
                onClick={() => window.open(integration.docsUrl, '_blank', 'noopener,noreferrer')}
              >
                Documentation
              </Button>
              <div className="h-4 w-px bg-gray-200" />
              <Button
                variant="link"
                className="flex h-auto items-center gap-1 p-0 text-sm text-gray-600"
                onClick={onOpenMapping}
              >
                <Settings2 size={12} />
                Field mapping
              </Button>
              <div className="h-4 w-px bg-gray-200" />
              <Button
                variant="link"
                className="flex h-auto items-center gap-1 p-0 text-sm text-gray-600"
                onClick={onOpenLogs}
              >
                <ScrollText size={12} />
                Deliveries
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center bg-gray-50/50 p-6 md:w-1/3">
          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-600">Setup</p>
            {/* Facebook's callback URL is fixed — it authenticates by signing
                each delivery, so there is no per-source token to rotate. */}
            {integration.slug ? (
              <>
                <Button
                  className="w-full justify-start bg-[#E04020] text-left text-white hover:bg-[#C02F12]"
                  onClick={onOpenSetupEmail}
                >
                  <Mail size={14} className="mr-2" />
                  Email account manager
                </Button>
                {status?.setupEmailSentAt && (
                  <p className="text-xs leading-relaxed text-gray-500">
                    Sent to {status.accountManagerEmail} on{' '}
                    {new Date(status.setupEmailSentAt).toLocaleDateString()}
                  </p>
                )}
                <Button
                  className="w-full justify-start border-gray-200 bg-white text-left text-gray-700 hover:bg-gray-50"
                  variant="outline"
                  onClick={rotateSecret}
                  disabled={rotating}
                >
                  {rotating ? (
                    <><Loader2 size={14} className="mr-2 animate-spin" /> Generating…</>
                  ) : (
                    <><RefreshCw size={14} className="mr-2" /> {webhookUrl ? 'Regenerate URL' : 'Generate URL'}</>
                  )}
                </Button>
                {webhookUrl && (
                  <p className="text-xs leading-relaxed text-gray-400">
                    Regenerating invalidates the old URL. The portal will stop sending leads until
                    you email them the new one.
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs leading-relaxed text-gray-400">
                This URL is fixed. Facebook signs every delivery, so it is verified by the app
                secret rather than a token in the URL.
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
