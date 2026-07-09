'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Facebook, Globe, Copy, Check, Settings2, Save, KeyRound, Loader2 } from 'lucide-react';
import { useState, useEffect, Fragment } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import api from '@/lib/api';

type FieldMapEntry = { externalField: string; crmField: string };
type LogEntry = { timestamp: string; status: string; payload: string };

const DEFAULT_MAPPINGS: Record<string, FieldMapEntry[]> = {
  facebook: [
    { externalField: 'full_name', crmField: 'name' },
    { externalField: 'phone_number', crmField: 'phone' },
    { externalField: 'email_address', crmField: 'email' },
    { externalField: '', crmField: 'city' },
  ],
  webflow: [
    { externalField: 'full_name', crmField: 'name' },
    { externalField: 'phone_number', crmField: 'phone' },
    { externalField: 'email_address', crmField: 'email' },
    { externalField: '', crmField: 'city' },
  ],
};

export default function IntegrationsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [fbToken, setFbToken] = useState('');
  const [fbSaving, setFbSaving] = useState(false);
  const [fbSaved, setFbSaved] = useState(false);
  // CRM-025: field mapping state
  const [fieldMaps, setFieldMaps] = useState<Record<string, FieldMapEntry[]>>(DEFAULT_MAPPINGS);
  const [savingMapping, setSavingMapping] = useState<Record<string, boolean>>({});
  // CRM-026: webhook test + log state
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'loading' | 'success' | 'error'>>({});
  const [logDialog, setLogDialog] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, LogEntry[]>>({});

  useEffect(() => {
    api.get('/integrations/config/FACEBOOK').then(r => {
      if (r.data?.accessToken) setFbToken(r.data.accessToken);
    }).catch(() => {});

    const saved = localStorage.getItem('fieldMappings');
    if (saved) {
      try { setFieldMaps(prev => ({ ...prev, ...JSON.parse(saved) })); } catch {}
    }
    const savedLogs = localStorage.getItem('webhookLogs');
    if (savedLogs) {
      try { setLogs(JSON.parse(savedLogs)); } catch {}
    }
  }, []);

  async function saveFbToken() {
    if (!fbToken.trim()) return;
    setFbSaving(true);
    try {
      await api.post('/integrations/config/FACEBOOK', { accessToken: fbToken.trim() });
      setFbSaved(true);
      setTimeout(() => setFbSaved(false), 2000);
    } catch {
      toast.error('Failed to save Facebook token');
    } finally {
      setFbSaving(false);
    }
  }

  // CRM-025: wire field mapping save
  function updateFieldMap(id: string, index: number, value: string) {
    setFieldMaps(prev => {
      const next = { ...prev };
      const entries = [...(next[id] || DEFAULT_MAPPINGS[id] || [])];
      if (entries[index]) entries[index] = { ...entries[index], externalField: value };
      next[id] = entries;
      return next;
    });
  }

  async function saveMapping(id: string) {
    setSavingMapping(prev => ({ ...prev, [id]: true }));
    try {
      await new Promise(r => setTimeout(r, 300));
      localStorage.setItem('fieldMappings', JSON.stringify(fieldMaps));
      toast.success('Mapping saved');
    } catch {
      toast.error('Failed to save mapping');
    } finally {
      setSavingMapping(prev => ({ ...prev, [id]: false }));
    }
  }

  function resetDefaults(id: string) {
    setFieldMaps(prev => ({ ...prev, [id]: [...DEFAULT_MAPPINGS[id]] }));
    toast.success('Reset to defaults');
  }

  // CRM-026: test webhook
  function addLogEntry(id: string, entry: LogEntry) {
    setLogs(prev => {
      const next = { ...prev, [id]: [entry, ...(prev[id] || [])].slice(0, 20) };
      localStorage.setItem('webhookLogs', JSON.stringify(next));
      return next;
    });
  }

  async function testWebhook(url: string, id: string) {
    setTestStatus(prev => ({ ...prev, [id]: 'loading' }));
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true, timestamp: new Date().toISOString() }),
      });
      addLogEntry(id, { timestamp: new Date().toISOString(), status: res.ok ? 'success' : 'error', payload: `HTTP ${res.status}` });
      if (res.ok) {
        toast.success('Webhook responded OK');
        setTestStatus(prev => ({ ...prev, [id]: 'success' }));
      } else {
        toast.error(`Webhook returned ${res.status}`);
        setTestStatus(prev => ({ ...prev, [id]: 'error' }));
      }
    } catch {
      addLogEntry(id, { timestamp: new Date().toISOString(), status: 'error', payload: 'Unreachable' });
      toast.error('Webhook unreachable');
      setTestStatus(prev => ({ ...prev, [id]: 'error' }));
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const integrations = [
    {
      id: 'facebook',
      name: 'Facebook Lead Ads',
      description: 'Automatically capture leads from your Facebook & Instagram ad forms.',
      icon: <Facebook className="text-blue-600" />,
      webhookUrl: `${baseUrl}/integrations/facebook`,
      docsUrl: 'https://developers.facebook.com/docs/marketing-api/guides/lead-ads/webhooks',
    },
    {
      id: 'webflow',
      name: 'Webflow',
      description: 'Connect your Webflow forms to Nidhivan CRM instantly.',
      icon: <Globe className="text-blue-500" />,
      webhookUrl: `${baseUrl}/integrations/webflow`,
      docsUrl: 'https://developers.webflow.com/reference/webhooks',
    },
  ];

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('URL copied to clipboard');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Integrations</h1>
        <p className="text-gray-500 mt-2">Connect your lead sources and marketing tools to Nidhivan CRM.</p>
      </div>

      <div className="grid gap-6">
        {integrations.map((int) => (
          <Card key={int.id} className="overflow-hidden border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex flex-col md:flex-row">
              <div className="p-6 md:w-2/3 border-b md:border-b-0 md:border-r border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gray-50 rounded-lg">
                    {int.icon}
                  </div>
                  <CardTitle>{int.name}</CardTitle>
                </div>
                <CardDescription className="text-sm leading-relaxed mb-6">
                  {int.description}
                </CardDescription>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Webhook URL</label>
                    <div className="flex gap-2">
                      <Input value={int.webhookUrl} readOnly className="bg-gray-50 font-mono text-xs" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(int.webhookUrl, int.id)}>
                        {copied === int.id ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Button variant="link" className="p-0 text-blue-600 text-sm h-auto" onClick={() => window.open(int.docsUrl, '_blank')}>
                      Documentation
                    </Button>
                    <div className="h-4 w-[1px] bg-gray-200" />
                    <Dialog>
                      <DialogTrigger render={<Button variant="link" className="p-0 text-gray-600 text-sm h-auto flex items-center gap-1" />}>
                        <Settings2 size={12} />
                        Field Mapping
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                          <DialogTitle>{int.name} - Field Mapping</DialogTitle>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                          <p className="text-sm text-gray-500 mb-4">Map your external form fields to Nidhivan CRM lead fields.</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-xs font-bold text-gray-400 uppercase">External Field</div>
                            <div className="text-xs font-bold text-gray-400 uppercase">CRM Lead Field</div>

                            {(fieldMaps[int.id] || DEFAULT_MAPPINGS[int.id] || []).map((entry, i) => (
                              <Fragment key={i}>
                                <Input
                                  value={entry.externalField}
                                  onChange={e => updateFieldMap(int.id, i, e.target.value)}
                                  className="h-8 text-xs font-mono bg-gray-50"
                                />
                                <Input value={entry.crmField} disabled className="h-8 text-xs" />
                              </Fragment>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <Button variant="outline" onClick={() => resetDefaults(int.id)}>Reset Defaults</Button>
                          <Button className="flex items-center gap-2" onClick={() => saveMapping(int.id)} disabled={savingMapping[int.id]}>
                            {savingMapping[int.id] ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                            {savingMapping[int.id] ? 'Saving\u2026' : 'Save Mapping'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                    <div className="h-4 w-[1px] bg-gray-200" />
                    <span className="text-xs text-gray-400">Status: <span className="text-green-500 font-medium italic">Ready to connect</span></span>
                  </div>
                </div>
              </div>

              <div className="p-6 md:w-1/3 bg-gray-50/50 flex flex-col justify-center">
                <div className="space-y-3">
                  <p className="text-xs font-medium text-gray-600">Manual Setup</p>
                  {/* CRM-026: test webhook onClick */}
                  <Button
                    className="w-full justify-start text-left bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    variant="outline"
                    onClick={() => testWebhook(int.webhookUrl, int.id)}
                    disabled={testStatus[int.id] === 'loading'}
                  >
                    {testStatus[int.id] === 'loading' ? (
                      <><Loader2 size={14} className="animate-spin mr-2" /> Testing\u2026</>
                    ) : testStatus[int.id] === 'success' ? (
                      '\u2713 Tested OK'
                    ) : testStatus[int.id] === 'error' ? (
                      'Test Failed - Retry'
                    ) : (
                      'Test Webhook'
                    )}
                  </Button>
                  {/* CRM-026: view logs onClick */}
                  <Button
                    className="w-full justify-start text-left bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                    variant="outline"
                    onClick={() => setLogDialog(int.id)}
                  >
                    View Logs
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* CRM-026: view logs dialog */}
      <Dialog open={!!logDialog} onOpenChange={(open) => { if (!open) setLogDialog(null); }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Webhook Logs - {logDialog && integrations.find(i => i.id === logDialog)?.name}</DialogTitle>
          </DialogHeader>
          <div className="py-4 max-h-80 overflow-y-auto">
            {logDialog && (!logs[logDialog] || logs[logDialog].length === 0) ? (
              <p className="text-sm text-gray-500 text-center py-8">No webhook deliveries yet. Test your webhook to see results here.</p>
            ) : logDialog && (
              <div className="space-y-2">
                {logs[logDialog].map((entry, i) => (
                  <div key={i} className="flex items-center justify-between p-3 text-sm border rounded-lg bg-gray-50">
                    <div>
                      <span className="font-mono text-xs text-gray-500">{new Date(entry.timestamp).toLocaleString()}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{entry.payload}</p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      entry.status === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {entry.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Facebook Page Access Token */}
      <Card className="border-gray-200 shadow-sm">
        <div className="p-6 flex items-start gap-4">
          <div className="p-2 bg-gray-50 rounded-lg flex-shrink-0">
            <KeyRound size={18} className="text-blue-600" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-gray-900">Facebook Page Access Token</h3>
              <p className="text-sm text-gray-500 mt-1">
                Required to fetch lead details from Facebook Lead Ads. Generate a permanent token from your Meta Business Suite → System Users.
              </p>
            </div>
            <div className="flex gap-2 max-w-lg">
              <Input
                type="password"
                value={fbToken}
                onChange={e => setFbToken(e.target.value)}
                placeholder="EAAxxxxx\u2026 (permanent page access token)"
                className="font-mono text-xs"
              />
              <Button onClick={saveFbToken} disabled={fbSaving || !fbToken.trim()}
                className={fbSaved ? 'bg-green-500 hover:bg-green-500' : ''}>
                {fbSaving ? 'Saving\u2026' : fbSaved ? '\u2713 Saved' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <Card className="bg-blue-600 border-none text-white overflow-hidden relative">
        <div className="p-8 relative z-10">
          <h3 className="text-xl font-bold mb-2">Need a custom integration?</h3>
          <p className="text-blue-100 text-sm max-w-md mb-6">Our API is open for custom lead capture. Contact the development team for more technical details.</p>
          <Button className="bg-white text-blue-600 hover:bg-blue-50 font-semibold">
            Request Custom Integration
          </Button>
        </div>
        <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-[-20%] left-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl" />
      </Card>
    </div>
  );
}
