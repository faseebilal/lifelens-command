import React from 'react';
import { cn } from '@/lib/utils';
import { RiskLevel, TaskPriority, TaskStatus } from '@/types/database';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'cyan' | 'emerald' | 'amber' | 'red' | 'purple' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
  pulse = false,
}) => {
  const variantStyles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    cyan: 'bg-cyan-950/70 text-cyan-300 border-cyan-500/40 shadow-[0_0_10px_rgba(0,229,255,0.15)]',
    emerald: 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40',
    amber: 'bg-amber-950/70 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
    red: 'bg-red-950/70 text-red-300 border-red-500/50 shadow-[0_0_12px_rgba(239,68,68,0.25)]',
    purple: 'bg-purple-950/70 text-purple-300 border-purple-500/40',
    outline: 'bg-transparent text-slate-300 border-white/10',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-1 font-semibold',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border transition-colors',
        variantStyles[variant],
        sizeStyles[size],
        pulse && 'animate-pulse',
        className
      )}
    >
      {pulse && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
};

export const RiskBadge: React.FC<{ level: RiskLevel; score?: number; className?: string }> = ({
  level,
  score,
  className,
}) => {
  const variant =
    level === 'CRITICAL' ? 'red' : level === 'HIGH' ? 'red' : level === 'MEDIUM' ? 'amber' : 'emerald';
  const pulse = level === 'CRITICAL';

  return (
    <Badge variant={variant} pulse={pulse} className={className}>
      {level} {score !== undefined && `(${score})`}
    </Badge>
  );
};

export const StatusBadge: React.FC<{ status: TaskStatus; className?: string }> = ({
  status,
  className,
}) => {
  const map: Record<TaskStatus, { label: string; variant: BadgeProps['variant'] }> = {
    TODO: { label: 'To Do', variant: 'default' },
    IN_PROGRESS: { label: 'In Progress', variant: 'cyan' },
    BLOCKED: { label: 'Blocked', variant: 'red' },
    COMPLETED: { label: 'Completed', variant: 'emerald' },
  };

  const item = map[status] || { label: status, variant: 'default' };
  return (
    <Badge variant={item.variant} className={className}>
      {item.label}
    </Badge>
  );
};

export const PriorityBadge: React.FC<{ priority: TaskPriority; className?: string }> = ({
  priority,
  className,
}) => {
  const map: Record<TaskPriority, { label: string; variant: BadgeProps['variant'] }> = {
    LOW: { label: 'Low', variant: 'default' },
    MEDIUM: { label: 'Medium', variant: 'default' },
    HIGH: { label: 'High', variant: 'amber' },
    CRITICAL: { label: 'Critical', variant: 'red' },
  };

  const item = map[priority] || { label: priority, variant: 'default' };
  return (
    <Badge variant={item.variant} size="sm" className={className}>
      {item.label}
    </Badge>
  );
};
