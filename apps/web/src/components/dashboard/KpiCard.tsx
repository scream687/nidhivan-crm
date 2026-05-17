'use client';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Props {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'red' | 'orange' | 'purple';
  suffix?: string;
}

const colorMap = {
  blue: 'bg-blue-50 text-blue-600',
  green: 'bg-green-50 text-green-600',
  red: 'bg-red-50 text-red-600',
  orange: 'bg-orange-50 text-orange-600',
  purple: 'bg-purple-50 text-purple-600',
};

export function KpiCard({ title, value, icon, trend, color = 'blue', suffix }: Props) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl p-5 shadow-card border border-gray-100"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <motion.p
            key={String(value)}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold text-gray-900 mt-1"
          >
            {value}{suffix}
          </motion.p>
          {trend && (
            <p className={cn('text-xs mt-1', trend.value >= 0 ? 'text-green-600' : 'text-red-500')}>
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </p>
          )}
        </div>
        <div className={cn('p-2.5 rounded-lg', colorMap[color])}>
          {icon}
        </div>
      </div>
    </motion.div>
  );
}
