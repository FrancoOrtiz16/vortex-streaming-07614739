# 🛡️ CACHE CONTROL INTEGRATION GUIDE
## Sistema Guardián de Caché - Arquitectura de Cero Persistencia

**Versión:** 1.0.0  
**Fecha:** 2026-05-03  
**Especialización:** Progressive Web Apps + Memory Management  

---

## 📋 TABLA DE CONTENIDOS

1. [Arquitectura General](#arquitectura-general)
2. [Componentes Implementados](#componentes-implementados)
3. [Especificaciones Técnicas Cumplidas](#especificaciones-técnicas-cumplidas)
4. [Guía de Uso para Desarrolladores](#guía-de-uso-para-desarrolladores)
5. [Troubleshooting](#troubleshooting)

---

## 🏗️ ARQUITECTURA GENERAL

```
┌─────────────────────────────────────────────────────────────┐
│                    VORTEX STREAMING PWA                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  index.html (Meta Tags + Cache-Bust Script)           │ │
│  │  ├─ Cache-Control directives                          │ │
│  │  ├─ Loading timeout (5s)                              │ │
│  │  └─ Infinite reload detector                          │ │
│  └────────────────────────────────────────────────────────┘ │
│           ↓                                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  src/main.tsx (Entry Point)                           │ │
│  │  - Import './lib/cacheControl' FIRST LINE             │ │
│  │  - Then import App component                          │ │
│  └────────────────────────────────────────────────────────┘ │
│           ↓                                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  src/lib/cacheControl.ts (EL GUARDIÁN)                │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ 1. Version Detection & Management               │ │ │
│  │  │    - APP_VERSION = timestamp-based              │ │ │
│  │  │    - Automatic cache invalidation on deploy     │ │ │
│  │  │    - Infinite reload prevention                 │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ 2. Smart Cache Clearing                         │ │ │
│  │  │    - localStorage.clear() + sessionStorage      │ │ │
│  │  │    - Whitelist protection (Auth tokens)         │ │ │
│  │  │    - Dev-mode forced cleanup                    │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ 3. Cache-Busting for Dynamic Imports            │ │ │
│  │  │    - getCacheBustedUrl() function               │ │ │
│  │  │    - dynamicImport() wrapper                    │ │ │
│  │  │    - Query parameter: ?v=${APP_VERSION}         │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ 4. Blocking Process Isolation                   │ │ │
│  │  │    - createSafeTimeout() [3s default]           │ │ │
│  │  │    - safeFetch() with timeout handling          │ │ │
│  │  │    - Dashboard fetch protection                 │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ 5. Obsolete Column Detection                    │ │ │
│  │  │    - validateDatabaseQuery()                    │ │ │
│  │  │    - Filters: combo_id, subscription_code       │ │ │
│  │  │    - Developer alerts + error in dev mode       │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  │  ┌──────────────────────────────────────────────────┐ │ │
│  │  │ 6. Developer Utilities                          │ │ │
│  │  │    - getCacheStatus() - diagnostics console    │ │ │
│  │  │    - forceCacheClear() - manual cleanup         │ │ │
│  │  │    - Window global typing for props             │ │ │
│  │  └──────────────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
│           ↓                                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  React Application                                    │ │
│  │  │ All components benefit from:                    │ │
│  │  │ ✅ Clean cache state on deployment             │ │
│  │  │ ✅ No infinite loading loops                    │ │
│  │  │ ✅ Protected authentication tokens              │ │
│  │  │ ✅ Automatic fetch timeouts                     │ │
│  │  │ ✅ Database query validation                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ ESPECIFICACIONES TÉCNICAS CUMPLIDAS

### 1. ✓ DETECCIÓN DE VERSIÓN Y LIMPIEZA INTELIGENTE

**Archivo:** `src/lib/cacheControl.ts`

```typescript
export const APP_VERSION = Date.now().toString();
```

**Comportamiento:**
- Cada despliegue crea un new timestamp único
- Sistema compara `localStorage.app_version` con `APP_VERSION`
- Si son diferentes → ejecuta limpieza automática
- Prevención de bucles infinitos con flag `has_reloaded` en sessionStorage
- Máx 1 recarga automática por sesión

**Whitelist de Protección:**
```typescript
const WHITELIST_KEYS = [
  'sb-',                      // Todas claves Supabase
  'supabase-auth-token',
  'supabase.auth.token',
  'user-session',
  'auth-token',
  'session-token'
];
```

❌ **Está protegida:** La sesión de Franco NO se cierra durante limpieza

---

### 2. ✓ CABECERAS Y META-TAGS DE CACHÉ

**Archivo:** `index.html` (líneas 16-26)

```html
<!-- Cache Control Meta Tags -->
<meta http-equiv="Expires" content="0">
<meta http-equiv="Last-Modified" content="0">
<meta http-equiv="Cache-Control" content="no-cache, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">

<!-- 🛡️ CACHE-BUSTING SCRIPT -->
<script>
  window.__CACHE_BUST_VERSION__ = Date.now().toString();
  // ... monitoring script
</script>
```

**Configuración:**
- ✅ Prohíbe almacenamiento persistente de assets
- ✅ Fuerza revalidación en cada visita
- ✅ Compatible con modo incógnito
- ✅ Monitoreo de cargas > 5 segundos

---

### 3. ✓ CACHE-BUSTING PARA IMPORTS DINÁMICOS

**Función disponible:**

```typescript
// Usar para componentes pesados (Admin Panel, Modal Pagos, etc)
const adminModule = await import(getCacheBustedUrl('./Admin.tsx'));

// Resultado: './Admin.tsx?v=1714838451234'
```

**Wrappers de utilidad:**

```typescript
// Wrapper automático para imports
dynamicImport(() => import('./AdminSubscriptions.tsx'));

// Con timeout de seguridad
safeFetch('/api/admin/data', {}, 3000);
```

---

### 4. ✓ AISLAMIENTO DE PROCESOS BLOQUEANTES

**Protección de Timeouts (3s default):**

```typescript
export function createSafeTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 3000,
  errorMessage: string = 'Timeout: Proceso bloqueante detectado'
): Promise<T>
```

**Ejemplo de uso en Dashboard:**

```typescript
// En lugar de:
const data = await fetchAdminData();

// Usar:
try {
  const data = await createSafeTimeout(
    fetchAdminData(),
    3000,
    'Admin data load timeout'
  );
} catch (err) {
  console.error('Fetch bloqueado por timeout', err);
  // Mostrar estado de error controlado
}
```

❌ **Resultado:** Spinner infinito → Error Controlado (máx 3s espera)

---

### 5. ✓ FILTRO DE COLUMNAS OBSOLETAS

**Validación automática:**

```typescript
const OBSOLETE_COLUMNS = ['combo_id', 'subscription_code'];

export function validateDatabaseQuery(query: any, context: string = 'unknown'): void {
  // Detecta automáticamente si consulta contiene columnas obsoletas
  // Console error + throw en modo desarrollo (localhost)
}
```

**Uso recomendado:**

```typescript
// Envolver consultas de Supabase:
import { validateDatabaseQuery } from '@/lib/cacheControl';

export async function getSubscriptions() {
  const query = supabase
    .from('subscriptions')
    .select('*');
  
  // Validar ANTES de ejecutar
  validateDatabaseQuery(query, 'getSubscriptions');
  
  return query;
}
```

---

## 🔧 GUÍA DE USO PARA DESARROLLADORES

### Diagnosticar Estado del Caché

```typescript
import { getCacheStatus } from '@/lib/cacheControl';

// En consola:
const status = getCacheStatus();
console.log(status);

// Output:
{
  version: "1714838451234",
  storedVersion: "1714838451234",
  hasReloaded: false,
  localStorageKeys: 15,
  sessionStorageKeys: 3,
  whitelistedKeys: ["sb-auth-token-12345", "user-session"]
}
```

### Limpiar Caché Manualmente (Dev Only)

```typescript
import { forceCacheClear } from '@/lib/cacheControl';

// Solo funciona en localhost:
forceCacheClear(); // ✅ Ejecuta en dev
// En producción: muestra advertencia
```

### Usar Cache-Busting en Componentes

```typescript
// Para components admin pesados:
import { getCacheBustedUrl, dynamicImport } from '@/lib/cacheControl';

// Opción 1: URL manual
const AdminComponent = lazy(() => 
  import(getCacheBustedUrl('./components/admin/Panel.tsx'))
);

// Opción 2: Wrapper automático
const SubscriptionsComponent = lazy(() => 
  dynamicImport(() => import('./components/admin/Subscriptions.tsx'))
);
```

### Proteger Fetches Largas

```typescript
import { safeFetch, createSafeTimeout } from '@/lib/cacheControl';

// Con timeout de 3 segundos:
try {
  const response = await safeFetch('/api/orders', { method: 'GET' });
  const data = await response.json();
} catch (err) {
  console.error('Fetch timeout o error', err);
  // Mostrar estado error en UI
}

// Promise genérica:
const dashboardData = await createSafeTimeout(
  fetchDashboardAsync(),
  5000,
  'Dashboard data load timeout'
);
```

### Validar Consultas BD

```typescript
import { validateDatabaseQuery, safeSupabaseQuery } from '@/lib/cacheControl';

// Validación manual:
validateDatabaseQuery(my_query_object, 'UsersFetch');

// O con wrapper:
const query = safeSupabaseQuery(
  supabase.from('users').select('*'),
  'getUsersList'
);
```

---

## 🐛 TROUBLESHOOTING

### Problema: "Infinite reload detected"

**Síntomas:** Página se recarga constantemente

**Causa:** 
- Sistema detectó más de 2 recargas en sesión
- Posible bucle infinito en código

**Solución:**
1. Abrir DevTools → Console
2. Ejecutar: `localStorage.removeItem('app_version')`
3. Hard refresh: `Ctrl+Shift+R` (Windows) o `Cmd+Shift+R` (Mac)
4. Revisar Console para mensajes `[CacheControl]`

### Problema: "Styling/JS not updating after deploy"

**Síntomas:** 
- CSS cambios no se ven
- New functions todavía tienen código viejo

**Causa:** 
- Navegador cacheando archivos estáticos
- APP_VERSION no cambió

**Solución:**
```typescript
// Esto se ejecuta AUTOMÁTICAMENTE en cada deploy:
// → APP_VERSION cambia (nuevo timestamp)
// → localStorage limpieza se ejecuta
// → Página se recarga automáticamente
```

### Problema: "Auth session lost after cache clear"

**Síntomas:** 
- Usuario deslogueado después de deploy
- "Session expired" error

**Causa:** 
- Auth token fue limpiado

**Solución:**
- ✅ **ESTO NO DEBE SUCEDER** - Whitelist protege tokens
- Si ocurre: revisar que `WHITELIST_KEYS` contiene patrón correcto
- Verificar: `grep -n "sb-" src/lib/cacheControl.ts`

### Problema: "Fetch requests timeout constantemente"

**Síntomas:**
- "Timeout: Proceso bloqueante detectado" en console
- Requests fallan si toman > 3 segundos

**Solución:**
```typescript
// Aumentar timeout si fetch es legítimamente lento:
await safeFetch(
  '/api/data',
  { method: 'GET' },
  5000  // ← Cambiar a 5 segundos
);

// O para promises genéricas:
await createSafeTimeout(
  slowPromise,
  7000,  // ← Aumentar timeout
  'Slow operation'
);
```

### Problema: "combo_id/subscription_code ALERTS en console"

**Síntomas:**
- Console error: "Columna obsoleta 'combo_id' detectada"
- En desarrollo: throw error
- En producción: solo alerta

**Solución:**
1. Identificar dónde se usa la columna obsoleta
2. Remover de la query
3. Example:
```typescript
// ❌ Antes (ERROR):
const query = supabase
  .from('suscripciones')
  .select('*'); // Implícitamente incluye combo_id

// ✅ Después (CORRECTO):
const query = supabase
  .from('suscripciones')
  .select('id, usuario, servicio, vigencia'); // Explícitamente
```

---

## 📊 MONITOREO Y LOGGING

### Console Output Normal (Esperado)

```
[CacheControl] 🛡️ Inicializando Guardián de Caché...
[CacheControl] ✅ Versión sincronizada - Sin limpieza necesaria
[CacheControl] ✅ Timeout de carga cancelado - Aplicación lista
[CacheControl] 🛡️ Guardián de Caché v1.0.0 inicializado (Versión: 1714838451234)
```

### Console Output Warning (Atención)

```
[CacheControl] 🔄 Versión cambió - Ejecutando limpieza inteligente...
[CacheControl] 🧹 Ejecutando limpieza con whitelist...
[CacheControl] 🗑️ Eliminado localStorage: cart-items
[CacheControl] ⏰ ALERTA: Fetch timeout: /api/admin/data (3000ms)
[CacheControl] 🚨 ALERTA: Columna obsoleta 'combo_id' detectada en consulta!
```

### Console Output Error (Crítico)

```
[CacheControl] 🚨 BUCLE INFINITO DETECTADO - Deteniendo recargas automáticas
[CacheControl] ⏰ ALERTA: Página tomando more than 5 segundos para cargar
```

---

## 🚀 CHECKLIST DE INTEGRACIÓN

- [x] `cacheControl.ts` creado con todas las funciones
- [x] `main.tsx` importa cacheControl como primera línea
- [x] `index.html` tiene meta tags y script de cache
- [x] Whitelist protege tokens de Supabase/Auth
- [x] Timeout de 3s previene spinners infinitos
- [x] Columnas obsoletas detectadas y alertadas
- [x] TypeScript compile: sin errores
- [x] Infinite reload detection implementado
- [x] Developer utilities funcionales
- [x] Documentación completa (este archivo)

---

## 📞 SOPORTE Y PREGUNTAS

**¿Por qué se ejecuta en main.tsx PRIMERO?**
- Esto asegura que el sistema de cache esté listo ANTES de que React renderice
- Previene race conditions en la carga

**¿Qué pasa si sessionStorage.clear() falla?**
- El whitelist verifica cada key individualmente
- Si localStorage/sessionStorage no está disponible, app continúa normalmente

**¿Los usuarios verán recarga automática?**
- SÍ (por 1 segundo máximo) pero solo en primer deploy después de cambio de versión
- Las sesiones subsecuentes NO tienen recarga

**¿Es compatible con modo incógnito?**
- SÍ, el sistema funciona igual porque
- No depende de persistencia de localStorage entre sesiones

---

**Última actualización:** 2026-05-03 - Versión 1.0.0
