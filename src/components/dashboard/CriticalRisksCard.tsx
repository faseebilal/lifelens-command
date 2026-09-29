'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/common/Card';
import { useLifeLens } from '@/lib/store';
import { AlertTriangle, Flame, ArrowRight, ShieldCheck } from 'lucide-react';
import { RiskBadge } from '@/components/common/Badge';
import { formatRelativeTime } from '@/lib/utils';

export const CriticalRisksCard: React.FC = () => {
  const { tasks, risks, setSelectedTaskId } = useLifeLens();

  const sortedTasks = [...tasks]
    .map((task) => ({ task, risk: risks[task.id] }))
    .filter((item) => item.risk && item.risk.risk_score >= 31)
    .sort((a, b) => (b.risk?.risk_score || 0) - (a.risk?.risk_score || 0))
    .slice(0, 4);

  return (
    <Card className="h-full">
      <CardHeader
        title="Critical & Elevated Risks"
        subtitle="Ranked by risk score, deadline proximity, and downstream blast radius"
        icon={<Flame className="w-5 h-5 text-red-400" />}
        action={
          <Link
            href="/risk-center"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            View All ({sortedTasks.length})
          </Link>
        }
      />

      {sortedTasks.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center text-slate-400">
          <ShieldCheck className="w-10 h-10 text-emerald-400/60 mb-2" />
          <p className="text-sm font-medium text-slate-300">All systems green</p>
          <p className="text-xs mt-1">No tasks currently exceed the risk threshold.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedTasks.map(({ task, risk }) => {
            if (!risk) return null;
            return (
              <Link
                key={task.id}
                href="/life-map"
                onClick={() => setSelectedTaskId(task.id)}
                className="group block p-3.5 rounded-xl bg-white/[0.02] border border-white/5 hover:border-red-500/40 hover:bg-red-950/20 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-white truncate group-hover:text-red-300 transition-colors">
                        {task.title}
                      </h4>
                      <RiskBadge level={risk.risk_level} score={risk.risk_score} />
                    </div>

                    <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                      {risk.why}
                    </p>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                      <span>Due {formatRelativeTime(task.deadline)}</span>
                      <span>•</span>
                      <span className="text-amber-300 font-medium">
                        {risk.downstream_tasks.length} downstream tasks affected
                      </span>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-red-400 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-1" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Card>
  );
};
