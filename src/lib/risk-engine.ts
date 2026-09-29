import { Task, Dependency, CalendarEvent, RiskAnalysis, RiskLevel } from '@/types/database';
import { DependencyEngine } from './dependency-engine';

export class RiskEngine {
  private dependencyEngine: DependencyEngine;

  constructor(
    private tasks: Task[],
    private dependencies: Dependency[],
    private events: CalendarEvent[] = []
  ) {
    this.dependencyEngine = new DependencyEngine(tasks, dependencies);
  }

  /**
   * Calculates transparent risk scores for all tasks including propagation
   */
  public calculateAllRisks(currentTime: Date = new Date()): Record<string, RiskAnalysis> {
    const rawRisks: Map<string, {
      deadlinePressure: number;
      dependencyImpact: number;
      remainingWorkPressure: number;
      scheduleConflictScore: number;
      downstreamTasks: string[];
      rawScore: number;
    }> = new Map();

    // 1. Calculate base risk for each task
    this.tasks.forEach((task) => {
      if (task.status === 'COMPLETED') {
        rawRisks.set(task.id, {
          deadlinePressure: 0,
          dependencyImpact: 0,
          remainingWorkPressure: 0,
          scheduleConflictScore: 0,
          downstreamTasks: [],
          rawScore: 0,
        });
        return;
      }

      // Factor 1: Deadline Pressure (40%)
      const deadline = new Date(task.deadline).getTime();
      const now = currentTime.getTime();
      const hoursUntilDeadline = (deadline - now) / (1000 * 60 * 60);

      let deadlinePressure = 0;
      if (hoursUntilDeadline <= 0) {
        deadlinePressure = 100; // Overdue!
      } else {
        const ratio = task.estimated_hours / hoursUntilDeadline;
        if (ratio >= 1.5) deadlinePressure = 100;
        else if (ratio >= 1.0) deadlinePressure = 85;
        else if (ratio >= 0.7) deadlinePressure = 65;
        else if (ratio >= 0.4) deadlinePressure = 35;
        else deadlinePressure = Math.min(25, ratio * 50);
      }

      // Factor 2: Dependency Impact (25%)
      const downstream = this.dependencyEngine.getAllDownstream(task.id);
      const downstreamIds = downstream.map((d) => d.task.id);
      let dependencyImpact = 0;
      const count = downstream.length;
      if (count >= 5) dependencyImpact = 100;
      else if (count >= 3) dependencyImpact = 80;
      else if (count >= 2) dependencyImpact = 55;
      else if (count === 1) dependencyImpact = 35;
      else dependencyImpact = 10;

      // Factor 3: Remaining Work Pressure (20%)
      let remainingWorkPressure = 0;
      if (task.status === 'BLOCKED') {
        remainingWorkPressure = 95;
      } else {
        if (task.estimated_hours > 8) remainingWorkPressure = 80;
        else if (task.estimated_hours >= 4) remainingWorkPressure = 50;
        else remainingWorkPressure = Math.min(30, task.estimated_hours * 8);

        if (task.priority === 'CRITICAL') remainingWorkPressure = Math.min(100, remainingWorkPressure + 20);
        else if (task.priority === 'HIGH') remainingWorkPressure = Math.min(100, remainingWorkPressure + 10);
      }

      // Factor 4: Schedule Conflict (15%)
      let scheduleConflictScore = 0;
      const taskDeadlineDate = new Date(task.deadline);
      // Check if any event overlaps within 3 hours prior to task deadline
      const conflictingEvents = this.events.filter((ev) => {
        const evStart = new Date(ev.start_time).getTime();
        const evEnd = new Date(ev.end_time).getTime();
        const windowStart = taskDeadlineDate.getTime() - 3 * 3600 * 1000;
        const windowEnd = taskDeadlineDate.getTime() + 1 * 3600 * 1000;
        return evStart < windowEnd && evEnd > windowStart;
      });

      if (conflictingEvents.length >= 2) scheduleConflictScore = 90;
      else if (conflictingEvents.length === 1) scheduleConflictScore = 60;

      const rawScore =
        deadlinePressure * 0.4 +
        dependencyImpact * 0.25 +
        remainingWorkPressure * 0.2 +
        scheduleConflictScore * 0.15;

      rawRisks.set(task.id, {
        deadlinePressure,
        dependencyImpact,
        remainingWorkPressure,
        scheduleConflictScore,
        downstreamTasks: downstreamIds,
        rawScore: Math.round(rawScore),
      });
    });

    // 2. Risk Propagation (Cascading wave)
    // If upstream task has High risk, downstream tasks receive cascading impact
    const finalRisks: Record<string, RiskAnalysis> = {};
    const topologicalOrder = this.dependencyEngine.getTopologicalOrder();

    topologicalOrder.forEach((task) => {
      const base = rawRisks.get(task.id) || {
        deadlinePressure: 0,
        dependencyImpact: 0,
        remainingWorkPressure: 0,
        scheduleConflictScore: 0,
        downstreamTasks: [],
        rawScore: 0,
      };

      if (task.status === 'COMPLETED') {
        finalRisks[task.id] = {
          id: `risk-${task.id}`,
          task_id: task.id,
          project_id: task.project_id,
          risk_score: 0,
          risk_level: 'LOW',
          deadline_pressure: 0,
          dependency_impact: 0,
          remaining_work_pressure: 0,
          schedule_conflict_score: 0,
          reason: 'Task is completed.',
          why: 'Task successfully completed.',
          affected: [],
          action: 'No action required.',
          downstream_tasks: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        return;
      }

      // Check upstream risks
      const directUpstream = this.dependencyEngine.getDirectUpstream(task.id);
      let upstreamPenalty = 0;
      const propagatedFrom: string[] = [];

      directUpstream.forEach((upTask) => {
        const upRisk = finalRisks[upTask.id];
        if (upRisk && upRisk.risk_score >= 60) {
          upstreamPenalty = Math.max(upstreamPenalty, 30);
          propagatedFrom.push(upTask.title);
        } else if (upRisk && upRisk.risk_score >= 35) {
          upstreamPenalty = Math.max(upstreamPenalty, 15);
          propagatedFrom.push(upTask.title);
        }
      });

      const totalScore = Math.min(100, Math.round(base.rawScore + upstreamPenalty * 0.7));
      let riskLevel: RiskLevel = 'LOW';
      if (totalScore >= 61) riskLevel = 'CRITICAL';
      else if (totalScore >= 31) riskLevel = 'MEDIUM';

      // Generate Human-Readable Reasoning
      const deadline = new Date(task.deadline).getTime();
      const hoursUntil = Math.max(0, (deadline - currentTime.getTime()) / (1000 * 60 * 60));
      const downstreamNames = base.downstreamTasks
        .map((id) => this.tasks.find((t) => t.id === id)?.title)
        .filter((n): n is string => !!n);

      let whyExplanation = '';
      if (task.status === 'BLOCKED') {
        whyExplanation = 'Task is currently blocked by pending prerequisites.';
      } else if (hoursUntil <= 0) {
        whyExplanation = `Task deadline has already lapsed with ${task.estimated_hours} hours of estimated work remaining.`;
      } else if (task.estimated_hours > hoursUntil) {
        whyExplanation = `Only ${hoursUntil.toFixed(1)}h remain before deadline, but ${task.estimated_hours}h of work are estimated.`;
      } else if (propagatedFrom.length > 0) {
        whyExplanation = `Cascading risk propagated from delayed upstream prerequisites (${propagatedFrom.join(', ')}).`;
      } else {
        whyExplanation = `On track with ${hoursUntil.toFixed(1)}h remaining for ${task.estimated_hours}h of work.`;
      }

      let actionRecommendation = '';
      if (totalScore >= 61) {
        actionRecommendation = downstreamNames.length > 0
          ? `Begin unblocking ${task.title} immediately or de-scope downstream dependencies (${downstreamNames.slice(0, 2).join(', ')}).`
          : `Reallocate focus to finish ${task.title} before the deadline window closes.`;
      } else if (totalScore >= 31) {
        actionRecommendation = 'Monitor progress closely; ensure no additional calendar conflicts emerge.';
      } else {
        actionRecommendation = 'Proceed according to the planned schedule.';
      }

      finalRisks[task.id] = {
        id: `risk-${task.id}`,
        task_id: task.id,
        project_id: task.project_id,
        risk_score: totalScore,
        risk_level: riskLevel,
        deadline_pressure: base.deadlinePressure,
        dependency_impact: base.dependencyImpact,
        remaining_work_pressure: base.remainingWorkPressure,
        schedule_conflict_score: base.scheduleConflictScore,
        reason: `${whyExplanation} Impacts ${downstreamNames.length} downstream tasks.`,
        why: whyExplanation,
        affected: downstreamNames,
        action: actionRecommendation,
        propagated_from: propagatedFrom.length > 0 ? propagatedFrom : undefined,
        downstream_tasks: base.downstreamTasks,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    return finalRisks;
  }

  /**
   * Calculate overall project risk score and health percentage
   */
  public calculateProjectHealth(risks: Record<string, RiskAnalysis>): {
    overallRiskScore: number;
    healthScore: number;
    criticalCount: number;
    mediumCount: number;
    lowCount: number;
  } {
    const riskValues = Object.values(risks);
    if (riskValues.length === 0) {
      return { overallRiskScore: 0, healthScore: 100, criticalCount: 0, mediumCount: 0, lowCount: 0 };
    }

    let criticalCount = 0;
    let mediumCount = 0;
    let lowCount = 0;
    let totalScore = 0;

    riskValues.forEach((r) => {
      totalScore += r.risk_score;
      if (r.risk_score >= 61) criticalCount++;
      else if (r.risk_score >= 31) mediumCount++;
      else lowCount++;
    });

    const averageRisk = Math.round(totalScore / riskValues.length);
    // Project health drops faster with critical tasks
    const healthScore = Math.max(0, 100 - averageRisk - criticalCount * 8);

    return {
      overallRiskScore: averageRisk,
      healthScore,
      criticalCount,
      mediumCount,
      lowCount,
    };
  }
}
