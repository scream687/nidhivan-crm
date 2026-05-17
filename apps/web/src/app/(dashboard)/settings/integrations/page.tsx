'use client';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Facebook, Globe, Copy, Check, Settings2, Save, KeyRound } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import api from '@/lib/api';

export default function IntegrationsPage() {
  const [copied, setCopied] = useState<string | null>(null);
  const [fbToken, setFbToken] = useState('');
  const [fbSaving, setFbSaving] = useState(false);
  const [fbSaved, setFbSaved] = useState(false);

  useEffect(() => {
    api.get('/integrations/config/FACEBOOK').then(r => {
      if (r.data?.accessToken) setFbToken(r.data.accessToken);
    }).catch(() => {});
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
                      <DialogTrigger>
                        <Button variant="link" className="p-0 text-gray-600 text-sm h-auto flex items-center gap-1">
                          <Settings2 size={12} />
                          Field Mapping
                        </Button>
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
                            
                            <div className="flex items-center gap-2">
                              <Input defaultValue="full_name" className="h-8 text-xs font-mono bg-gray-50" />
                            </div>
                            <Input defaultValue="name" disabled className="h-8 text-xs" />

                            <div className="flex items-center gap-2">
                              <Input defaultValue="phone_number" className="h-8 text-xs font-mono bg-gray-50" />
                            </div>
                            <Input defaultValue="phone" disabled className="h-8 text-xs" />

                            <div className="flex items-center gap-2">
                              <Input defaultValue="email_address" className="h-8 text-xs font-mono bg-gray-50" />
                            </div>
                            <Input defaultValue="email" disabled className="h-8 text-xs" />

                            <div className="flex items-center gap-2">
                              <Input placeholder="Custom field..." className="h-8 text-xs font-mono" />
                            </div>
                            <Input defaultValue="city" className="h-8 text-xs" />
                          </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                          <Button variant="outline">Reset Defaults</Button>
                          <Button className="flex items-center gap-2" onClick={() => toast.success('Mapping saved')}>
                            <Save size={14} />
                            Save Mapping
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
                  <Button className="w-full justify-start text-left bg-white border-gray-200 text-gray-700 hover:bg-gray-50" variant="outline">
                    Test Webhook
                  </Button>
                  <Button className="w-full justify-start text-left bg-white border-gray-200 text-gray-700 hover:bg-gray-50" variant="outline">
                    View Logs
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

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
                placeholder="EAAxxxxx… (permanent page access token)"
                className="font-mono text-xs"
              />
              <Button onClick={saveFbToken} disabled={fbSaving || !fbToken.trim()}
                className={fbSaved ? 'bg-green-500 hover:bg-green-500' : ''}>
                {fbSaving ? 'Saving…' : fbSaved ? '✓ Saved' : 'Save'}
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
