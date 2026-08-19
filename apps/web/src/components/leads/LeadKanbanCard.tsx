"use client";
import { motion } from "framer-motion";
import { Flame, Phone, Clock, MapPin, Copy, Building } from "lucide-react";
import {
  cn,
  timeAgo,
  formatCurrency,
} from "@/lib/utils";
import { LEAD_SOURCE_LABELS } from "@nidhivan/shared";

interface Props {
  lead: any;
  onClick: () => void;
  isDragging?: boolean;
}

export function LeadKanbanCard({ lead, onClick, isDragging = false }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-3 bg-white rounded-lg border border-[#E5E7EB] hover:border-[#E04020]/40 transition-colors cursor-pointer group shadow-sm"
      onClick={(e) => {
        if (!isDragging) onClick();
      }}
    >
      {/* Top Header: Title + Priority */}
      <div className="flex items-start justify-between gap-1.5 mb-1.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {lead.isHot && (
              <Flame size={12} className="text-[#E04020] flex-shrink-0" />
            )}
            <p className="text-xs font-semibold text-[#111113] truncate">
              {lead.name}
            </p>
          </div>
          <span className="text-[10px] font-mono text-[#626B76]">
            {lead.leadNumber}
          </span>
        </div>

        {lead.leadScore > 0 && (
          <span
            className={cn(
              "text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full",
              lead.leadScore >= 70
                ? "bg-[#FDECE6] text-[#C02F12]"
                : lead.leadScore >= 40
                  ? "bg-white text-[#111113] border border-[#E5E7EB]"
                  : "bg-white text-[#5A6470] border border-[#E5E7EB]",
            )}
          >
            {lead.leadScore} pts
          </span>
        )}
      </div>

      {/* Contact & Location Info */}
      <div className="flex items-center gap-2 text-[11px] text-[#5A6470] mb-2">
        <span className="truncate">{lead.phone}</span>
        {lead.city && (
          <>
            <span className="text-[#E5E7EB]">·</span>
            <span className="truncate text-[#5A6470]">{lead.city}</span>
          </>
        )}
      </div>

      {/* Deal Value */}
      {lead.budget && (
        <div className="mb-2">
          <span className="inline-block px-2 py-0.5 rounded-full bg-[#C02F12] text-white text-xs font-mono font-bold tabular-nums">
            {formatCurrency(Number(lead.budget))}
          </span>
        </div>
      )}

      {/* Bottom Metadata Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6]">
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#5A6470] font-medium">
          {LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS] || lead.source}
        </span>

        <div className="flex items-center gap-1.5">
          {lead.assignedTo && (
            <div
              className="w-5 h-5 rounded-full bg-[#C02F12] text-white flex items-center justify-center text-[10px] font-bold"
              title={lead.assignedTo.name}
            >
              {lead.assignedTo.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="text-[10px] text-[#626B76] font-mono">
            {timeAgo(lead.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
