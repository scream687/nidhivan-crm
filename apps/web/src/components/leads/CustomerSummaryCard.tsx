"use client";
import { cn, timeAgo, formatCurrency } from "@/lib/utils";
import {
  LEAD_SOURCE_LABELS,
  LeadStage,
  LEAD_STAGE_LABELS,
} from "@nidhivan/shared";
import {
  Phone, Mail, MapPin, DollarSign, Clock, Hash, Briefcase, Tag, User, Target, Flame, AlertCircle, TrendingUp, CalendarDays, Activity,
} from "lucide-react";

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

interface Props {
  lead: any;
  healthScore?: { score: number; label: string; reasons: string[] };
  summary?: {
    leadAge?: number;
    daysInStage?: number;
    lastContactDays?: number | null;
    lastActivityAt?: string | null;
    conversionProbability?: number;
    pipelineValue?: number;
    overdueTasks?: number;
    openTasks?: number;
  };
}

export default function CustomerSummaryCard({ lead, healthScore, summary }: Props) {
  return (
    <div className="space-y-3">
      <HealthBadge healthScore={healthScore} />

      {summary && <InsightsSection summary={summary} />}

      <Section title="Contact">
        <Row icon={<Phone size={12} />} label={lead.phone} />
        {lead.altPhone && <Row icon={<Phone size={12} />} label={lead.altPhone} />}
        {lead.email && <Row icon={<Mail size={12} />} label={lead.email} />}
        {lead.city && <Row icon={<MapPin size={12} />} label={`${lead.city}${lead.state ? `, ${lead.state}` : ""}`} />}
      </Section>

      {lead.occupation && (
        <Section title="Occupation">
          <Row icon={<Briefcase size={12} />} label={lead.occupation} />
        </Section>
      )}

      <Section title="Lead Info">
        <Row icon={<Target size={12} />} label={lead.projectInterest || "—"} />
        <Row icon={<DollarSign size={12} />} label={lead.budget ? formatCurrency(Number(lead.budget)) : "—"} />
        <Row icon={<Hash size={12} />} label={LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS] || lead.source} />
        {lead.investmentPurpose && <Row icon={<Tag size={12} />} label={lead.investmentPurpose.replace("_", " ")} />}
      </Section>

      {(lead.assignedTo || lead.nextFollowUpAt) && (
        <Section title="Assignment">
          <Row icon={<User size={12} />} label={lead.assignedTo?.name || "Unassigned"} />
          {lead.nextFollowUpAt && <Row icon={<Clock size={12} />} label={`Follow-up: ${new Date(lead.nextFollowUpAt).toLocaleDateString("en-IN")}`} />}
        </Section>
      )}

      {lead.tags?.length > 0 && (
        <Section title="Tags">
          <div className="flex flex-wrap gap-1">
            {lead.tags.map((t: string) => (
              <span key={t} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full">{t}</span>
            ))}
          </div>
        </Section>
      )}

      <Section title="Stage History">
        {[LeadStage.NEW, LeadStage.CONNECTED, LeadStage.INTERESTED, LeadStage.SITE_VISIT_SCHEDULED, LeadStage.NEGOTIATION, LeadStage.CLOSED_WON].map((s) => {
          const colors = STAGE_COLORS[s] ?? { color: "#374151", bgColor: "#f3f4f6" };
          return (
            <div key={s} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors.color }} />
              <span className={cn("text-[11px]", lead.stage === s ? "font-semibold text-gray-900" : "text-gray-400")}>
                {LEAD_STAGE_LABELS[s]}
              </span>
            </div>
          );
        })}
      </Section>
    </div>
  );
}

function InsightsSection({ summary }: { summary: NonNullable<Props["summary"]> }) {
  const insights: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <CalendarDays size={11} />, label: "Lead Age", value: `${summary.leadAge ?? "—"} days` },
    { icon: <Activity size={11} />, label: "Last Contact", value: summary.lastActivityAt ? timeAgo(summary.lastActivityAt) : "Never" },
    { icon: <Clock size={11} />, label: "Days in Stage", value: `${summary.daysInStage ?? "—"}` },
    { icon: <TrendingUp size={11} />, label: "Conversion Probability", value: `${summary.conversionProbability ?? "—"}%` },
    { icon: <DollarSign size={11} />, label: "Pipeline Value", value: summary.pipelineValue ? formatCurrency(summary.pipelineValue) : "—" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {insights.map((ins) => (
        <div key={ins.label} className="bg-gray-50 rounded-lg p-2 space-y-0.5">
          <div className="flex items-center gap-1 text-gray-400">
            {ins.icon}
            <span className="text-[9px] uppercase tracking-wide font-semibold">{ins.label}</span>
          </div>
          <p className="text-xs font-semibold text-gray-800">{ins.value}</p>
        </div>
      ))}
    </div>
  );
}

function HealthBadge({ healthScore }: { healthScore?: { score: number; label: string; reasons: string[] } }) {
  if (!healthScore) return null;
  const colorMap: Record<string, string> = {
    Healthy: "bg-green-50 border-green-200 text-green-700",
    "Needs Attention": "bg-yellow-50 border-yellow-200 text-yellow-700",
    "At Risk": "bg-red-50 border-red-200 text-red-700",
  };
  return (
    <div className={cn("border rounded-lg p-3 space-y-1.5", colorMap[healthScore.label] || "bg-gray-50 border-gray-200")}>
      <div className="flex items-center gap-1.5">
        <Flame size={14} />
        <span className="text-xs font-bold">{healthScore.label}</span>
        <span className="text-[10px] opacity-70">{healthScore.score}/100</span>
      </div>
      {healthScore.reasons.length > 0 && (
        <div className="space-y-0.5">
          {healthScore.reasons.map((r, i) => (
            <p key={i} className="text-[10px] flex items-start gap-1">
              <AlertCircle size={9} className="mt-0.5 flex-shrink-0" />
              {r}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      {icon && <span className="text-gray-400 flex-shrink-0">{icon}</span>}
      <span className="text-xs text-gray-700 truncate">{label}</span>
    </div>
  );
}
