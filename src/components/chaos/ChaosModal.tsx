'use client';

import React, { useState } from 'react';
import {
  Zap,
  Clock,
  UserX,
  Calendar,
  AlertCircle,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { Modal } from '@/components/common/Modal';
import { useLifeLens } from '@/lib/store';
import { SimulationScenario } from '@/types/database';
import { cn } from '@/lib/utils';

interface ChaosModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChaosModal: React.FC<ChaosModalProps> = ({ isOpen, onClose }) => {
  const { tasks, runSimulation, discardSimulation, currentSimulation, applySimulation } = useLifeLens();
  const [selectedDisruption, setSelectedDisruption] = useState<string>('delay-primary');
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: Select Disruption, 2: Simulating wave, 3: Before/After result

  const primaryTask = tasks.find((t) => t.id === 'task-2-api-dev') || tasks[0];
  const finalTask = tasks.find((t) => t.id === 'task-6-submission') || tasks[tasks.length - 1] || primaryTask;
  const primaryAssignee = primaryTask?.assigned_to || 'Key Engineer';

  const disruptions = [
    {
      id: 'delay-primary',
      title: `Task Delayed by 24h (${primaryTask?.title || 'Primary Task'})`,
      description: `Simulates an unexpected operational blocker, pushing delivery out 24 full hours.`,
      icon: Clock,
      scenario: {
        id: 'chaos-delay-primary',
        name: `${primaryTask?.title || 'Primary Task'} 24h Delay`,
        description: `Postpone ${primaryTask?.title || 'Task'} by 24 hours`,
        type: 'DELAY_TASK' as const,
        payload: {
          taskId: primaryTask?.id || '',
          delayHours: 24,
        },
      },
    },
    {
      id: 'unavailable-resource',
      title: `${primaryAssignee} Unavailable for 6 Hours`,
      description: `Sudden absence of assigned resource halts progress, increasing backlog duration across assigned tasks.`,
      icon: UserX,
      scenario: {
        id: 'chaos-unavailable-resource',
        name: `${primaryAssignee} 6h Absence`,
        description: `${primaryAssignee} unavailable for 6 hours`,
        type: 'UNAVAILABLE_RESOURCE' as const,
        payload: {
          resourceName: primaryAssignee,
          hoursUnavailable: 6,
        },
      },
    },
    {
      id: 'early-deadline',
      title: `Deadline Moved Earlier (${finalTask?.title || 'Final Milestone'})`,
      description: `External milestone window compressed by 8 hours, squeezing delivery buffer for downstream QA.`,
      icon: Calendar,
      scenario: {
        id: 'chaos-early-deadline',
        name: `Accelerated Deadline: ${finalTask?.title || 'Milestone'}`,
        description: `Milestone moved earlier by 8 hours`,
        type: 'MOVE_DEADLINE' as const,
        payload: {
          taskId: finalTask?.id || '',
          newDeadline: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
        },
      },
    },
    {
      id: 'event-conflict',
      title: 'Emergency Schedule Conflict (Mandatory 2h Sync)',
      description: 'Synchronous emergency meeting collides directly with critical task delivery window.',
      icon: AlertCircle,
      scenario: {
        id: 'chaos-event-conflict',
        name: 'Urgent Stakeholder Review Meeting Collision',
        description: 'New overlapping meeting added into critical task deadline window',
        type: 'ADD_EVENT' as const,
        payload: {
          newEvent: {
            title: 'Urgent Stakeholder Review',
            start_time: new Date(Date.now() + 1.5 * 3600 * 1000).toISOString(),
            end_time: new Date(Date.now() + 3.5 * 3600 * 1000).toISOString(),
            location: 'Conference Room Beta / Zoom',
          },
        },
      },
    },
  ];

  const handleExecuteChaos = () => {
    if (tasks.length === 0) return;
    const selected = disruptions.find((d) => d.id === selectedDisruption) || disruptions[0];
    if (!selected) return;

    setStep(2);
    // Cinematic calculation wave
    setTimeout(() => {
      runSimulation(selected.scenario);
      setStep(3);
    }, 1000);
  };

  const handleClose = () => {
    discardSimulation();
    setStep(1);
    onClose();
  };

  const handleApplyToRealData = async () => {
    if (!currentSimulation) return;
    if (
      confirm(
        'CONFIRM APPLICATION:\nAre you sure you want to apply these simulated disruptions to your real database records? This will permanently update task deadlines and estimated hours.'
      )
    ) {
      await applySimulation();
      setStep(1);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Chaos Mode — Consequence Simulator"
      subtitle="Inject real-world operational disruptions to observe cascading dependency failures"
      maxWidth="2xl"
    >
      {tasks.length === 0 ? (
        <div className="py-8 text-center space-y-3">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto opacity-70" />
          <h4 className="text-sm font-bold text-white">No Tasks Available in Workspace</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Create tasks and projects in your workspace first to simulate disruptions and observe consequence cascades.
          </p>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-slate-200"
          >
            Close
          </button>
        </div>
      ) : (
        <>
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">
                Select a disruption event. The LifeLens Engine will traverse the dependency graph, propagate
                delays, and calculate downstream mission impact strictly in memory without altering live data:
              </p>

              <div className="grid gap-3">
                {disruptions.map((d) => {
                  const Icon = d.icon;
                  const isSelected = selectedDisruption === d.id;

                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDisruption(d.id)}
                      className={cn(
                        'p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-3',
                        isSelected
                          ? 'bg-red-950/40 border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                          : 'bg-white/[0.03] border-white/10 hover:border-white/20'
                      )}
                    >
                      <div
                        className={cn(
                          'p-2.5 rounded-lg flex-shrink-0',
                          isSelected ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-slate-400'
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white truncate">{d.title}</h4>
                          {isSelected && (
                            <span className="text-[11px] font-mono text-red-400 uppercase tracking-wider flex-shrink-0 ml-2">
                              SELECTED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">{d.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteChaos}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-amber-600 text-white text-xs font-bold shadow-[0_0_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_30px_rgba(239,68,68,0.7)] transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Zap className="w-4 h-4" />
                  <span>SIMULATE DISRUPTION</span>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-red-500/30 animate-ping" />
                <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                  <Zap className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">Injecting Chaos Wave</h3>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Traversing DAG edges → Propagating deadline slippage → Evaluating downstream failures...
                </p>
              </div>
            </div>
          )}

          {step === 3 && currentSimulation && (
            <div className="space-y-4">
              {/* Disruption Headline */}
              <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-xs">
                <div className="flex items-center gap-2 text-red-300 font-semibold mb-1">
                  <Zap className="w-4 h-4 text-red-400" />
                  <span>DISRUPTION INJECTED: {currentSimulation.name}</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{currentSimulation.impact_summary.narrative}</p>
              </div>

              {/* Side-by-side BEFORE vs AFTER */}
              <div className="grid grid-cols-2 gap-3">
                {/* BEFORE */}
                <div className="p-4 rounded-xl bg-slate-900/60 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-xs font-mono text-emerald-400 uppercase font-semibold">BEFORE</span>
                    <span className="text-xs text-slate-400 font-mono">Baseline</span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-slate-400">Project Health:</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">
                      {currentSimulation.original_state.project_health}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Risk Score:</span>
                    <span className="text-sm font-semibold text-slate-300 font-mono">
                      {currentSimulation.original_state.overall_risk_score}/100
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Critical Tasks:</span>
                    <span className="text-sm font-semibold text-emerald-300 font-mono">
                      {currentSimulation.original_state.critical_count}
                    </span>
                  </div>
                </div>

                {/* AFTER */}
                <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 space-y-2 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
                  <div className="flex items-center justify-between pb-2 border-b border-red-500/20">
                    <span className="text-xs font-mono text-red-400 uppercase font-semibold">AFTER</span>
                    <span className="text-xs text-red-300 font-mono">
                      Change: {currentSimulation.impact_summary.project_health_delta > 0 ? '+' : ''}
                      {currentSimulation.impact_summary.project_health_delta}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-xs text-slate-400">Project Health:</span>
                    <span className="text-lg font-bold text-red-400 font-mono">
                      {currentSimulation.simulated_state.project_health}%
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Risk Score:</span>
                    <span className="text-sm font-semibold text-red-300 font-mono">
                      {currentSimulation.simulated_state.overall_risk_score}/100
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400">Critical Tasks:</span>
                    <span className="text-sm font-semibold text-red-300 font-mono">
                      {currentSimulation.simulated_state.critical_count}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Recommendation */}
              <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/40 text-xs space-y-1.5">
                <span className="text-cyan-300 font-semibold uppercase tracking-wider text-[10px] block font-mono">
                  RECOMMENDED COUNTERMEASURE
                </span>
                <p className="text-slate-200 leading-relaxed">
                  {currentSimulation.impact_summary.recommended_action}
                </p>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <button
                  onClick={handleClose}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Discard Simulation</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleApplyToRealData}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white text-xs font-semibold border border-red-400/40 transition-colors"
                    title="Commit these simulated modifications to real database records"
                  >
                    <span>Apply to Real Data</span>
                  </button>
                  <button
                    onClick={handleClose}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-500 text-black text-xs font-bold hover:bg-cyan-400 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Done Viewing</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
};
