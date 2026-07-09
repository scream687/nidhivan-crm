'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Users, Bell, Phone, MessageSquare, Shield, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useFocusTrap } from '@/hooks/useFocusTrap';
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
    }).catch(() => toast.error('Failed to load WhatsApp config')).finally(() => setWaLoading(false));
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
    loadCompany();
  }, []);

  useEffect(() => {
    if (active === 'team' && team.length === 0 && !teamLoading && !teamError) {
      loadTeam();
    }
  }, [active, team.length, teamLoading, teamError]);

  const [companyForm, setCompanyForm] = useState({ name: '', address: '', phone: '', email: '', gstin: '', reraNumber: '' });
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companySaving, setCompanySaving] = useState(false);

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);

  // Telephony state
  const [telForm, setTelForm] = useState({ exotelSid: '', exotelToken: '', exotelPhone: '', virtualNumber: '' });
  const [telLoading, setTelLoading] = useState(true);
  const [telSaving, setTelSaving] = useState(false);
  const [telSaved, setTelSaved] = useState(false);

  useEffect(() => {
    api.get('/telephony/config').then(r => {
      if (r.data) setTelForm({ exotelSid: r.data.exotelSid || '', exotelToken: r.data.exotelToken || '', exotelPhone: r.data.exotelPhone || '', virtualNumber: r.data.virtualNumber || '' });
    }).catch(() => toast.error('Failed to load telephony config')).finally(() => setTelLoading(false));
  }, []);

  async function saveTelephony() {
    setTelSaving(true);
    try {
      await api.post('/telephony/config', telForm);
      setTelSaved(true);
      setTimeout(() => setTelSaved(false), 2000);
    } catch {
      toast.error('Failed to save telephony config');
    } finally {
      setTelSaving(false);
    }
  }

  // Notification preferences
  const NOTIFICATION_LABELS: Record<string, string> = {
    newLeadAssigned: 'New lead assigned to me',
    leadStageChange: 'Lead stage change',
    hotLeadAlert: 'Hot lead alert',
    overdueTaskReminder: 'Overdue task reminder',
    slaBreachWarning: 'SLA breach warning',
    whatsappReplyReceived: 'WhatsApp reply received',
    missedCallAlert: 'Missed call alert',
    dailySummaryReport: 'Daily summary report',
  };
  const NOTIFICATION_DEFAULTS: Record<string, boolean> = {
    newLeadAssigned: true, leadStageChange: true, hotLeadAlert: true,
    overdueTaskReminder: true, slaBreachWarning: true, whatsappReplyReceived: true,
    missedCallAlert: false, dailySummaryReport: false,
  };
  const [notifPrefs, setNotifPrefs] = useState<Record<string, boolean>>(NOTIFICATION_DEFAULTS);
  const [notifSaving, setNotifSaving] = useState<string | null>(null);
  const [notifLoading, setNotifLoading] = useState(true);

  useEffect(() => {
    setNotifLoading(true);
    api.get('/users/me').then(r => {
      if (r.data?.notificationPreferences) {
        setNotifPrefs({ ...NOTIFICATION_DEFAULTS, ...r.data.notificationPreferences });
      }
    }).catch(() => { /* use defaults */ }).finally(() => setNotifLoading(false));
  }, []);

  async function toggleNotif(key: string) {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] };
    setNotifPrefs(next);
    setNotifSaving(key);
    try {
      await api.patch('/users/me', { notificationPreferences: next });
    } catch {
      setNotifPrefs(notifPrefs); // revert
      toast.error('Failed to save preference');
    } finally {
      setNotifSaving(null);
    }
  }

  // ─── Sessions (CRM-023) ────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<{ id: string; userAgent: string; ipAddress: string | null; createdAt: string; expiresAt: string }[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    if (active === 'security') {
      setSessionsLoading(true);
      api.get('/auth/sessions').then(r => setSessions(r.data)).catch(() => {}).finally(() => setSessionsLoading(false));
    }
  }, [active]);

  async function revokeSession(id: string) {
    setRevoking(id);
    try {
      await api.delete(`/auth/sessions/${id}`);
      setSessions(s => s.filter(x => x.id !== id));
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    } finally {
      setRevoking(null);
    }
  }

  // ─── Invite Member (CRM-024) ────────────────────────────────────────────────
  const [showInvite, setShowInvite] = useState(false);
  const inviteTrapRef = useFocusTrap(showInvite);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'SALES_AGENT' });
  const [inviting, setInviting] = useState(false);

  async function inviteMember(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      await api.post('/users/invite', inviteForm);
      toast.success('Invitation sent');
      setShowInvite(false);
      setInviteForm({ name: '', email: '', role: 'SALES_AGENT' });
      loadTeam();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to invite');
    } finally {
      setInviting(false);
    }
  }

  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { toast.error('Passwords do not match'); return; }
    if (pwForm.next.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!user?.id) return;
    setPwSaving(true);
    try {
      await api.patch(`/users/${user.id}/password`, { currentPassword: pwForm.current, newPassword: pwForm.next });
      toast.success('Password updated successfully');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update password');
    } finally { setPwSaving(false); }
  }

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

  async function loadCompany() {
    setCompanyLoading(true);
    try {
      const { data } = await api.get('/settings/company');
      setCompanyForm({ name: data.name || '', address: data.address || '', phone: data.phone || '', email: data.email || '', gstin: data.gstin || '', reraNumber: data.reraNumber || '' });
    } catch {
      // defaults stay empty
    } finally {
      setCompanyLoading(false);
    }
  }

  async function saveCompany() {
    setCompanySaving(true);
    try {
      await api.put('/settings/company', companyForm);
      toast.success('Company details saved');
    } catch {
      toast.error('Failed to save company details');
    } finally {
      setCompanySaving(false);
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
        <nav className="flex-1 p-2 flex lg:flex-col gap-1 lg:gap-0 lg:space-y-0.5 overflow-x-auto">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActive(id)}
              className={cn('flex-shrink-0 w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition text-left',
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
              <button onClick={() => setShowInvite(true)} className="text-sm text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50">+ Invite Member</button>
            </div>

            {/* Invite Modal */}
            {showInvite && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => !inviting && setShowInvite(false)}>
                <div ref={inviteTrapRef} tabIndex={-1} className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                  <h3 className="font-semibold text-gray-900 mb-4">Invite Team Member</h3>
                  <form onSubmit={inviteMember} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Name</label>
                      <input value={inviteForm.name} onChange={e => setInviteForm(f => ({ ...f, name: e.target.value }))} required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                      <input type="email" value={inviteForm.email} onChange={e => setInviteForm(f => ({ ...f, email: e.target.value }))} required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Role</label>
                      <select value={inviteForm.role} onChange={e => setInviteForm(f => ({ ...f, role: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="SALES_AGENT">Sales Agent</option>
                        <option value="TELECALLER">Telecaller</option>
                        <option value="MANAGER">Manager</option>
                        <option value="MARKETING">Marketing</option>
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button type="button" onClick={() => setShowInvite(false)} disabled={inviting}
                        className="flex-1 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                      <button type="submit" disabled={inviting}
                        className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                        {inviting ? 'Inviting…' : 'Send Invite'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

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
              {telLoading ? <div className="py-4 text-sm text-gray-400">Loading…</div> : (
                <>
                  {[
                    { label: 'Exotel SID', key: 'exotelSid', placeholder: 'ex...' },
                    { label: 'Exotel Token', key: 'exotelToken', placeholder: '••••••••', type: 'password' },
                    { label: 'Exotel Phone Number', key: 'exotelPhone', placeholder: '+91 XXXXX XXXXX' },
                    { label: 'Virtual Number (ExoPhone)', key: 'virtualNumber', placeholder: 'XXXXXXXX' },
                  ].map(({ label, key, placeholder, type }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                      <input
                        type={type || 'text'}
                        value={(telForm as any)[key]}
                        onChange={e => setTelForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                  <button onClick={saveTelephony} disabled={telSaving}
                    className={cn('w-full py-2 rounded-lg text-sm font-medium transition disabled:opacity-60', telSaved ? 'bg-green-500 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')}>
                    {telSaving ? 'Saving…' : telSaved ? '✓ Saved!' : 'Save & Activate'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {active === 'whatsapp' && <WhatsAppSettings />}

        {active === 'company' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg space-y-4">
            <h2 className="font-semibold text-gray-900">Company Details</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              {companyLoading ? (
                <div className="py-4 text-sm text-gray-400">Loading…</div>
              ) : (
                <>
                  {[
                    { label: 'Company Name', key: 'name', placeholder: 'Nidhivan Property Linkers' },
                    { label: 'GSTIN', key: 'gstin', placeholder: 'XXXXXXXXXXXXX' },
                    { label: 'RERA Number', key: 'reraNumber', placeholder: 'UP-RERA-XXXXX' },
                    { label: 'Address', key: 'address', placeholder: 'Vrindavan, Uttar Pradesh' },
                    { label: 'Support Email', key: 'email', placeholder: 'nidhivanproperty@gmail.com' },
                    { label: 'Support Phone', key: 'phone', placeholder: '+91 9876543210' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                      <input
                        value={(companyForm as any)[key]}
                        onChange={e => setCompanyForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  ))}
                  <button onClick={saveCompany} disabled={companySaving}
                    className="w-full py-2 rounded-lg text-sm font-medium transition bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white">
                    {companySaving ? 'Saving…' : 'Save Changes'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}

        {active === 'notifications' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg space-y-4">
            <h2 className="font-semibold text-gray-900">Notification Preferences</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              {notifLoading ? (
                <div className="py-4 text-sm text-gray-400">Loading preferences…</div>
              ) : Object.keys(NOTIFICATION_LABELS).map((key) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-700">{NOTIFICATION_LABELS[key]}</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={notifPrefs[key] ?? NOTIFICATION_DEFAULTS[key]} onChange={() => toggleNotif(key)} disabled={notifSaving === key} className="sr-only peer" />
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
            <form onSubmit={changePassword} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h3 className="text-sm font-medium text-gray-700">Change Password</h3>
              {[
                { label: 'Current Password', key: 'current' },
                { label: 'New Password', key: 'next' },
                { label: 'Confirm New Password', key: 'confirm' },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
                  <input
                    type="password"
                    value={(pwForm as any)[key]}
                    onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                    required
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ))}
              <button type="submit" disabled={pwSaving}
                className="w-full py-2 rounded-lg text-sm font-medium transition bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white">
                {pwSaving ? 'Updating…' : 'Update Password'}
              </button>
            </form>
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Active Sessions</h3>
              {sessionsLoading ? (
                <div className="py-2 text-sm text-gray-400">Loading sessions…</div>
              ) : sessions.length === 0 ? (
                <div className="py-2 text-sm text-gray-400">No active sessions</div>
              ) : sessions.map(s => (
                <div key={s.id} className="flex items-center justify-between text-sm">
                  <div className="flex-1 min-w-0">
                    <span className="text-gray-600 block truncate">{s.userAgent}</span>
                    {s.ipAddress && <span className="text-xs text-gray-400">{s.ipAddress}</span>}
                  </div>
                  <button onClick={() => revokeSession(s.id)} disabled={revoking === s.id}
                    className="text-xs text-red-500 hover:text-red-700 ml-3 shrink-0 disabled:opacity-50">
                    {revoking === s.id ? 'Revoking…' : 'Revoke'}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
