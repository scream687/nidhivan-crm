'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Bolt } from 'lucide-react';

const ACTION_LABELS: Record<string, string> = {
  ASSIGN_LEAD: 'Assign to Agent',
  CHANGE_STAGE: 'Change Lead Stage',
  NOTIFY_AGENT: 'Notify Agent',
};

export function ActionNode({ data, selected }: NodeProps) {
  const d = data as { actionType?: string; config?: Record<string, any> };
  return (
    <div className={`bg-gray-50 border-2 rounded-xl px-4 py-3 min-w-[180px] max-w-[240px] shadow-sm transition-shadow ${selected ? 'border-gray-500 shadow-md' : 'border-gray-300'}`}>
      <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
          <Bolt className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Action</span>
      </div>
      {d.actionType ? (
        <div>
          <span className="text-sm font-medium text-gray-800 block">{ACTION_LABELS[d.actionType] ?? d.actionType}</span>
          {d.config?.stage && <span className="text-xs text-gray-500 mt-0.5 block">→ {d.config.stage.replace(/_/g, ' ')}</span>}
        </div>
      ) : (
        <span className="text-xs text-gray-400 italic">Pick action in panel →</span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-3 !h-3" />
    </div>
  );
}
