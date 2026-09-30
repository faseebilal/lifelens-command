'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  X,
  Clock,
  Calendar,
  AlertTriangle,
  ArrowDown,
  ShieldCheck,
  Flame,
  Plus,
  Trash2,
  SlidersHorizontal,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useLifeLens } from '@/lib/store';
import { DependencyEngine } from '@/lib/dependency-engine';
import { formatDate, formatRelativeTime } from '@/lib/utils';
import { RiskBadge, StatusBadge, PriorityBadge } from '@/components/common/Badge';

interface NodeDetailDrawerProps {
  taskId: string;
  onClose: () => void;
}

export const NodeDetailDrawer: React.FC<NodeDetailDrawerProps> = ({ taskId, onClose }) => {
  const { tasks, dependencies, risks, createDependency, deleteDependency } = useLifeLens();
  const [newTargetTaskId, setNewTargetTaskId] = useState('');
  const [depError, setDepError] = useState('');

  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const risk = risks[taskId];
  const depEngine = new DependencyEngine(tasks, dependencies);
  const upstream = depEngine.getDirectUpstream(taskId);
  const downstream = depEngine.getDirectDownstream(taskId);
  const allDownstream = depEngine.getAllDownstream(taskId);

  // Available tasks to add as dependency target (this task -> target)
  const existingTargetIds = new Set(
    dependencies.filter((d) => d.source_task_id === taskId).map((d) => d.target_task_id)
  );
  const availableTargetTasks = tasks.filter(
    (t) => t.id !== taskId && !existingTargetIds.has(t.id)
  );

  const handleAddDependency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTargetTaskId) return;
    const res = await createDependency(taskId, newTargetTaskId);
    if (!res.success) {
      setDepError(res.error || 'Failed to add dependency');
    } else {
      setDepError('');
      setNewTargetTaskId('');
    }
  };

  const handleDeleteDep = async (depId: string) => {
    await deleteDependency(depId);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-80 md:w-96 bg-slate-900/95 backdrop-blur-xl border-l border-white/10 flex flex-col h-full overflow-y-auto p-5 select-none animate-in slide-in-from-right duration-200 shadow-2xl">
      {/* Header */}
      <div className="flex items-start justify-between pb-4 border-b border-white/10">
        <div>
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider block">
            TASK TELEMETRY INSPECTOR
          </span>
          <h3 className="text-base font-bold text-white mt-1 leading-snug">{task.title}</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="py-4 space-y-5">
        {/* Core Badges & Risk Score */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Risk Assessment:</span>
            {risk && <RiskBadge level={risk.risk_level} score={risk.risk_score} />}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Status</span>
              <StatusBadge status={task.status} className="mt-0.5" />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 block">Priority</span>
              <PriorityBadge priority={task.priority} className="mt-0.5" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-300 pt-2 border-t border-white/5">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>{task.estimated_hours}h estimated</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{formatRelativeTime(task.deadline)}</span>
            </span>
          </div>
        </div>

        {/* Transparent Risk Engine Breakdown */}
        {risk && (
          <div className="space-y-2">
            <span className="text-xs font-mono text-slate-300 uppercase tracking-wide block">
              RISK ENGINE EXPLANATION
            </span>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 space-y-2 text-xs">
              <div>
                <span className="text-[10px] text-cyan-400 font-mono uppercase block font-semibold">WHY</span>
                <p className="text-slate-300 mt-0.5 leading-relaxed">{risk.why}</p>
              </div>

              <div>
                <span className="text-[10px] text-amber-400 font-mono uppercase block font-semibold">
                  AFFECTED DOWNSTREAM
                </span>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  {risk.affected.length > 0 ? risk.affected.join(', ') : 'No downstream dependencies affected.'}
                </p>
              </div>

              <div>
                <span className="text-[10px] text-emerald-400 font-mono uppercase block font-semibold">
                  ACTION PLAN
                </span>
                <p className="text-slate-300 mt-0.5 leading-relaxed">{risk.action}</p>
              </div>
            </div>
          </div>
        )}

        {/* Visual Cascading Chain: THIS TASK -> AFFECTS -> DOWNSTREAM TASKS */}
        <div className="p-3.5 rounded-xl bg-gradient-to-b from-red-950/20 to-amber-950/10 border border-red-500/30 space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-red-300 uppercase tracking-wide">
            <Flame className="w-3.5 h-3.5 text-red-400" />
            <span>CASCADING DEPENDENCY CHAIN</span>
          </div>

          <div className="space-y-1.5 text-xs">
            <div className="p-2 rounded-lg bg-white/5 border border-cyan-500/40 text-cyan-300 font-semibold flex items-center justify-between">
              <span>{task.title}</span>
              <span className="text-[10px] font-mono text-cyan-400">THIS TASK</span>
            </div>

            <div className="flex justify-center text-slate-400 py-0.5">
              <ArrowDown className="w-4 h-4 text-amber-400 animate-bounce" />
            </div>

            {allDownstream.length === 0 ? (
              <p className="text-[11px] text-slate-400 text-center italic py-1">
                Terminal task. No downstream tasks depend on this.
              </p>
            ) : (
              <div className="space-y-1">
                {allDownstream.map(({ task: dTask, depth }) => {
                  const dRisk = risks[dTask.id];
                  return (
                    <div
                      key={dTask.id}
                      className="p-2 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">+{depth}</span>
                        <span className="text-slate-200 font-medium">{dTask.title}</span>
                      </div>
                      {dRisk && <RiskBadge level={dRisk.risk_level} score={dRisk.risk_score} />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Simulation Shortcut */}
        <Link
          href={`/what-if`}
          className="flex items-center justify-center gap-2 w-full p-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Simulate Delay in What-If Mode</span>
        </Link>

        {/* Dependency Management: Add Edge */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <span className="text-xs font-mono text-slate-300 uppercase tracking-wide block">
            MANAGE GRAPH DEPENDENCY
          </span>

          <form onSubmit={handleAddDependency} className="space-y-2">
            <select
              value={newTargetTaskId}
              onChange={(e) => setNewTargetTaskId(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="">+ Connect downstream successor...</option>
              {availableTargetTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>

            {depError && <p className="text-[11px] text-red-400">{depError}</p>}

            <button
              type="submit"
              disabled={!newTargetTaskId}
              className="w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/15 disabled:opacity-40 text-xs font-medium text-slate-200 transition-colors"
            >
              Add Dependency Edge
            </button>
          </form>

          {/* Existing Outgoing Dependencies */}
          {downstream.length > 0 && (
            <div className="space-y-1 pt-2">
              <span className="text-[10px] text-slate-400 block uppercase">Existing Connections:</span>
              {dependencies
                .filter((d) => d.source_task_id === taskId)
                .map((dep) => {
                  const target = tasks.find((t) => t.id === dep.target_task_id);
                  if (!target) return null;
                  return (
                    <div
                      key={dep.id}
                      className="flex items-center justify-between p-1.5 rounded bg-white/[0.02] border border-white/5 text-xs text-slate-300"
                    >
                      <span className="truncate pr-2">Blocks: {target.title}</span>
                      <button
                        onClick={() => handleDeleteDep(dep.id)}
                        className="text-slate-500 hover:text-red-400 p-1"
                        title="Delete dependency edge"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
