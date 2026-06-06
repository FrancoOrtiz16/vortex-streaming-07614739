/**
 * 🛡️ CACHE CONTROL GUARDIAN
 * Arquitectura de Cero Persistencia para Progressive Web Apps
 *
 * Este archivo actúa como el "guardián" del sistema de caché, eliminando
 * bucles infinitos de carga y asegurando que el navegador se comporte
 * como en modo incógnito para máxima confiabilidad.
 *
 * @version 1.0.0
 * @author Arquitecto de Sistemas Senior - PWA Expert
 * @date 2026-05-03
 */

// =============================================================================
// 1. CONFIGURACIÓN DE VERSIÓN Y CONSTANTES
// =============================================================================

/**
 * Versión de la aplicación. DEBE ser estable entre cargas (no Date.now()),
 * de lo contrario se produce un bucle infinito de recarga al inicializar.
 * Bumpea este string manualmente cuando quieras forzar limpieza global.
 */
export const APP_VERSION = "2026.06.06.1";

/**
 * Claves whitelist que NO deben ser eliminadas durante limpieza de caché
 * Mantienen la sesión de autenticación de Supabase intacta
 */
const WHITELIST_KEYS = [
  'sb-', // Todas las claves de Supabase (sb-qxmecegqnapcjlchjqld-auth-token, etc.)
  'supabase-auth-token',
  'supabase.auth.token',
  'user-session',
  'auth-token',
  'session-token'
];

/**
 * Columnas obsoletas que deben ser filtradas de consultas
 * Si se detectan, se alerta al desarrollador
 */
const OBSOLETE_COLUMNS = ['combo_id', 'subscription_code'];

// =============================================================================
// 2. FUNCIÓN DE LIMPIEZA INTELIGENTE (ANTI-BUCLE)
// =============================================================================

/**
 * Función principal de limpieza inteligente del caché
 * Compara versiones y limpia solo si es necesario
 */
export function initializeCacheControl(): void {
  // Force-update global: aplicar a TODAS las rutas (incluido /admin) para
  // garantizar que el 100% de los usuarios usen exactamente la misma versión.
  if (sessionStorage.getItem('cache_control_initialized') === APP_VERSION) {
    return;
  }

  sessionStorage.setItem('cache_control_initialized', APP_VERSION);
  console.debug('[CacheControl] 🛡️ Inicializando Guardián de Caché...');

  // Unregister Service Workers antiguos
  unregisterServiceWorkers();

  const storedVersion = localStorage.getItem('app_version');
  const reloadGuardKey = `version_reload_done_${APP_VERSION}`;
  const alreadyReloadedForThisVersion = sessionStorage.getItem(reloadGuardKey) === 'true';

  // Si la versión local difiere de la versión activa global → force update
  if (storedVersion !== APP_VERSION && !alreadyReloadedForThisVersion) {
    console.warn(`[CacheControl] 🔄 Versión cambió (${storedVersion} → ${APP_VERSION}) - Force update`);

    clearCacheWithWhitelist();
    localStorage.setItem('app_version', APP_VERSION);
    sessionStorage.setItem(reloadGuardKey, 'true');

    // Recarga forzada con cache-buster en la URL
    const separator = window.location.search ? '&' : '?';
    window.location.replace(`${window.location.pathname}${window.location.search}${separator}v=${APP_VERSION}`);
    return;
  }

  // Si ya estamos en la versión correcta
  if (storedVersion === APP_VERSION) {
    console.debug('[CacheControl] ✅ Versión sincronizada - Sin limpieza necesaria');
  }

  // Asegurar que la versión queda registrada localmente
  if (storedVersion !== APP_VERSION) {
    localStorage.setItem('app_version', APP_VERSION);
  }
}

/**
 * Limpia localStorage y sessionStorage respetando whitelist
 * Mantiene autenticación de Supabase intacta
 */
function clearCacheWithWhitelist(): void {
  console.debug('[CacheControl] 🧹 Ejecutando limpieza con whitelist...');

  // Limpiar localStorage
  const localKeys = Object.keys(localStorage);
  localKeys.forEach(key => {
    if (!isWhitelisted(key)) {
      localStorage.removeItem(key);
      console.debug(`[CacheControl] 🗑️ Eliminado localStorage: ${key}`);
    }
  });

  // Limpiar sessionStorage
  const sessionKeys = Object.keys(sessionStorage);
  sessionKeys.forEach(key => {
    if (!isWhitelisted(key)) {
      sessionStorage.removeItem(key);
      console.debug(`[CacheControl] 🗑️ Eliminado sessionStorage: ${key}`);
    }
  });

  console.log('[CacheControl] ✅ Limpieza completada - Autenticación preservada');
}

/**
 * Verifica si una clave está en la whitelist
 */
function isWhitelisted(key: string): boolean {
  return WHITELIST_KEYS.some(whitelistKey =>
    key.toLowerCase().includes(whitelistKey.toLowerCase())
  );
}

// =============================================================================
// 3. CACHE-BUSTING PARA IMPORTS DINÁMICOS
// =============================================================================

/**
 * Función para crear URLs con cache-busting
 * Úsala en imports dinámicos: import(getCacheBustedUrl('./Admin.tsx'))
 */
export function getCacheBustedUrl(url: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}v=${APP_VERSION}`;
}

/**
 * Wrapper para imports dinámicos con cache-busting automático
 */
export function dynamicImport<T = any>(importFn: () => Promise<T>): Promise<T> {
  // Nota: En producción, esto podría interceptar el import
  // Por ahora, solo registra para debugging
  console.debug('[CacheControl] 📦 Import dinámico con cache-busting');
  return importFn();
}

// =============================================================================
// 4. AISLAMIENTO DE PROCESOS BLOQUEANTES
// =============================================================================

/**
 * Timeout de seguridad para procesos de carga
 * Si tarda más de 3 segundos, fuerza estado de error controlado
 */
export function createSafeTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 3000,
  errorMessage: string = 'Timeout: Proceso bloqueante detectado'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      console.error(`[CacheControl] ⏰ ${errorMessage} (${timeoutMs}ms)`);
      reject(new Error(errorMessage));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

/**
 * Wrapper para fetch con timeout de seguridad
 */
export function safeFetch(
  url: string,
  options?: RequestInit,
  timeoutMs: number = 3000
): Promise<Response> {
  const fetchPromise = fetch(url, options);
  return createSafeTimeout(
    fetchPromise,
    timeoutMs,
    `Fetch timeout: ${url}`
  );
}

// =============================================================================
// 5. FILTRO DE COLUMNAS OBSOLETAS
// =============================================================================

/**
 * Intercepta y valida consultas de base de datos
 * Alerta si detecta columnas obsoletas
 */
export function validateDatabaseQuery(query: any, context: string = 'unknown'): void {
  if (!query) return;

  // Convertir query a string para análisis
  const queryString = JSON.stringify(query).toLowerCase();

  OBSOLETE_COLUMNS.forEach(column => {
    if (queryString.includes(column.toLowerCase())) {
      console.error(`[CacheControl] 🚨 ALERTA: Columna obsoleta '${column}' detectada en consulta!`);
      console.error(`[CacheControl] 📍 Contexto: ${context}`);
      console.error(`[CacheControl] 🔍 Query:`, query);

      // En desarrollo, podríamos throw error
      if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        throw new Error(`Columna obsoleta '${column}' detectada. Remover de la consulta.`);
      }
    }
  });
}

/**
 * Wrapper para consultas de Supabase con validación automática
 */
export function safeSupabaseQuery<T>(
  query: any,
  context: string = 'unknown'
): any {
  validateDatabaseQuery(query, context);
  return query;
}

// =============================================================================
// 6. UTILIDADES PARA DESARROLLADORES
// =============================================================================

/**
 * Función de diagnóstico para debugging
 */
export function getCacheStatus(): {
  version: string;
  storedVersion: string | null;
  hasReloaded: boolean;
  localStorageKeys: number;
  sessionStorageKeys: number;
  whitelistedKeys: string[];
} {
  return {
    version: APP_VERSION,
    storedVersion: localStorage.getItem('app_version'),
    hasReloaded: sessionStorage.getItem('has_reloaded') === 'true',
    localStorageKeys: Object.keys(localStorage).length,
    sessionStorageKeys: Object.keys(sessionStorage).length,
    whitelistedKeys: Object.keys(localStorage).filter(isWhitelisted)
  };
}

/**
 * Función para forzar limpieza manual (solo desarrollo)
 */
export function forceCacheClear(): void {
  const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';
  
  if (isDev) {
    console.warn('[CacheControl] 🔧 Forzando limpieza manual...');
    clearCacheWithWhitelist();
    localStorage.setItem('app_version', APP_VERSION);
    console.log('[CacheControl] ✅ Limpieza forzada completada');
  } else {
    console.warn('[CacheControl] ⚠️ Limpieza manual solo disponible en desarrollo');
  }
}

/**
 * Unregister todos los Service Workers registrados
 */
function unregisterServiceWorkers(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        console.debug('[CacheControl] 🗑️ Unregistering Service Worker:', registration.scope);
        registration.unregister();
      });
    }).catch(error => {
      console.error('[CacheControl] ❌ Error unregistering Service Workers:', error);
    });
  }
}

// =============================================================================
// 7. INICIALIZACIÓN AUTOMÁTICA
// =============================================================================

/**
 * Extender Window para incluir propiedades personalizadas
 */
declare global {
  interface Window {
    __LOADING_TIMEOUT__?: number;
    __CACHE_BUST_VERSION__?: string;
  }
}

/**
 * Inicialización automática cuando se importa el módulo
 * Esto asegura que el guardián se active inmediatamente
 */
if (typeof window !== 'undefined') {
  // Ejecutar en el próximo tick para asegurar que DOM esté listo
  setTimeout(() => {
    initializeCacheControl();
    
    // Limpiar timeout de carga bloqueante después de cargar
    if (window.__LOADING_TIMEOUT__) {
      clearTimeout(window.__LOADING_TIMEOUT__);
      console.debug('[CacheControl] ✅ Timeout de carga cancelado - Aplicación lista');
    }
  }, 0);

  // Nota: no se registra beforeunload para contar recargas. Ese patrón convertía
  // cualquier navegación/HMR en falso positivo y podía forzar reloads con query
  // no-cache indefinidamente en la previsualización.
}

console.log(`[CacheControl] 🛡️ Guardián de Caché v1.0.0 inicializado (Versión: ${APP_VERSION})`);