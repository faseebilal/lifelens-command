import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export const dynamic = 'force-dynamic';

/**
 * Real-time Notification Schedule Recalculation API
 * Immediately reacts to task/project changes (deadline edits, completions, deletions)
 * to cancel obsolete notifications and regenerate schedule according to user preferences.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, action, taskId, projectId, deadline, status } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: true,
        message: 'Supabase unconfigured; notification schedule sync operates in local mode.',
      });
    }

    // 1. Task Completed -> Cancel all scheduled future notifications for this task
    if (action === 'TASK_COMPLETED' || status === 'COMPLETED') {
      if (taskId) {
        await supabase
          .from('notifications')
          .update({ status: 'cancelled' })
          .eq('task_id', taskId)
          .eq('status', 'scheduled');
      }
      return NextResponse.json({
        success: true,
        message: 'Future scheduled reminders successfully cancelled for completed task.',
      });
    }

    // 2. Task Deleted -> Cancel all notifications for this task
    if (action === 'TASK_DELETED') {
      if (taskId) {
        await supabase
          .from('notifications')
          .update({ status: 'cancelled' })
          .eq('task_id', taskId)
          .eq('status', 'scheduled');
      }
      return NextResponse.json({
        success: true,
        message: 'Notification schedule purged for deleted task.',
      });
    }

    // 3. Task Deadline Changed or Task Created -> Cancel obsolete reminders & recalculate
    if (
      action === 'TASK_DEADLINE_CHANGED' ||
      action === 'TASK_CREATED' ||
      action === 'TASK_UPDATED'
    ) {
      if (taskId) {
        // Cancel previous scheduled reminders for this task
        await supabase
          .from('notifications')
          .update({ status: 'cancelled' })
          .eq('task_id', taskId)
          .eq('status', 'scheduled');

        // Fetch user preferences
        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        const taskDeadlinesEnabled = prefs ? prefs.task_deadlines_enabled : true;
        const timings: string[] = prefs?.task_reminder_timings || [
          '24h',
          '2h',
          'at_deadline',
        ];

        if (taskDeadlinesEnabled && deadline) {
          const deadlineMs = new Date(deadline).getTime();
          const timingOffsets: Record<string, number> = {
            '24h': 24 * 3600 * 1000,
            '12h': 12 * 3600 * 1000,
            '2h': 2 * 3600 * 1000,
            '1h': 1 * 3600 * 1000,
            '30m': 30 * 60 * 1000,
            at_deadline: 0,
          };

          const newScheduledRows = [];
          const nowMs = Date.now();

          for (const timing of timings) {
            const offset = timingOffsets[timing];
            if (offset !== undefined) {
              const scheduledTime = new Date(deadlineMs - offset);
              // Only schedule reminders for future moments
              if (scheduledTime.getTime() > nowMs) {
                newScheduledRows.push({
                  user_id: userId,
                  type: 'TASK_DEADLINE',
                  title:
                    timing === 'at_deadline'
                      ? 'LifeLens Alert — Deadline Now'
                      : `LifeLens Reminder — Due in ${timing}`,
                  message: `Task deadline is approaching. Review your critical path to mitigate cascading delay.`,
                  task_id: taskId,
                  scheduled_for: scheduledTime.toISOString(),
                  status: 'scheduled',
                  payload: { tag: `${taskId}-${timing}`, url: '/tasks' },
                });
              }
            }
          }

          if (newScheduledRows.length > 0) {
            await supabase.from('notifications').insert(newScheduledRows);
          }
        }
      }
      return NextResponse.json({
        success: true,
        message: 'Notification schedule recalculated successfully.',
      });
    }

    // 4. Project completions / deletions
    if (action === 'PROJECT_DELETED' || action === 'PROJECT_COMPLETED') {
      if (projectId) {
        await supabase
          .from('notifications')
          .update({ status: 'cancelled' })
          .eq('project_id', projectId)
          .eq('status', 'scheduled');
      }
      return NextResponse.json({
        success: true,
        message: 'Project notifications updated.',
      });
    }

    // 5. Project deadline changed / created
    if (action === 'PROJECT_DEADLINE_CHANGED' || action === 'PROJECT_CREATED') {
      if (projectId) {
        await supabase
          .from('notifications')
          .update({ status: 'cancelled' })
          .eq('project_id', projectId)
          .eq('status', 'scheduled');

        const { data: prefs } = await supabase
          .from('notification_preferences')
          .select('*')
          .eq('user_id', userId)
          .single();

        const projEnabled = prefs ? prefs.project_deadlines_enabled : true;
        const pTimings: string[] = prefs?.project_reminder_timings || ['24h', 'at_deadline'];

        if (projEnabled && deadline) {
          const deadlineMs = new Date(deadline).getTime();
          const pOffsets: Record<string, number> = {
            '7d': 7 * 24 * 3600 * 1000,
            '3d': 3 * 24 * 3600 * 1000,
            '24h': 24 * 3600 * 1000,
            '12h': 12 * 3600 * 1000,
            '2h': 2 * 3600 * 1000,
            at_deadline: 0,
          };

          const newProjRows = [];
          const nowMs = Date.now();

          for (const timing of pTimings) {
            const offset = pOffsets[timing];
            if (offset !== undefined) {
              const scheduledTime = new Date(deadlineMs - offset);
              if (scheduledTime.getTime() > nowMs) {
                newProjRows.push({
                  user_id: userId,
                  type: 'PROJECT_DEADLINE',
                  title:
                    timing === 'at_deadline'
                      ? 'LifeLens Project Alert — Deadline Reached'
                      : `LifeLens Project Milestone — Due in ${timing}`,
                  message: `Project milestone deadline is imminent. Confirm deliverables are on track.`,
                  project_id: projectId,
                  scheduled_for: scheduledTime.toISOString(),
                  status: 'scheduled',
                  payload: { tag: `${projectId}-${timing}`, url: '/projects' },
                });
              }
            }
          }

          if (newProjRows.length > 0) {
            await supabase.from('notifications').insert(newProjRows);
          }
        }
      }
      return NextResponse.json({
        success: true,
        message: 'Project notification schedule recalculated.',
      });
    }

    return NextResponse.json({ success: true, message: 'Sync completed.' });
  } catch (err: any) {
    console.error('Notification sync error:', err);
    return NextResponse.json(
      { error: err.message || 'Notification sync failed' },
      { status: 500 }
    );
  }
}
