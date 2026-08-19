'use client';
import React, { useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SpotlightProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  fill?: string;
}

export function Spotlight({ className, fill = '#0071e3' }: SpotlightProps) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute -top-40 left-0 right-0 h-[500px] w-full overflow-hidden opacity-30 blur-[100px]',
        className
      )}
      style={{
        background: `radial-gradient(ellipse 60% 50% at 50% 0%, ${fill} 0%, transparent 80%)`,
      }}
    />
  );
}

export function GlowCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: -1000, y: -1000 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function handleMouseLeave() {
    setMousePos({ x: -1000, y: -1000 });
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'relative rounded-2xl border border-black/[0.08] bg-white/90 backdrop-blur-xl p-5 shadow-xs transition-all duration-300 hover:shadow-md hover:border-black/15 overflow-hidden group',
        className
      )}
      {...props}
    >
      {/* Dynamic Cursor Spotlight Effect */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{
          background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(0, 113, 227, 0.06), transparent 40%)`,
        }}
      />
      {/* Specular Rim Top Highlight */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent" />
      {children}
    </div>
  );
}
