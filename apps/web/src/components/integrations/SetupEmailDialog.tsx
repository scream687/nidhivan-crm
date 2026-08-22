'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Mail, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import type { IntegrationDef, IntegrationStatus } from './types';

interface Props {
  integration: IntegrationDef | null;
  status?: IntegrationStatus;
  onSent: () => void;
  onClose: () => void;
}

export function SetupEmailDialog({ integration, status, onSent, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  // Prefill with whoever it was last sent to when a different card is opened.
  if (integration && openedFor !== integration.configType) {
    setOpenedFor(integration.configType);
    setEmail(status?.accountManagerEmail || '');
  }

  async function send() {
    if (!integration) return;
    setSending(true);
    try {
      const { data } = await api.post(
        `/integrations/config/${integration.configType}/send-setup-email`,
        { email: email.trim() },
      );
      toast.success(`Setup request sent to ${data.to}`);
      onSent();
      onClose();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message ||
          (e?.response?.status === 403
            ? 'Only admins can send setup requests'
            : 'Could not send the email'),
        { duration: 8000 },
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={!!integration} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Email {integration?.name} setup request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm leading-relaxed text-gray-600">
            Sends your {integration?.name} account manager the endpoint and instructions to enable
            lead push. If no webhook URL exists yet, one is generated first.
          </p>

          <div>
            <label htmlFor="am-email" className="mb-1 block text-xs font-medium text-gray-500">
              Account manager email
            </label>
            <Input
              id="am-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              onKeyDown={(e) => { if (e.key === 'Enter' && email.trim()) send(); }}
            />
          </div>

          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
            <ShieldAlert size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
            <p className="text-xs leading-relaxed text-amber-800">
              The URL in this email contains your authentication token. Anyone holding it can create
              leads in your CRM, so send it only to the named account manager — never to a shared or
              group inbox.
            </p>
          </div>

          {status?.setupEmailSentAt && (
            <p className="text-xs text-gray-500">
              Last sent to {status.accountManagerEmail} on{' '}
              {new Date(status.setupEmailSentAt).toLocaleDateString()}.
            </p>
          )}
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button className="flex items-center gap-2" onClick={send} disabled={sending || !email.trim()}>
            {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
            {sending ? 'Sending…' : 'Send request'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
