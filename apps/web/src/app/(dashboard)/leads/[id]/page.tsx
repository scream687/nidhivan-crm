'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useLeadsStore } from '@/stores/leadsStore';
import { cn, timeAgo, formatCurrency } from '@/lib/utils';
import { LEAD_SOURCE_LABELS, LeadStage, LEAD_STAGE_LABELS } from '@nidhivan/shared';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';
import { Role } from '@prisma/client';
import {
  ArrowLeft, Phone, Flame, CheckCircle, Clock, PhoneCall, StickyNote,
  ChevronDown, Zap, MapPin, Mail, DollarSign, Calendar, ClipboardList,
} from 'lucide-react';
import { ReassignDialog } from '@/components/leads/ReassignDialog';
import { ScheduleVisitModal } from '@/components/leads/ScheduleVisitModal';
import { RecordOutcomeModal } from '@/components/leads/RecordOutcomeModal';

const TABS = ['Timeline', 'Calls', 'Tasks', 'Notes', 'Visits'] as const;

const STAGE_COLORS: Record<string, { color: string; bgColor: string }> = {
  NEW: { color: '#6b7280', bgColor: '#f3f4f6' },
  ATTEMPTED: { color: '#ea580c', bgColor: '#fff7ed' },
  CONNECTED: { color: '#2563eb', bgColor: '#eff6ff' },
  INTERESTED: { color: '#7c3aed', bgColor: '#f5f3ff' },
  HOT: { color: '#dc2626', bgColor: '#fef2f2' },
  SITE_VISIT_SCHEDULED: { color: '#7c3aed', bgColor: '#f5f3ff' },
  SITE_VISIT_COMPLETED: { color: '#0d9488', bgColor: '#f0fdfa' },
  NEGOTIATION: { color: '#d97706', bgColor: '#fffbeb' },
  BOOKING_PENDING: { color: '#ca8a04', bgColor: '#fefce8' },
  CLOSED_WON: { color: '#16a34a', bgColor: '#f0fdf4' },
  CLOSED_LOST: { color: '#9f1239', bgColor: '#fff1f2' },
  FUTURE_PROSPECT: { color: '#0891b2', bgColor: '#ecfeff' },
};

const stages = Object.values(LeadStage).map(name => ({
  name,
  label: LEAD_STAGE_LABELS[name],
  ...(STAGE_COLORS[name] ?? { color: '#374151', bgColor: '#f3f4f6' }),
}));

const OUTCOME_STYLES: Record<string, { bg: string; text: string }> = {
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-700' },
  NO_SHOW: { bg: 'bg-red-100', text: 'text-red-700' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-600' },
  RESCHEDULED: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
};

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { currentLead, isLoading, fetchLead, changeStage, toggleHot } = useLeadsStore();
  const router = useRouter();
  const [tab, setTab] = useState<typeof TABS[number]>('Timeline');
  const [timeline, setTimeline] = useState<any>(null);
  const [noteText, setNoteText] = useState('');
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [outcomeVisitId, setOutcomeVisitId] = useState<string | null>(null);

  const isManager = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  useEffect(() => {
    fetchLead(id);
    loadTimeline();
  }, [id]);

  async function loadTimeline() {
    const { data } = await api.get(`/leads/${id}/timeline`);
    setTimeline(data);
  }

  async function addNote() {
    if (!noteText.trim()) return;
    await api.post(`/leads/${id}/notes`, { content: noteText });
    setNoteText('');
    loadTimeline();
    toast.success('Note added');
  }

  async function handleCall() {
    await api.post('/telephony/click-to-call', { leadId: id });
    toast.success('Initiating call…');
  }

  if (isLoading || !currentLead) {
    return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const lead = currentLead;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600"><ArrowLeft size={18} /></button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-gray-900">{lead.name}</h1>
                <button onClick={() => toggleHot(id, !lead.isHot)} className={cn('transition', lead.isHot ? 'text-red-500' : 'text-gray-300 hover:text-red-400')}>
                  <Flame size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-400">{lead.leadNumber} · Created {timeAgo(lead.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stage selector */}
            <div className="relative">
              {(() => {
                const sc = stages.find(s => s.name === lead.stage);
                return (
                  <button onClick={() => setShowStageMenu(!showStageMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={sc ? { color: sc.color, backgroundColor: sc.bgColor } : { color: '#374151', backgroundColor: '#f3f4f6' }}>
                    {sc?.label || lead.stage}
                    <ChevronDown size={13} />
                  </button>
                );
              })()}
              {showStageMenu && (
                <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[200px]">
                  {stages.map((s) => (
                    <button key={s.name} onClick={async () => { await changeStage(id, s.name); setShowStageMenu(false); await fetchLead(id); }}
                      className={cn('w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition flex items-center gap-2', s.name === lead.stage ? 'font-semibold' : '')}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleCall} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm px-3.5 py-1.5 rounded-lg transition font-medium">
              <Phone size={14} />
              Call
            </button>

            {isManager && (
              <button onClick={() => setShowScheduleModal(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3.5 py-1.5 rounded-lg transition font-medium">
                <Calendar size={14} />
                Schedule Visit
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: lead info */}
        <div className="w-72 bg-white border-r border-gray-200 overflow-y-auto p-4 space-y-4">
          <Section title="Contact">
            <Info icon={<Phone size={13} />} label="Phone" value={lead.phone} />
            {lead.altPhone && <Info icon={<Phone size={13} />} label="Alt Phone" value={lead.altPhone} />}
            {lead.email && <Info icon={<Mail size={13} />} label="Email" value={lead.email} />}
            {lead.city && <Info icon={<MapPin size={13} />} label="City" value={`${lead.city}${lead.state ? `, ${lead.state}` : ''}`} />}
          </Section>

          <Section title="Lead Info">
            {(lead as any).leadTitle && <Info label="Title" value={(lead as any).leadTitle} />}
            <Info label="Source" value={LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS] || lead.source} />
            <Info label="Project" value={lead.projectInterest || '—'} />
            {(lead as any).siteLocation && <Info icon={<MapPin size={13} />} label="Site Location" value={(lead as any).siteLocation} />}
            {(lead as any).siteVisitDate && <Info label="Site Visit" value={new Date((lead as any).siteVisitDate).toLocaleDateString('en-IN')} />}
            {lead.budget && <Info icon={<DollarSign size={13} />} label="Budget" value={formatCurrency(Number(lead.budget))} />}
            {(lead as any).requirements && <Info label="Requirements" value={(lead as any).requirements} />}
            {(lead as any).description && <Info label="Description" value={(lead as any).description} />}
            {lead.occupation && <Info label="Occupation" value={lead.occupation} />}
            {lead.investmentPurpose && <Info label="Purpose" value={lead.investmentPurpose.replace('_', ' ')} />}
            {(lead as any).reference && <Info label="Reference" value={(lead as any).reference} />}
          </Section>

          <Section title="Campaign">
            {(lead as any).campaignName && <Info label="Campaign" value={(lead as any).campaignName} />}
            {(lead as any).campaignTeam && <Info label="Team" value={(lead as any).campaignTeam} />}
          </Section>

          <Section title="Assignment">
            <div className="flex items-center justify-between">
              <Info label="Assigned To" value={lead.assignedTo?.name || 'Unassigned'} />
              <ReassignDialog
                leadId={lead.id}
                currentAssigneeId={lead.assignedToId}
                onSuccess={() => fetchLead(lead.id)}
              />
            </div>
            {lead.nextFollowUpAt && <Info icon={<Clock size={13} />} label="Follow-up On" value={new Date(lead.nextFollowUpAt).toLocaleDateString('en-IN')} />}
            {(lead as any).nextFollowUpInfo && <Info label="Follow-up Info" value={(lead as any).nextFollowUpInfo} />}
            {(lead as any).bookingDate && <Info label="Booking Date" value={new Date((lead as any).bookingDate).toLocaleDateString('en-IN')} />}
            {(lead as any).registryDoneDate && <Info label="Registry Done" value={new Date((lead as any).registryDoneDate).toLocaleDateString('en-IN')} />}
          </Section>

          {lead.tags?.length > 0 && (
            <Section title="Tags">
              <div className="flex flex-wrap gap-1">
                {lead.tags.map((t: string) => (
                  <span key={t} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </Section>
          )}
        </div>

        {/* Right: tabs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center gap-0 border-b border-gray-200 bg-white px-4">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn('px-4 py-3 text-sm font-medium border-b-2 transition', tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700')}>
                {t}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {tab === 'Timeline' && (
              <div className="space-y-3">
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                  <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Add a note…"
                    rows={2} className="w-full text-sm text-gray-700 resize-none focus:outline-none" />
                  <div className="flex justify-end mt-2">
                    <button onClick={addNote} className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition">Save Note</button>
                  </div>
                </div>

                {timeline?.activities?.map((a: any) => (
                  <ActivityItem key={a.id} activity={a} />
                ))}
              </div>
            )}

            {tab === 'Calls' && (
              <div className="space-y-3">
                {timeline?.calls?.map((call: any) => (
                  <div key={call.id} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <PhoneCall size={14} className={call.callType === 'OUTGOING' ? 'text-blue-500' : 'text-green-500'} />
                        <span className="text-sm font-medium text-gray-800">{call.callType} call</span>
                        <span className={cn('text-xs px-1.5 py-0.5 rounded-full', call.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600')}>
                          {call.status}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">{timeAgo(call.createdAt)}</span>
                    </div>
                    {call.duration && <p className="text-xs text-gray-500">Duration: {Math.floor(call.duration / 60)}:{String(call.duration % 60).padStart(2, '0')}</p>}
                    {call.notes && <p className="text-sm text-gray-600 mt-1">{call.notes}</p>}
                    {call.recordingUrl && (
                      <audio controls src={call.recordingUrl} className="mt-2 w-full h-8" />
                    )}
                  </div>
                ))}
                {timeline?.calls?.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No calls yet</p>}
              </div>
            )}

            {tab === 'Tasks' && (
              <div className="space-y-2">
                {timeline?.tasks?.map((task: any) => (
                  <div key={task.id} className={cn('bg-white rounded-lg border p-3 flex items-start gap-3', task.isCompleted ? 'border-gray-100 opacity-60' : 'border-gray-200')}>
                    <CheckCircle size={16} className={task.isCompleted ? 'text-green-500' : 'text-gray-300'} />
                    <div>
                      <p className={cn('text-sm', task.isCompleted ? 'line-through text-gray-400' : 'text-gray-800 font-medium')}>{task.title}</p>
                      {task.dueDate && <p className="text-xs text-gray-400 mt-0.5">Due: {new Date(task.dueDate).toLocaleDateString('en-IN')}</p>}
                    </div>
                  </div>
                ))}
                {timeline?.tasks?.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No tasks</p>}
              </div>
            )}

            {tab === 'Notes' && (
              <div className="space-y-3">
                {timeline?.activities?.filter((a: any) => a.type === 'NOTE').map((a: any) => (
                  <div key={a.id} className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-gray-700">{a.description}</p>
                    <p className="text-xs text-gray-400 mt-2">{a.user?.name} · {timeAgo(a.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}

            {tab === 'Visits' && (
              <div className="space-y-3">
                {lead.siteVisits?.map((v: any) => {
                  const outcomeStyle = v.outcome ? OUTCOME_STYLES[v.outcome] : null;
                  return (
                    <div key={v.id} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <MapPin size={14} className="text-blue-500 flex-shrink-0" />
                          <span className="text-sm font-semibold text-gray-900">{v.address}</span>
                          {outcomeStyle ? (
                            <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-bold', outcomeStyle.bg, outcomeStyle.text)}>
                              {v.outcome.replace('_', ' ')}
                            </span>
                          ) : (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700">SCHEDULED</span>
                          )}
                          {v.interestLevel && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold bg-orange-100 text-orange-700">
                              {v.interestLevel.replace('_', ' ')}
                            </span>
                          )}
                        </div>
                        {!v.outcome && isManager && (
                          <button
                            onClick={() => setOutcomeVisitId(v.id)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 rounded-lg px-2 py-1 transition flex-shrink-0"
                          >
                            <ClipboardList size={11} />
                            Record
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                        {v.scheduledAt && (
                          <span className="flex items-center gap-0.5">
                            <Calendar size={10} />
                            {new Date(v.scheduledAt).toLocaleDateString('en-IN')}
                          </span>
                        )}
                        {v.assignedTo && <span>Assigned: {v.assignedTo.name}</span>}
                        {v.conductedBy && <span>Conducted by: {v.conductedBy.name}</span>}
                      </div>
                      {v.propertyShown && <p className="text-xs text-gray-500 mt-1.5">Property: {v.propertyShown}</p>}
                      {v.objections && <p className="text-xs text-gray-500 mt-1 italic">Concerns: {v.objections}</p>}
                      {v.followUpNotes && <p className="text-sm text-gray-600 mt-2">"{v.followUpNotes}"</p>}
                    </div>
                  );
                })}
                {lead.siteVisits?.length === 0 && (
                  <div className="py-12 text-center">
                    <MapPin size={32} className="mx-auto text-gray-200 mb-2" />
                    <p className="text-sm text-gray-400">No site visits recorded</p>
                    {isManager && (
                      <button onClick={() => setShowScheduleModal(true)} className="mt-3 text-sm text-blue-600 hover:underline">
                        Schedule the first visit
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showScheduleModal && (
        <ScheduleVisitModal
          leadId={id}
          onClose={() => setShowScheduleModal(false)}
          onSuccess={() => { setShowScheduleModal(false); fetchLead(id); }}
        />
      )}
      {outcomeVisitId && (
        <RecordOutcomeModal
          leadId={id}
          visitId={outcomeVisitId}
          onClose={() => setOutcomeVisitId(null)}
          onSuccess={() => { setOutcomeVisitId(null); fetchLead(id); }}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Info({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      {icon && <span className="text-gray-400 mt-0.5 flex-shrink-0">{icon}</span>}
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-700 font-medium">{value}</p>
      </div>
    </div>
  );
}

function ActivityItem({ activity }: { activity: any }) {
  const iconMap: Record<string, React.ReactNode> = {
    NOTE: <StickyNote size={13} className="text-amber-500" />,
    CALL: <Phone size={13} className="text-blue-500" />,
    STAGE_CHANGE: <Zap size={13} className="text-purple-500" />,
    ASSIGNMENT: <CheckCircle size={13} className="text-green-500" />,
    SYSTEM: <Zap size={13} className="text-gray-400" />,
  };

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
        {iconMap[activity.type] || <Zap size={12} className="text-gray-400" />}
      </div>
      <div className="flex-1 bg-white rounded-xl border border-gray-100 p-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-800">{activity.title}</p>
          <span className="text-xs text-gray-400">{timeAgo(activity.createdAt)}</span>
        </div>
        {activity.description && <p className="text-sm text-gray-600 mt-1">{activity.description}</p>}
        <p className="text-xs text-gray-400 mt-1">{activity.user?.name}</p>
      </div>
    </div>
  );
}
