'use client';

import React from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card } from '@/components/common/Card';
import { useLifeLens } from '@/lib/store';
import {
  AlertTriangle,
  Flame,
  ShieldCheck,
  Clock,
  ArrowRight,
  GitFork,
  CheckCircle,
} from 'lucide-react';
import { RiskBadge } from '@/components/common/Badge';
import { formatDate, formatRelativeTime } from '@/lib/utils';

export default function RiskCenterPage() {
  const { tasks, projects, risks, setSelectedTaskId } = useLifeLens();

  const taskRiskItems = tasks.map((task) => ({
    task,
    project: projects.find((p) => p.id === task.project_id),
    risk: risks[task.id],
  }));

  const criticalRisks = taskRiskItems.filter((i) => (i.risk?.risk_score || 0) >= 61);
  const mediumRisks = taskRiskItems.filter(
    (i) => (i.risk?.risk_score || 0) >= 31 && (i.risk?.risk_score || 0) < 61
  );
  const lowRisks = taskRiskItems.filter((i) => (i.risk?.risk_score || 0) < 31);

  const renderRiskCard = (item: (typeof taskRiskItems)[0]) => {
    const { task, project, risk } = item;
    if (!risk) return null;

    const isCritical = risk.risk_score >= 61;
    const isMedium = risk.risk_score >= 31 && risk.risk_score < 61;

    return (
      <Card
        key={task.id}
        glow={isCritical ? 'red' : isMedium ? 'amber' : 'emerald'}
        className="p-4 transition-all duration-200 hover:scale-[1.01]"
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <RiskBadge level={risk.risk_level} score={risk.risk_score} />
              <span className="text-[10px] font-mono text-slate-400">
                Project: {project?.name || 'Workspace'}
              </span>
            </div>

            <h3 className="text-base font-bold text-white tracking-tight">{task.title}</h3>

            {/* Why explanation */}
            <div className="mt-2 p-3 rounded-lg bg-black/40 border border-white/5 space-y-1 text-xs">
              <p className="text-slate-300">
                <span className="text-cyan-400 font-semibold font-mono uppercase text-[10px]">WHY: </span>
                {risk.why}
              </p>
              <p className="text-slate-300">
                <span className="text-amber-400 font-semibold font-mono uppercase text-[10px]">AFFECTED: </span>
                {risk.affected.length > 0
                  ? `${risk.affected.length} downstream tasks (${risk.affected.join(', ')})`
                  : 'Zero downstream dependencies.'}
              </p>
              <p className="text-slate-300">
                <span className="text-emerald-400 font-semibold font-mono uppercase text-[10px]">ACTION: </span>
                {risk.action}
              </p>
            </div>

            {/* Footer metrics */}
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Due {formatRelativeTime(task.deadline)}</span>
              </span>
              <span>•</span>
              <span>{task.estimated_hours}h estimated work</span>
              <span>•</span>
              <span className="text-slate-300">Assigned: {task.assigned_to}</span>
            </div>
          </div>

          {/* Action button */}
          <Link
            href="/life-map"
            onClick={() => setSelectedTaskId(task.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-cyan-300 hover:text-white transition-colors self-end sm:self-center flex-shrink-0"
          >
            <GitFork className="w-3.5 h-3.5 text-cyan-400" />
            <span>Inspect in Graph</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="pb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/30">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Risk Center</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic risk categorization based on remaining time ratios, dependency depth, and schedule collisions.
          </p>
        </div>

        {/* Section 1: Critical (61-100) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400" />
            <h2 className="text-sm font-bold text-red-400 uppercase tracking-wide">
              Critical Risks ({criticalRisks.length})
            </h2>
          </div>
          {criticalRisks.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No critical risks currently detected.</p>
          ) : (
            <div className="space-y-3">{criticalRisks.map(renderRiskCard)}</div>
          )}
        </div>

        {/* Section 2: Medium / Warning (31-60) */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wide">
              Elevated / Warning Risks ({mediumRisks.length})
            </h2>
          </div>
          {mediumRisks.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No elevated risks currently detected.</p>
          ) : (
            <div className="space-y-3">{mediumRisks.map(renderRiskCard)}</div>
          )}
        </div>

        {/* Section 3: Low / Healthy (0-30) */}
        <div className="space-y-3 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">
              Low / Healthy Risks ({lowRisks.length})
            </h2>
          </div>
          {lowRisks.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No healthy tasks currently recorded.</p>
          ) : (
            <div className="space-y-3">{lowRisks.map(renderRiskCard)}</div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
