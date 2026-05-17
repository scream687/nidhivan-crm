'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

export function ConditionNode({ data, selected }: NodeProps) {
  const d = data as { branches?: { keyword: string; label: string }[] };
  const branches = d.branches ?? [];
  return (
    <div className={`bg-amber-50 border-2 rounded-xl px-4 py-3 min-w-[200px] max-w-[260px] shadow-sm transition-shadow ${selected ? 'border-amber-500 shadow-md' : 'border-amber-300'}`}>
      <Handle type="target" position={Position.Top} className="!bg-amber-400 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
          <GitBranch className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Condition</span>
      </div>
      {branches.length > 0 ? (
        <div className="space-y-1">
          {branches.map((b, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-mono">{b.keyword}</span>
              <span className="text-[10px] text-amber-500">→ {b.label}</span>
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs text-amber-400 italic">Add branches in panel →</span>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-amber-400 !w-3 !h-3" />
    </div>
  );
}
