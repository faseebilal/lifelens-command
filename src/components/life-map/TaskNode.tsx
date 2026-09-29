'use client';

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Task, RiskAnalysis } from '@/types/database';
import { Clock, User, AlertTriangle, ShieldCheck, Flame } from 'lucide-react';
import { cn, formatRelativeTime } from '@/lib/utils';

export interface TaskNodeData extends Record<string, unknown> {
  task: Task;
  risk?: RiskAnalysis;
  isSelected?: boolean;
  isUpstream?: boolean;
  isDownstream?: boolean;
}

export const TaskNode = memo((props: any) => {
  const data = props.data as TaskNodeData;
  const { task, risk, isSelected, isUpstream, isDownstream } = data;
  const riskScore = risk?.risk_score ?? 0;

  // Determine node theme based on risk score and status
  const isCompleted = task.status === 'COMPLETED';
  const isCritical = riskScore >= 61;
  const isWarning = riskScore >= 31 && riskScore < 61;

  let borderColor = 'border-slate-700/80';
  let haloGlow = '';
  let statusBadgeColor = 'bg-slate-800 text-slate-300';
  let riskIndicatorColor = 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40';

  if (isCompleted) {
    borderColor = 'border-emerald-500/40';
    riskIndicatorColor = 'text-emerald-400 bg-emerald-950/80 border-emerald-500/40';
  } else if (isCritical) {
    borderColor = 'border-red-500/80';
    haloGlow = 'shadow-[0_0_25px_rgba(239,68,68,0.5)] ring-2 ring-red-500/50';
    riskIndicatorColor = 'text-red-300 bg-red-950/90 border-red-500/60 animate-pulse';
  } else if (isWarning) {
    borderColor = 'border-amber-500/80';
    haloGlow = 'shadow-[0_0_18px_rgba(245,158,11,0.35)]';
    riskIndicatorColor = 'text-amber-300 bg-amber-950/80 border-amber-500/60';
  } else {
    borderColor = 'border-cyan-500/40';
    riskIndicatorColor = 'text-cyan-300 bg-cyan-950/80 border-cyan-500/40';
  }

  if (isSelected) {
    borderColor = 'border-cyan-400 ring-2 ring-cyan-400';
    haloGlow = 'shadow-[0_0_30px_rgba(0,229,255,0.4)]';
  } else if (isDownstream) {
    borderColor = 'border-amber-400/90 ring-1 ring-amber-400/50';
    haloGlow = 'shadow-[0_0_20px_rgba(245,158,11,0.3)]';
  } else if (isUpstream) {
    borderColor = 'border-blue-400/90 ring-1 ring-blue-400/50';
  }

  return (
    <div
      className={cn(
        'w-64 rounded-xl border bg-slate-900/95 backdrop-blur-md transition-all duration-200 select-none cursor-pointer',
        borderColor,
        haloGlow
      )}
    >
      {/* Top Handle (Incoming dependencies - Prerequisite) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 hover:!bg-cyan-400 transition-colors"
      />

      {/* Header bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              'text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold flex items-center gap-1',
              riskIndicatorColor
            )}
          >
            {isCritical && <Flame className="w-3 h-3 text-red-400" />}
            {isWarning && <AlertTriangle className="w-3 h-3 text-amber-400" />}
            {isCompleted && <ShieldCheck className="w-3 h-3 text-emerald-400" />}
            <span>RISK {riskScore}</span>
          </span>
        </div>

        <span className="text-[10px] font-mono text-slate-400 uppercase font-medium">
          {task.status.replace('_', ' ')}
        </span>
      </div>

      {/* Body */}
      <div className="p-3.5 space-y-2">
        <h4 className="text-sm font-semibold text-white tracking-tight line-clamp-1">{task.title}</h4>
        
        {task.description && (
          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
            {task.description}
          </p>
        )}

        {/* Footer info: Hours & Deadline */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px] text-slate-400">
          <div className="flex items-center gap-1 text-slate-300">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{task.estimated_hours}h</span>
          </div>
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-slate-400" />
            <span className="truncate max-w-[80px]">{task.assigned_to}</span>
          </div>
          <div className="text-[10px] font-mono text-slate-300">
            {formatRelativeTime(task.deadline)}
          </div>
        </div>

        {/* Highlight badge if downstream impact active */}
        {isDownstream && (
          <div className="mt-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono text-center border border-amber-500/30">
            ⚡ AFFECTED BY SELECTION
          </div>
        )}
      </div>

      {/* Bottom Handle (Outgoing dependencies - Successors) */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-slate-900 hover:!bg-cyan-400 transition-colors"
      />
    </div>
  );
});

TaskNode.displayName = 'TaskNode';
