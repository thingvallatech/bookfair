// The Book Fair - Service Worker
// Network-first for pages, cache-first for static assets

const CACHE_NAME = 'bookfair-v1';

// Core app shell to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Static asset extensions that benefit from cache-first
const STATIC_EXTENSIONS = [
  '.js', '.css', '.woff', '.woff2', '.ttf', '.otf',
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico',
  '.mp3', '.ogg', '.wav'
];

// Simple offline fallback page
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>The Book Fair - Offline</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Press Start 2P', monospace, sans-serif;
      background: #0a0a1a;
      color: #f7d51d;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      text-align: center;
      padding: 24px;
    }
    .offline {
      max-width: 480px;
    }
    h1 { font-size: 20px; margin-bottom: 24px; line-height: 1.4; }
    p { font-size: 12px; line-height: 1.8; color: #b2bec3; margin-bottom: 16px; }
    .emoji { font-size: 64px; margin-bottom: 24px; display: block; }
    button {
      margin-top: 16px;
      padding: 12px 24px;
      font-family: inherit;
      font-size: 12px;
      background: #f7d51d;
      color: #0a0a1a;
      border: none;
      cursor: pointer;
    }
    button:hover { background: #fce566; }
  </style>
</head>
<body>
  <div class="offline">
    <span class="emoji">📚</span>
    <h1>The Book Fair is Offline</h1>
    <p>Looks like you wandered away from the internet. Check your connection and try again.</p>
    <button onclick="window.location.reload()">Try Again</button>
  </div>
</body>
</html>`;

// --- Install ---
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// --- Activate ---
// Clean up old caches when a new version is deployed
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        );
      })
      .then(() => self.clients.claim())
  );
});

// --- Fetch ---
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (CDN audio, Google Fonts loaded at runtime, analytics, etc.)
  // We only cache same-origin resources
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Skip GoatCounter analytics
  if (url.pathname.includes('/count')) return;

  // Determine if this is a static asset or a page/document
  const isStaticAsset = STATIC_EXTENSIONS.some((ext) => url.pathname.endsWith(ext));

  if (isStaticAsset) {
    // Cache-first for static assets (JS, CSS, images, fonts)
    event.respondWith(cacheFirst(request));
  } else {
    // Network-first for HTML pages / navigation requests
    event.respondWith(networkFirst(request));
  }
});

// --- Strategies ---

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Static asset unavailable offline - return a 503
    return new Response('', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed - try the cache
    const cached = await caches.match(request);
    if (cached) return cached;

    // Nothing in cache either - show offline page
    return new Response(OFFLINE_HTML, {
      status: 503,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}
