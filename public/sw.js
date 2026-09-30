// ============================================================================
// LifeLens Command — Production Web Push Service Worker
// NOTE: This Service Worker handles Web Push Notifications ONLY.
// It explicitly DOES NOT intercept or block any network fetch requests.
// ============================================================================

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Purge any stale cache storage from earlier builds on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => {
        return Promise.all(keys.map((k) => caches.delete(k)));
      })
      .then(() => self.clients.claim())
  );
});

// Listen for message events (e.g. diagnostics or explicit unregister requests)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'UNREGISTER') {
    self.registration.unregister().then(() => {
      self.clients.matchAll().then((clients) => {
        clients.forEach((client) => client.navigate(client.url));
      });
    });
  }
});

// Listen for incoming Web Push events from VAPID server
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'LifeLens Command',
    body: 'Operational update available in your workspace.',
    url: '/dashboard',
    tag: 'lifelens-alert',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      notificationData = {
        title: parsed.title || notificationData.title,
        body: parsed.body || parsed.message || notificationData.body,
        url: parsed.url || '/dashboard',
        tag: parsed.tag || `lifelens-${Date.now()}`,
        taskId: parsed.taskId,
        projectId: parsed.projectId,
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: '/lifelens.png',
    badge: '/lifelens.png',
    vibrate: [200, 100, 200],
    data: {
      url: notificationData.url,
      taskId: notificationData.taskId,
      projectId: notificationData.projectId,
    },
    tag: notificationData.tag,
    renotify: true,
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Open LifeLens' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a tab is already open, focus and navigate it
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(self.location.origin)) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
