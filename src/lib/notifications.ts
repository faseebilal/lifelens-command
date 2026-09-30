// ============================================================================
// LifeLens Command — Web Push Notification Manager
// ============================================================================

export type NotificationStatus =
  | 'enabled'
  | 'permission_required'
  | 'blocked'
  | 'unsupported'
  | 'subscription_error';

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
  type:
    | 'TASK_DEADLINE'
    | 'PROJECT_DEADLINE'
    | 'TASK_OVERDUE'
    | 'DAILY_SUMMARY'
    | 'REMINDER'
    | 'SYSTEM';
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
 * Verify, repair, and synchronize push subscription with server
 * If permission is 'granted':
 * 1. Verifies service worker registration
 * 2. Verifies PushManager subscription; creates new one if missing
 * 3. Replaces expired or invalid subscriptions
 * 4. Syncs subscription with server database
 */
export async function verifyAndSyncSubscription(userId: string): Promise<{
  success: boolean;
  status: NotificationStatus;
  error?: string;
  subscription?: PushSubscription;
}> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      status: 'unsupported',
      error: 'Web Push Notifications are not supported on this browser or platform.',
    };
  }

  const permission = Notification.permission;
  if (permission === 'denied') {
    return {
      success: false,
      status: 'blocked',
      error: 'Notifications are blocked in your browser settings.',
    };
  }

  if (permission === 'default') {
    return {
      success: false,
      status: 'permission_required',
    };
  }

  // Permission is 'granted'
  try {
    const registration = await registerServiceWorker();
    if (!registration) {
      return {
        success: false,
        status: 'subscription_error',
        error: 'Service worker registration failed to initialize.',
      };
    }

    let subscription = await registration.pushManager.getSubscription();

    // Missing subscription? Create new one
    if (!subscription) {
      const vapidPublicKey =
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
        'BF2zmPIQQOPC_wYh-pV8kvO1fzEX3DqtuhrcavyS5qB4gMbmKceFmTLSkFtEAjpNE_u-10DdvYrU5rgtkfjwf6E';

      const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey as any,
      });
    }

    // Save and verify with server
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        subscription: subscription.toJSON(),
      }),
    });

    if (!response.ok) {
      // If server rejected subscription as stale, unsubscribe and recreate
      try {
        await subscription.unsubscribe();
        const vapidPublicKey =
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
          'BF2zmPIQQOPC_wYh-pV8kvO1fzEX3DqtuhrcavyS5qB4gMbmKceFmTLSkFtEAjpNE_u-10DdvYrU5rgtkfjwf6E';
        const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: convertedVapidKey as any,
        });

        const retryRes = await fetch('/api/notifications/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            subscription: subscription.toJSON(),
          }),
        });

        if (!retryRes.ok) {
          throw new Error('Server could not register renewed subscription.');
        }
      } catch (retryErr: any) {
        return {
          success: false,
          status: 'subscription_error',
          error: retryErr.message || 'Push subscription negotiation error.',
        };
      }
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(`lifelens_push_active_${userId}`, 'true');
    }

    return {
      success: true,
      status: 'enabled',
      subscription,
    };
  } catch (err: any) {
    console.error('Subscription verification error:', err);
    return {
      success: false,
      status: 'subscription_error',
      error: err.message || 'Push subscription verification failed.',
    };
  }
}

/**
 * Get comprehensive notification and push status
 */
export async function getDetailedNotificationStatus(userId?: string): Promise<{
  status: NotificationStatus;
  permission: NotificationPermission | 'unsupported';
  hasSubscription: boolean;
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return {
      status: 'unsupported',
      permission: 'unsupported',
      hasSubscription: false,
    };
  }

  const permission = Notification.permission;
  if (permission === 'denied') {
    return {
      status: 'blocked',
      permission: 'denied',
      hasSubscription: false,
      error: 'Notifications are blocked in your browser.',
    };
  }

  if (permission === 'default') {
    return {
      status: 'permission_required',
      permission: 'default',
      hasSubscription: false,
    };
  }

  // Permission is 'granted'
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return {
        status: 'subscription_error',
        permission: 'granted',
        hasSubscription: false,
        error: 'Service worker not registered.',
      };
    }

    const sub = await registration.pushManager.getSubscription();
    if (!sub) {
      return {
        status: 'subscription_error',
        permission: 'granted',
        hasSubscription: false,
        error: 'Push subscription missing.',
      };
    }

    return {
      status: 'enabled',
      permission: 'granted',
      hasSubscription: true,
    };
  } catch (err: any) {
    return {
      status: 'subscription_error',
      permission: 'granted',
      hasSubscription: false,
      error: err.message || 'Failed to inspect subscription status.',
    };
  }
}

/**
 * Subscribe user to real Web Push Notifications
 * - If denied: Does NOT repeatedly prompt or call requestPermission
 * - If default: Requests browser permission
 * - If granted: Creates and synchronizes push subscription
 */
export async function subscribeToPush(userId: string): Promise<{
  success: boolean;
  status: NotificationStatus;
  error?: string;
  subscription?: PushSubscription;
}> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      status: 'unsupported',
      error: 'Web Push Notifications are not supported on this browser/device.',
    };
  }

  const currentPermission = Notification.permission;

  // 1. If permission is denied, DO NOT repeatedly call requestPermission()
  if (currentPermission === 'denied') {
    return {
      success: false,
      status: 'blocked',
      error: 'Notifications are blocked in your browser settings. Please allow notifications in site settings.',
    };
  }

  // 2. If permission is 'default', request permission upon explicit user action
  if (currentPermission === 'default') {
    try {
      const requested = await Notification.requestPermission();
      if (requested === 'denied') {
        return {
          success: false,
          status: 'blocked',
          error: 'Notifications were blocked in your browser.',
        };
      }
      if (requested !== 'granted') {
        return {
          success: false,
          status: 'permission_required',
          error: 'Notification permission request was dismissed.',
        };
      }
    } catch (permErr: any) {
      return {
        success: false,
        status: 'subscription_error',
        error: permErr.message || 'Failed to request notification permission.',
      };
    }
  }

  // 3. Permission is 'granted' -> verify, create and sync PushSubscription
  return verifyAndSyncSubscription(userId);
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
 * Listen for browser-level permission changes in real-time
 * Triggered when a user unblocks notifications in the browser URL bar
 */
export function listenToPermissionChanges(
  onStatusChange: (
    status: NotificationStatus,
    permission: NotificationPermission | 'unsupported'
  ) => void
): () => void {
  if (
    typeof window === 'undefined' ||
    !('permissions' in navigator) ||
    !navigator.permissions.query
  ) {
    return () => {};
  }

  let permissionStatus: PermissionStatus | null = null;
  let isMounted = true;

  navigator.permissions
    .query({ name: 'notifications' as PermissionName })
    .then((status) => {
      if (!isMounted) return;
      permissionStatus = status;
      permissionStatus.onchange = () => {
        const perm = Notification.permission;
        const normalizedStatus: NotificationStatus =
          perm === 'granted'
            ? 'enabled'
            : perm === 'denied'
            ? 'blocked'
            : 'permission_required';
        onStatusChange(normalizedStatus, perm);
      };
    })
    .catch(() => {
      // Ignore if permissions.query is unsupported or restricted
    });

  return () => {
    isMounted = false;
    if (permissionStatus) {
      permissionStatus.onchange = null;
    }
  };
}

/**
 * Trigger an immediate test push notification
 */
export async function sendTestNotification(
  userId: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    const response = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Failed to trigger test notification.',
    };
  }
}
