const CACHE = "deadline-__CACHE_VERSION__";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
  "./main.svg",
  "./settings.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(e.request, copy));
          return res;
        })
        .catch(() => cached);
    })
  );
});

// --- Notification support ---
let notifyTimer = null;
let notifyState = null;
let lastBody = null;

self.addEventListener("message", (e) => {
  const data = e.data;
  if (!data || data.type !== "COUNTDOWN") return;

  notifyState = data;

  if (data.visible || !data.enabled || !data.hasDeadlines) {
    clearNotification();
    return;
  }

  showOrUpdateNotification();

  if (!notifyTimer) {
    notifyTimer = setInterval(showOrUpdateNotification, 1000);
  }
});

function clearNotification() {
  if (notifyTimer) {
    clearInterval(notifyTimer);
    notifyTimer = null;
  }
  lastBody = null;
  self.registration.getNotifications({ tag: "countdown" })
    .then(ns => ns.forEach(n => n.close()));
}

function notificationBody() {
  if (!notifyState) return null;

  const { targetTimestamp, targetLabel, allDone } = notifyState;
  const now = Date.now();

  if (allDone || !targetTimestamp) {
    return "\u2713 \u0412\u0441\u0451 \u0432\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e";
  }

  const diff = targetTimestamp - now;
  if (diff <= 0) {
    return "\u2713 \u0412\u044b\u043f\u043e\u043b\u043d\u0435\u043d\u043e";
  }

  const total = Math.floor(diff / 60000);
  const h = Math.floor(total / 60);
  const m = total % 60;

  if (h === 0) {
    return `${m} \u043c\u0438\u043d \u0434\u043e ${targetLabel}`;
  }
  return `${h} \u0447 ${m} \u043c\u0438\u043d \u0434\u043e ${targetLabel}`;
}

function showOrUpdateNotification() {
  const body = notificationBody();
  if (body === null || body === lastBody) return;
  lastBody = body;

  try {
    self.registration.showNotification("\u041a\u0438\u0446\u0443\u043d\u044d", {
      body,
      tag: "countdown",
      renotify: false,
      icon: "./icons/icon-192.png",
      badge: "./icons/icon-192.png",
      silent: true,
    });
  } catch (e) {}
}

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  notifyState = null;
  if (notifyTimer) {
    clearInterval(notifyTimer);
    notifyTimer = null;
  }
  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow("./");
      })
  );
});
