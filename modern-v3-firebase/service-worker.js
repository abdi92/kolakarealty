const CACHE_VERSION = "kbr-office-firebase-v4-5";
// App shell minimal: aset berat (logo 1,37 MB, bachground.png 2,26 MB) TIDAK
// masuk precache agar instalasi cepat; keduanya otomatis ter-cache lazily
// lewat strategi stale-while-revalidate pada kunjungan pertama.
const APP_SHELL = [
  "./",
  "./index.html",
  "./app.js",
  "./manifest.webmanifest",
  "./offline.html",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Background Sync: minta halaman memutar ulang antrean mutasi offline (IndexedDB outbox).
self.addEventListener("sync", (event) => {
  if (event.tag === "kbr-offline-mutations") {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: "window" })
        .then((clients) => {
          clients.forEach((client) => client.postMessage({ type: "KBR_FLUSH_QUEUE" }));
        })
    );
  }
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== "GET" || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            const urlKey = event.request.url;
            // Cache per-URL; key "./index.html" hanya dipelihara untuk root origin (app shell).
            caches.open(CACHE_VERSION)
              .then((cache) => cache.put(urlKey, copy))
              .then(() => {
                if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
                  return caches.open(CACHE_VERSION).then((cache) => cache.put("./index.html", copy));
                }
                return undefined;
              })
              .catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request)
            .then((cached) => cached || caches.match("./index.html"))
            .then((cached) => cached || caches.match("./offline.html"))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fresh = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_VERSION)
              .then((cache) => cache.put(event.request, copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => Response.error());
      return cached || fresh;
    }).catch(() => Response.error())
  );
});
