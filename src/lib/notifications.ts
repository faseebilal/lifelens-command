// ============================================================================
// LifeLens Command — Web Push Notification Manager
// ============================================================================

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface NotificationRecord {
  id: string;
  user_id: string;
  type: 'TASK_DEADLINE' | 'PROJECT_DEADLINE' | 'TASK_OVERDUE' | 'DAILY_SUMMARY' | 'REMINDER' | 'SYSTEM';
  title: string;
  message: string;
  task_id?: string | null;
  project_id?: string | null;
  reminder_id?: string | null;
  scheduled_for: string;
  sent_at?: string | null;
  read_at?: string | null;
  status: 'scheduled' | 'sent' | 'failed' | 'cancelled';
  payload?: any;
  created_at: string;
}

export interface NotificationPreferences {
  user_id: string;
  push_enabled: boolean;
  task_deadlines_enabled: boolean;
  project_deadlines_enabled: boolean;
  reminders_enabled: boolean;
  overdue_enabled: boolean;
  daily_summary_enabled: boolean;
  daily_summary_time: string;
  task_reminder_timings: string[];
  project_reminder_timings: string[];
  timezone: string;
  updated_at?: string;
}

// Convert VAPID base64 public key to Uint8Array for pushManager.subscribe
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Check if the current browser and OS support Web Push Notifications
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Current browser permission state
 */
export function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Register Service Worker safely
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (error) {
    console.error('Service worker registration failed:', error);
    return null;
  }
}

/**
 * Subscribe user to real Web Push Notifications with VAPID authentication
 */
export async function subscribeToPush(userId: string): Promise<{
  success: boolean;
  error?: string;
  subscription?: PushSubscription;
}> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      error: 'Web Push Notifications are not supported on this browser/device. Try Android Chrome, macOS Safari 16+, or modern Desktop browsers.',
    };
  }

  try {
    // 1. Request user permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error:
          permission === 'denied'
            ? 'Notification permission was denied. Please allow notifications in your browser settings to receive alerts when the site is closed.'
            : 'Notification permission was dismissed.',
      };
    }

    // 2. Register Service Worker
    const registration = await registerServiceWorker();
    if (!registration) {
      return {
        success: false,
        error: 'Failed to initialize service worker on this device.',
      };
    }

    // 3. Get public VAPID key
    const vapidPublicKey =
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
      'BF2zmPIQQOPC_wYh-pV8kvO1fzEX3DqtuhrcavyS5qB4gMbmKceFmTLSkFtEAjpNE_u-10DdvYrU5rgtkfjwf6E';

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    // 4. Create PushSubscription
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as any,
      });
    }

    // 5. Send subscription to server
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || 'Failed to save push subscription to server.');
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(`lifelens_push_active_${userId}`, 'true');
    }

    return { success: true, subscription };
  } catch (err: any) {
    console.error('Push subscription failed:', err);
    return {
      success: false,
      error: err.message || 'Failed to complete push notification subscription.',
    };
  }
}

/**
 * Unsubscribe user from push notifications
 */
export async function unsubscribeFromPush(userId: string): Promise<boolean> {
  if (!isPushNotificationSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          endpoint: subscription.endpoint,
        }),
      });
    }

    if (typeof window !== 'undefined') {
      localStorage.removeItem(`lifelens_push_active_${userId}`);
    }

    return true;
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return false;
  }
}

/**
 * Trigger an immediate test push notification
 */
export async function sendTestNotification(userId: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();
    return data;
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to trigger test notification.' };
  }
}
