'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Building2, MapPin, Layers, CheckCircle2, ArrowRight, IndianRupee } from 'lucide-react';
import Link from 'next/link';

interface TownshipProject {
  id: string;
  name: string;
  location: string;
  type: string;
  totalPlots: number;
  availablePlots: number;
  startingPrice: string;
  ratePerSqYd: string;
  tag: string;
  tagColor: string;
}

const PROJECTS: TownshipProject[] = [
  {
    id: 'govardhan-greens',
    name: 'Govardhan Greens Township',
    location: 'NH-19, Mathura - Vrindavan Expressway',
    type: 'Gated Township Plots (100 - 500 Sq.Yd)',
    totalPlots: 120,
    availablePlots: 34,
    startingPrice: '₹22.5L',
    ratePerSqYd: '₹18,500/sq.yd',
    tag: 'Fast Selling',
    tagColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    id: 'vrindavan-heritage',
    name: 'Vrindavan Heritage Heights',
    location: 'Near Prem Mandir, Raman Reti',
    type: 'Luxury Villa Plots & Duplexes',
    totalPlots: 85,
    availablePlots: 18,
    startingPrice: '₹48.0L',
    ratePerSqYd: '₹28,000/sq.yd',
    tag: 'Premium Luxury',
    tagColor: 'bg-[#e8f2fe] text-[#0071e3] border-[#0071e3]/20',
  },
  {
    id: 'radha-rani-enclave',
    name: 'Radha Rani Enclave Phase 2',
    location: 'Barsana Road, Chhatikara Ring Road',
    type: 'Residential Plots with 40ft Roads',
    totalPlots: 160,
    availablePlots: 62,
    startingPrice: '₹16.8L',
    ratePerSqYd: '₹14,000/sq.yd',
    tag: 'New Launch',
    tagColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
];

export function TownshipShowcase() {
  return (
    <div className="space-y-3">
      {PROJECTS.map((p) => {
        const soldPercentage = Math.round(((p.totalPlots - p.availablePlots) / p.totalPlots) * 100);
        return (
          <div
            key={p.id}
            className="p-4 rounded-2xl border border-black/[0.08] bg-[#f5f5f7] hover:bg-white hover:border-black/20 hover:shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-[#1d1d1f] tracking-tight truncate">
                  {p.name}
                </h4>
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-semibold border ${p.tagColor}`}>
                  {p.tag}
                </span>
              </div>
              <p className="text-[11px] text-[#86868b] flex items-center gap-1 mt-0.5">
                <MapPin size={11} className="text-[#86868b]" />
                <span className="truncate">{p.location}</span>
              </p>

              {/* Progress bar */}
              <div className="flex items-center gap-3 mt-2.5">
                <div className="flex-1 h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0066cc] rounded-full"
                    style={{ width: `${soldPercentage}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono font-medium text-[#86868b]">
                  {soldPercentage}% Booked ({p.availablePlots} left)
                </span>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-black/[0.06]">
              <span className="text-xs font-bold text-[#1d1d1f] font-mono">
                From {p.startingPrice}
              </span>
              <span className="text-[10px] font-mono text-[#86868b]">
                {p.ratePerSqYd}
              </span>
              <Link
                href="/inventory"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0066cc] hover:underline mt-0.5"
              >
                <span>View Layout</span>
                <ArrowRight size={11} />
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
