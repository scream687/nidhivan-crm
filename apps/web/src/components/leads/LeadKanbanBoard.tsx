'use client';
import { useRouter } from 'next/navigation';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLeadsStore } from '@/stores/leadsStore';
import { LeadKanbanCard } from './LeadKanbanCard';
import { cn, formatCurrency } from '@/lib/utils';
import { motion } from 'framer-motion';
import { useState } from 'react';

function SortableCard({ lead, onClick }: { lead: any; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: lead.id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      {...attributes} {...listeners}>
      <LeadKanbanCard lead={lead} onClick={onClick} isDragging={isDragging} />
    </div>
  );
}

export function LeadKanbanBoard() {
  const { kanban, changeStage } = useLeadsStore();
  const router = useRouter();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [stampStage, setStampStage] = useState<string | null>(null);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const targetCol = kanban.find((col) => col.stage === over.id || col.leads.some((l: any) => l.id === over.id));
    if (!targetCol) return;
    await changeStage(String(active.id), targetCol.stage);
    setStampStage(targetCol.stage);
    window.setTimeout(() => setStampStage(null), 450);
  };

  return (
    <DndContext collisionDetection={closestCorners} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {kanban.map((col) => {
          const totalVal = col.leads.reduce((sum: number, l: any) => sum + (Number(l.budget) || 0), 0);
          const maxTotalVal = Math.max(...kanban.map((c: any) => c.leads.reduce((s: number, l: any) => s + (Number(l.budget) || 0), 0)));
          
          return (
            <div key={col.stage} id={col.stage} className="kanban-column">
              <div className="flex items-center justify-between pb-2 mb-1 border-b border-[#E5E7EB]/70 px-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-xs font-bold text-[#111113] uppercase tracking-wide font-mono">
                    {col.label || col.stage.replace(/_/g, ' ')}
                  </h3>
                  <div className="relative">
                    <span className="px-1.5 py-0.2 rounded bg-white border border-[#E5E7EB] text-[10px] font-mono text-[#5A6470] font-semibold">
                      {col.count}
                    </span>
                    {stampStage === col.stage && (
                      <motion.span
                        initial={{ scale: 0.2, opacity: 0.5 }}
                        animate={{ scale: 1.9, opacity: 0 }}
                        transition={{ duration: 0.45, ease: 'easeOut' }}
                        className="absolute inset-0 rounded bg-[#E04020]/25 pointer-events-none"
                      />
                    )}
                  </div>
                </div>
                {totalVal > 0 && (
                  <span className={cn(
                    'text-sm font-mono font-bold tabular-nums leading-none',
                    totalVal === maxTotalVal && maxTotalVal > 0 ? 'text-[#E04020]' : 'text-[#111113]',
                  )}>
                    {formatCurrency(totalVal)}
                  </span>
                )}
              </div>

              <SortableContext items={col.leads.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-2 min-h-[80px]">
                  {col.leads.map((lead: any) => (
                    <SortableCard key={lead.id} lead={lead} onClick={() => router.push(`/leads/${lead.id}`)} />
                  ))}
                  {col.leads.length === 0 && (
                    <div className="h-20 border border-dashed border-[#E5E7EB] rounded-lg flex items-center justify-center bg-[#F3F4F6]">
                      <p className="text-[11px] text-[#626B76] font-mono">No leads in stage</p>
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          );
        })}
      </div>
    </DndContext>
  );
}
