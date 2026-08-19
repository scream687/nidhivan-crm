'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from '@/components/magicui/AnimatedCounter';

interface Props {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'red' | 'orange' | 'purple';
  suffix?: string;
  sub?: React.ReactNode;
}

const colorMap = {
  blue: 'bg-[#FDECE6] text-[#E04020]',
  green: 'bg-[#E7F6EE] text-[#047857]',
  red: 'bg-[#FDECE6] text-[#E04020]',
  orange: 'bg-[#FDECE6] text-[#E04020]',
  purple: 'bg-[#F3F4F6] text-[#5A6470]',
};

export function KpiCard({ title, value, icon, trend, color = 'blue', suffix, sub }: Props) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl p-5 shadow-sm border border-[#E5E7EB]"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[11px] text-[#5A6470] font-semibold uppercase tracking-wider">{title}</p>
          {typeof value === 'number' ? (
            <AnimatedCounter
              value={value}
              suffix={suffix ?? ''}
              className="text-[26px] leading-none font-mono font-semibold tracking-tight tabular-nums text-[#111113] mt-2 block"
            />
          ) : (
            <p className="text-[26px] leading-none font-mono font-semibold tracking-tight tabular-nums text-[#111113] mt-2">
              {value}{suffix}
            </p>
          )}
          {trend && (
            <p className={cn('text-xs mt-2 flex items-center gap-1', trend.value >= 0 ? 'text-[#047857]' : 'text-[#626B76]')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
          {sub && <p className="text-xs mt-2 text-[#626B76] flex items-center gap-1">{sub}</p>}
        </div>
        <div className={cn('p-2.5 rounded-lg flex-shrink-0', colorMap[color])}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
