'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { MessageSquare } from 'lucide-react';

export function MessageNode({ data, selected }: NodeProps) {
  const d = data as { text?: string };
  return (
    <div className={`bg-blue-50 border-2 rounded-xl px-4 py-3 min-w-[200px] max-w-[260px] shadow-sm transition-shadow ${selected ? 'border-blue-500 shadow-md' : 'border-blue-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Message</span>
      </div>
      <p className="text-sm text-blue-900 line-clamp-3 break-words">
        {d.text || <span className="italic text-blue-400">Enter message text →</span>}
      </p>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-3 !h-3" />
    </div>
  );
}
