'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  FolderKanban,
  Clock,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useLifeLens } from '@/lib/store';

export const MetricsGrid: React.FC = () => {
  const { projects, tasks, risks, criticalRisksCount, mediumRisksCount } = useLifeLens();

  const activeProjectsCount = projects.filter((p) => p.status === 'ACTIVE').length;
  const tasksAtRiskCount = Object.values(risks).filter((r) => r.risk_score >= 31).length;

  const now = new Date();
  const upcomingDeadlinesCount = tasks.filter((t) => {
    if (t.status === 'COMPLETED') return false;
    const deadline = new Date(t.deadline);
    const diffHours = (deadline.getTime() - now.getTime()) / (1000 * 3600);
    return diffHours > 0 && diffHours <= 48;
  }).length;

  const metrics = [
    {
      label: 'Critical Risks',
      value: criticalRisksCount,
      sublabel: 'Immediate blockers detected',
      icon: Flame,
      color: 'red',
      glow: criticalRisksCount > 0 ? ('red' as const) : ('none' as const),
      href: '/risk-center',
      alert: criticalRisksCount > 0,
    },
    {
      label: 'Tasks At Risk',
      value: tasksAtRiskCount,
      sublabel: `${mediumRisksCount} warning, ${criticalRisksCount} critical`,
      icon: AlertTriangle,
      color: 'amber',
      glow: tasksAtRiskCount > 0 ? ('amber' as const) : ('none' as const),
      href: '/risk-center',
    },
    {
      label: 'Active Projects',
      value: activeProjectsCount,
      sublabel: `${tasks.length} total tasks tracked`,
      icon: FolderKanban,
      color: 'cyan',
      glow: 'none' as const,
      href: '/projects',
    },
    {
      label: 'Upcoming Deadlines',
      value: upcomingDeadlinesCount,
      sublabel: 'Due within next 48 hours',
      icon: Clock,
      color: 'emerald',
      glow: 'none' as const,
      href: '/calendar',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, idx) => {
        const Icon = m.icon;
        return (
          <Link key={idx} href={m.href} className="group">
            <Card
              glow={m.glow}
              className="h-full relative overflow-hidden transition-all duration-200 group-hover:border-cyan-500/40 group-hover:scale-[1.01]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-slate-400 block">{m.label}</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-bold tracking-tight text-white font-mono">{m.value}</span>
                    {m.alert && (
                      <span className="text-[10px] font-mono font-semibold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-500/30 animate-pulse">
                        ATTENTION
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{m.sublabel}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-colors">
                  <Icon className="w-5 h-5" />
                </div>
              </div>

              <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight className="w-4 h-4 text-cyan-400" />
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};
