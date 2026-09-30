import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  const defaultPreferences = {
    user_id: userId,
    push_enabled: false,
    task_deadlines_enabled: true,
    project_deadlines_enabled: true,
    reminders_enabled: true,
    overdue_enabled: true,
    daily_summary_enabled: false,
    daily_summary_time: '09:00',
    task_reminder_timings: ['24h', '2h', 'at_deadline'],
    project_reminder_timings: ['24h', 'at_deadline'],
    timezone: 'UTC',
  };

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!error && data) {
        return NextResponse.json({ preferences: data });
      }
    } catch {
      // Fallback
    }
  }

  return NextResponse.json({ preferences: defaultPreferences });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, preferences } = body;

    if (!userId || !preferences) {
      return NextResponse.json({ error: 'Missing userId or preferences' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('notification_preferences')
          .upsert(
            {
              user_id: userId,
              ...preferences,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

        if (error) throw error;
      } catch (err: any) {
        console.warn('Preferences upsert note:', err.message);
      }
    }

    return NextResponse.json({ success: true, preferences });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Preferences save error' }, { status: 500 });
  }
}
