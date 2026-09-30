import webpush from 'web-push';
import { supabase, isSupabaseConfigured } from '@/lib/supabase/client';

const vapidPublicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  'BF2zmPIQQOPC_wYh-pV8kvO1fzEX3DqtuhrcavyS5qB4gMbmKceFmTLSkFtEAjpNE_u-10DdvYrU5rgtkfjwf6E';

const vapidPrivateKey =
  process.env.VAPID_PRIVATE_KEY ||
  'Sd0_hIsj9511AsZPVqm2yXsnFgutThZSYk_M_0KBBmo';

const vapidSubject =
  process.env.VAPID_SUBJECT ||
  'mailto:commander@lifelens.io';

// Configure Web Push with VAPID keys
try {
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
} catch (err) {
  console.warn('VAPID initialization note:', err);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  taskId?: string;
  projectId?: string;
}

// In-memory fallback subscription store if Supabase database is not configured
const inMemorySubscriptions = new Map<string, any[]>();

export function saveInMemorySubscription(userId: string, sub: any) {
  const existing = inMemorySubscriptions.get(userId) || [];
  const filtered = existing.filter((s) => s.endpoint !== sub.endpoint);
  filtered.push({ ...sub, updated_at: new Date().toISOString() });
  inMemorySubscriptions.set(userId, filtered);
}

export function getInMemorySubscriptions(userId: string): any[] {
  return inMemorySubscriptions.get(userId) || [];
}

export function removeInMemorySubscription(userId: string, endpoint: string) {
  const existing = inMemorySubscriptions.get(userId) || [];
  inMemorySubscriptions.set(
    userId,
    existing.filter((s) => s.endpoint !== endpoint)
  );
}

/**
 * Send Web Push notification to a specific subscription
 */
export async function sendWebPush(subscription: any, payload: PushPayload): Promise<boolean> {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh || subscription.keys?.p256dh,
        auth: subscription.auth || subscription.keys?.auth,
      },
    };

    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      {
        TTL: 60 * 60 * 24, // 24 hours
        urgency: 'high',
      }
    );

    return true;
  } catch (err: any) {
    console.error('Web Push delivery error:', err.statusCode, err.message);

    // If subscription is expired or unregistered, prune it
    if (err.statusCode === 404 || err.statusCode === 410) {
      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from('notification_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint);
        } catch {
          // Ignore
        }
      }
    }
    return false;
  }
}

/**
 * Send Web Push notification to all active devices of a user
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<{ sent: number; total: number }> {
  let subscriptions: any[] = [];

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('notification_subscriptions')
        .select('*')
        .eq('user_id', userId);

      if (!error && data) {
        subscriptions = data;
      }
    } catch {
      subscriptions = getInMemorySubscriptions(userId);
    }
  } else {
    subscriptions = getInMemorySubscriptions(userId);
  }

  let sent = 0;
  for (const sub of subscriptions) {
    const success = await sendWebPush(sub, payload);
    if (success) sent++;
  }

  return { sent, total: subscriptions.length };
}
