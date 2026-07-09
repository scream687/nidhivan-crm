'use client';
import { useRouter } from 'next/navigation';
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useLeadsStore } from '@/stores/leadsStore';
import { LeadKanbanCard } from './LeadKanbanCard';
import { cn, COLUMN_HEADER_COLORS } from '@/lib/utils';
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const targetCol = kanban.find((col) => col.stage === over.id || col.leads.some((l: any) => l.id === over.id));
    if (!targetCol) return;
    await changeStage(String(active.id), targetCol.stage);
  };

  return (
    <DndContext collisionDetection={closestCorners} onDragStart={(e) => setActiveId(String(e.active.id))} onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {kanban.map((col) => (
          <div key={col.stage} id={col.stage} className="kanban-column">
            <div className={cn('flex items-center justify-between mb-1 px-2 py-1.5 rounded-lg', COLUMN_HEADER_COLORS[col.stage] ?? 'bg-gray-50')}>
              <h3 className={cn('text-xs font-semibold uppercase tracking-wide',
                col.isWon ? 'text-green-600' : col.isLost ? 'text-red-400' : 'text-gray-500'
              )}
                style={col.color ? { color: col.color } : undefined}>
                {col.label || col.stage}
              </h3>
              <span className="bg-white/70 text-gray-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{col.count}</span>
            </div>

            <SortableContext items={col.leads.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2 min-h-[80px]">
                {col.leads.map((lead: any) => (
                  <SortableCard key={lead.id} lead={lead} onClick={() => router.push(`/leads/${lead.id}`)} />
                ))}
                {col.leads.length === 0 && (
                  <div className="h-16 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center">
                    <p className="text-xs text-gray-400">Drop here</p>
                  </div>
                )}
              </div>
            </SortableContext>
          </div>
        ))}
      </div>
    </DndContext>
  );
}
