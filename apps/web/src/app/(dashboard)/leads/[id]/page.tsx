"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useLeadsStore } from "@/stores/leadsStore";
import { cn, timeAgo } from "@/lib/utils";
import {
  LeadStage,
  LEAD_STAGE_LABELS,
  Role,
} from "@nidhivan/shared";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { useAuthStore } from "@/stores/authStore";
import {
  ArrowLeft, Phone, Flame, ChevronDown, Calendar,
} from "lucide-react";
import { ReassignDialog } from "@/components/leads/ReassignDialog";
import { ScheduleVisitModal } from "@/components/leads/ScheduleVisitModal";
import { RecordOutcomeModal } from "@/components/leads/RecordOutcomeModal";
import { DuplicateAlert } from "@/components/leads/DuplicateAlert";
import { FollowUpForm } from "@/components/follow-up/FollowUpForm";
import LeadTimeline from "@/components/communication/LeadTimeline";
import VoiceRecorder from "@/components/voice/VoiceRecorder";
import QuickActionsBar from "@/components/leads/QuickActionsBar";
import CustomerSummaryCard from "@/components/leads/CustomerSummaryCard";

const STAGE_COLORS: Record<string, { color: string; bgColor: string }> = {
  NEW: { color: "#6b7280", bgColor: "#f3f4f6" },
  ATTEMPTED: { color: "#ea580c", bgColor: "#fff7ed" },
  NOT_REACHABLE: { color: "#6b7280", bgColor: "#f3f4f6" },
  WRONG_NUMBER: { color: "#b91c1c", bgColor: "#fef2f2" },
  CONNECTED: { color: "#2563eb", bgColor: "#eff6ff" },
  INTERESTED: { color: "#7c3aed", bgColor: "#f5f3ff" },
  HOT: { color: "#dc2626", bgColor: "#fef2f2" },
  SITE_VISIT_SCHEDULED: { color: "#7c3aed", bgColor: "#f5f3ff" },
  SITE_VISIT_COMPLETED: { color: "#0d9488", bgColor: "#f0fdfa" },
  NEGOTIATION: { color: "#d97706", bgColor: "#fffbeb" },
  BOOKING_PENDING: { color: "#ca8a04", bgColor: "#fefce8" },
  LOAN_PROCESSING: { color: "#2563eb", bgColor: "#eff6ff" },
  DOCUMENTATION_PENDING: { color: "#a855f7", bgColor: "#f5f3ff" },
  PAYMENT_PENDING: { color: "#d97706", bgColor: "#fffbeb" },
  CLOSED_WON: { color: "#16a34a", bgColor: "#f0fdf4" },
  CLOSED_LOST: { color: "#9f1239", bgColor: "#fff1f2" },
  DUPLICATE: { color: "#ea580c", bgColor: "#fff7ed" },
  FUTURE_PROSPECT: { color: "#0891b2", bgColor: "#ecfeff" },
};

const stages = Object.values(LeadStage).map((name) => ({
  name,
  label: LEAD_STAGE_LABELS[name],
  ...(STAGE_COLORS[name] ?? { color: "#374151", bgColor: "#f3f4f6" }),
}));

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const { currentLead, isLoading, fetchLead, changeStage, toggleHot } = useLeadsStore();
  const router = useRouter();
  const [noteText, setNoteText] = useState("");
  const [showStageMenu, setShowStageMenu] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [outcomeVisitId, setOutcomeVisitId] = useState<string | null>(null);
  const [workspaceSummary, setWorkspaceSummary] = useState<any>(null);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [timelineKey, setTimelineKey] = useState(0);

  const isManager = user?.role === Role.ADMIN || user?.role === Role.MANAGER;

  const refreshWorkspace = useCallback(async () => {
    await Promise.all([fetchLead(id), loadWorkspace()]);
    setTimelineKey((k) => k + 1);
  }, [id]);

  useEffect(() => {
    fetchLead(id);
    loadWorkspace();
  }, [id]);

  async function loadWorkspace() {
    try {
      const { data } = await api.get(`/leads/${id}/workspace`);
      setWorkspaceSummary(data.summary);
    } catch {
      setWorkspaceSummary(null);
    }
  }

  async function addNote() {
    if (!noteText.trim()) return;
    await api.post(`/leads/${id}/notes`, { content: noteText });
    setNoteText("");
    refreshWorkspace();
    toast.success("Note added");
  }

  async function handleCall() {
    await api.post("/telephony/click-to-call", { leadId: id });
    toast.success("Initiating call…");
  }

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      switch (e.key.toLowerCase()) {
        case "n": addNote(); break;
        case "c": handleCall(); break;
        case "w": toast("WhatsApp coming soon"); break;
        case "t": setShowFollowUpForm(true); break;
        case "v": setShowScheduleModal(true); break;
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [id, noteText]);

  if (isLoading || !currentLead) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const lead = currentLead;

  return (
    <div className="flex flex-col h-screen">
      <DuplicateAlert leadId={lead.id} phone={lead.phone} onMergeComplete={() => fetchLead(lead.id)} />

      {/* Sticky header */}
      <div className="sticky top-0 z-10 px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 lg:gap-3">
            <button onClick={() => router.back()} aria-label="Back" className="text-gray-400 hover:text-gray-600">
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base lg:text-lg font-bold text-gray-900">{lead.name}</h1>
                {(lead as any).aiScore !== undefined && (lead as any).aiScore !== null ? (
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", (lead as any).aiScore >= 70 ? "bg-green-100 text-green-700" : (lead as any).aiScore >= 40 ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700")}>
                    AI {(lead as any).aiScore}
                  </span>
                ) : null}
                <button onClick={() => toggleHot(id, !lead.isHot)} aria-label={lead.isHot ? "Remove hot status" : "Mark as hot"} className={cn("transition", lead.isHot ? "text-red-500" : "text-gray-300 hover:text-red-400")}>
                  <Flame size={18} />
                </button>
              </div>
              <p className="text-xs text-gray-400">{lead.leadNumber} · Created {timeAgo(lead.createdAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              {(() => {
                const sc = stages.find((s) => s.name === lead.stage);
                return (
                  <button onClick={() => setShowStageMenu(!showStageMenu)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium"
                    style={sc ? { color: sc.color, backgroundColor: sc.bgColor } : { color: "#374151", backgroundColor: "#f3f4f6" }}>
                    {sc?.label || lead.stage}
                    <ChevronDown size={13} />
                  </button>
                );
              })()}
              {showStageMenu && (
                <div className="absolute right-0 top-9 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[200px]">
                  {stages.map((s) => (
                    <button key={s.name} onClick={async () => { await changeStage(id, s.name); setShowStageMenu(false); refreshWorkspace(); }}
                      className={cn("w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition flex items-center gap-2", s.name === lead.stage ? "font-semibold" : "")}>
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button onClick={handleCall} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm px-2.5 lg:px-3.5 py-1.5 rounded-lg transition font-medium">
              <Phone size={14} /><span className="hidden sm:inline">Call</span>
            </button>

            {isManager && (
              <button onClick={() => setShowScheduleModal(true)} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm px-2.5 lg:px-3.5 py-1.5 rounded-lg transition font-medium">
                <Calendar size={14} /><span className="hidden sm:inline">Schedule Visit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Quick Actions */}
      <div className="sticky top-[73px] z-10">
        <QuickActionsBar
          onCall={handleCall}
          onWhatsApp={() => toast("WhatsApp coming soon")}
          onTask={() => setShowFollowUpForm(true)}
          onVisit={() => setShowScheduleModal(true)}
          onBooking={() => {}}
        />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Timeline column */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="flex flex-col space-y-3 max-w-3xl">
            <div className="bg-white rounded-xl border border-gray-200 p-3">
              <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Quick note…" rows={1} className="w-full text-sm text-gray-700 resize-none focus:outline-none" />
              <div className="flex items-center justify-between mt-2">
                <VoiceRecorder leadId={id} onSuccess={refreshWorkspace} />
                <button onClick={addNote} className="text-xs bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition font-medium">Save Note</button>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 text-right -mt-2">N ↵ quick note · C call · T task · V visit</p>
            <div className="flex-1 rounded-xl border border-gray-100 bg-white">
              <LeadTimeline leadId={id} refreshKey={timelineKey} />
            </div>
          </div>
        </div>

        {/* Sticky Customer Summary sidebar */}
        <div className="hidden lg:block w-[30%] min-w-[280px] max-w-sm border-l border-gray-200 bg-white">
          <div className="sticky top-[123px] overflow-y-auto p-4 space-y-4 max-h-[calc(100vh-123px)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer Summary</p>
              <ReassignDialog leadId={lead.id} currentAssigneeId={lead.assignedToId} onSuccess={() => fetchLead(lead.id)} />
            </div>
            <CustomerSummaryCard lead={lead} healthScore={workspaceSummary?.healthScore} summary={workspaceSummary} />
          </div>
        </div>
      </div>

      {showScheduleModal && (
        <ScheduleVisitModal leadId={id} onClose={() => setShowScheduleModal(false)} onSuccess={() => { setShowScheduleModal(false); refreshWorkspace(); }} />
      )}
      {outcomeVisitId && (
        <RecordOutcomeModal leadId={id} visitId={outcomeVisitId} onClose={() => setOutcomeVisitId(null)} onSuccess={() => { setOutcomeVisitId(null); refreshWorkspace(); }} />
      )}
      {showFollowUpForm && (
        <FollowUpForm leadId={id} leadName={lead.name} onClose={() => setShowFollowUpForm(false)} onSuccess={() => { setShowFollowUpForm(false); refreshWorkspace(); }} />
      )}
    </div>
  );
}
