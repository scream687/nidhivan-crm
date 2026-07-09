"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  RefreshCw,
  Phone,
  MessageSquare,
  Mail,
  MapPin,
  Calendar,
  ChevronRight,
  Clock,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Zap,
  Target,
  Users,
  BarChart3,
  Layers,
  Star,
} from "lucide-react";
import api from "@/lib/api";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { FollowUpForm } from "@/components/follow-up/FollowUpForm";

interface LeadIntelligenceProps {
  leadId: string;
}

interface ScoreBreakdown {
  label: string;
  score: number;
  icon: React.ReactNode;
}

interface PropertyMatch {
  projectName: string;
  matchPercent: number;
  factors: string[];
}

interface FollowupSuggestion {
  type: "CALL" | "WHATSAPP" | "EMAIL" | "VISIT";
  message: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  timing: string;
}

export default function LeadIntelligence({ leadId }: LeadIntelligenceProps) {
  const [loading, setLoading] = useState(true);
  const [aiScore, setAiScore] = useState<number | null>(null);
  const [lastCalculated, setLastCalculated] = useState<string | null>(null);
  const [scoreBreakdown, setScoreBreakdown] = useState<ScoreBreakdown[]>([]);
  const [propertyMatches, setPropertyMatches] = useState<PropertyMatch[]>([]);
  const [followupSuggestion, setFollowupSuggestion] = useState<FollowupSuggestion | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [callSummary, setCallSummary] = useState<string | null>(null);
  const [callSentiment, setCallSentiment] = useState<string | null>(null);
  const [dealRisk, setDealRisk] = useState<{ risk: string; score: number; factors: string[]; recommendation: string } | null>(null);
  const [recalculating, setRecalculating] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  const loadAI = useCallback(async () => {
    setLoading(true);
    try {
      const [leadData, riskData] = await Promise.all([
        api.get(`/leads/${leadId}/ai`).catch(() => ({ data: {} })),
        api.get(`/ai/copilot/deal-risk/${leadId}`).catch(() => ({ data: null })),
      ]);

      const data = leadData.data;
      setAiScore(data.aiScore ?? null);
      setLastCalculated(data.lastCalculated ?? null);
      setScoreBreakdown(Array.isArray(data.scoreBreakdown) ? data.scoreBreakdown : []);
      setPropertyMatches(Array.isArray(data.propertyMatches) ? data.propertyMatches : []);
      setFollowupSuggestion(data.followupSuggestion ?? null);
      setTranscription(data.transcription ?? null);
      setCallSummary(data.summary ?? null);
      setCallSentiment(data.sentiment ?? null);
      setDealRisk(riskData.data);
    } catch {
      setAiScore(null);
      setScoreBreakdown([]);
      setPropertyMatches([]);
      setFollowupSuggestion(null);
      setTranscription(null);
      setCallSummary(null);
      setDealRisk(null);
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    loadAI();
  }, [loadAI]);

  async function handleRecalculate() {
    setRecalculating(true);
    try {
      const { data } = await api.post(`/leads/${leadId}/ai/score`);
      setAiScore(data.aiScore);
      setLastCalculated(data.lastCalculated ?? new Date().toISOString());
      setScoreBreakdown(
        Array.isArray(data.scoreBreakdown) ? data.scoreBreakdown : [],
      );
      toast.success("Score recalculated");
    } catch {
      toast.error("Could not recalculate score");
    } finally {
      setRecalculating(false);
    }
  }

  const scoreColor =
    aiScore !== null
      ? aiScore >= 70
        ? "text-green-500"
        : aiScore >= 40
          ? "text-yellow-500"
          : "text-red-500"
      : "text-gray-300";

  const scoreStroke =
    aiScore !== null
      ? aiScore >= 70
        ? "#22c55e"
        : aiScore >= 40
          ? "#eab308"
          : "#ef4444"
      : "#d1d5db";

  // SVG circular gauge — polar coordinates, (0, -R) start, clockwise
  const R = 50;
  const circumference = 2 * Math.PI * R;
  const offset =
    aiScore !== null
      ? circumference * (1 - aiScore / 100)
      : circumference;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* AI Score */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain size={16} className="text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-800">AI Score</h3>
          </div>
          <button
            onClick={handleRecalculate}
            disabled={recalculating}
            className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
          >
            <RefreshCw
              size={12}
              className={recalculating ? "animate-spin" : ""}
            />
            {recalculating ? "Calculating..." : "Recalculate Score"}
          </button>
        </div>

        <div className="flex items-start gap-6">
          {/* Gauge */}
          <div className="relative flex-shrink-0">
            <svg width="120" height="120" className="-rotate-90">
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke="#f3f4f6"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={scoreStroke}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-2xl font-bold ${scoreColor}`}>
                {aiScore !== null ? aiScore : "—"}
              </span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="flex-1 space-y-2.5 min-w-0">
            {scoreBreakdown.length === 0 && (
              <p className="text-xs text-gray-400 italic">
                No scoring data yet. Click "Recalculate Score" to analyze this
                lead.
              </p>
            )}
            {scoreBreakdown.map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1 text-gray-600">
                    {item.icon}
                    {item.label}
                  </span>
                  <span className="font-medium text-gray-700">
                    {item.score}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.score}%` }}
                    transition={{ duration: 0.6, delay: 0.1 }}
                    className={cn(
                      "h-full rounded-full",
                      item.score >= 70
                        ? "bg-green-400"
                        : item.score >= 40
                          ? "bg-yellow-400"
                          : "bg-red-400",
                    )}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {lastCalculated && (
          <p className="text-[10px] text-gray-400 mt-3">
            Last calculated: {new Date(lastCalculated).toLocaleString("en-IN")}
          </p>
        )}
      </div>

      {/* Property Match */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <MapPin size={15} className="text-blue-500" />
          <h3 className="text-sm font-semibold text-gray-800">
            Property Match
          </h3>
        </div>

        {propertyMatches.length === 0 ? (
          <p className="text-xs text-gray-400 italic">
            No property matches available yet.
          </p>
        ) : (
          <div className="space-y-3">
            {propertyMatches.map((match, i) => (
              <div key={i}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-gray-800">
                    {match.projectName}
                  </span>
                  <span className="text-xs font-semibold text-blue-600">
                    {match.matchPercent}% match
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-1.5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${match.matchPercent}%` }}
                    transition={{ duration: 0.6, delay: 0.1 * i }}
                    className="h-full rounded-full bg-blue-400"
                  />
                </div>
                <div className="flex flex-wrap gap-1">
                  {match.factors.map((f, j) => (
                    <span
                      key={j}
                      className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Follow-up Suggestion */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-gray-800">
              Follow-up Suggestion
            </h3>
          </div>
        </div>

        {followupSuggestion ? (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span
                className={cn(
                  "text-xs font-bold px-2 py-0.5 rounded-full",
                  followupSuggestion.priority === "HIGH"
                    ? "bg-red-100 text-red-700"
                    : followupSuggestion.priority === "MEDIUM"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-green-100 text-green-700",
                )}
              >
                {followupSuggestion.priority} PRIORITY
              </span>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Clock size={11} />
                {followupSuggestion.timing}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                {followupSuggestion.type === "CALL" ? (
                  <Phone size={14} className="text-amber-600" />
                ) : followupSuggestion.type === "WHATSAPP" ? (
                  <MessageSquare size={14} className="text-green-600" />
                ) : followupSuggestion.type === "EMAIL" ? (
                  <Mail size={14} className="text-blue-600" />
                ) : (
                  <MapPin size={14} className="text-purple-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  {followupSuggestion.type}
                </p>
                <p className="text-xs text-gray-600">
                  {followupSuggestion.message}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowFollowUpForm(true)}
              className="mt-3 w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition"
            >
              <Calendar size={13} />
              Schedule Follow-up
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <Sparkles size={24} className="mx-auto text-gray-200 mb-2" />
            <p className="text-xs text-gray-400">
              AI suggestion requires scoring data. Click "Recalculate Score"
              above first.
            </p>
          </div>
        )}
      </div>

      {/* Call Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={15} className="text-indigo-500" />
          <h3 className="text-sm font-semibold text-gray-800">Call Summary</h3>
          {callSentiment && (
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium',
              callSentiment === 'POSITIVE' ? 'bg-green-100 text-green-600' :
              callSentiment === 'NEGATIVE' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
            )}>{callSentiment}</span>
          )}
        </div>

        {callSummary ? (
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
            {callSummary}
          </div>
        ) : transcription ? (
          <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 leading-relaxed">
            {transcription}
          </div>
        ) : (
          <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="text-indigo-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-indigo-700 mb-1">
                  {callSummary === null ? 'No call history to summarize' : 'AI summary requires NVIDIA NIM API key'}
                </p>
                <p className="text-xs text-indigo-500">
                  {callSummary === null
                    ? 'Log a call with notes to see an AI-generated summary.'
                    : 'Configure via Settings > Integrations to enable AI summaries.'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Deal Risk Assessment */}
      {dealRisk && dealRisk.score > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertCircle size={15} className={cn(
                dealRisk.risk === 'HIGH' ? 'text-red-500' :
                dealRisk.risk === 'MEDIUM' ? 'text-amber-500' : 'text-green-500'
              )} />
              <h3 className="text-sm font-semibold text-gray-800">Deal Risk</h3>
            </div>
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-bold',
              dealRisk.risk === 'HIGH' ? 'bg-red-100 text-red-700' :
              dealRisk.risk === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
            )}>{dealRisk.risk}</span>
          </div>

          <div className="space-y-2 mb-3">
            {dealRisk.factors.map((f, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="text-red-400 mt-0.5">•</span> {f}
              </div>
            ))}
          </div>

          {dealRisk.recommendation && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
              <span className="font-medium">Recommendation:</span> {dealRisk.recommendation}
            </div>
          )}
        </div>
      )}

      {showFollowUpForm && (
        <FollowUpForm
          leadId={leadId}
          onClose={() => setShowFollowUpForm(false)}
          onSuccess={() => {
            setShowFollowUpForm(false);
            toast.success("Follow-up scheduled");
          }}
        />
      )}
    </div>
  );
}

function breakdownIcon(label: string): React.ReactNode {
  const iconMap: Record<string, React.ReactNode> = {
    "Budget Fit": <DollarSignIcon />,
    "Source Quality": <UsersIcon />,
    Engagement: <TrendingUpIcon />,
    Stage: <BarChart3Icon />,
    Time: <ClockIcon />,
    Priority: <TargetIcon />,
  };
  return iconMap[label] || <StarIcon />;
}

// Inline icon components to avoid importing extra icons
function DollarSignIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-green-500"
    >
      <line x1="12" x2="12" y1="2" y2="22" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function UsersIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-blue-500"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function TrendingUpIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-purple-500"
    >
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function BarChart3Icon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-orange-500"
    >
      <line x1="12" x2="12" y1="20" y2="10" />
      <line x1="18" x2="18" y1="20" y2="4" />
      <line x1="6" x2="6" y1="20" y2="16" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-cyan-500"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-red-500"
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-yellow-500"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}
