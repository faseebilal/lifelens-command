'use client';

import React, { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardHeader } from '@/components/common/Card';
import { useLifeLens } from '@/lib/store';
import {
  SlidersHorizontal,
  Clock,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Flame,
  Zap,
  Sparkles,
  Layers,
  Activity,
  BookmarkPlus,
  Trash2,
  Calendar,
  UserX,
} from 'lucide-react';
import { RiskBadge, StatusBadge } from '@/components/common/Badge';
import { SimulationScenario } from '@/types/database';
import { formatDate } from '@/lib/utils';

export default function WhatIfPage() {
  const {
    tasks,
    currentSimulation,
    savedSimulations,
    runSimulation,
    applySimulation,
    discardSimulation,
    saveCurrentSimulation,
    deleteSavedSimulation,
  } = useLifeLens();

  // Scenario input controls
  const [selectedTaskId, setSelectedTaskId] = useState<string>(tasks[0]?.id || '');
  const [delayHours, setDelayHours] = useState<number>(24);
  const [hoursUnavailable, setHoursUnavailable] = useState<number>(6);
  const [newDeadlineHours, setNewDeadlineHours] = useState<number>(8);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [scenarioType, setScenarioType] = useState<
    'DELAY_TASK' | 'MOVE_DEADLINE' | 'UNAVAILABLE_RESOURCE' | 'CHANGE_PRIORITY' | 'ADD_EVENT'
  >('DELAY_TASK');

  // Keep selectedTaskId in sync with current tasks
  React.useEffect(() => {
    if (tasks.length > 0 && (!selectedTaskId || !tasks.some((t) => t.id === selectedTaskId))) {
      setSelectedTaskId(tasks[0].id);
    } else if (tasks.length === 0) {
      setSelectedTaskId('');
    }
  }, [tasks, selectedTaskId]);

  const handleRunSimulation = () => {
    if (tasks.length === 0) return;
    let scenario: SimulationScenario;
    const task = tasks.find((t) => t.id === selectedTaskId) || tasks[0];
    const resourceName = task?.assigned_to || 'Key Member';

    if (scenarioType === 'DELAY_TASK') {
      scenario = {
        id: `sim-delay-${Date.now()}`,
        name: `Hypothetical ${delayHours}h Delay on ${task?.title || 'Task'}`,
        description: `Delay ${task?.title || 'Task'} by ${delayHours} hours`,
        type: 'DELAY_TASK',
        payload: {
          taskId: task?.id || selectedTaskId,
          delayHours: Number(delayHours),
        },
      };
    } else if (scenarioType === 'MOVE_DEADLINE') {
      const earlierDate = new Date(Date.now() + newDeadlineHours * 3600 * 1000).toISOString();
      scenario = {
        id: `sim-deadline-${Date.now()}`,
        name: `Deadline Shift: ${task?.title || 'Task'} moved to ${newDeadlineHours}h from now`,
        description: `Compress deadline on ${task?.title || 'Task'}`,
        type: 'MOVE_DEADLINE',
        payload: {
          taskId: task?.id || selectedTaskId,
          newDeadline: earlierDate,
        },
      };
    } else if (scenarioType === 'UNAVAILABLE_RESOURCE') {
      scenario = {
        id: `sim-res-${Date.now()}`,
        name: `Resource Absence: ${resourceName} Unavailable for ${hoursUnavailable}h`,
        description: `${resourceName} unavailable for ${hoursUnavailable} hours`,
        type: 'UNAVAILABLE_RESOURCE',
        payload: {
          resourceName,
          hoursUnavailable: Number(hoursUnavailable),
        },
      };
    } else if (scenarioType === 'ADD_EVENT') {
      scenario = {
        id: `sim-event-${Date.now()}`,
        name: `Emergency Schedule Collision: 2h Mandatory Sync`,
        description: 'New overlapping meeting added into critical task deadline window',
        type: 'ADD_EVENT',
        payload: {
          newEvent: {
            title: 'Urgent Stakeholder Review Meeting',
            start_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
            end_time: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
          },
        },
      };
    } else {
      scenario = {
        id: `sim-prio-${Date.now()}`,
        name: `Elevate Priority to CRITICAL on ${task?.title || 'Selected Task'}`,
        description: 'Reprioritize task to critical tier',
        type: 'CHANGE_PRIORITY',
        payload: {
          taskId: task?.id || selectedTaskId,
          newPriority: 'CRITICAL',
        },
      };
    }

    runSimulation(scenario);
  };

  const handleSave = async () => {
    if (!currentSimulation) return;
    const saved = await saveCurrentSimulation();
    if (saved) {
      setSaveSuccessMsg(`Simulation "${saved.name}" successfully saved.`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    }
  };

  const handleApply = async () => {
    if (!currentSimulation) return;
    if (
      confirm(
        'CONFIRM APPLICATION:\nAre you sure you want to apply these hypothetical changes to your real workspace data? This will permanently modify task deadlines and priorities.'
      )
    ) {
      await applySimulation();
      alert('Hypothetical changes successfully applied to production state.');
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                <SlidersHorizontal className="w-5 h-5" />
              </div>
              <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
                What-If Scenario Simulator
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Sandbox consequence engine: Test hypothetical delays and disruptions without altering production data.
            </p>
          </div>

          {currentSimulation && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={discardSimulation}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Discard</span>
              </button>

              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/70 hover:bg-purple-900/80 text-purple-200 text-xs font-semibold border border-purple-500/40 transition-colors shadow-[0_0_12px_rgba(168,85,247,0.2)]"
              >
                <BookmarkPlus className="w-3.5 h-3.5 text-purple-400" />
                <span>Save Simulation</span>
              </button>

              <button
                onClick={handleApply}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold shadow-[0_0_15px_rgba(0,229,255,0.3)] transition-all hover:scale-105 active:scale-95"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Apply to Real Data</span>
              </button>
            </div>
          )}
        </div>

        {saveSuccessMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* Simulator Control Panel */}
        <Card className="p-5">
          <CardHeader
            title="Configure Hypothetical Disruption"
            subtitle="Parameters operate strictly in-memory using an isolated cloned graph state"
            icon={<Zap className="w-5 h-5 text-cyan-400" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Scenario Type */}
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Scenario Type</label>
              <select
                value={scenarioType}
                onChange={(e) => setScenarioType(e.target.value as any)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="DELAY_TASK">Delay Task (Hours/Days)</option>
                <option value="MOVE_DEADLINE">Move Deadline Earlier</option>
                <option value="UNAVAILABLE_RESOURCE">Key Engineer Unavailable</option>
                <option value="ADD_EVENT">Add Schedule Collision (Event)</option>
                <option value="CHANGE_PRIORITY">Elevate Task Priority</option>
              </select>
            </div>

            {/* Target Task */}
            {['DELAY_TASK', 'MOVE_DEADLINE', 'CHANGE_PRIORITY'].includes(scenarioType) && (
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Target Task</label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-2.5 text-white focus:outline-none focus:border-cyan-500"
                >
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Parameter Adjustment */}
            {scenarioType === 'DELAY_TASK' && (
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Delay Duration: <span className="text-cyan-400 font-bold">{delayHours} Hours</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="72"
                  step="2"
                  value={delayHours}
                  onChange={(e) => setDelayHours(Number(e.target.value))}
                  className="w-full accent-cyan-400 mt-2"
                />
              </div>
            )}

            {scenarioType === 'MOVE_DEADLINE' && (
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  New Compressed Window: <span className="text-amber-400 font-bold">{newDeadlineHours}h from now</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="24"
                  step="1"
                  value={newDeadlineHours}
                  onChange={(e) => setNewDeadlineHours(Number(e.target.value))}
                  className="w-full accent-amber-400 mt-2"
                />
              </div>
            )}

            {scenarioType === 'UNAVAILABLE_RESOURCE' && (
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Absence Duration: <span className="text-red-400 font-bold">{hoursUnavailable} Hours</span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="24"
                  step="2"
                  value={hoursUnavailable}
                  onChange={(e) => setHoursUnavailable(Number(e.target.value))}
                  className="w-full accent-red-400 mt-2"
                />
              </div>
            )}

            {scenarioType === 'ADD_EVENT' && (
              <div className="flex items-center text-xs text-slate-400 pt-4">
                <span className="p-2 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300">
                  Injects an emergency 2h sync into the task deadline window to observe collision penalties.
                </span>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-end">
            <button
              onClick={handleRunSimulation}
              disabled={tasks.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black font-extrabold text-xs shadow-[0_0_20px_rgba(0,229,255,0.3)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-black" />
              <span>Run Hypothetical Simulation</span>
            </button>
          </div>
        </Card>

        {/* Simulation Results: BEFORE vs SIMULATED */}
        {currentSimulation ? (
          <div className="space-y-6">
            {/* Impact Metric Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card glow="red" className="p-4 text-center">
                <span className="text-[10px] font-mono text-slate-400 uppercase">PROJECT HEALTH (BEFORE → SIMULATED)</span>
                <div className="text-2xl font-bold font-mono text-red-400 mt-1">
                  {currentSimulation.original_state.project_health}% →{' '}
                  {currentSimulation.simulated_state.project_health}%
                </div>
                <p className="text-[11px] text-red-300 mt-0.5">
                  ({currentSimulation.impact_summary.project_health_delta}% degradation)
                </p>
              </Card>

              <Card glow="amber" className="p-4 text-center">
                <span className="text-[10px] font-mono text-slate-400 uppercase">OVERALL RISK (BEFORE → SIMULATED)</span>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-1">
                  {currentSimulation.original_state.overall_risk_score} →{' '}
                  {currentSimulation.simulated_state.overall_risk_score}
                </div>
                <p className="text-[11px] text-amber-300 mt-0.5">
                  (+{currentSimulation.impact_summary.risk_score_delta} risk score points)
                </p>
              </Card>

              <Card glow="cyan" className="p-4 text-center">
                <span className="text-[10px] font-mono text-slate-400 uppercase">DOWNSTREAM TASKS AFFECTED</span>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-1">
                  {currentSimulation.impact_summary.affected_task_ids.length}
                </div>
                <p className="text-[11px] text-cyan-300 mt-0.5">Cascading blast radius</p>
              </Card>
            </div>

            {/* Structured Why / Impact / Recommendation */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase block">WHY THIS MATTERS</span>
                <p className="text-slate-300 leading-relaxed">
                  {currentSimulation.impact_summary.why_it_matters || currentSimulation.scenario.description}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-white/10 space-y-1">
                <span className="text-[10px] font-mono text-amber-400 font-bold uppercase block">IMPACT</span>
                <p className="text-slate-300 leading-relaxed">
                  {currentSimulation.impact_summary.narrative}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-cyan-500/30 space-y-1 bg-cyan-950/20">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block">RECOMMENDATION</span>
                <p className="text-slate-200 leading-relaxed font-medium">
                  {currentSimulation.impact_summary.recommended_action}
                </p>
              </div>
            </div>

            {/* Side-by-side Task Diff Table */}
            <Card className="p-5">
              <CardHeader
                title="State Differential: Baseline vs Simulated"
                subtitle="Visual diff comparing individual task risk scores across the topological DAG"
                icon={<Layers className="w-5 h-5 text-cyan-400" />}
              />

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-slate-400 font-mono text-[11px]">
                      <th className="pb-3">Task Name</th>
                      <th className="pb-3 text-center">Baseline Risk</th>
                      <th className="pb-3 text-center">Simulated Risk</th>
                      <th className="pb-3 text-right">Risk Score Shift</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {currentSimulation.simulated_state.tasks.map((simTask) => {
                      const origRisk = currentSimulation.original_state.risks[simTask.id];
                      const simRisk = currentSimulation.simulated_state.risks[simTask.id];
                      const isAffected = currentSimulation.impact_summary.affected_task_ids.includes(simTask.id);

                      return (
                        <tr
                          key={simTask.id}
                          className={isAffected ? 'bg-red-950/25' : 'hover:bg-white/[0.01]'}
                        >
                          <td className="py-3 pr-2">
                            <span className="font-semibold text-white block">{simTask.title}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {simTask.assigned_to} • {simTask.estimated_hours}h
                            </span>
                          </td>

                          <td className="py-3 text-center">
                            {origRisk && (
                              <RiskBadge level={origRisk.risk_level} score={origRisk.risk_score} />
                            )}
                          </td>

                          <td className="py-3 text-center">
                            {simRisk && (
                              <RiskBadge level={simRisk.risk_level} score={simRisk.risk_score} />
                            )}
                          </td>

                          <td className="py-3 text-right font-mono font-bold">
                            {origRisk && simRisk && (
                              <span
                                className={
                                  simRisk.risk_score > origRisk.risk_score
                                    ? 'text-red-400'
                                    : 'text-emerald-400'
                                }
                              >
                                {origRisk.risk_score} → {simRisk.risk_score}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 border border-dashed border-white/10 rounded-2xl">
            <SlidersHorizontal className="w-12 h-12 text-slate-600 mb-3 opacity-60" />
            <h3 className="text-sm font-semibold text-slate-300">Simulator In Standby</h3>
            <p className="text-xs max-w-md mt-1 text-slate-400">
              Configure parameters above and click <strong>&quot;Run Hypothetical Simulation&quot;</strong> to project
              consequences without altering real data.
            </p>
          </div>
        )}

        {/* Saved Simulations Section */}
        {savedSimulations.length > 0 && (
          <Card className="p-5">
            <CardHeader
              title={`Saved Simulations (${savedSimulations.length})`}
              subtitle="Persisted scenario checkpoints in PostgreSQL / Supabase"
              icon={<BookmarkPlus className="w-5 h-5 text-purple-400" />}
            />

            <div className="space-y-3">
              {savedSimulations.map((sim) => (
                <div
                  key={sim.id}
                  className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-white block text-sm">{sim.name}</span>
                    <span className="text-[11px] text-slate-400 block">{sim.impact_summary?.narrative || sim.scenario.description}</span>
                    <span className="text-[10px] font-mono text-purple-400 block">
                      Saved: {formatDate(sim.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => deleteSavedSimulation(sim.id)}
                      className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-white/5 transition-colors"
                      title="Delete saved simulation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
