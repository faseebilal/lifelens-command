import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { removeInMemorySubscription } from '@/lib/server-push';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    if (isSupabaseConfigured()) {
      try {
        await supabase
          .from('notification_subscriptions')
          .delete()
          .eq('endpoint', endpoint);
      } catch (err) {
        console.warn('Subscription delete note:', err);
      }
    }

    if (userId) {
      removeInMemorySubscription(userId, endpoint);
    }

    return NextResponse.json({ success: true, message: 'Unsubscribed successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Unsubscribe error' }, { status: 500 });
  }
}
