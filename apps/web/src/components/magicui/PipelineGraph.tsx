'use client';
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, ArrowUpRight } from 'lucide-react';

interface PipelineDataPoint {
  stage: string;
  count: number;
  revenue: number;
  conversion: string;
}

interface PipelineGraphProps {
  data?: PipelineDataPoint[];
}

const DEFAULT_REAL_ESTATE_PIPELINE: PipelineDataPoint[] = [
  { stage: 'Inquiries', count: 48, revenue: 12000000, conversion: '100%' },
  { stage: 'Connected', count: 34, revenue: 9500000, conversion: '71%' },
  { stage: 'Site Visits', count: 21, revenue: 6800000, conversion: '44%' },
  { stage: 'Negotiation', count: 12, revenue: 4200000, conversion: '25%' },
  { stage: 'Token Locked', count: 7, revenue: 2600000, conversion: '15%' },
  { stage: 'Registry Won', count: 4, revenue: 1500000, conversion: '8.3%' },
];

export function PipelineGraph({ data }: PipelineGraphProps) {
  const chartData = data && data.length > 0 && data.some((d) => d.count > 0)
    ? data
    : DEFAULT_REAL_ESTATE_PIPELINE;

  return (
    <div className="space-y-4">
      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-black/[0.06]">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#86868b]">
            Total Pipeline Deals
          </span>
          <p className="text-base font-bold text-[#1d1d1f] font-mono mt-0.5">
            {chartData.reduce((acc, curr) => acc + curr.count, 0)} Units
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-black/[0.06]">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#86868b]">
            Weighted Gross Value
          </span>
          <p className="text-base font-bold text-[#0066cc] font-mono mt-0.5">
            ₹{(chartData.reduce((acc, curr) => acc + curr.revenue, 0) / 100000).toFixed(1)}L
          </p>
        </div>
        <div className="p-3.5 rounded-2xl bg-[#f5f5f7] border border-black/[0.06]">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-[#86868b]">
            Funnel Velocity
          </span>
          <p className="text-base font-bold text-[#1d1d1f] font-mono mt-0.5">
            18.4 Days Avg
          </p>
        </div>
      </div>

      {/* Interactive Glowing Area Chart */}
      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="appleBlueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0066cc" stopOpacity={0.28} />
                <stop offset="95%" stopColor="#0066cc" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="stage"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: '#86868b', fontWeight: 500 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#86868b' }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  const p = payload[0].payload as PipelineDataPoint;
                  return (
                    <div className="rounded-2xl border border-black/[0.08] bg-white/95 backdrop-blur-xl p-3.5 shadow-xl text-xs space-y-1">
                      <p className="font-bold text-[#1d1d1f]">{label}</p>
                      <p className="text-[#0066cc] font-mono font-semibold">
                        {p.count} Active Leads ({p.conversion} pass-rate)
                      </p>
                      <p className="text-[#86868b] font-mono text-[11px]">
                        Pipeline Value: ₹{(p.revenue / 100000).toFixed(1)} Lakhs
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#0066cc"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#appleBlueGradient)"
              dot={{ r: 3, fill: '#0066cc', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 5, fill: '#0066cc', strokeWidth: 2, stroke: '#ffffff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Stage conversion chips */}
      <div className="flex items-center justify-between gap-1.5 overflow-x-auto pt-1 pb-1">
        {chartData.map((s) => (
          <div
            key={s.stage}
            className="flex-1 min-w-[70px] text-center p-2 rounded-xl bg-[#f5f5f7] border border-black/[0.04]"
          >
            <p className="text-[10px] text-[#86868b] uppercase font-semibold truncate">{s.stage}</p>
            <p className="text-xs font-bold text-[#1d1d1f] font-mono mt-0.5">{s.count}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
