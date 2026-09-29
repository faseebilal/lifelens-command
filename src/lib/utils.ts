import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | Date | undefined): string {
  if (!dateString) return 'No date';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'Invalid date';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export function formatRelativeTime(dateString: string | Date | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (diffHours < 0) {
    const overdueHours = Math.abs(diffHours);
    if (overdueHours < 24) return `${Math.round(overdueHours)}h overdue`;
    return `${Math.round(overdueHours / 24)}d overdue`;
  }
  if (diffHours < 1) return `in ${Math.round(diffHours * 60)} mins`;
  if (diffHours < 24) return `in ${Math.round(diffHours)} hrs`;
  return `in ${Math.round(diffHours / 24)} days`;
}

export function getRiskColorClass(score: number): {
  text: string;
  bg: string;
  border: string;
  badge: string;
  glow: string;
} {
  if (score >= 61) {
    return {
      text: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      badge: 'bg-red-500/20 text-red-300 border-red-500/40',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.35)]',
    };
  }
  if (score >= 31) {
    return {
      text: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
    };
  }
  return {
    text: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    glow: 'shadow-[0_0_15px_rgba(16,185,129,0.25)]',
  };
}
