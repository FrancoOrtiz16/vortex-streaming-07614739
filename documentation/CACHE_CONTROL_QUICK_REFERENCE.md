# 🛡️ CACHE CONTROL QUICK REFERENCE
## Guía de Referencia Rápida para Desarrolladores

**Version:** 1.0.0 | **Last Updated:** 2026-05-03

---

## ⚡ USO RÁPIDO

### 1. Diagnosticar Cache (En DevTools Console)
```javascript
// Obtener estado actual
const { getCacheStatus } = await import('/src/lib/cacheControl.ts');
getCacheStatus();

// Output esperado:
// {
//   version: "1714838451234",
//   storedVersion: "1714838451234",
//   hasReloaded: false,
//   localStorageKeys: 15,
//   sessionStorageKeys: 3,
//   whitelistedKeys: ["sb-auth-token", "user-session"]
// }
```

### 2. Limpiar Cache Manualmente (Solo Localhost)
```typescript
import { forceCacheClear } from '@/lib/cacheControl';

// En desarrollo:
forceCacheClear(); // ✅ Ejecuta limpieza
// En producción: Solo aviso en console
```

### 3. Cache-Busting en Imports Dinámicos
```typescript
import { getCacheBustedUrl, dynamicImport } from '@/lib/cacheControl';

// Opción 1: URL manual
const AdminPanel = lazy(() => import(getCacheBustedUrl('./Admin.tsx')));

// Opción 2: Wrapper automático
const Subscriptions = lazy(() => 
  dynamicImport(() => import('./AdminSubscriptions.tsx'))
);
```

### 4. Proteger Fetches Largos
```typescript
import { safeFetch, createSafeTimeout } from '@/lib/cacheControl';

// Fetch con timeout 3s
try {
  const res = await safeFetch('/api/orders', {}, 3000);
  const data = await res.json();
} catch (err) {
  console.error('Timeout o error:', err);
  // Mostrar estado de error en UI
}

// Promise genérica
const data = await createSafeTimeout(
  slowPromise(),
  5000,
  'Operación bloqueante detectada'
);
```

### 5. Validar Queries de BD
```typescript
import { validateDatabaseQuery } from '@/lib/cacheControl';

// Validar query
validateDatabaseQuery(myQuery, 'getUsers');
// Si contiene 'combo_id' o 'subscription_code':
// → Console error en AMBOS modos
// → throw error solo en localhost
```

---

## 🎯 PROBLEMAS COMUNES

### Problema: Infinite Reload Loop
**Síntoma:** Página recarga constantemente  
**Solución rápida:**
```javascript
// En DevTools Console:
localStorage.removeItem('app_version');
location.reload();
```

### Problema: CSS/JS No Actualiza Post-Deploy
**Síntoma:** Cambios no se ven después de deploy  
**Solución:** ✅ AUTOMÁTICO - Esperar 1 recarga (máx)  
*(Sistema detecta nuevo APP_VERSION y limpia automáticamente)*

### Problema: Fetch Timeout Constantemente
**Síntoma:** "Timeout: Proceso bloqueante detectado"  
**Solución:** Aumentar timeout
```typescript
await safeFetch('/api/data', {}, 5000); // ← Cambiar 3000 a 5000
```

### Problema: Auth Perdida Después de Deploy
**Síntoma:** "Session expired" error  
**Explicación:** ✅ NO DEBERÍA OCURRIR (whitelist lo previene)  
**Si ocurre:** Verificar whitelist en `cacheControl.ts` línea ~20

---

## 📊 FLUJO DE EJECUCIÓN

```
1. main.tsx importa './lib/cacheControl' ← PRIMERO
2. cacheControl.ts inicializa automáticamente
3. Compara: localStorage.app_version vs APP_VERSION
4. Si diferentes:
   - Limpia localStorage (excepto auth tokens)
   - Limpia sessionStorage (excepto auth tokens)
   - Recarga página 1 vez
   - No vuelve a recargar en esta sesión
5. React renderiza <App /> normalmente
```

---

## 🔧 CONSTANTES Y FUNCIONES

### Constantes
```typescript
APP_VERSION              // Unique per deploy (timestamp)
WHITELIST_KEYS          // Keys protected from cleanup
OBSOLETE_COLUMNS        // Database columns to flag
```

### Funciones Públicas
```typescript
initializeCacheControl()    // Auto-called on import
getCacheBustedUrl(url)      // Returns url?v=${APP_VERSION}
dynamicImport(importFn)     // Wrapper for dynamic imports
createSafeTimeout(promise)  // Promise with 3s timeout
safeFetch(url, opts)        // Fetch with timeout protection
validateDatabaseQuery(q)    // Check for obsolete columns
safeSupabaseQuery(q)        // Wrapper for Supabase
getCacheStatus()            // Get diagnostic info
forceCacheClear()           // Manual cleanup (dev only)
```

---

## 🚨 DEVELOPER ALERTS

Cuando veas estos en console, debes actuar:

| Alert | Level | Acción |
|-------|-------|--------|
| `[CacheControl] 🔄 Versión cambió` | INFO | Normal, limpieza en progreso |
| `[CacheControl] ⏰ Fetch timeout` | WARN | Optimizar fetch o ↑ timeout |
| `[CacheControl] 🚨 Columna obsoleta` | ERROR | Remover `combo_id` o `subscription_code` de query |
| `[CacheControl] 🚨 BUCLE INFINITO` | CRITICAL | Hard refresh + clear storage |

---

## ✅ CHECKLIST ANTES DE DEPLOY

- [ ] Compilar sin errores: `npm run build`
- [ ] Verificar imports de cacheControl en componentes
- [ ] Verificar que NO hay columnas obsoletas en queries
- [ ] Revisar console para advertencias de CacheControl
- [ ] Si modificó cacheControl.ts, test en localhost
- [ ] Verificar whitelist si agregó nuevas auth keys

---

## 📈 MONITOREO

### Logs Esperados (Normal)
```
[CacheControl] 🛡️ Inicializando Guardián de Caché...
[CacheControl] ✅ Versión sincronizada - Sin limpieza
[CacheControl] ✅ Timeout de carga cancelado - App lista
```

### Logs de Caution (Pero Normales)
```
[CacheControl] 🔄 Versión cambió - Ejecutando limpieza
[CacheControl] 🧹 Ejecutando limpieza con whitelist
[CacheControl] 🗑️ Eliminado localStorage: cart-items
```

### Logs de Error (Investigar)
```
[CacheControl] ⏰ ALERTA: Fetch timeout
[CacheControl] 🚨 Columna obsoleta detectada
[CacheControl] 🚨 BUCLE INFINITO DETECTADO
```

---

## 🎓 EXAMPLES

### Ejemplo 1: Proteger Admin Dashboard
```typescript
// components/admin/Dashboard.tsx
import { createSafeTimeout } from '@/lib/cacheControl';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await createSafeTimeout(
        fetchDashboardData(),
        3000,
        'Dashboard data timeout'
      );
      // ... usar data
    } catch (err) {
      setError('Dashboard cargó lentamente');
      // Mostrar error controlado (no spinner infinito)
    } finally {
      setLoading(false);
    }
  };

  if (error) return <ErrorState message={error} />;
  // ...
}
```

### Ejemplo 2: Validar Query de Subscripciones
```typescript
import { validateDatabaseQuery } from '@/lib/cacheControl';

export async function getSubscriptions() {
  const query = supabase
    .from('subscriptions')
    .select('id, user_id, service, status, next_renewal')
    .eq('user_id', userId);

  // Validar ANTES de ejecutar
  validateDatabaseQuery(query, 'getSubscriptions');

  return query;
}
```

### Ejemplo 3: Dynamic Import con Cache-Bust
```typescript
import { lazy } from 'react';
import { getCacheBustedUrl } from '@/lib/cacheControl';

// Para componentes pesados (Admin Panel, etc.)
export const AdminPanel = lazy(() => 
  import(getCacheBustedUrl('./pages/AdminPanel.tsx'))
    .then(m => ({ default: m.AdminPanel }))
);
```

---

## 🔗 ARCHIVOS RELACIONADOS

- 📖 **CACHE_CONTROL_INTEGRATION_GUIDE.md** - Guía técnica completa
- 📋 **CACHE_CONTROL_GUARDIAN_SUMMARY.md** - Resumen ejecutivo  
- 💻 **src/lib/cacheControl.ts** - Código fuente comentado
- 🌐 **src/main.tsx** - Entry point (verifica import)
- 📄 **index.html** - Meta tags y script inyectado

---

## 💡 TIPS

1. **Para desarrollo rápido:** Usa `forceCacheClear()` en DevTools
2. **Para debugging:** `getCacheStatus()` muestra todo
3. **Para componentes lentos:** Envuelve con `createSafeTimeout()`
4. **Para queries:** Validar con `validateDatabaseQuery()` ANTES de ejecutar
5. **Para deploys:** El sistema maneja limpeza automáticamente

---

## 📞 SOPORTE

**¿Dónde está el Guardián activado?**  
→ `src/main.tsx` línea 2, antes de `import App`

**¿Cómo sé si está funcionando?**  
→ Abre DevTools → Console → busca `[CacheControl]`

**¿Puedo desactivarlo?**  
→ ❌ NO RECOMENDADO - Quita el import en main.tsx si es ABSOLUTAMENTE necesario

**¿Funciona en producción?**  
→ ✅ SÍ (automático, solo 1 recarga por deploy)

---

**Keep it clean. Keep it fast.** 🚀  
*Guardian v1.0.0 - Always watching*
