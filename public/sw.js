/**
 * 🚀 SERVICE WORKER - Vortex Streaming
 * Cache Busting & Instant Updates
 * 
 * Estrategia:
 * 1. skipWaiting() - Activación inmediata del nuevo SW
 * 2. Clients.claim() - Toma control de clientes sin recargar
 * 3. Network-first para API calls
 * 4. Stale-while-revalidate para assets estáticos
 * 
 * @version 2.0.0
 * @date 2026-05-17
 */

const CACHE_VERSION = 'vortex-v2-' + new Date().toISOString().split('T')[0];
const RUNTIME_CACHE = 'vortex-runtime';
const STATIC_CACHE = 'vortex-static';

// Assets que siempre deben ser servidos en red (fresco)
const ALWAYS_NETWORK = [
  '/api',
  '/manifest.json',
  '/index.html',
];

// Assets estáticos que pueden venir de caché
const STATIC_ASSETS = [
  '.js',
  '.css',
  '.woff2',
  '.png',
  '.jpg',
  '.svg',
  '.webp'
];

// =============================================================================
// 1. INSTALL - Precache de assets estáticos
// =============================================================================
self.addEventListener('install', (event) => {
  console.log('[SW] 📦 Installing Service Worker...');

  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] ✅ Static cache opened:', STATIC_CACHE);
      return cache.addAll([
        '/',
        '/index.html',
      ]).catch((err) => {
        console.warn('[SW] ⚠️ Cache addAll error (non-fatal):', err);
      });
    }).then(() => {
      // skipWaiting() - Activación inmediata sin esperar navegadores
      console.log('[SW] ⚡ skipWaiting() - Activación inmediata');
      return self.skipWaiting();
    })
  );
});

// =============================================================================
// 2. ACTIVATE - Limpieza de cachés antiguos + Control de clientes
// =============================================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] 🔄 Activating Service Worker...');

  event.waitUntil(
    (async () => {
      // Limpiar cachés de versiones anteriores
      const cacheNames = await caches.keys();
      const cachesToDelete = cacheNames.filter((name) => {
        return !name.includes(CACHE_VERSION) && 
               !name.includes(RUNTIME_CACHE) && 
               !name.includes(STATIC_CACHE);
      });

      await Promise.all(cachesToDelete.map((name) => {
        console.log('[SW] 🗑️ Deleting old cache:', name);
        return caches.delete(name);
      }));

      // Clients.claim() - Tomar control inmediato de todos los clientes
      console.log('[SW] 👑 Clients.claim() - Taking control of all clients');
      return self.clients.claim();
    })()
  );
});

// =============================================================================
// 3. FETCH - Estrategia de caching inteligente
// =============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Si es un GET, aplicar estrategia de caché
  if (request.method !== 'GET') {
    return;
  }

  // 1️⃣ NETWORK-FIRST para rutas críticas (HTML, API, manifests)
  if (ALWAYS_NETWORK.some((path) => url.pathname.includes(path))) {
    return event.respondWith(
      fetch(request)
        .then((response) => {
          // Guardar en runtime cache si es exitosa
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla, intentar caché (stale-while-revalidate)
          return caches.match(request).then((cached) => {
            if (cached) {
              console.log('[SW] 📦 Serving from cache (network failed):', url.pathname);
              return cached;
            }
            // Fallback genérico
            return new Response('Offline', { status: 503 });
          });
        })
    );
  }

  // 2️⃣ STALE-WHILE-REVALIDATE para assets estáticos
  const isStaticAsset = STATIC_ASSETS.some((ext) => url.pathname.endsWith(ext));
  
  if (isStaticAsset) {
    return event.respondWith(
      caches.match(request).then((cached) => {
        // Retornar del caché inmediatamente si existe
        if (cached) {
          // Revalidar en background (sin bloquear)
          fetch(request).then((fresh) => {
            if (fresh && fresh.status === 200) {
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, fresh.clone());
              });
            }
          }).catch(() => {
            // Silenciosamente ignorar errores de revalidación
          });
          
          return cached;
        }

        // Si no está en caché, ir a red
        return fetch(request)
          .then((response) => {
            if (!response || response.status !== 200) {
              return response;
            }
            
            const clone = response.clone();
            caches.open(STATIC_CACHE).then((cache) => {
              cache.put(request, clone);
            });
            
            return response;
          })
          .catch(() => {
            // Si falla la red, retornar un placeholder
            return new Response('Resource not available', { status: 404 });
          });
      })
    );
  }

  // 3️⃣ NETWORK-FIRST para todo lo demás (por defecto)
  return event.respondWith(
    fetch(request)
      .then((response) => {
        if (!response || response.status !== 200) {
          return response;
        }

        const clone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(request, clone);
        });

        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          if (cached) {
            console.log('[SW] 📦 Serving stale from cache:', url.pathname);
            return cached;
          }
          return new Response('Network error', { status: 503 });
        });
      })
  );
});

// =============================================================================
// 4. MESSAGE - Comunicación con clientes para actualización
// =============================================================================
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] 📤 Received SKIP_WAITING message');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    console.log('[SW] 📤 Responding with version info');
    event.ports[0].postMessage({
      version: CACHE_VERSION,
      timestamp: new Date().toISOString(),
    });
  }
});

// =============================================================================
// 5. PUSH NOTIFICATIONS (Opcional - para notificaciones de actualización)
// =============================================================================
self.addEventListener('push', (event) => {
  console.log('[SW] 🔔 Push event received');
  
  if (event.data) {
    try {
      const data = event.data.json();
      if (data.type === 'UPDATE_AVAILABLE') {
        event.waitUntil(
          self.registration.showNotification('Vortex Streaming', {
            body: 'Nueva versión disponible. Actualizando...',
            icon: '/favicon.ico',
            tag: 'vortex-update',
            requireInteraction: false,
            actions: [
              {
                action: 'update',
                title: 'Actualizar ahora',
              },
            ],
          })
        );
      }
    } catch (e) {
      console.warn('[SW] Push parse error:', e);
    }
  }
});

console.log('[SW] ✅ Service Worker loaded and ready');
