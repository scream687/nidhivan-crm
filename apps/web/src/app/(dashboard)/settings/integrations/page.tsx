'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Megaphone, Globe, KeyRound, Building2, Home, Upload, Phone, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { FieldMappingDialog } from '@/components/integrations/FieldMappingDialog';
import { DeliveryLogDialog } from '@/components/integrations/DeliveryLogDialog';
import { SetupEmailDialog } from '@/components/integrations/SetupEmailDialog';
import type { IntegrationDef, IntegrationStatus, FieldMap } from '@/components/integrations/types';

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'nidhivanproperty@gmail.com';

const PORTAL_FIELDS = [
  { field: 'name', label: 'Name', builtIn: 'name / Name / full_name' },
  { field: 'phone', label: 'Phone', builtIn: 'phone / mobile / contact_number' },
  { field: 'email', label: 'Email', builtIn: 'email / email_address' },
  { field: 'city', label: 'City', builtIn: 'city / location' },
  { field: 'projectInterest', label: 'Project interest', builtIn: 'project_name / ProjectName' },
  { field: 'requirements', label: 'Requirements', builtIn: 'message / comments' },
];

const INTEGRATIONS: IntegrationDef[] = [
  {
    slug: null,
    configType: 'FACEBOOK',
    name: 'Facebook Lead Ads',
    description: 'Capture leads from Facebook and Instagram ad forms the moment they are submitted.',
    docsUrl: 'https://developers.facebook.com/docs/marketing-api/guides/lead-ads/webhooks',
    crmFields: PORTAL_FIELDS,
    setupNote:
      'Add this as the callback URL in your Meta app’s Webhooks settings, subscribed to the "leadgen" field. Signature verification requires the app secret below.',
  },
  {
    slug: 'housing',
    configType: 'HOUSING_COM',
    name: 'Housing.com',
    description: 'Receive Housing.com enquiries directly into the CRM instead of re-typing them from the portal.',
    docsUrl: 'https://housing.com',
    crmFields: PORTAL_FIELDS,
    setupNote:
      'Use “Email account manager” to send this endpoint and the setup instructions to your Housing.com contact. The token in the URL is what authenticates them.',
  },
  {
    slug: '99acres',
    configType: 'NINETYNINE_ACRES',
    name: '99acres',
    description: 'Receive 99acres enquiries directly into the CRM as they come in.',
    docsUrl: 'https://www.99acres.com',
    crmFields: PORTAL_FIELDS,
    setupNote:
      'Use “Email account manager” to send this endpoint to your 99acres relationship manager and request lead push / API integration.',
  },
  {
    slug: 'magicbricks',
    configType: 'MAGICBRICKS',
    name: 'MagicBricks',
    description: 'Receive MagicBricks enquiries directly into the CRM.',
    docsUrl: 'https://www.magicbricks.com',
    crmFields: PORTAL_FIELDS,
    setupNote: 'Use “Email account manager” to send this endpoint to your MagicBricks contact and request lead push.',
  },
  {
    slug: 'webflow',
    configType: 'WEBFLOW',
    name: 'Webflow',
    description: 'Connect your Webflow site forms to the CRM.',
    docsUrl: 'https://developers.webflow.com/reference/webhooks',
    crmFields: PORTAL_FIELDS,
    setupNote: 'Add this as a "Form submission" webhook in your Webflow site settings.',
  },
];

const ICONS: Record<string, React.ReactNode> = {
  FACEBOOK: <Megaphone className="text-[#E04020]" />,
  HOUSING_COM: <Home className="text-[#E04020]" />,
  NINETYNINE_ACRES: <Building2 className="text-[#E04020]" />,
  MAGICBRICKS: <Building2 className="text-[#E04020]" />,
  WEBFLOW: <Globe className="text-[#E04020]" />,
};

export default function IntegrationsPage() {
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});
  const [fieldMaps, setFieldMaps] = useState<Record<string, FieldMap>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [mappingFor, setMappingFor] = useState<IntegrationDef | null>(null);
  const [logsFor, setLogsFor] = useState<IntegrationDef | null>(null);
  const [emailFor, setEmailFor] = useState<IntegrationDef | null>(null);

  const [fbToken, setFbToken] = useState('');
  const [fbAppSecret, setFbAppSecret] = useState('');
  const [fbVerifyToken, setFbVerifyToken] = useState('');
  const [fbHasToken, setFbHasToken] = useState(false);
  const [fbSaving, setFbSaving] = useState(false);
  const [fbVerifying, setFbVerifying] = useState(false);
  const [fbVerifyResult, setFbVerifyResult] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [statusRes, ...configRes] = await Promise.all([
        api.get('/integrations/status'),
        ...INTEGRATIONS.map((i) => api.get(`/integrations/config/${i.configType}`)),
      ]);

      setStatuses(
        Object.fromEntries(
          (statusRes.data || []).map((s: IntegrationStatus) => [s.type, s]),
        ),
      );

      // Webhook URLs come from /status — the API builds them, so what is shown
      // here is byte-identical to what gets emailed to the portal.
      const nextMaps: Record<string, FieldMap> = {};
      configRes.forEach((res, i) => {
        const meta = res.data?.metadata || {};
        if (meta.fieldMap) nextMaps[INTEGRATIONS[i].configType] = meta.fieldMap;
        if (INTEGRATIONS[i].configType === 'FACEBOOK') {
          setFbHasToken(!!res.data?.hasToken);
          setFbAppSecret(meta.appSecret || '');
          setFbVerifyToken(meta.verifyToken || '');
        }
      });
      setFieldMaps(nextMaps);
    } catch (e: any) {
      setLoadError(
        e?.response?.status === 403
          ? 'Only admins can manage integrations. Ask an admin for access.'
          : 'Could not load integration settings. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function verifyFacebook() {
    setFbVerifying(true);
    setFbVerifyResult(null);
    try {
      const { data } = await api.post('/integrations/facebook/verify');
      setFbVerifyResult(
        data.ok
          ? { ok: true, message: `Facebook accepted the token — connected to page "${data.pageName}".` }
          : {
              ok: false,
              message: data.blocksDeliveries
                ? `${data.error}. Until the app secret is saved, every incoming lead is rejected.`
                : data.error,
            },
      );
    } catch (e: any) {
      setFbVerifyResult({
        ok: false,
        message: e?.response?.status === 403 ? 'Only admins can verify credentials' : 'Could not reach the API',
      });
    } finally {
      setFbVerifying(false);
    }
  }

  async function saveFacebook() {
    setFbSaving(true);
    setFbVerifyResult(null);
    try {
      await api.post('/integrations/config/FACEBOOK', {
        ...(fbToken.trim() ? { accessToken: fbToken.trim() } : {}),
        metadata: {
          ...(fbAppSecret.trim() ? { appSecret: fbAppSecret.trim() } : {}),
          ...(fbVerifyToken.trim() ? { verifyToken: fbVerifyToken.trim() } : {}),
        },
      });
      setFbToken('');
      toast.success('Facebook credentials saved');
      load();
    } catch (e: any) {
      toast.error(
        e?.response?.status === 403
          ? 'Only admins can change Facebook credentials'
          : 'Could not save Facebook credentials',
      );
    } finally {
      setFbSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin" /> Loading integrations…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="space-y-4 py-16 text-center">
        <p role="alert" className="text-sm text-red-600">{loadError}</p>
        <Button onClick={load}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-[#111113]">Integrations</h1>
        <p className="mt-2 text-gray-500">
          Connect your lead sources so enquiries reach the team without anyone re-typing them.
        </p>
      </div>

      <div className="grid gap-6">
        {INTEGRATIONS.map((def) => (
          <IntegrationCard
            key={def.configType}
            integration={def}
            icon={ICONS[def.configType]}
            status={statuses[def.configType]}
            webhookUrl={statuses[def.configType]?.webhookUrl ?? null}
            onSecretRotated={load}
            onOpenMapping={() => setMappingFor(def)}
            onOpenLogs={() => setLogsFor(def)}
            onOpenSetupEmail={() => setEmailFor(def)}
          />
        ))}
      </div>

      <FieldMappingDialog
        integration={mappingFor}
        fieldMap={mappingFor ? fieldMaps[mappingFor.configType] || {} : {}}
        onSaved={(configType, map) => setFieldMaps((m) => ({ ...m, [configType]: map }))}
        onClose={() => setMappingFor(null)}
      />

      <DeliveryLogDialog
        configType={logsFor?.configType ?? null}
        name={logsFor?.name ?? ''}
        onClose={() => setLogsFor(null)}
      />

      <SetupEmailDialog
        integration={emailFor}
        status={emailFor ? statuses[emailFor.configType] : undefined}
        onSent={load}
        onClose={() => setEmailFor(null)}
      />

      {/* Facebook credentials — the webhook cannot verify signatures without these */}
      <Card className="border-gray-200 shadow-sm">
        <div className="flex items-start gap-4 p-6">
          <div className="flex-shrink-0 rounded-lg bg-gray-50 p-2">
            <KeyRound size={18} className="text-[#E04020]" />
          </div>
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900">Facebook credentials</h3>
              <p className="mt-1 text-sm text-gray-500">
                All three come from your Meta app. Without the app secret, incoming webhooks are
                rejected — Facebook signs every delivery and the CRM verifies that signature.
              </p>
            </div>

            <div className="grid max-w-2xl gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="fb-token" className="mb-1 block text-xs font-medium text-gray-500">
                  Page access token {fbHasToken && <span className="text-green-600">· saved</span>}
                </label>
                <Input
                  id="fb-token"
                  type="password"
                  value={fbToken}
                  onChange={(e) => setFbToken(e.target.value)}
                  placeholder={fbHasToken ? 'Leave blank to keep the saved token' : 'EAAxxxxx… (permanent page access token)'}
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label htmlFor="fb-secret" className="mb-1 block text-xs font-medium text-gray-500">
                  App secret
                </label>
                <Input
                  id="fb-secret"
                  value={fbAppSecret}
                  onChange={(e) => setFbAppSecret(e.target.value)}
                  placeholder="Meta app → Settings → Basic"
                  className="font-mono text-xs"
                />
              </div>
              <div>
                <label htmlFor="fb-verify" className="mb-1 block text-xs font-medium text-gray-500">
                  Verify token
                </label>
                <Input
                  id="fb-verify"
                  value={fbVerifyToken}
                  onChange={(e) => setFbVerifyToken(e.target.value)}
                  placeholder="Any phrase — paste the same one into Meta"
                  className="font-mono text-xs"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={saveFacebook} disabled={fbSaving}>
                {fbSaving ? 'Saving…' : 'Save Facebook credentials'}
              </Button>
              <Button variant="outline" onClick={verifyFacebook} disabled={fbVerifying}>
                {fbVerifying ? 'Checking…' : 'Verify with Facebook'}
              </Button>
            </div>

            {fbVerifyResult && (
              <p role="alert" className={`text-sm ${fbVerifyResult.ok ? 'text-green-700' : 'text-red-600'}`}>
                {fbVerifyResult.ok ? '✓ ' : '✗ '}{fbVerifyResult.message}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Paths that do not depend on a portal enabling API access */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-gray-200 shadow-sm">
          <div className="flex items-start gap-4 p-6">
            <div className="flex-shrink-0 rounded-lg bg-gray-50 p-2">
              <Upload size={18} className="text-[#E04020]" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Import a portal export</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Housing.com and 99acres both let you export enquiries as a spreadsheet. Import one
                here — set the Source column to <code className="text-xs">HOUSING_COM</code> or{' '}
                <code className="text-xs">NINETYNINE_ACRES</code> and the leads land tagged correctly.
              </p>
              <Link href="/leads" className="inline-block text-sm font-medium text-[#E04020] hover:underline">
                Go to Leads → Import
              </Link>
            </div>
          </div>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <div className="flex items-start gap-4 p-6">
            <div className="flex-shrink-0 rounded-lg bg-gray-50 p-2">
              <Phone size={18} className="text-[#E04020]" />
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Exotel IVR &amp; click-to-call</h3>
              <p className="text-sm leading-relaxed text-gray-500">
                Calls to your ExoPhone can create leads automatically, and agents can dial from a
                lead record. Credentials and webhook URLs live on the Telephony tab.
              </p>
              <Link href="/settings" className="inline-block text-sm font-medium text-[#E04020] hover:underline">
                Go to Settings → Telephony
              </Link>
            </div>
          </div>
        </Card>
      </div>

      <Card className="relative overflow-hidden border-none bg-[#E04020] text-white">
        <div className="relative z-10 p-8">
          <h3 className="mb-2 text-xl font-bold">Need a custom integration?</h3>
          <p className="mb-6 max-w-md text-sm text-[#FDECE6]">
            Any system that can POST a lead can be connected. Tell us what you want to plug in.
          </p>
          <Button
            className="bg-white font-semibold text-[#E04020] hover:bg-[#FDECE6]"
            onClick={() => {
              window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Custom integration request')}&body=${encodeURIComponent('Which system do you want to connect?\n\nWhat data should flow into the CRM?\n\n')}`;
            }}
          >
            Request custom integration
          </Button>
        </div>
        <div className="absolute top-[-20%] right-[-10%] h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      </Card>
    </div>
  );
}
