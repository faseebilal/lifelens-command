import { NextRequest, NextResponse } from 'next/server';
import { sendPushToUser } from '@/lib/server-push';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const payload = {
      title: 'LifeLens Command — Priority Alert',
      body: 'Java DSA Practice is due in 2 hours. Review your dependency graph before deadlines compress.',
      url: '/tasks',
      tag: `test-push-${Date.now()}`,
    };

    // 1. Dispatch real Web Push notification via VAPID
    const pushResult = await sendPushToUser(userId, payload);

    // 2. Persist In-App Notification in Supabase if configured
    if (isSupabaseConfigured()) {
      try {
        await supabase.from('notifications').insert([
          {
            user_id: userId,
            type: 'TASK_DEADLINE',
            title: payload.title,
            message: payload.body,
            scheduled_for: new Date().toISOString(),
            sent_at: new Date().toISOString(),
            status: 'sent',
            payload: { url: payload.url },
          },
        ]);
      } catch (err) {
        console.warn('In-app notification insert note:', err);
      }
    }

    return NextResponse.json({
      success: true,
      sentCount: pushResult.sent,
      devicesCount: pushResult.total,
      message:
        pushResult.sent > 0
          ? `Dispatched push notification to ${pushResult.sent} device(s).`
          : pushResult.total === 0
          ? 'Notification created in Notification Center. (Enable Push on this device to receive system banners while closed).'
          : 'Attempted push delivery. Devices will receive the notification upon network sync.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to dispatch test notification' },
      { status: 500 }
    );
  }
}
