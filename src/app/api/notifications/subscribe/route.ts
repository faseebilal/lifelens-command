import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { saveInMemorySubscription } from '@/lib/server-push';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, subscription } = body;

    if (!userId || !subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Missing userId or subscription payload' },
        { status: 400 }
      );
    }

    const { endpoint, keys } = subscription;
    const p256dh = keys?.p256dh || '';
    const auth = keys?.auth || '';

    // If Supabase is active, persist to PostgreSQL table with RLS
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('notification_subscriptions')
          .upsert(
            {
              user_id: userId,
              endpoint,
              p256dh,
              auth,
              user_agent: req.headers.get('user-agent') || 'Browser',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'endpoint' }
          );

        if (error) {
          console.warn('Supabase subscription upsert note:', error.message);
          // Fall back to memory
          saveInMemorySubscription(userId, { endpoint, p256dh, auth });
        }
      } catch (err) {
        saveInMemorySubscription(userId, { endpoint, p256dh, auth });
      }
    } else {
      saveInMemorySubscription(userId, { endpoint, p256dh, auth });
    }

    return NextResponse.json({
      success: true,
      message: 'Web Push subscription successfully registered.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to save subscription' },
      { status: 500 }
    );
  }
}
