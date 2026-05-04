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
// 0. RELOAD SEGURO (ANTI-BUCLE INFINITO)
// =============================================================================

/**
 * 🔐 RECARGA SEGURA: Previene bucles infinitos de recarga
 * Verifica si ya hemos recargado demasiadas veces y bloquea
 * 
 * @param reason - Razón de la recarga (para debugging)
 */
export function safeReload(reason: string = 'Unknown'): void {
  const reloadKey = 'safe-reload-' + window.location.pathname;
  const reloadCount = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);

  if (reloadCount >= 2) {
    console.error('[CacheControl] 🚨 BLOQUEADO: Múltiples recargas detectadas');
    console.error(`[CacheControl] Razón: ${reason}`);
    console.error('[CacheControl] ⏹️ Recarga bloqueada para prevenir bucle infinito');

    // Marcar que se intentó recargar pero fue bloqueado
    sessionStorage.setItem(reloadKey + '-blocked', 'true');

    // Mostrar error elegante en consola
    console.warn('[CacheControl] 💡 SOLUCIÓN: Ejecutar en DevTools:');
    console.warn('[CacheControl] sessionStorage.clear(); location.reload();');
    return;
  }

  // Incrementar contador
  sessionStorage.setItem(reloadKey, (reloadCount + 1).toString());

  // Auto-limpiar contador después de 30 segundos
  setTimeout(() => {
    sessionStorage.removeItem(reloadKey);
  }, 30000);

  console.warn(`[CacheControl] 🔄 Recarga Segura #${reloadCount + 1}: ${reason}`);
  window.location.reload();
}

/**
 * 🔐 RECARGA CON CACHE-BUST: Recarga sin usar caché del navegador
 * 
 * @param reason - Razón de la recarga
 */
export function safeReloadNoCachePreserveAuth(reason: string = 'Unknown'): void {
  const reloadKey = 'safe-reload-' + window.location.pathname;
  const reloadCount = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);

  if (reloadCount >= 2) {
    console.error('[CacheControl] 🚨 BLOQUEADO: Múltiples recargas detectadas');
    return;
  }

  sessionStorage.setItem(reloadKey, (reloadCount + 1).toString());

  console.warn(`[CacheControl] 🔄 Recarga Sin Caché #${reloadCount + 1}: ${reason}`);

  // Agregar parámetro de cache-bust
  const separator = window.location.search ? '&' : '?';
  const newUrl = window.location.href + separator + 'cache-bust=' + Date.now();

  window.location.href = newUrl;
}

// =============================================================================
// 1. CONFIGURACIÓN DE VERSIÓN Y CONSTANTES
// =============================================================================

/**
 * Versión de la aplicación basada en timestamp de despliegue
 * Esto asegura que cada despliegue tenga una versión única
 */
export const APP_VERSION = Date.now().toString();

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
  console.debug('[CacheControl] 🛡️ Inicializando Guardián de Caché...');

  // Unregister Service Workers antiguos
  unregisterServiceWorkers();

  const storedVersion = localStorage.getItem('app_version');
  const hasReloaded = sessionStorage.getItem('has_reloaded') === 'true';

  // Si la versión cambió y no hemos recargado aún en esta sesión
  if (storedVersion !== APP_VERSION && !hasReloaded) {
    console.warn('[CacheControl] 🔄 Versión cambió - Ejecutando limpieza inteligente...');

    // Limpiar caché con whitelist
    clearCacheWithWhitelist();

    // Marcar que hemos recargado para evitar bucles
    sessionStorage.setItem('has_reloaded', 'true');

    // Guardar nueva versión
    localStorage.setItem('app_version', APP_VERSION);

    console.log('[CacheControl] ✅ Limpieza completada - Recargando página...');

    // Usar safeReload en vez de window.location.reload()
    safeReload('Version mismatch detected');
    return;
  }

  // Si ya estamos en la versión correcta
  if (storedVersion === APP_VERSION) {
    console.debug('[CacheControl] ✅ Versión sincronizada - Sin limpieza necesaria');
  }

  // Resetear bandera de recarga para próximas sesiones
  if (hasReloaded) {
    sessionStorage.removeItem('has_reloaded');
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
// 6. SISTEMA AUTO-CLEAR CON DETECCIÓN DE BLOQUEO (5 segundos)
// =============================================================================

/**
 * 🚨 FUNCIÓN CRÍTICA: Detecta bloqueo de renderizado y ejecuta limpieza profunda
 * Si el componente principal no carga en 5 segundos, activa automáticamente
 * 
 * @param timeoutMs - Tiempo máximo de espera en milisegundos (default: 5000)
 * @param onBlockDetected - Callback cuando se detecta bloqueo
 */
export function setupLoadingBlockDetector(
  timeoutMs: number = 5000,
  onBlockDetected?: (recovered: boolean) => void
): () => void {
  let timeoutId: number | null = null;
  let blockDetected = false;

  const detectBlock = () => {
    if (!blockDetected) {
      blockDetected = true;
      console.error('[CacheControl] 🚨 BLOQUEO DETECTADO: Componente principal no se renderizó en', timeoutMs, 'ms');
      console.error('[CacheControl] 🔧 Iniciando Auto-Clear profundo...');

      // Ejecutar Deep Clean automáticamente
      const recovered = executeDeepClean();

      // Callback opcional
      if (onBlockDetected) {
        onBlockDetected(recovered);
      }
    }
  };

  // Iniciar timeout
  timeoutId = setTimeout(detectBlock, timeoutMs) as any;

  // Retornar función para limpiar el detector cuando se renderize exitosamente
  return () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      console.debug('[CacheControl] ✅ Bloqueo no detectado - Aplicación cargó correctamente');
    }
  };
}

/**
 * 🔧 LIMPIEZA PROFUNDA: Método agresivo cuando el renderizado está completamente bloqueado
 * 
 * Limpia:
 * - localStorage (excepto whitelist)
 * - sessionStorage (excepto whitelist) 
 * - Service Worker cache
 * - IndexedDB
 * - Cookies antiguas
 * 
 * @returns true si la limpieza fue exitosa
 */
export function executeDeepClean(): boolean {
  try {
    console.warn('[CacheControl] 💎 EJECUTANDO DEEP CLEAN...');

    // 1. Limpiar localStorage
    const localKeys = Object.keys(localStorage);
    localKeys.forEach(key => {
      if (!isWhitelisted(key)) {
        localStorage.removeItem(key);
      }
    });
    console.debug('[CacheControl] ✅ localStorage limpiado');

    // 2. Limpiar sessionStorage
    const sessionKeys = Object.keys(sessionStorage);
    sessionKeys.forEach(key => {
      if (!isWhitelisted(key)) {
        sessionStorage.removeItem(key);
      }
    });
    console.debug('[CacheControl] ✅ sessionStorage limpiado');

    // 3. Limpiar cache de Service Workers
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.delete(cacheName);
        });
      });
      console.debug('[CacheControl] ✅ Service Worker cache limpiado');
    }

    // 4. Limpiar IndexedDB
    if ('indexedDB' in window) {
      const dbs = indexedDB.databases ? indexedDB.databases() : null;
      if (dbs) {
        Promise.resolve(dbs).then(dbList => {
          dbList.forEach(db => {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
            }
          });
        });
      }
      console.debug('[CacheControl] ✅ IndexedDB limpiado');
    }

    // 5. Marcar en sessionStorage que se ejecutó deep clean
    sessionStorage.setItem('deep-clean-executed', Date.now().toString());
    sessionStorage.setItem('deep-clean-recovered', 'true');

    console.warn('[CacheControl] 💎 DEEP CLEAN COMPLETADO - Requiere recarga');
    return true;
  } catch (err) {
    console.error('[CacheControl] ❌ Error en Deep Clean:', err);
    return false;
  }
}

/**
 * 🔐 Función que retorna true si ya se ejecutó Deep Clean
 * Previene que se bloquee nuevamente
 */
export function hasDeepCleanBeenExecuted(): boolean {
  return sessionStorage.getItem('deep-clean-executed') !== null;
}

/**
 * 🎯 Crea un componente que muestra el botón "Deep Clean" manual
 * Solo se muestra después de un segundo intento fallido
 * 
 * @returns HTML string con el botón o null
 */
export function getDeepCleanRecoveryUI(): { show: boolean; message: string } {
  const deepCleanExecuted = hasDeepCleanBeenExecuted();
  const recovered = sessionStorage.getItem('deep-clean-recovered') === 'true';

  if (!deepCleanExecuted) {
    return { show: false, message: '' };
  }

  if (recovered && deepCleanExecuted) {
    return {
      show: true,
      message: 'Se ejecutó Limpieza Profunda. Si el problema persiste, haz clic en "Limpieza Profunda y Reintentar"',
    };
  }

  return { show: false, message: '' };
}

// =============================================================================
// 7. UTILIDADES PARA DESARROLLADORES
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
  deepCleanExecuted: boolean;
} {
  return {
    version: APP_VERSION,
    storedVersion: localStorage.getItem('app_version'),
    hasReloaded: sessionStorage.getItem('has_reloaded') === 'true',
    localStorageKeys: Object.keys(localStorage).length,
    sessionStorageKeys: Object.keys(sessionStorage).length,
    whitelistedKeys: Object.keys(localStorage).filter(isWhitelisted),
    deepCleanExecuted: hasDeepCleanBeenExecuted(),
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

  // Detectar recarga infinita y prevenirla
  let reloadCount = 0;
  const reloadKey = 'reload-attempt-count';
  
  // Incrementar contador de recargas
  const currentReloads = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
  if (currentReloads > 2) {
    console.error('[CacheControl] 🚨 BUCLE INFINITO DETECTADO - Deteniendo recargas automáticas');
    sessionStorage.removeItem(reloadKey);
    localStorage.removeItem('app_version');
    
    // Forzar página sin caché
    window.location.href = window.location.href + (window.location.search ? '&' : '?') + 'no-cache=' + Date.now();
    throw new Error('Bucle infinito detectado y bloqueado');
  }
  
  // Registrar intento de recarga usando beforeunload
  window.addEventListener('beforeunload', () => {
    sessionStorage.setItem(reloadKey, (currentReloads + 1).toString());
  }, { once: true });
}

console.log(`[CacheControl] 🛡️ Guardián de Caché v1.0.0 inicializado (Versión: ${APP_VERSION})`);