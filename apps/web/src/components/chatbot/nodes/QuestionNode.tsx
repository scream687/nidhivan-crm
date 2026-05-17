'use client';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { HelpCircle } from 'lucide-react';

export function QuestionNode({ data, selected }: NodeProps) {
  const d = data as { text?: string; buttons?: string[] };
  return (
    <div className={`bg-purple-50 border-2 rounded-xl px-4 py-3 min-w-[200px] max-w-[260px] shadow-sm transition-shadow ${selected ? 'border-purple-500 shadow-md' : 'border-purple-200'}`}>
      <Handle type="target" position={Position.Top} className="!bg-purple-400 !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center flex-shrink-0">
          <HelpCircle className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Question</span>
      </div>
      <p className="text-sm text-purple-900 line-clamp-2 break-words mb-2">
        {d.text || <span className="italic text-purple-400">Enter question →</span>}
      </p>
      {(d.buttons ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(d.buttons ?? []).map((b, i) => (
            <span key={i} className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full border border-purple-200">
              {b}
            </span>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-purple-400 !w-3 !h-3" />
    </div>
  );
}
