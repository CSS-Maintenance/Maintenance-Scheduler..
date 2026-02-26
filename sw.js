sw_content = '''// PC Maintenance Scheduler - Service Worker
const CACHE_NAME = 'pc-maint-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// Install event - cache assets
self.addEventListener('install', event => {
  console.log('🔧 Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('✅ Cache opened');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.log('⚠️ Cache failed:', err);
      })
  );
  
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('🔧 Service Worker activating...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => {
            console.log('🗑️ Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  
  // Take control immediately
  self.clients.claim();
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
      .catch(() => {
        // If both fail, show offline page (optional)
        console.log('📴 Offline mode');
      })
  );
});

// Message event - communication with main app
self.addEventListener('message', event => {
  console.log('📨 SW received message:', event.data);
  
  if (event.data && event.data.type === 'SYNC_SCHEDULES') {
    // Store schedules for background checking
    event.waitUntil(
      storeSchedules(event.data.schedules)
    );
  }
});

// Store schedules in IndexedDB for background checking
async function storeSchedules(schedules) {
  // Simple in-memory storage for SW
  self.schedules = schedules;
  console.log('💾 Stored schedules in SW:', schedules.length);
}

// Push event - handle push notifications (for future server integration)
self.addEventListener('push', event => {
  console.log('📨 Push received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'Maintenance reminder',
    icon: 'icon-192x192.png',
    badge: 'icon-72x72.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    data: {
      url: '/'
    }
  };
  
  event.waitUntil(
    self.registration.showNotification('🔧 PC Maintenance', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('👆 Notification clicked:', event);
  
  event.notification.close();
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

// Background sync (for offline support)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncTasks());
  }
});

async function syncTasks() {
  console.log('🔄 Background sync triggered');
  // Implement task synchronization logic here
}

// Periodic background sync (for checking upcoming tasks)
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-tasks') {
    event.waitUntil(checkUpcomingTasks());
  }
});

async function checkUpcomingTasks() {
  console.log('⏰ Periodic sync: checking tasks');
  
  const schedules = self.schedules || [];
  const now = new Date();
  
  for (const task of schedules) {
    const taskTime = new Date(task.date + 'T' + task.time);
    const diff = taskTime - now;
    
    // If task is due within 1 minute
    if (diff > 0 && diff < 60000 && !task.notified) {
      // Notify all clients
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(client => {
        client.postMessage({
          type: 'TASK_DUE',
          taskId: task.id
        });
      });
      
      // Show notification
      await self.registration.showNotification(
        `🔧 ${task.computer} - Maintenance Due!`,
        {
          body: `${task.type} at ${task.time}`,
          icon: 'icon-192x192.png',
          badge: 'icon-72x72.png',
          tag: String(task.id),
          requireInteraction: true,
          vibrate: [200, 100, 200],
          data: { taskId: task.id }
        }
      );
    }
  }
}

console.log('✅ Service Worker loaded');'''

with open('/mnt/kimi/output/sw.js', 'w', encoding='utf-8') as f:
    f.write(sw_content)

print("✅ sw.js (Service Worker) created!")
print(f"📄 Size: {len(sw_content):,} characters")
