import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glow?: 'cyan' | 'red' | 'amber' | 'emerald' | 'none';
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  glow = 'none',
  interactive = false,
  ...props
}) => {
  const glowStyles = {
    none: '',
    cyan: 'shadow-[0_0_20px_rgba(0,229,255,0.12)] border-cyan-500/30',
    red: 'shadow-[0_0_25px_rgba(239,68,68,0.2)] border-red-500/40',
    amber: 'shadow-[0_0_20px_rgba(245,158,11,0.15)] border-amber-500/35',
    emerald: 'shadow-[0_0_20px_rgba(16,185,129,0.15)] border-emerald-500/30',
  };

  return (
    <div
      className={cn(
        'glass-panel rounded-xl p-5 text-slate-100',
        glowStyles[glow],
        interactive && 'glass-panel-hover cursor-pointer active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, icon, className }) => {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-4', className)}>
      <div className="flex items-center gap-3">
        {icon && <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-cyan-400">{icon}</div>}
        <div>
          <h3 className="text-base font-semibold text-white tracking-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
};
