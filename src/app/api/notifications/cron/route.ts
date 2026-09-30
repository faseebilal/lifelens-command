import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { sendPushToUser } from '@/lib/server-push';

export const dynamic = 'force-dynamic';

/**
 * Server-side Notification Scheduler & Dispatcher
 * Periodically checks upcoming deadlines, overdue tasks, and dispatches Web Push
 * with strict idempotency and duplicate prevention.
 */
export async function GET(req: NextRequest) {
  return handleSchedule(req);
}

export async function POST(req: NextRequest) {
  return handleSchedule(req);
}

async function handleSchedule(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  // Optional security check if CRON_SECRET is configured
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    // In dev or hackathon, allow query param ?secret=... or manual run
    const url = new URL(req.url);
    if (url.searchParams.get('secret') !== cronSecret && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
    }
  }

  const now = new Date();
  const nowMs = now.getTime();
  let notificationsSent = 0;
  const dispatchLogs: string[] = [];

  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        message: 'Supabase unconfigured; server scheduler operates in offline standby mode.',
        notificationsSent: 0,
      });
    }

    // 1. Cancel pending notifications for tasks that have been COMPLETED
    const { data: completedTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('status', 'COMPLETED');

    if (completedTasks && completedTasks.length > 0) {
      const completedIds = completedTasks.map((t) => t.id);
      await supabase
        .from('notifications')
        .update({ status: 'cancelled' })
        .in('task_id', completedIds)
        .eq('status', 'scheduled');
    }

    // 2. Fetch active tasks with deadlines
    const { data: activeTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .neq('status', 'COMPLETED');

    if (tasksError) throw tasksError;

    // 3. Process each task for impending deadline or overdue state
    for (const task of activeTasks || []) {
      const deadline = new Date(task.deadline).getTime();
      const diffHours = (deadline - nowMs) / (1000 * 3600);

      // Determine timing window
      let timingCategory: string | null = null;
      let notificationTitle = '';
      let notificationBody = '';
      let isOverdue = false;

      if (diffHours < 0 && diffHours >= -48) {
        // Overdue within last 48 hours
        isOverdue = true;
        timingCategory = 'overdue';
        notificationTitle = 'LifeLens Alert — Task Overdue';
        notificationBody = `"${task.title}" is overdue by ${Math.abs(Math.round(diffHours))}h. Review your critical path to mitigate cascading delay.`;
      } else if (diffHours >= 0 && diffHours <= 0.25) {
        timingCategory = 'at_deadline';
        notificationTitle = 'LifeLens Alert — Deadline Now';
        notificationBody = `Deadline reached for "${task.title}". Complete or adjust timeline.`;
      } else if (diffHours > 0.25 && diffHours <= 0.6) {
        timingCategory = '30m';
        notificationTitle = 'LifeLens Reminder — 30m Remaining';
        notificationBody = `"${task.title}" is due in 30 minutes.`;
      } else if (diffHours > 0.6 && diffHours <= 1.2) {
        timingCategory = '1h';
        notificationTitle = 'LifeLens Reminder — 1h Remaining';
        notificationBody = `"${task.title}" is due in 1 hour (${task.estimated_hours}h estimated work).`;
      } else if (diffHours > 1.2 && diffHours <= 2.5) {
        timingCategory = '2h';
        notificationTitle = 'LifeLens Reminder — 2h Remaining';
        notificationBody = `"${task.title}" is due in 2 hours. Review upstream blockers.`;
      } else if (diffHours > 10.0 && diffHours <= 13.0) {
        timingCategory = '12h';
        notificationTitle = 'LifeLens Reminder — 12h Remaining';
        notificationBody = `"${task.title}" is due in 12 hours.`;
      } else if (diffHours > 22.0 && diffHours <= 26.0) {
        timingCategory = '24h';
        notificationTitle = 'LifeLens Reminder — 24h Remaining';
        notificationBody = `"${task.title}" is due tomorrow. Keep momentum on deliverables.`;
      }

      if (timingCategory) {
        // Idempotency check: verify notification not already recorded
        const dedupTag = `${task.id}-${timingCategory}`;
        const { data: existingNotifs } = await supabase
          .from('notifications')
          .select('id, status')
          .eq('user_id', task.user_id)
          .eq('task_id', task.id)
          .contains('payload', { tag: dedupTag });

        const alreadySent = existingNotifs && existingNotifs.length > 0;

        if (!alreadySent) {
          // Record notification
          const { error: insertError } = await supabase.from('notifications').insert([
            {
              user_id: task.user_id,
              type: isOverdue ? 'TASK_OVERDUE' : 'TASK_DEADLINE',
              title: notificationTitle,
              message: notificationBody,
              task_id: task.id,
              project_id: task.project_id,
              scheduled_for: now.toISOString(),
              sent_at: now.toISOString(),
              status: 'sent',
              payload: { tag: dedupTag, url: `/tasks` },
            },
          ]);

          if (!insertError) {
            // Send real Web Push via VAPID
            const pushResult = await sendPushToUser(task.user_id, {
              title: notificationTitle,
              body: notificationBody,
              url: `/tasks`,
              tag: dedupTag,
              taskId: task.id,
              projectId: task.project_id,
            });

            if (pushResult.sent > 0) {
              notificationsSent++;
              dispatchLogs.push(`Sent ${timingCategory} push for task "${task.title}"`);
            }
          }
        }
      }
    }

    // 4. Process Project Deadlines
    const { data: activeProjects } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'ACTIVE');

    for (const proj of activeProjects || []) {
      if (!proj.deadline) continue;
      const pDeadline = new Date(proj.deadline).getTime();
      const pDiffHours = (pDeadline - nowMs) / (1000 * 3600);

      let pTimingCategory: string | null = null;
      let pTitle = '';
      let pBody = '';

      if (pDiffHours > 0 && pDiffHours <= 2.5) {
        pTimingCategory = 'proj_2h';
        pTitle = 'LifeLens Project Alert — 2h Remaining';
        pBody = `Project milestone "${proj.name}" closes in 2 hours!`;
      } else if (pDiffHours > 22 && pDiffHours <= 26) {
        pTimingCategory = 'proj_24h';
        pTitle = 'LifeLens Project Alert — Due Tomorrow';
        pBody = `Project milestone "${proj.name}" is due within 24 hours.`;
      }

      if (pTimingCategory) {
        const pTag = `${proj.id}-${pTimingCategory}`;
        const { data: existingProjNotifs } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', proj.user_id)
          .eq('project_id', proj.id)
          .contains('payload', { tag: pTag });

        if (!existingProjNotifs || existingProjNotifs.length === 0) {
          await supabase.from('notifications').insert([
            {
              user_id: proj.user_id,
              type: 'PROJECT_DEADLINE',
              title: pTitle,
              message: pBody,
              project_id: proj.id,
              scheduled_for: now.toISOString(),
              sent_at: now.toISOString(),
              status: 'sent',
              payload: { tag: pTag, url: `/projects` },
            },
          ]);

          const pRes = await sendPushToUser(proj.user_id, {
            title: pTitle,
            body: pBody,
            url: `/projects`,
            tag: pTag,
            projectId: proj.id,
          });

          if (pRes.sent > 0) notificationsSent++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      tasksChecked: (activeTasks || []).length,
      projectsChecked: (activeProjects || []).length,
      notificationsSent,
      logs: dispatchLogs,
    });
  } catch (error: any) {
    console.error('Scheduler execution error:', error);
    return NextResponse.json({ error: error.message || 'Scheduler failed' }, { status: 500 });
  }
}
