'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Zap } from 'lucide-react';

const MATCH_LABELS: Record<string, string> = {
  CONTAINS: 'contains',
  EXACT: 'exact match',
  STARTS_WITH: 'starts with',
};

export function TriggerNode({ data, selected }: NodeProps) {
  const d = data as { keyword?: string; matchType?: string; label?: string };
  return (
    <div className={`bg-green-50 border-2 rounded-xl px-4 py-3 min-w-[180px] shadow-sm transition-shadow ${selected ? 'border-green-500 shadow-md' : 'border-green-300'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
          <Zap className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">Trigger</span>
      </div>
      {d.keyword ? (
        <div>
          <code className="text-sm font-bold text-green-900 block">&quot;{d.keyword}&quot;</code>
          <span className="text-[10px] text-green-600 mt-0.5 block">{MATCH_LABELS[d.matchType ?? 'CONTAINS']}</span>
        </div>
      ) : (
        <span className="text-xs text-green-500 italic">Set keyword in panel →</span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />
    </div>
  );
}
