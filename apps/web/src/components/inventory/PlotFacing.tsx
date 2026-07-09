'use client';
import { cn } from '@/lib/utils';

const FACING_CONFIG: Record<string, { label: string; color: string; arrow: string }> = {
  NORTH: { label: 'North', color: 'bg-blue-100 text-blue-700 border-blue-200', arrow: '↑' },
  SOUTH: { label: 'South', color: 'bg-red-100 text-red-700 border-red-200', arrow: '↓' },
  EAST: { label: 'East', color: 'bg-green-100 text-green-700 border-green-200', arrow: '→' },
  WEST: { label: 'West', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', arrow: '←' },
  NORTHEAST: { label: 'N-E', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', arrow: '↗' },
  NORTHWEST: { label: 'N-W', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', arrow: '↖' },
  SOUTHEAST: { label: 'S-E', color: 'bg-teal-100 text-teal-700 border-teal-200', arrow: '↘' },
  SOUTHWEST: { label: 'S-W', color: 'bg-rose-100 text-rose-700 border-rose-200', arrow: '↙' },
};

// ponytail: CORNER/AVENUE treated as special facings — add more if project uses them
interface Props {
  facing: string;
  className?: string;
}

export default function PlotFacing({ facing, className }: Props) {
  const cfg = FACING_CONFIG[facing.toUpperCase()] ?? { label: facing, color: 'bg-gray-100 text-gray-600 border-gray-200', arrow: '•' };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap',
        cfg.color,
        className,
      )}
    >
      <span className="text-xs leading-none">{cfg.arrow}</span>
      {cfg.label}
    </span>
  );
}
