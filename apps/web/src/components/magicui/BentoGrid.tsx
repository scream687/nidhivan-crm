'use client';
import React, { ReactNode } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlowCard } from '@/components/magicui/Spotlight';

interface BentoGridProps {
  children: ReactNode;
  className?: string;
}

interface BentoCardProps {
  name: string;
  className?: string;
  background?: ReactNode;
  Icon?: React.ElementType;
  description: string;
  href?: string;
  cta?: string;
  badge?: string;
  badgeColor?: string;
  children?: ReactNode;
}

export function BentoGrid({ children, className }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid w-full auto-rows-[22rem] grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
        className
      )}
    >
      {children}
    </div>
  );
}

export function BentoCard({
  name,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  badge,
  badgeColor = 'bg-[#e8f2fe] text-[#0071e3] border-[#0071e3]/20',
  children,
}: BentoCardProps) {
  return (
    <GlowCard
      className={cn(
        'group relative flex flex-col justify-between overflow-hidden',
        className
      )}
    >
      {/* Background visual or interactive graphic */}
      {background && (
        <div className="absolute inset-0 z-0 overflow-hidden opacity-80 transition-transform duration-500 group-hover:scale-105">
          {background}
        </div>
      )}

      {/* Top Header */}
      <div className="relative z-10 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-8 h-8 rounded-xl bg-[#0071e3]/10 text-[#0071e3] border border-[#0071e3]/20 flex items-center justify-center flex-shrink-0">
              <Icon size={16} />
            </div>
          )}
          <h3 className="text-sm font-bold text-[#1d1d1f] tracking-tight truncate">
            {name}
          </h3>
        </div>
        {badge && (
          <span
            className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
              badgeColor
            )}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Main Body Slot */}
      {children && <div className="relative z-10 flex-1 my-3 min-h-0">{children}</div>}

      {/* Bottom Footer Description & CTA */}
      <div className="relative z-10 pt-3 border-t border-black/[0.06] flex items-center justify-between">
        <p className="text-xs text-[#86868b] line-clamp-1 flex-1 pr-2">
          {description}
        </p>
        {cta && href && (
          <a
            href={href}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0071e3] hover:underline flex-shrink-0"
          >
            <span>{cta}</span>
            <ArrowRightIcon size={12} />
          </a>
        )}
      </div>
    </GlowCard>
  );
}
