import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { sendPushToUser } from '@/lib/server-push';

export const dynamic = 'force-dynamic';

/**
 * Server-side Notification Scheduler & Dispatcher
 * Periodically checks upcoming deadlines, overdue tasks, daily summaries,
 * and dispatches Web Push with strict idempotency and duplicate prevention.
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

    // 2. Fetch all user preferences to respect custom reminder timings & timezones
    const { data: allPrefs } = await supabase
      .from('notification_preferences')
      .select('*');

    const prefsMap = new Map<string, any>();
    for (const p of allPrefs || []) {
      prefsMap.set(p.user_id, p);
    }

    // Default preference generator
    const getUserPrefs = (userId: string) => {
      return (
        prefsMap.get(userId) || {
          user_id: userId,
          push_enabled: true,
          task_deadlines_enabled: true,
          project_deadlines_enabled: true,
          reminders_enabled: true,
          overdue_enabled: true,
          daily_summary_enabled: false,
          daily_summary_time: '09:00',
          task_reminder_timings: ['24h', '12h', '2h', '1h', '30m', 'at_deadline'],
          project_reminder_timings: ['7d', '3d', '24h', '12h', '2h', 'at_deadline'],
          timezone: 'UTC',
        }
      );
    };

    // 3. Process Active Tasks for Impending Deadlines and Overdue States
    const { data: activeTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .neq('status', 'COMPLETED');

    if (tasksError) throw tasksError;

    for (const task of activeTasks || []) {
      const prefs = getUserPrefs(task.user_id);
      const deadline = new Date(task.deadline).getTime();
      const diffHours = (deadline - nowMs) / (1000 * 3600);

      // A. Overdue Check
      if (diffHours < 0 && diffHours >= -72 && prefs.overdue_enabled) {
        const overdueTag = `overdue-${task.id}`;

        // Idempotency: verify this overdue alert hasn't already been sent
        const { data: existingOverdue } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', task.user_id)
          .eq('task_id', task.id)
          .contains('payload', { tag: overdueTag });

        if (!existingOverdue || existingOverdue.length === 0) {
          const hoursAgo = Math.max(1, Math.round(Math.abs(diffHours)));
          const title = 'Task overdue';
          const body = `"${task.title}" is overdue by ${hoursAgo}h. Check downstream deliverables to mitigate cascading delay.`;

          await supabase.from('notifications').insert([
            {
              user_id: task.user_id,
              type: 'TASK_OVERDUE',
              title,
              message: body,
              task_id: task.id,
              project_id: task.project_id,
              scheduled_for: now.toISOString(),
              sent_at: now.toISOString(),
              status: 'sent',
              payload: { tag: overdueTag, url: '/tasks' },
            },
          ]);

          const pushRes = await sendPushToUser(task.user_id, {
            title,
            body,
            url: '/tasks',
            tag: overdueTag,
            taskId: task.id,
          });

          if (pushRes.sent > 0) {
            notificationsSent++;
            dispatchLogs.push(`Sent overdue alert for task: "${task.title}"`);
          }
        }
      }

      // B. Upcoming Deadline Windows (Respecting user's selected intervals)
      if (prefs.task_deadlines_enabled && diffHours >= 0) {
        const allowedTimings: string[] = prefs.task_reminder_timings || [
          '24h',
          '12h',
          '2h',
          '1h',
          '30m',
          'at_deadline',
        ];

        let matchedTiming: string | null = null;
        let notifTitle = '';
        let notifBody = '';

        if (diffHours <= 0.25 && allowedTimings.includes('at_deadline')) {
          matchedTiming = 'at_deadline';
          notifTitle = 'LifeLens Alert — Deadline Now';
          notifBody = `Deadline reached for "${task.title}". Complete or adjust timeline.`;
        } else if (diffHours > 0.25 && diffHours <= 0.6 && allowedTimings.includes('30m')) {
          matchedTiming = '30m';
          notifTitle = 'LifeLens Reminder — 30m Remaining';
          notifBody = `"${task.title}" is due in 30 minutes.`;
        } else if (diffHours > 0.6 && diffHours <= 1.2 && allowedTimings.includes('1h')) {
          matchedTiming = '1h';
          notifTitle = 'LifeLens Reminder — 1h Remaining';
          notifBody = `"${task.title}" is due in 1 hour (${task.estimated_hours || 1}h work estimated).`;
        } else if (diffHours > 1.2 && diffHours <= 2.5 && allowedTimings.includes('2h')) {
          matchedTiming = '2h';
          notifTitle = 'LifeLens Reminder — 2h Remaining';
          notifBody = `"${task.title}" is due in 2 hours.`;
        } else if (diffHours > 10.0 && diffHours <= 13.0 && allowedTimings.includes('12h')) {
          matchedTiming = '12h';
          notifTitle = 'LifeLens Reminder — 12h Remaining';
          notifBody = `"${task.title}" is due in 12 hours.`;
        } else if (diffHours > 22.0 && diffHours <= 26.0 && allowedTimings.includes('24h')) {
          matchedTiming = '24h';
          notifTitle = 'Task due tomorrow';
          notifBody = `"${task.title}" is due tomorrow. Keep momentum on deliverables.`;
        }

        if (matchedTiming) {
          const timingTag = `${task.id}-${matchedTiming}`;
          const { data: existingTiming } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', task.user_id)
            .eq('task_id', task.id)
            .contains('payload', { tag: timingTag });

          if (!existingTiming || existingTiming.length === 0) {
            await supabase.from('notifications').insert([
              {
                user_id: task.user_id,
                type: 'TASK_DEADLINE',
                title: notifTitle,
                message: notifBody,
                task_id: task.id,
                project_id: task.project_id,
                scheduled_for: now.toISOString(),
                sent_at: now.toISOString(),
                status: 'sent',
                payload: { tag: timingTag, url: '/tasks' },
              },
            ]);

            const pushRes = await sendPushToUser(task.user_id, {
              title: notifTitle,
              body: notifBody,
              url: '/tasks',
              tag: timingTag,
              taskId: task.id,
              projectId: task.project_id,
            });

            if (pushRes.sent > 0) {
              notificationsSent++;
              dispatchLogs.push(`Sent ${matchedTiming} alert for task: "${task.title}"`);
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
      const prefs = getUserPrefs(proj.user_id);
      if (!prefs.project_deadlines_enabled) continue;

      const pDeadline = new Date(proj.deadline).getTime();
      const pDiffHours = (pDeadline - nowMs) / (1000 * 3600);
      const allowedProjTimings: string[] = prefs.project_reminder_timings || [
        '7d',
        '3d',
        '24h',
        '12h',
        '2h',
        'at_deadline',
      ];

      let pTiming: string | null = null;
      let pTitle = '';
      let pBody = '';

      if (pDiffHours <= 0.25 && allowedProjTimings.includes('at_deadline')) {
        pTiming = 'proj_at_deadline';
        pTitle = 'Project deadline is today';
        pBody = `Project deadline reached for "${proj.name}". Confirm deliverable handover.`;
      } else if (pDiffHours > 0.25 && pDiffHours <= 2.5 && allowedProjTimings.includes('2h')) {
        pTiming = 'proj_2h';
        pTitle = 'LifeLens Project Alert — 2h Remaining';
        pBody = `Project milestone "${proj.name}" is due in 2 hours!`;
      } else if (pDiffHours > 10.0 && pDiffHours <= 13.0 && allowedProjTimings.includes('12h')) {
        pTiming = 'proj_12h';
        pTitle = 'LifeLens Project Alert — 12h Remaining';
        pBody = `Project "${proj.name}" has 12 hours remaining.`;
      } else if (pDiffHours > 22.0 && pDiffHours <= 26.0 && allowedProjTimings.includes('24h')) {
        pTiming = 'proj_24h';
        pTitle = 'Project deadline is tomorrow';
        pBody = `Project milestone "${proj.name}" is due within 24 hours.`;
      } else if (pDiffHours > 68.0 && pDiffHours <= 76.0 && allowedProjTimings.includes('3d')) {
        pTiming = 'proj_3d';
        pTitle = 'LifeLens Project Alert — 3 Days Remaining';
        pBody = `Project milestone "${proj.name}" deadline is in 3 days.`;
      } else if (pDiffHours > 164.0 && pDiffHours <= 172.0 && allowedProjTimings.includes('7d')) {
        pTiming = 'proj_7d';
        pTitle = 'LifeLens Project Alert — 7 Days Remaining';
        pBody = `1 week until final delivery for project "${proj.name}".`;
      }

      if (pTiming) {
        const pTag = `${proj.id}-${pTiming}`;
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
              payload: { tag: pTag, url: '/projects' },
            },
          ]);

          const pRes = await sendPushToUser(proj.user_id, {
            title: pTitle,
            body: pBody,
            url: '/projects',
            tag: pTag,
            projectId: proj.id,
          });

          if (pRes.sent > 0) {
            notificationsSent++;
            dispatchLogs.push(`Sent project alert for "${proj.name}"`);
          }
        }
      }
    }

    // 5. Daily Summary Dispatch (Timezone-Aware)
    for (const [userId, prefs] of prefsMap.entries()) {
      if (!prefs.daily_summary_enabled) continue;

      const userTz = prefs.timezone || 'UTC';
      let currentHour = '09';
      let todayDateStr = now.toISOString().slice(0, 10);

      try {
        const timeFormatter = new Intl.DateTimeFormat('en-GB', {
          timeZone: userTz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
        const dateFormatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: userTz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        todayDateStr = dateFormatter.format(now);
        currentHour = timeFormatter.formatToParts(now).find((p) => p.type === 'hour')?.value || '09';
      } catch (err) {
        console.warn('Timezone calculation fallback:', err);
      }

      const prefHour = (prefs.daily_summary_time || '09:00').split(':')[0];

      // Trigger if current local hour matches configured daily summary hour
      if (currentHour === prefHour) {
        const dailyTag = `daily-summary-${userId}-${todayDateStr}`;

        const { data: existingDaily } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', userId)
          .contains('payload', { tag: dailyTag });

        if (!existingDaily || existingDaily.length === 0) {
          // Count user's active tasks, overdue tasks, and project milestones
          const { data: userTasks } = await supabase
            .from('tasks')
            .select('id, deadline, status')
            .eq('user_id', userId)
            .neq('status', 'COMPLETED');

          const taskList = userTasks || [];
          const overdueTasksCount = taskList.filter(
            (t) => new Date(t.deadline).getTime() < nowMs
          ).length;

          // Tasks due today in user timezone
          const dueTodayCount = taskList.filter((t) => {
            const d = new Date(t.deadline);
            return (
              d.getTime() >= nowMs &&
              d.getTime() <= nowMs + 24 * 3600 * 1000
            );
          }).length;

          // Projects due this week
          const { data: userProjects } = await supabase
            .from('projects')
            .select('id, deadline')
            .eq('user_id', userId)
            .eq('status', 'ACTIVE');

          const projDueThisWeek = (userProjects || []).filter((p) => {
            if (!p.deadline) return false;
            const diff = (new Date(p.deadline).getTime() - nowMs) / (1000 * 3600 * 24);
            return diff >= 0 && diff <= 7;
          }).length;

          const summaryTitle = 'Good morning 👋';
          const summaryLines = [
            `You have:`,
            `${dueTodayCount} task${dueTodayCount === 1 ? '' : 's'} today`,
            `${projDueThisWeek} project deadline${projDueThisWeek === 1 ? '' : 's'} this week`,
            ...(overdueTasksCount > 0
              ? [`${overdueTasksCount} overdue task${overdueTasksCount === 1 ? '' : 's'}`]
              : []),
          ];
          const summaryBody = summaryLines.join('\n');

          await supabase.from('notifications').insert([
            {
              user_id: userId,
              type: 'DAILY_SUMMARY',
              title: summaryTitle,
              message: summaryBody,
              scheduled_for: now.toISOString(),
              sent_at: now.toISOString(),
              status: 'sent',
              payload: { tag: dailyTag, url: '/dashboard' },
            },
          ]);

          const summaryPush = await sendPushToUser(userId, {
            title: summaryTitle,
            body: summaryBody,
            url: '/dashboard',
            tag: dailyTag,
          });

          if (summaryPush.sent > 0) {
            notificationsSent++;
            dispatchLogs.push(`Sent Daily Summary to user ${userId}`);
          }
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
