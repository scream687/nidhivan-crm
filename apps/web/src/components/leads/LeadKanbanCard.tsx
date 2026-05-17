'use client';
import { motion } from 'framer-motion';
import { Flame, Phone, Clock, MapPin } from 'lucide-react';
import { cn, STAGE_COLORS, SOURCE_COLORS, timeAgo, formatCurrency } from '@/lib/utils';
import { LEAD_SOURCE_LABELS } from '@nidhivan/shared';

interface Props {
  lead: any;
  onClick: () => void;
}

export function LeadKanbanCard({ lead, onClick }: Props) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -1 }}
      className="kanban-card group"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {lead.isHot && <Flame size={13} className="text-red-500 flex-shrink-0" />}
            <p className="text-sm font-semibold text-gray-900 truncate">{lead.name}</p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{lead.leadNumber}</p>
        </div>
        {lead.leadScore > 0 && (
          <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded-md flex-shrink-0',
            lead.leadScore >= 70 ? 'bg-green-100 text-green-700' :
            lead.leadScore >= 40 ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-600')}>
            {lead.leadScore}
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
        <Phone size={11} />
        <span>{lead.phone}</span>
        {lead.city && <><span>·</span><MapPin size={11} /><span className="truncate">{lead.city}</span></>}
      </div>

      {lead.budget && (
        <p className="text-xs text-blue-600 font-medium mb-2">{formatCurrency(Number(lead.budget))}</p>
      )}

      <div className="flex items-center justify-between">
        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', SOURCE_COLORS[lead.source as keyof typeof SOURCE_COLORS] || 'bg-gray-50 text-gray-500')}>
          {LEAD_SOURCE_LABELS[lead.source as keyof typeof LEAD_SOURCE_LABELS] || lead.source}
        </span>

        <div className="flex items-center gap-1.5">
          {lead.assignedTo && (
            <div className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 text-[10px] font-semibold"
              title={lead.assignedTo.name}>
              {lead.assignedTo.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <span className="text-xs text-gray-400 flex items-center gap-0.5">
            <Clock size={10} />{timeAgo(lead.createdAt)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
