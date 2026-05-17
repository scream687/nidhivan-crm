'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { CheckCircle2 } from 'lucide-react';

export function EndNode({ data, selected }: NodeProps) {
  const d = data as { text?: string };
  return (
    <div className={`bg-red-50 border-2 rounded-xl px-4 py-3 min-w-[160px] max-w-[240px] shadow-sm transition-shadow ${selected ? 'border-red-500 shadow-md' : 'border-red-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-red-400 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded-full bg-red-400 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-semibold text-red-600 uppercase tracking-wide">End</span>
      </div>
      {d.text ? (
        <p className="text-sm text-red-800 line-clamp-2 break-words">{d.text}</p>
      ) : (
        <span className="text-xs text-red-300 italic">Optional farewell →</span>
      )}
    </div>
  );
}
