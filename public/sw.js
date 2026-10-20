// Zaika service worker: makes the app installable and quick to reopen.
// - App shell (the SPA's index.html) and built assets are cached, so the app opens offline
// - Dish photos are cached as they are seen
// - /api/* is never cached: menus, carts, prices and orders always come from the server
// Filled in by the build (see swAssets in vite.config.js): every JS/CSS chunk, so lazy pages work offline
const BUILD = { version: "dev", assets: [] };
const VERSION = `zaika-${BUILD.version}`;
const SHELL = ["/", "/favicon.svg", "/manifest.webmanifest", "/icons/icon-192.png", ...BUILD.assets];

self.addEventListener("install", (event) => {
    event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
            .then(() => self.clients.claim()),
    );
});

// ignoreVary: servers send "Vary: Origin", and a crossorigin <link> or module request would
// otherwise miss the copy cached at install time
const fromCache = (request) => caches.match(request, { ignoreVary: true });

const cacheFirst = async (request) => {
    const cached = await fromCache(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) (await caches.open(VERSION)).put(request, response.clone());
    return response;
};

self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

    // Pages: always try the network for the latest build, fall back to the cached shell offline
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    if (response.ok) caches.open(VERSION).then((cache) => cache.put("/", response.clone()));
                    return response;
                })
                .catch(() => caches.match("/", { ignoreVary: true })),
        );
        return;
    }

    // Hashed build files and dish photos never change at the same URL
    if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/dishes/") || url.pathname.startsWith("/icons/")) {
        event.respondWith(cacheFirst(request));
    }
});
