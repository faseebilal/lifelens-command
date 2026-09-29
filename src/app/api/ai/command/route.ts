import { NextRequest, NextResponse } from 'next/server';
import { Task, Dependency, CalendarEvent, RiskAnalysis } from '@/types/database';
import { RiskEngine } from '@/lib/risk-engine';
import { DependencyEngine } from '@/lib/dependency-engine';
import { SimulationEngine } from '@/lib/simulation-engine';

interface AIRequestBody {
  prompt: string;
  context: {
    projects: any[];
    tasks: Task[];
    dependencies: Dependency[];
    events: CalendarEvent[];
    risks?: Record<string, RiskAnalysis>;
    simulation?: any;
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: AIRequestBody = await req.json();
    const { prompt, context } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const tasks: Task[] = context?.tasks || [];
    const dependencies: Dependency[] = context?.dependencies || [];
    const events: CalendarEvent[] = context?.events || [];
    const projects: any[] = context?.projects || [];

    // Calculate authoritative live telemetry using engines
    const riskEngine = new RiskEngine(tasks, dependencies, events);
    const liveRisks = riskEngine.calculateAllRisks();
    const liveHealth = riskEngine.calculateProjectHealth(liveRisks);
    const depEngine = new DependencyEngine(tasks, dependencies);

    const apiKey = process.env.AI_API_KEY;
    const model = process.env.AI_MODEL || 'gemini-1.5-flash';

    // 1. If external AI API Key is configured, attempt secure external LLM call
    if (apiKey && apiKey.trim().length > 5) {
      try {
        const systemPrompt = `You are LifeLens Command AI, an operational decision-intelligence advisor for project execution and consequence analysis.
You have real-time access to the user's workspace telemetry:
Projects: ${JSON.stringify(projects.map((p) => ({ id: p.id, name: p.name, deadline: p.deadline })))}
Tasks: ${JSON.stringify(tasks.map((t) => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, hours: t.estimated_hours, deadline: t.deadline, assigned_to: t.assigned_to })))}
Dependencies: ${JSON.stringify(dependencies.map((d) => ({ from: d.source_task_id, to: d.target_task_id })))}
Live Risks: ${JSON.stringify(Object.values(liveRisks).map((r) => ({ task_id: r.task_id, score: r.risk_score, level: r.risk_level, why: r.why, affected: r.affected, action: r.action })))}
Project Health: ${liveHealth.healthScore}% (Overall Risk: ${liveHealth.overallRiskScore}/100, Critical Count: ${liveHealth.criticalCount})

STRICT RULES:
1. NEVER invent tasks, deadlines, dependencies, or team members that are not in the context above.
2. If tasks is empty, explicitly tell the user their workspace has no active tasks yet and advise them to create a project and task.
3. Keep the response crisp, tactical, and format using:
**PRIORITY ASSESSMENT**: [Direct concise finding]
**ROOT CAUSE / WHY**: [Specific metrics, estimated hours, deadlines]
**DOWNSTREAM IMPACT**: [Which specific downstream tasks and deliverables are threatened]
**TACTICAL ACTION**: [Clear mitigation or resequencing recommendation]`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8-second safety timeout

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `${systemPrompt}\n\nUser Question: ${prompt}` }],
                },
              ],
              generationConfig: {
                temperature: 0.2,
                maxOutputTokens: 600,
              },
            }),
          }
        );

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (replyText) {
            return NextResponse.json({
              content: replyText,
              provider: 'GEMINI_AI',
              model,
              structured_data: {
                priority_level: liveHealth.criticalCount > 0 ? 'CRITICAL' : 'MEDIUM',
                why: 'Real-time multi-agent context intelligence',
                affected_tasks: Object.values(liveRisks)
                  .filter((r) => r.risk_score >= 61)
                  .map((r) => tasks.find((t) => t.id === r.task_id)?.title || '')
                  .filter(Boolean),
                tactical_action: 'Execute proposed mitigation vector',
              },
            });
          }
        }
      } catch (externalErr: any) {
        // Fall back gracefully to built-in reasoning engine
        console.warn('External AI call failed or timed out, executing built-in reasoning engine:', externalErr.message);
      }
    }

    // 2. Built-in Deterministic Reasoning Intelligence Engine (High reliability, zero hallucination)
    const lower = prompt.toLowerCase();

    // ==========================================
    // CASE A: EMPTY WORKSPACE (No fabricated data)
    // ==========================================
    if (tasks.length === 0) {
      if (lower.includes('prioritize') || lower.includes('work on') || lower.includes('what should i do') || lower.includes('today')) {
        return NextResponse.json({
          content: `**PRIORITY ASSESSMENT**: You don't have any active tasks yet.\n\n` +
            `**ROOT CAUSE / WHY**: Your workspace currently contains 0 tasks and 0 projects.\n\n` +
            `**DOWNSTREAM IMPACT**: Zero downstream bottlenecks detected.\n\n` +
            `**TACTICAL ACTION**: Create a project and add your first task so LifeLens can begin analyzing priorities and dependencies.`,
          provider: 'BUILTIN_ENGINE',
          structured_data: {
            priority_level: 'LOW',
            why: 'Workspace is empty.',
            affected_tasks: [],
            tactical_action: 'Create your first project and task to start tracking dependencies.',
            suggested_commands: [
              'What should I prioritize today?',
              'What is my biggest risk?',
            ],
          },
        });
      }

      if (lower.includes('risk') || lower.includes('threat') || lower.includes('danger') || lower.includes('bottleneck')) {
        return NextResponse.json({
          content: `**PRIORITY ASSESSMENT**: All systems clear.\n\n` +
            `**ROOT CAUSE / WHY**: There are currently no task-level risks because your workspace has no active tasks.\n\n` +
            `**DOWNSTREAM IMPACT**: Zero dependencies at risk.\n\n` +
            `**TACTICAL ACTION**: Add tasks with deadlines and dependencies to enable proactive bottleneck detection.`,
          provider: 'BUILTIN_ENGINE',
          structured_data: {
            priority_level: 'LOW',
            why: 'No tasks registered in workspace.',
            affected_tasks: [],
            tactical_action: 'Add tasks to start calculating risk telemetry.',
          },
        });
      }

      return NextResponse.json({
        content: `**PRIORITY ASSESSMENT**: Welcome to LifeLens Command.\n\n` +
          `**ROOT CAUSE / WHY**: You have no active projects or tasks loaded in this workspace.\n\n` +
          `**DOWNSTREAM IMPACT**: Consequence analysis is in standby.\n\n` +
          `**TACTICAL ACTION**: Click **"+ Create First Project"** on your dashboard or choose **"Try Demo Workspace"** to explore the preloaded AI Campus Assistant demo.`,
        provider: 'BUILTIN_ENGINE',
        structured_data: {
          priority_level: 'LOW',
          why: 'Workspace empty.',
          affected_tasks: [],
          tactical_action: 'Create project or try demo workspace.',
        },
      });
    }

    // ==========================================
    // CASE B: INTENT — PRIORITIZATION ("What should I prioritize today?")
    // ==========================================
    if (lower.includes('prioritize') || lower.includes('what should i do') || lower.includes('focus on') || lower.includes('today')) {
      // Sort tasks by risk score descending, then priority, then deadline proximity
      const sortedTasks = [...tasks]
        .filter((t) => t.status !== 'COMPLETED')
        .sort((a, b) => {
          const scoreA = liveRisks[a.id]?.risk_score || 0;
          const scoreB = liveRisks[b.id]?.risk_score || 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });

      const topTask = sortedTasks[0] || tasks[0];
      const risk = liveRisks[topTask.id];
      const downstream = depEngine.getAllDownstream(topTask.id);
      const downstreamNames = downstream.map((d) => d.task.title);

      return NextResponse.json({
        content: `**PRIORITY ASSESSMENT**: Immediately prioritize **${topTask.title}**.\n\n` +
          `**ROOT CAUSE / WHY**: Evaluated at a Risk Score of **${risk?.risk_score ?? 0}/100** (${risk?.risk_level ?? 'LOW'}). ${risk?.why ?? 'Pending deliverable requiring immediate execution.'}\n\n` +
          `**DOWNSTREAM IMPACT**: Directly or transitively threatens **${downstream.length} downstream deliverable(s)**${downstreamNames.length > 0 ? ` (${downstreamNames.slice(0, 3).join(', ')})` : ''}.\n\n` +
          `**TACTICAL ACTION**: ${risk?.action ?? `Focus engineering velocity to complete ${topTask.title} before deadline.`}`,
        provider: 'BUILTIN_ENGINE',
        structured_data: {
          priority_level: risk?.risk_level || 'MEDIUM',
          why: risk?.why || `${topTask.estimated_hours}h estimated work.`,
          affected_tasks: downstreamNames,
          tactical_action: risk?.action || 'Execute primary milestone.',
          suggested_commands: [
            `What is putting my project at risk?`,
            `What happens if I delay ${topTask.title}?`,
            `Which task has the highest downstream impact?`,
          ],
        },
      });
    }

    // ==========================================
    // CASE C: INTENT — RISK ANALYSIS ("What is putting my project at risk?")
    // ==========================================
    if (lower.includes('risk') || lower.includes('threat') || lower.includes('danger') || lower.includes('bottleneck')) {
      const tasksWithRisks = tasks
        .map((t) => ({ task: t, risk: liveRisks[t.id] }))
        .filter((item) => item.risk && item.risk.risk_score >= 31)
        .sort((a, b) => (b.risk?.risk_score || 0) - (a.risk?.risk_score || 0));

      if (tasksWithRisks.length === 0) {
        return NextResponse.json({
          content: `**PRIORITY ASSESSMENT**: All systems green.\n\n` +
            `**ROOT CAUSE / WHY**: Overall project health is at **${liveHealth.healthScore}%**. None of your ${tasks.length} active tasks currently exceed the risk threshold.\n\n` +
            `**DOWNSTREAM IMPACT**: Zero downstream blockages detected.\n\n` +
            `**TACTICAL ACTION**: Maintain current schedule cadence across all active deliverables.`,
          provider: 'BUILTIN_ENGINE',
          structured_data: {
            priority_level: 'LOW',
            why: 'All tasks within safe time buffers.',
            affected_tasks: [],
            tactical_action: 'Proceed with planned milestones.',
          },
        });
      }

      const topThreat = tasksWithRisks[0];
      const risk = topThreat.risk;
      const downstream = depEngine.getAllDownstream(topThreat.task.id);
      const downstreamNames = downstream.map((d) => d.task.title);

      return NextResponse.json({
        content: `**PRIORITY ASSESSMENT**: The primary threat to your project is **${topThreat.task.title}** (Risk Score: **${risk.risk_score}/100**).\n\n` +
          `**ROOT CAUSE / WHY**: ${risk.why}\n\n` +
          `**DOWNSTREAM IMPACT**: This bottleneck directly jeopardizes **${downstream.length} downstream deliverable(s)**: ${downstreamNames.length > 0 ? downstreamNames.join(', ') : 'None'}.\n\n` +
          `**TACTICAL ACTION**: ${risk.action}`,
        provider: 'BUILTIN_ENGINE',
        structured_data: {
          priority_level: risk.risk_level,
          why: risk.why,
          affected_tasks: downstreamNames,
          tactical_action: risk.action,
          suggested_commands: [
            `What should I prioritize today?`,
            `What happens if I delay ${topThreat.task.title}?`,
            `Which task has the highest downstream impact?`,
          ],
        },
      });
    }

    // ==========================================
    // CASE D: INTENT — SIMULATION ("What happens if I delay [Task]?")
    // ==========================================
    if (lower.includes('delay') || lower.includes('postpone') || lower.includes('what happens if') || lower.includes('simulate')) {
      // Find matching task mentioned in prompt, or default to highest risk task
      let targetTask = tasks.find((t) => lower.includes(t.title.toLowerCase()));
      if (!targetTask) {
        const sorted = [...tasks].sort((a, b) => (liveRisks[b.id]?.risk_score || 0) - (liveRisks[a.id]?.risk_score || 0));
        targetTask = sorted[0];
      }

      if (targetTask) {
        const simEngine = new SimulationEngine(tasks, dependencies, events);
        const simResult = simEngine.simulate({
          id: `sim-chat-${Date.now()}`,
          name: `Simulated Delay on ${targetTask.title}`,
          description: `Hypothetical 24h delay on ${targetTask.title}`,
          type: 'DELAY_TASK',
          payload: {
            taskId: targetTask.id,
            delayHours: 24,
          },
        });

        return NextResponse.json({
          content: `**PRIORITY ASSESSMENT**: Simulating a 24-hour delay on **${targetTask.title}**:\n\n` +
            `**ROOT CAUSE / WHY**: ${simResult.impact_summary.why_it_matters}\n\n` +
            `**DOWNSTREAM IMPACT**: Project Health drops from **${simResult.original_state.project_health}% to ${simResult.simulated_state.project_health}%** (${simResult.impact_summary.project_health_delta}% shift). Affects **${simResult.impact_summary.affected_task_ids.length} tasks** in the DAG.\n\n` +
            `**TACTICAL ACTION**: ${simResult.impact_summary.recommended_action}`,
          provider: 'BUILTIN_ENGINE',
          structured_data: {
            priority_level: 'CRITICAL',
            why: simResult.impact_summary.why_it_matters,
            affected_tasks: simResult.impact_summary.affected_task_names,
            tactical_action: simResult.impact_summary.recommended_action,
            suggested_commands: [
              `What should I prioritize today?`,
              `Which task has the highest downstream impact?`,
            ],
          },
        });
      }
    }

    // ==========================================
    // CASE E: INTENT — DEPENDENCY ANALYSIS ("Which task has highest downstream impact?")
    // ==========================================
    if (lower.includes('downstream') || lower.includes('most dependents') || lower.includes('multiplier') || lower.includes('highest impact') || lower.includes('graph')) {
      const taskImpacts = tasks.map((t) => {
        const downstream = depEngine.getAllDownstream(t.id);
        return {
          task: t,
          count: downstream.length,
          names: downstream.map((d) => d.task.title),
        };
      }).sort((a, b) => b.count - a.count);

      const topMultiplier = taskImpacts[0];

      if (!topMultiplier || topMultiplier.count === 0) {
        return NextResponse.json({
          content: `**PRIORITY ASSESSMENT**: No multi-tier dependencies detected.\n\n` +
            `**ROOT CAUSE / WHY**: None of the ${tasks.length} tasks in this workspace have outgoing dependency edges.\n\n` +
            `**DOWNSTREAM IMPACT**: Tasks can currently proceed independently in parallel.\n\n` +
            `**TACTICAL ACTION**: Use the Life Map graph or task editor to link predecessor and successor tasks.`,
          provider: 'BUILTIN_ENGINE',
          structured_data: {
            priority_level: 'LOW',
            why: 'No dependency edges in graph.',
            affected_tasks: [],
            tactical_action: 'Link tasks in Life Map to enable cascading consequence tracking.',
          },
        });
      }

      return NextResponse.json({
        content: `**PRIORITY ASSESSMENT**: **${topMultiplier.task.title}** has the highest downstream consequence multiplier in this workspace.\n\n` +
          `**ROOT CAUSE / WHY**: It directly or transitively blocks **${topMultiplier.count} of your ${tasks.length} tasks** in the topological execution graph.\n\n` +
          `**DOWNSTREAM IMPACT**: Downstream tasks held in waiting: ${topMultiplier.names.join(', ')}.\n\n` +
          `**TACTICAL ACTION**: Protect this critical predecessor. Implement stubs, mock contracts, or assign paired engineering capacity to ensure it completes without slippage.`,
        provider: 'BUILTIN_ENGINE',
        structured_data: {
          priority_level: 'HIGH',
          why: `Blocks ${topMultiplier.count} downstream deliverables.`,
          affected_tasks: topMultiplier.names,
          tactical_action: `Deliver intermediate artifacts to unblock ${topMultiplier.names[0]}.`,
          suggested_commands: [
            `What happens if I delay ${topMultiplier.task.title}?`,
            `What should I prioritize today?`,
          ],
        },
      });
    }

    // ==========================================
    // CASE F: INTENT — CALENDAR & EVENTS ("What events do I have today?")
    // ==========================================
    if (lower.includes('event') || lower.includes('calendar') || lower.includes('meeting') || lower.includes('schedule')) {
      if (events.length === 0) {
        return NextResponse.json({
          content: `**PRIORITY ASSESSMENT**: No calendar collisions detected.\n\n` +
            `**ROOT CAUSE / WHY**: You have 0 scheduled events recorded in your calendar.\n\n` +
            `**DOWNSTREAM IMPACT**: All engineering capacity remains unfragmented.\n\n` +
            `**TACTICAL ACTION**: Add classes, syncs, or mentor checkpoints on the Calendar page to track time collisions against hard task deadlines.`,
          provider: 'BUILTIN_ENGINE',
          structured_data: {
            priority_level: 'LOW',
            why: 'Zero calendar events.',
            affected_tasks: [],
            tactical_action: 'Add events in Calendar to detect collision overlaps.',
          },
        });
      }

      const eventList = events.map((e) => `• **${e.title}** (${new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(e.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`).join('\n');

      return NextResponse.json({
        content: `**PRIORITY ASSESSMENT**: You have **${events.length} event(s)** on your operational schedule:\n\n${eventList}\n\n` +
          `**ROOT CAUSE / WHY**: Calendar commitments require synchronous attendance and reduce available task execution buffers.\n\n` +
          `**DOWNSTREAM IMPACT**: Review Calendar to ensure events do not collide within 1 hour of imminent task deadlines.\n\n` +
          `**TACTICAL ACTION**: Guard core focus hours during approaching milestone windows.`,
        provider: 'BUILTIN_ENGINE',
        structured_data: {
          priority_level: 'MEDIUM',
          why: `${events.length} scheduled calendar events.`,
          affected_tasks: [],
          tactical_action: 'Inspect Calendar for deadline overlaps.',
        },
      });
    }

    // ==========================================
    // DEFAULT GENERAL WORKSPACE TELEMETRY QUERY
    // ==========================================
    const criticalCount = liveHealth.criticalCount;
    return NextResponse.json({
      content: `**PRIORITY ASSESSMENT**: Monitoring ${tasks.length} tasks and ${dependencies.length} dependencies across your active workspace.\n\n` +
        `**ROOT CAUSE / WHY**: Project health is currently evaluated at **${liveHealth.healthScore}%** with an overall risk index of **${liveHealth.overallRiskScore}/100** (${criticalCount} critical bottleneck${criticalCount === 1 ? '' : 's'}).\n\n` +
        `**DOWNSTREAM IMPACT**: Topological dependency tracking is active.\n\n` +
        `**TACTICAL ACTION**: Ask specific questions such as *"What should I prioritize today?"*, *"What is putting my project at risk?"*, or *"Which task has the highest downstream impact?"*`,
      provider: 'BUILTIN_ENGINE',
      structured_data: {
        priority_level: criticalCount > 0 ? 'CRITICAL' : 'MEDIUM',
        why: 'Real-time telemetry overview.',
        affected_tasks: Object.values(liveRisks).filter((r) => r.risk_score >= 61).map((r) => tasks.find((t) => t.id === r.task_id)?.title || '').filter(Boolean),
        tactical_action: 'Explore recommendations or simulate disruptions.',
        suggested_commands: [
          'What should I prioritize today?',
          'What is putting my project at risk?',
          'Which task has the highest downstream impact?',
        ],
      },
    });
  } catch (error: any) {
    console.error('AI command route error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI command query', details: error.message },
      { status: 500 }
    );
  }
}
