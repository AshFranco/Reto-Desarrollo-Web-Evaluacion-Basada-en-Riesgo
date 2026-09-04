/// <reference lib="WebWorker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, NetworkOnly } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

// Catálogo y asignaciones: NetworkFirst con caché de respaldo
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/formularios') || url.pathname.startsWith('/api/v1/asignaciones'),
  new NetworkFirst({ cacheName: 'api-catalogo', networkTimeoutSeconds: 3 })
);

// Tokens: nunca cachear
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/auth'),
  new NetworkOnly()
);

// Evaluaciones y evidencias: escrituras offline van por la cola, no el SW
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/evaluaciones') || url.pathname.startsWith('/api/v1/evidencias'),
  new NetworkOnly()
);

// Resto de GET: StaleWhileRevalidate
registerRoute(
  ({ request }) => request.method === 'GET',
  new StaleWhileRevalidate({ cacheName: 'api-general' })
);

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
