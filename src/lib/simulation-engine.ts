import { Task, Dependency, CalendarEvent, RiskAnalysis, SimulationResult, SimulationScenario } from '@/types/database';
import { RiskEngine } from './risk-engine';
import { DependencyEngine } from './dependency-engine';

export class SimulationEngine {
  constructor(
    private originalTasks: Task[],
    private dependencies: Dependency[],
    private originalEvents: CalendarEvent[] = []
  ) {}

  /**
   * Run a what-if simulation without mutating original production data
   * Single source of truth for all simulation UI components
   */
  public simulate(scenario: SimulationScenario): SimulationResult {
    // 1. Calculate baseline original state
    const originalRiskEngine = new RiskEngine(this.originalTasks, this.dependencies, this.originalEvents);
    const originalRisks = originalRiskEngine.calculateAllRisks();
    const originalHealth = originalRiskEngine.calculateProjectHealth(originalRisks);

    // 2. Clone tasks and events in memory (Non-destructive)
    const simulatedTasks: Task[] = JSON.parse(JSON.stringify(this.originalTasks));
    const simulatedEvents: CalendarEvent[] = JSON.parse(JSON.stringify(this.originalEvents));

    const affectedTaskIds = new Set<string>();
    const newlyCriticalTasks: string[] = [];
    const depEngine = new DependencyEngine(simulatedTasks, this.dependencies);

    let whyItMatters = '';
    let narrative = '';
    let recommendedAction = '';
    const scheduleConflicts: Array<{ eventTitle: string; taskTitle: string }> = [];

    // 3. Apply scenario modifications dynamically
    switch (scenario.type) {
      case 'DELAY_TASK': {
        const taskId = scenario.payload.taskId;
        const delayHours = scenario.payload.delayHours || (scenario.payload.delayDays || 1) * 24;
        const targetTask = simulatedTasks.find((t) => t.id === taskId) || simulatedTasks[0];

        if (targetTask) {
          affectedTaskIds.add(targetTask.id);

          // Pushing task completion pushes deadline or compresses buffer
          const origDeadline = new Date(targetTask.deadline).getTime();
          targetTask.deadline = new Date(origDeadline + delayHours * 3600 * 1000).toISOString();
          targetTask.estimated_hours = Math.round((targetTask.estimated_hours + delayHours * 0.25) * 10) / 10;

          // Downstream traversal
          const downstream = depEngine.getAllDownstream(targetTask.id);
          downstream.forEach(({ task: dTask }) => {
            affectedTaskIds.add(dTask.id);
          });

          const downstreamNames = downstream.map((d) => d.task.title);

          whyItMatters = `A simulated ${delayHours}h delay on "${targetTask.title}" postpones milestone delivery and compresses time buffers.`;

          if (downstream.length > 0) {
            narrative = `Delaying "${targetTask.title}" directly cascades into ${downstream.length} downstream deliverable(s): ${downstreamNames.slice(0, 3).join(', ')}${downstreamNames.length > 3 ? '...' : ''}.`;
            recommendedAction = `Parallelize tasks downstream of "${targetTask.title}". Stagger delivery by publishing intermediate interfaces so that "${downstreamNames[0]}" is not completely blocked.`;
          } else {
            narrative = `"${targetTask.title}" has no downstream dependencies, so the ${delayHours}h delay affects its own deadline without causing cascading blockages.`;
            recommendedAction = `Reallocate sprint focus to ensure "${targetTask.title}" finishes before the overall project milestone.`;
          }
        } else {
          whyItMatters = 'No target task selected for delay simulation.';
          narrative = 'Simulation completed without modifying tasks.';
          recommendedAction = 'Select a task to simulate delay impact.';
        }
        break;
      }

      case 'MOVE_DEADLINE': {
        const taskId = scenario.payload.taskId;
        const targetTask = simulatedTasks.find((t) => t.id === taskId) || simulatedTasks[0];

        if (targetTask && scenario.payload.newDeadline) {
          affectedTaskIds.add(targetTask.id);
          targetTask.deadline = scenario.payload.newDeadline;

          const downstream = depEngine.getAllDownstream(targetTask.id);
          downstream.forEach(({ task: dTask }) => affectedTaskIds.add(dTask.id));

          const hoursUntil = Math.max(0, (new Date(targetTask.deadline).getTime() - Date.now()) / (1000 * 3600));
          const isTight = targetTask.estimated_hours > hoursUntil;

          whyItMatters = `Deadline for "${targetTask.title}" moved earlier to ${new Date(targetTask.deadline).toLocaleDateString()} ${new Date(targetTask.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Only ${hoursUntil.toFixed(1)}h remain for ${targetTask.estimated_hours}h of work.`;
          narrative = `Accelerated deadline window compresses delivery buffer for "${targetTask.title}" and ${downstream.length} downstream dependencies.`;

          if (isTight) {
            recommendedAction = `Estimated workload (${targetTask.estimated_hours}h) exceeds the remaining accelerated window (${hoursUntil.toFixed(1)}h). De-scope optional sub-features or assign a second engineer to "${targetTask.title}".`;
          } else {
            recommendedAction = `Keep focus on "${targetTask.title}" to protect the accelerated completion milestone.`;
          }
        } else {
          whyItMatters = 'Deadline shift configured without valid deadline.';
          narrative = 'No deadline adjustments applied.';
          recommendedAction = 'Specify a target task and accelerated deadline.';
        }
        break;
      }

      case 'UNAVAILABLE_RESOURCE': {
        const hoursUnavailable = scenario.payload.hoursUnavailable || 6;
        const resourceName = scenario.payload.resourceName || 'Key Member';

        // ONLY tasks assigned to this specific resource should be directly affected
        const directlyAssignedTasks = simulatedTasks.filter(
          (t) =>
            t.status !== 'COMPLETED' &&
            t.assigned_to &&
            t.assigned_to.toLowerCase().includes(resourceName.toLowerCase())
        );

        if (directlyAssignedTasks.length === 0) {
          whyItMatters = `No active tasks are assigned to ${resourceName}, so this disruption currently has no direct task impact.`;
          narrative = `Team member ${resourceName} is unavailable for ${hoursUnavailable} hours, but has zero active tasks assigned in this workspace.`;
          recommendedAction = `No reallocations necessary. Existing task assignments are unimpeded.`;
        } else {
          directlyAssignedTasks.forEach((task) => {
            task.estimated_hours += Math.round(hoursUnavailable * 0.5 * 10) / 10;
            affectedTaskIds.add(task.id);

            // Traverse downstream from each assigned task
            const downstream = depEngine.getAllDownstream(task.id);
            downstream.forEach(({ task: dTask }) => affectedTaskIds.add(dTask.id));
          });

          const assignedNames = directlyAssignedTasks.map((t) => t.title);
          whyItMatters = `${resourceName} is unavailable for ${hoursUnavailable} hours, directly impacting ${directlyAssignedTasks.length} task(s) (${assignedNames.join(', ')}).`;
          narrative = `Halted progress on ${assignedNames.join(', ')} increases estimated backlog duration and cascades to downstream successors.`;
          recommendedAction = `Temporarily reassign critical blocker "${assignedNames[0]}" to an available team member, or pause non-critical background items.`;
        }
        break;
      }

      case 'ADD_EVENT': {
        if (scenario.payload.newEvent) {
          const newEv: CalendarEvent = {
            id: `sim-ev-${Date.now()}`,
            user_id: 'sim-user',
            title: scenario.payload.newEvent.title || 'Emergency Briefing',
            description: scenario.payload.newEvent.description || 'Simulated meeting',
            start_time: scenario.payload.newEvent.start_time || new Date().toISOString(),
            end_time: scenario.payload.newEvent.end_time || new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
            created_at: new Date().toISOString(),
          };
          simulatedEvents.push(newEv);

          // Detect real conflict with tasks
          const evStart = new Date(newEv.start_time).getTime();
          const evEnd = new Date(newEv.end_time).getTime();

          const conflictingTasks = simulatedTasks.filter((t) => {
            if (t.status === 'COMPLETED') return false;
            const tDeadline = new Date(t.deadline).getTime();
            // Conflict if task deadline is within 2 hours of event or during event
            return tDeadline >= evStart - 2 * 3600 * 1000 && tDeadline <= evEnd + 1 * 3600 * 1000;
          });

          conflictingTasks.forEach((t) => {
            affectedTaskIds.add(t.id);
            scheduleConflicts.push({ eventTitle: newEv.title, taskTitle: t.title });
          });

          if (conflictingTasks.length > 0) {
            const conflictTaskNames = conflictingTasks.map((t) => t.title).join(', ');
            whyItMatters = `Mandatory event "${newEv.title}" collides directly with critical deadline window for ${conflictTaskNames}.`;
            narrative = `Synchronous meeting commitment removes focus hours during the delivery window of ${conflictTaskNames}.`;
            recommendedAction = `Reschedule "${newEv.title}" or designate an asynchronous proxy attendee to protect engineering focus on "${conflictingTasks[0].title}".`;
          } else {
            whyItMatters = `Added calendar event: "${newEv.title}" (${new Date(newEv.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(newEv.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).`;
            narrative = `The event introduces a schedule commitment but does not directly overlap with imminent task delivery deadlines.`;
            recommendedAction = `Ensure upcoming milestone deadlines do not get shifted into this reserved time block.`;
          }
        }
        break;
      }

      case 'CHANGE_PRIORITY': {
        const taskId = scenario.payload.taskId;
        const targetTask = simulatedTasks.find((t) => t.id === taskId) || simulatedTasks[0];

        if (targetTask && scenario.payload.newPriority) {
          targetTask.priority = scenario.payload.newPriority;
          affectedTaskIds.add(targetTask.id);

          const downstream = depEngine.getAllDownstream(targetTask.id);
          downstream.forEach(({ task: dTask }) => affectedTaskIds.add(dTask.id));

          whyItMatters = `Priority of "${targetTask.title}" elevated to ${targetTask.priority}.`;
          narrative = `Elevating priority sharpens risk sensitivity and shifts critical path focus to "${targetTask.title}".`;
          recommendedAction = `Realign team focus so "${targetTask.title}" is tackled before lower-priority backlog items.`;
        }
        break;
      }
    }

    // 4. Recalculate risks for simulated state
    const simulatedRiskEngine = new RiskEngine(simulatedTasks, this.dependencies, simulatedEvents);
    const simulatedRisks = simulatedRiskEngine.calculateAllRisks();
    const simulatedHealth = simulatedRiskEngine.calculateProjectHealth(simulatedRisks);

    // 5. Compare diffs
    Object.keys(simulatedRisks).forEach((taskId) => {
      const orig = originalRisks[taskId];
      const sim = simulatedRisks[taskId];
      if (sim && orig) {
        if (sim.risk_level === 'CRITICAL' && orig.risk_level !== 'CRITICAL') {
          newlyCriticalTasks.push(taskId);
        }
        if (Math.abs(sim.risk_score - orig.risk_score) >= 10) {
          affectedTaskIds.add(taskId);
        }
      }
    });

    const affectedIdsArray = Array.from(affectedTaskIds);
    const affectedNamesArray = affectedIdsArray
      .map((id) => simulatedTasks.find((t) => t.id === id)?.title)
      .filter((n): n is string => !!n);

    const downstreamIds = affectedIdsArray.filter(
      (id) => !scenario.payload?.taskId || id !== scenario.payload.taskId
    );
    const downstreamNames = downstreamIds
      .map((id) => simulatedTasks.find((t) => t.id === id)?.title)
      .filter((n): n is string => !!n);

    return {
      id: `sim-${Date.now()}`,
      user_id: this.originalTasks[0]?.user_id || 'demo-user',
      name: scenario.name,
      scenario,
      original_state: {
        tasks: this.originalTasks,
        risks: originalRisks,
        overall_risk_score: originalHealth.overallRiskScore,
        project_health: originalHealth.healthScore,
        critical_count: originalHealth.criticalCount,
      },
      simulated_state: {
        tasks: simulatedTasks,
        risks: simulatedRisks,
        overall_risk_score: simulatedHealth.overallRiskScore,
        project_health: simulatedHealth.healthScore,
        critical_count: simulatedHealth.criticalCount,
      },
      impact_summary: {
        affected_task_ids: affectedIdsArray,
        affected_task_names: affectedNamesArray,
        downstream_task_ids: downstreamIds,
        downstream_task_names: downstreamNames,
        risk_score_delta: simulatedHealth.overallRiskScore - originalHealth.overallRiskScore,
        project_health_delta: simulatedHealth.healthScore - originalHealth.healthScore,
        newly_critical_tasks: newlyCriticalTasks,
        why_it_matters: whyItMatters,
        narrative,
        recommended_action: recommendedAction,
        schedule_conflicts: scheduleConflicts.length > 0 ? scheduleConflicts : undefined,
      },
      created_at: new Date().toISOString(),
    };
  }
}
