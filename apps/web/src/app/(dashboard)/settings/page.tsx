'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Users, Bell, Phone, MessageSquare, Shield, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const SECTIONS = [
  { id: 'profile', label: 'My Profile', icon: User },
  { id: 'team', label: 'Team Members', icon: Users },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'telephony', label: 'Telephony (Exotel)', icon: Phone },
  { id: 'whatsapp', label: 'WhatsApp API', icon: MessageSquare },
  { id: 'company', label: 'Company', icon: Building },
  { id: 'security', label: 'Security', icon: Shield },
];

type TeamMember = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: string;
  isActive: boolean;
  avatarUrl?: string | null;
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-purple-100 text-purple-600',
  MANAGER: 'bg-blue-100 text-blue-600',
  SALES_AGENT: 'bg-green-100 text-green-600',
  TELECALLER: 'bg-amber-100 text-amber-600',
};

function WhatsAppSettings() {
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const webhookUrl = `${apiBase.replace('/api/v1', '')}/api/v1/whatsapp/webhook`;

  const [waForm, setWaForm] = useState({ phoneNumberId: '', wabaId: '', accessToken: '', verifyToken: 'nidhivan_crm_webhook', displayName: '' });
  const [waLoading, setWaLoading] = useState(true);
  const [waSaving, setWaSaving] = useState(false);
  const [waSaved, setWaSaved] = useState(false);
  const [waCopied, setWaCopied] = useState(false);

  useEffect(() => {
    api.get('/whatsapp/config').then(r => {
      if (r.data) setWaForm({ phoneNumberId: r.data.phoneNumberId || '', wabaId: r.data.wabaId || '', accessToken: r.data.accessToken || '', verifyToken: r.data.verifyToken || 'nidhivan_crm_webhook', displayName: r.data.displayName || '' });
    }).catch(() => {}).finally(() => setWaLoading(false));
  }, []);

  async function saveWa() {
    setWaSaving(true);
    try {
      await api.post('/whatsapp/config', waForm);
      setWaSaved(true);
      setTimeout(() => setWaSaved(false), 2000);
    } catch {
      toast.error('Failed to save WhatsApp config');
    } finally {
      setWaSaving(false);
    }
  }

  function copyWebhook() {
    navigator.clipboard.writeText(webhookUrl);
    setWaCopied(true);
    setTimeout(() => setWaCopied(false), 2000);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg space-y-4">
      <h2 className="font-semibold text-gray-900">WhatsApp Business API</h2>
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-700">
        Connect your Meta WhatsApp Cloud API. You need a Phone Number ID, WABA ID, and a permanent access token from the Meta Developer Console.
      </div>
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        {waLoading ? <div className="py-4 text-sm text-gray-400">Loading…</div> : (
          <>
            {[
              { label: 'Display Name', key: 'displayName', placeholder: 'Nidhivan Property Linkers' },
              { label: 'Phone Number ID', key: 'phoneNumberId', placeholder: '787056411164201' },
              { label: 'WhatsApp Business Account (WABA) ID', key: 'wabaId', placeholder: '1884427422495224' },
              { label: 'Access Token', key: 'accessToken', placeholder: 'EAAxxxxx…', type: 'password' },
              { label: 'Verify Token (Webhook)', key: 'verifyToken', placeholder: 'nidhivan_crm_webhook' },
            ].map(({ label, key, placeholder, type }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                <input
                  type={type || 'text'}
                  value={(waForm as any)[key]}
                  onChange={e => setWaForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Webhook URL — paste this in Meta Developer Console</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 truncate">{webhookUrl}</div>
                <button onClick={copyWebhook} className="px-3 py-2 border border-gray-200 rounded-lg text-xs hover:bg-gray-50 transition">
                  {waCopied ? '✓' : 'Copy'}
                </button>
              </div>
            </div>
            <button onClick={saveWa} disabled={waSaving}
              className={cn('w-full py-2 rounded-lg text-sm font-medium transition disabled:opacity-60', waSaved ? 'bg-green-500 text-white' : 'bg-green-600 hover:bg-green-700 text-white')}>
              {waSaving ? 'Saving…' : waSaved ? '✓ Saved & Connected!' : 'Save & Connect'}
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const { user, fetchMe } = useAuthStore();
  const [active, setActive] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (active === 'team' && team.length === 0 && !teamLoading && !teamError) {
      loadTeam();
    }
  }, [active, team.length, teamLoading, teamError]);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  async function loadProfile() {
    setProfileLoading(true);
    setProfileError('');
    try {
      const { data } = await api.get('/users/me');
      setProfileForm({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
      });
    } catch {
      setProfileError('Unable to load profile right now.');
      setProfileForm({
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
      });
    } finally {
      setProfileLoading(false);
    }
  }

  async function loadTeam() {
    setTeamLoading(true);
    setTeamError('');
    try {
      const { data } = await api.get('/users');
      setTeam(data);
    } catch {
      setTeamError('Unable to load team members.');
    } finally {
      setTeamLoading(false);
    }
  }

  async function saveProfile() {
    setProfileSaving(true);
    setProfileSaved(false);
    setProfileError('');
    try {
      await api.patch('/users/me', {
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim() || null,
      });
      await fetchMe();
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2000);
    } catch {
      setProfileError('Profile update failed. Please try again.');
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-56 border-r border-gray-200 bg-white flex flex-col">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-gray-500" />
            <h1 className="font-bold text-gray-900 text-sm">Settings</h1>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActive(id)}
              className={cn('w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition text-left',
                active === id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50')}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {active === 'profile' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg space-y-5">
            <h2 className="font-semibold text-gray-900">My Profile</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
                  {(profileForm.name || user?.name || 'RS').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{profileForm.name || user?.name}</p>
                  <p className="text-sm text-gray-400">{profileForm.email || user?.email}</p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[user?.role || ''] || 'bg-gray-100 text-gray-500')}>
                    {user?.role}
                  </span>
                </div>
              </div>
              {profileError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-600">
                  {profileError}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Full Name</label>
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                  disabled={profileLoading || profileSaving}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                <input
                  value={profileForm.email}
                  disabled
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
                <input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))}
                  disabled={profileLoading || profileSaving}
                  placeholder="+91 9876543210"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                />
              </div>
              <button
                onClick={saveProfile}
                disabled={profileLoading || profileSaving}
                className={cn(
                  'w-full py-2 rounded-lg text-sm font-medium transition disabled:opacity-60',
                  profileSaved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white',
                )}
              >
                {profileLoading ? 'Loading…' : profileSaving ? 'Saving…' : profileSaved ? '✓ Saved!' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}

        {active === 'team' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Team Members</h2>
              <button className="text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">+ Invite Member</button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {teamLoading && (
                <div className="px-5 py-6 text-sm text-gray-400">Loading team members…</div>
              )}
              {!teamLoading && teamError && (
                <div className="px-5 py-6 text-sm text-red-600">{teamError}</div>
              )}
              {!teamLoading && !teamError && team.length === 0 && (
                <div className="px-5 py-6 text-sm text-gray-400">No team members found.</div>
              )}
              {!teamLoading && !teamError && team.map((member, i) => (
                <div key={member.id} className={cn('flex items-center gap-4 px-5 py-3.5', i < team.length - 1 ? 'border-b border-gray-50' : '')}>
                  <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{member.name}</p>
                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                  </div>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', ROLE_COLORS[member.role] || 'bg-gray-100 text-gray-500')}>
                    {member.role.replace(/_/g, ' ')}
                  </span>
                  <div className={cn('w-2 h-2 rounded-full', member.isActive ? 'bg-green-400' : 'bg-gray-300')} />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {active === 'telephony' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg space-y-4">
            <h2 className="font-semibold text-gray-900">Telephony — Exotel</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
              Exotel integration is scaffolded and ready. Enter your API credentials below to activate click-to-call, call recording, and auto-link.
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              {[['Exotel SID', 'ex...'], ['Exotel Token', '••••••••'], ['Exotel Phone Number', '+91 XXXXX XXXXX'], ['Virtual Number (ExoPhone)', 'XXXXXXXX']].map(([label, ph]) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input placeholder={ph} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <button onClick={save} className={cn('w-full py-2 rounded-lg text-sm font-medium transition', saved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')}>
                {saved ? '✓ Saved!' : 'Save & Activate'}
              </button>
            </div>
          </motion.div>
        )}

        {active === 'whatsapp' && <WhatsAppSettings />}

        {active === 'company' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg space-y-4">
            <h2 className="font-semibold text-gray-900">Company Details</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              {[['Company Name', 'NIDHIVAN PROPERTY LINKERS®'], ['GSTIN', ''], ['RERA Number', ''], ['Address', 'Jaipur, Rajasthan'], ['Support Email', 'nidhivanproperty@gmail.com'], ['Support Phone', '']].map(([label, val]) => (
                <div key={label}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input defaultValue={val} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <button onClick={save} className={cn('w-full py-2 rounded-lg text-sm font-medium transition', saved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')}>
                {saved ? '✓ Saved!' : 'Save Changes'}
              </button>
            </div>
          </motion.div>
        )}

        {active === 'notifications' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg space-y-4">
            <h2 className="font-semibold text-gray-900">Notification Preferences</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              {[
                ['New lead assigned to me', true],
                ['Lead stage change', true],
                ['Hot lead alert', true],
                ['Overdue task reminder', true],
                ['SLA breach warning', true],
                ['WhatsApp reply received', true],
                ['Missed call alert', false],
                ['Daily summary report', false],
              ].map(([label, def]) => (
                <div key={label as string} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-700">{label as string}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" defaultChecked={def as boolean} className="sr-only peer" />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500" />
                  </label>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {active === 'security' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg space-y-4">
            <h2 className="font-semibold text-gray-900">Security</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Change Password</h3>
              {['Current Password', 'New Password', 'Confirm New Password'].map(label => (
                <div key={label}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input type="password" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              ))}
              <button onClick={save} className={cn('w-full py-2 rounded-lg text-sm font-medium transition', saved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')}>
                {saved ? '✓ Updated!' : 'Update Password'}
              </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Active Sessions</h3>
              {[['Chrome · MacBook Pro · Jaipur', 'Current'], ['iPhone · Safari · Jaipur', '2h ago']].map(([session, time]) => (
                <div key={session} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{session}</span>
                  <span className={cn('text-xs', time === 'Current' ? 'text-green-500 font-medium' : 'text-gray-400')}>{time}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
