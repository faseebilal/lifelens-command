'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/common/Card';
import { useLifeLens } from '@/lib/store';
import { DependencyEngine } from '@/lib/dependency-engine';
import {
  GitFork,
  ArrowRight,
  Flame,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const ImpactPreviewCard: React.FC = () => {
  const { tasks, dependencies, risks, setSelectedTaskId } = useLifeLens();

  // Find the highest risk task with downstream dependents
  const depEngine = new DependencyEngine(tasks, dependencies);
  const tasksWithDownstream = tasks
    .filter((t) => depEngine.getDirectDownstream(t.id).length > 0)
    .sort((a, b) => (risks[b.id]?.risk_score || 0) - (risks[a.id]?.risk_score || 0));

  const rootTask = tasksWithDownstream[0] || tasks[0];
  if (!rootTask) return null;

  const rootRisk = risks[rootTask.id];
  const downstreamChain = depEngine.getAllDownstream(rootTask.id);

  const chainTasks = [
    { task: rootTask, isRoot: true },
    ...downstreamChain.map((d) => ({ task: d.task, isRoot: false })),
  ];

  return (
    <Card className="relative overflow-hidden">
      <CardHeader
        title="Cascading Impact Preview"
        subtitle="Live visualization of the active bottleneck and downstream dependency chain"
        icon={<GitFork className="w-5 h-5" />}
        action={
          <Link
            href="/life-map"
            className="flex items-center gap-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>Explore Life Map</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {/* Horizontal Chain Flow */}
      <div className="py-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max pb-2">
          {chainTasks.map((item, idx) => {
            const t = item.task;
            const r = risks[t.id];
            const isCritical = (r?.risk_score || 0) >= 61;
            const isWarning = (r?.risk_score || 0) >= 31 && (r?.risk_score || 0) < 61;
            const isCompleted = t.status === 'COMPLETED';

            let nodeStyle = 'border-slate-700 bg-slate-900/80 text-slate-300';
            let badgeBg = 'bg-slate-800 text-slate-400';

            if (isCompleted) {
              nodeStyle = 'border-emerald-500/40 bg-emerald-950/40 text-emerald-200';
              badgeBg = 'bg-emerald-950 text-emerald-400 border border-emerald-500/40';
            } else if (isCritical) {
              nodeStyle =
                'border-red-500/80 bg-red-950/70 text-red-200 ring-1 ring-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse';
              badgeBg = 'bg-red-900 text-red-300 border border-red-500/50';
            } else if (isWarning) {
              nodeStyle = 'border-amber-500/60 bg-amber-950/40 text-amber-200';
              badgeBg = 'bg-amber-900 text-amber-300 border border-amber-500/40';
            }

            return (
              <React.Fragment key={t.id}>
                <Link
                  href="/life-map"
                  onClick={() => setSelectedTaskId(t.id)}
                  className={cn(
                    'p-3 rounded-xl border transition-all hover:scale-105 active:scale-95 cursor-pointer max-w-[190px]',
                    nodeStyle
                  )}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-mono uppercase text-slate-400">
                      {item.isRoot ? 'BOTTLENECK' : `DEPENDENCY #${idx}`}
                    </span>
                    <span className={cn('text-[9px] font-mono px-1.5 py-0.5 rounded font-bold', badgeBg)}>
                      {r ? `RISK ${r.risk_score}` : '0'}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold truncate text-white">{t.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{t.assigned_to}</p>
                </Link>

                {idx < chainTasks.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Narrative callout */}
      {rootRisk && (
        <div className="mt-3 p-3 rounded-xl bg-slate-900/70 border border-white/5 text-xs text-slate-300 flex items-start gap-2.5">
          <Flame className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-semibold text-white">Impact Analysis: </span>
            {rootRisk.reason}
          </p>
        </div>
      )}
    </Card>
  );
};
