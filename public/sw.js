const CACHE_PREFIX = 'beacon-eclipse-';
const CACHE_NAME = `${CACHE_PREFIX}shell-v1`;
const CORE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icons/beacon-eclipse.svg',
  '/assets/DRN_Soyka.gltf',
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(CORE_URLS.map((url) => cache.add(url)));

    try {
      const response = await fetch(new Request('/', { cache: 'reload' }));
      if (response.ok) {
        await cache.put('/', response.clone());
        const html = await response.text();
        const discovered = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
          .map((match) => match[1])
          .filter((value) => value && !value.startsWith('data:'))
          .map((value) => new URL(value, self.location.origin))
          .filter((url) => url.origin === self.location.origin)
          .map((url) => `${url.pathname}${url.search}`);
        await Promise.allSettled([...new Set(discovered)].map((url) => cache.add(url)));
      }
    } catch (error) {
      console.warn('[PWA] Could not precache generated app shell', error);
    }

    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put('/', response.clone());
    return response;
  } catch {
    return (await cache.match('/')) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok && response.type === 'basic') await cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  if (cached) {
    eventWaitUntilSafe(network);
    return cached;
  }

  return (await network) || Response.error();
}

function eventWaitUntilSafe(promise) {
  promise.catch(() => undefined);
}
