/* global self, caches */
/**
 * PWA service worker: API e HTML sempre na rede; cache só para assets versionados
 * (_next/static) e outros recursos estáticos, para não servir posições de ônibus antigas.
 */
const STATIC_CACHE = "meu-busao-static-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(req));
    return;
  }

  // Dados dinâmicos: nunca cachear
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(fetch(req));
    return;
  }

  // Chunks JS/CSS do Next têm hash no path — seguro para cache-first
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(req, STATIC_CACHE));
    return;
  }

  // Navegação e documentos HTML: sempre rede (evita shell com dados velhos)
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(fetch(req));
    return;
  }

  // Demais assets same-origin (imagens, fontes, etc.): rede com fallback leve
  event.respondWith(staleWhileRevalidate(req, STATIC_CACHE));
});

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  });
  return cached || networkPromise;
}
