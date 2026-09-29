'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader } from '@/components/common/Card';
import { useLifeLens } from '@/lib/store';
import { FolderKanban, ShieldCheck, AlertTriangle, ChevronRight, Activity } from 'lucide-react';
import { formatDate } from '@/lib/utils';

export const ProjectHealthCard: React.FC = () => {
  const { projects, tasks, projectHealth, overallRiskScore, criticalRisksCount } = useLifeLens();
  const currentProject = projects[0];

  if (!currentProject) {
    return (
      <Card className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
        <FolderKanban className="w-8 h-8 text-slate-600 mb-2 opacity-60" />
        <p className="text-sm font-semibold text-slate-300">No Active Project</p>
        <p className="text-xs text-slate-500 mt-1">Create a project to track health indices and completion velocity.</p>
        <Link
          href="/projects"
          className="mt-4 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold"
        >
          + Add Project
        </Link>
      </Card>
    );
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <Card className="h-full flex flex-col justify-between">
      <div>
        <CardHeader
          title={currentProject.name}
          subtitle="Core 36h Hackathon Objective"
          icon={<FolderKanban className="w-5 h-5 text-cyan-400" />}
          action={
            <Link
              href="/projects"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              <span>Manage</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        />

        <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mb-4">
          {currentProject.description}
        </p>

        {/* Health Index Meter */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Project Health Index:</span>
            </span>
            <span
              className={`font-mono font-bold ${
                projectHealth >= 75
                  ? 'text-emerald-400'
                  : projectHealth >= 50
                  ? 'text-amber-400'
                  : 'text-red-400 animate-pulse'
              }`}
            >
              {projectHealth}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                projectHealth >= 75
                  ? 'bg-gradient-to-r from-cyan-500 to-emerald-400'
                  : projectHealth >= 50
                  ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                  : 'bg-gradient-to-r from-red-600 to-red-400'
              }`}
              style={{ width: `${projectHealth}%` }}
            />
          </div>
        </div>

        {/* Task Completion Progress */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Execution Progress:</span>
            <span className="font-mono text-white">
              {completedTasks}/{totalTasks} tasks ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-cyan-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Meta Footer */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
        <div>
          <span className="block text-[10px] uppercase font-mono text-slate-500">FINAL SUBMISSION</span>
          <span className="text-slate-200 font-medium">{formatDate(currentProject.deadline)}</span>
        </div>

        <div className="text-right">
          <span className="block text-[10px] uppercase font-mono text-slate-500">BLAST RADIUS</span>
          <span className="text-red-400 font-semibold">{criticalRisksCount} critical bottlenecks</span>
        </div>
      </div>
    </Card>
  );
};
