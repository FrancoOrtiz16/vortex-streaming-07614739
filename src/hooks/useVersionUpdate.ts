/**
 * 🚀 Hook useVersionUpdate
 * Detecta cambios de versión y notifica actualizaciones inmediatas
 * 
 * Características:
 * - Compara hash de assets cada 10 segundos
 * - Notifica cambios mediante callback
 * - Soporta actualización automática o manual
 * - Compatible con Service Worker
 * 
 * @version 1.0.0
 */

import { useEffect, useRef, useCallback } from 'react';

interface VersionCheckConfig {
  checkInterval?: number; // ms entre checks (default: 10000)
  autoUpdate?: boolean; // Actualizar automáticamente (default: true)
  onUpdateAvailable?: () => void;
  onUpdateReady?: () => void;
  verbose?: boolean;
  // Paths donde no se debe forzar recarga automática (ej. panel de administración)
  ignorePaths?: string[];
}

interface VersionInfo {
  hash: string;
  timestamp: number;
}

let currentVersionInfo: VersionInfo | null = null;
let swRegistration: ServiceWorkerRegistration | null = null;
let updateCheckTimer: NodeJS.Timeout | null = null;

/**
 * Obtiene el hash del HTML actual para detectar cambios
 */
async function getCurrentVersionHash(): Promise<string> {
  try {
    // Agregar timestamp para evitar caché
    const response = await fetch('/index.html?v=' + Date.now(), {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });

    if (!response.ok) {
      console.warn('[VersionCheck] HTML fetch failed:', response.status);
      return '';
    }

    const html = await response.text();

    // ⚠️ El HTML servido por Lovable inyecta dinámicamente data-context-token (JWT
    // con `exp` distinto en cada request) y timestamps en `?v=`. Si los incluimos
    // el hash cambia en cada chequeo y dispara un reload-loop infinito en producción.
    // Filtramos cualquier fragmento volátil antes de hashear.
    const sanitized = html
      .replace(/data-context-token="[^"]*"/g, '')
      .replace(/data-commit-sha="[^"]*"/g, '')
      .replace(/data-artifact-id="[^"]*"/g, '')
      .replace(/\?v=\d+/g, '')
      .replace(/exp"\s*:\s*\d+/g, '')
      .replace(/\s+/g, ' ');

    // Hash sobre los primeros y últimos 200 chars del HTML saneado
    const start = sanitized.substring(0, 200);
    const end = sanitized.substring(sanitized.length - 200);
    const combined = start + end;

    // Hash simple usando charCodeAt
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32-bit integer
    }

    return Math.abs(hash).toString(16);
  } catch (error) {
    console.warn('[VersionCheck] getCurrentVersionHash error:', error);
    return '';
  }
}

/**
 * Registra el Service Worker
 */
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.info('[VersionCheck] Service Worker no soportado en este navegador');
    return null;
  }

  try {
    console.log('[VersionCheck] Registrando Service Worker...');
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none', // Nunca cachear sw.js
    });

    console.log('[VersionCheck] ✅ Service Worker registrado:', registration);
    return registration;
  } catch (error) {
    console.warn('[VersionCheck] Error registrando Service Worker:', error);
    return null;
  }
}

/**
 * Escucha cambios del Service Worker
 */
function setupServiceWorkerListeners(
  registration: ServiceWorkerRegistration,
  onUpdateAvailable: (() => void) | undefined,
  onUpdateReady: (() => void) | undefined,
  verbose: boolean
) {
  // Escuchar cuando hay un nuevo Service Worker esperando activación
  if (registration.waiting) {
    if (verbose) console.log('[VersionCheck] Nuevo SW esperando activación');
    onUpdateAvailable?.();
  }

  registration.addEventListener('updatefound', () => {
    console.log('[VersionCheck] 📢 Actualización de Service Worker encontrada!');
    
    const newWorker = registration.installing;
    if (!newWorker) return;

    newWorker.addEventListener('statechange', () => {
      if (verbose) console.log('[VersionCheck] SW state:', newWorker.state);

      if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
        // Hay un SW nuevo esperando activación
        console.log('[VersionCheck] ✅ Nuevo Service Worker instalado y listo');
        onUpdateAvailable?.();
      } else if (newWorker.state === 'activated') {
        // El nuevo SW está activo
        console.log('[VersionCheck] 🎉 Nuevo Service Worker activado');
        onUpdateReady?.();
      }
    });
  });
}

/**
 * Hook principal
 */
export function useVersionUpdate(config: VersionCheckConfig = {}) {
  const {
    checkInterval = 10000,
    autoUpdate = true,
    onUpdateAvailable,
    onUpdateReady,
    verbose = false,
    ignorePaths = ['/admin', '/admin-access'],
  } = config;

  const updateQueuedRef = useRef(false);

  // Inicializar versión actual y registrar SW
  useEffect(() => {
    (async () => {
      // Obtener versión inicial
      const hash = await getCurrentVersionHash();
      currentVersionInfo = {
        hash,
        timestamp: Date.now(),
      };
      
      if (verbose) console.log('[VersionCheck] Versión inicial:', currentVersionInfo.hash);

      // Registrar Service Worker
      const registration = await registerServiceWorker();
      swRegistration = registration;

      if (registration) {
        setupServiceWorkerListeners(
          registration,
          onUpdateAvailable,
          onUpdateReady,
          verbose
        );
      }

      // Iniciar chequeo periódico
      startVersionCheck(checkInterval, autoUpdate, onUpdateAvailable, onUpdateReady, verbose, ignorePaths);
    })();

    return () => {
      // Limpiar timer al desmontar
      if (updateCheckTimer) {
        clearInterval(updateCheckTimer);
        updateCheckTimer = null;
      }
    };
  }, [checkInterval, autoUpdate, onUpdateAvailable, onUpdateReady, verbose]);

  // Función para forzar actualización manual
  const forceUpdate = useCallback(() => {
    console.log('[VersionCheck] 🔄 Forzando actualización...');

    // Notificar al Service Worker para que se active inmediatamente
    if (swRegistration?.waiting) {
      console.log('[VersionCheck] Enviando SKIP_WAITING al Service Worker');
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }

    // Esperar a que el nuevo SW tome control y recargar
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[VersionCheck] 🔄 Nueva actualización de Service Worker activa - Recargando página');
        window.location.reload();
      }, { once: true });
    } else {
      // Si no hay controller, simplemente recargar
      window.location.reload();
    }
  }, []);

  // Función para obtener info de versión actual
  const getVersionInfo = useCallback(async () => {
    if (!currentVersionInfo) {
      const hash = await getCurrentVersionHash();
      currentVersionInfo = {
        hash,
        timestamp: Date.now(),
      };
    }
    return currentVersionInfo;
  }, []);

  return {
    forceUpdate,
    getVersionInfo,
    updateQueued: updateQueuedRef.current,
  };
}

/**
 * Inicia el chequeo periódico de versión
 */
function startVersionCheck(
  checkInterval: number,
  autoUpdate: boolean,
  onUpdateAvailable: (() => void) | undefined,
  onUpdateReady: (() => void) | undefined,
  verbose: boolean,
  ignorePaths: string[] = []
) {
  if (updateCheckTimer) {
    clearInterval(updateCheckTimer);
  }

  updateCheckTimer = setInterval(async () => {
    try {
      const newHash = await getCurrentVersionHash();

      if (currentVersionInfo && newHash && newHash !== currentVersionInfo.hash) {
        console.log('[VersionCheck] 🎉 Nueva versión detectada!');
        console.log('[VersionCheck] Anterior hash:', currentVersionInfo.hash);
        console.log('[VersionCheck] Nuevo hash:', newHash);

        currentVersionInfo = {
          hash: newHash,
          timestamp: Date.now(),
        };

        // Forzar chequeo de SW
        if (swRegistration) {
          try {
            await swRegistration.update();
            console.log('[VersionCheck] SW actualizado');
          } catch (error) {
            console.warn('[VersionCheck] Error actualizando SW:', error);
          }
        }

        // Notificar disponible
        onUpdateAvailable?.();

        // Si la ruta actual está en ignorePaths, no forzar recarga automática
        const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
        const shouldSkip = ignorePaths.some(p => pathname.includes(p));
        if (shouldSkip) {
          console.log('[VersionCheck] Auto-update SKIPPED for path:', pathname);
          return; // salir de esta comprobación y esperar al siguiente intervalo
        }

        if (autoUpdate) {
          console.log('[VersionCheck] Actualizando automáticamente...');
          
          if (swRegistration?.waiting) {
            // Hay un nuevo SW esperando - activarlo
            swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
            
            // Escuchar cuando el nuevo SW toma control
            navigator.serviceWorker.addEventListener('controllerchange', () => {
              console.log('[VersionCheck] 🎉 Nueva versión activada - Recargando');
              onUpdateReady?.();
              window.location.reload();
            }, { once: true });
          } else {
            // Sin SW, simplemente recargar
            window.location.reload();
          }
        }
      }
    } catch (error) {
      if (verbose) console.warn('[VersionCheck] Error en chequeo periódico:', error);
    }
  }, checkInterval);
}

export default useVersionUpdate;
