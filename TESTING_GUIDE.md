# 🧪 GUÍA DE PRUEBAS: Auto-Clear y Resiliencia

## 📝 Prueba 1: Verificar que Cache Control Se Ejecuta

**Objetivo:** Confirmar que `initializeCacheControl()` se ejecuta al cargar

**Pasos:**
1. Abre DevTools (F12)
2. Ir a **Console**
3. Recargar la página (Ctrl+R)
4. Busca este mensaje en los primeros logs:
   ```
   [CacheControl] 🛡️ Guardián de Caché v1.0.0 inicializado
   ```

**Resultado esperado:** ✅ El mensaje aparece en los primeros 500ms

---

## 📝 Prueba 2: Simular Bloqueo de 5 Segundos

**Objetivo:** Verificar que Auto-Clear se dispara

**Pasos:**
1. Abre DevTools Console
2. Ejecuta este código para detener el renderizado:
   ```javascript
   // Congelar la aplicación por 6 segundos
   while(Date.now() % 6000 < 100) {}
   ```
3. O alterna: Ve a Network tab, selecciona "Slow 3G" para simular conexión lenta
4. Recarga la página

**Resultado esperado:** 
- ✅ Después de 5 segundos aparece consola: `[CacheControl] 🚨 BLOQUEO DETECTADO`
- ✅ Auto-limpia automáticamente
- ✅ Página se recarga sola después de 2 segundos

**Nota:** Si el bloqueo NO ocurre, es porque la app está cargando normalmente (✅ ¡Es correcto!)

---

## 📝 Prueba 3: Verificar Deep Clean

**Objetivo:** Confirmar que Deep Clean elimina datos correctamente

**Pasos:**
1. Abre DevTools Console
2. Anota el contenido de localStorage:
   ```javascript
   console.table(Object.keys(localStorage))
   ```
3. Ejecuta Deep Clean manual:
   ```javascript
   import('@/lib/cacheControl').then(m => {
     m.executeDeepClean();
     console.log('Deep Clean ejecutado');
   });
   ```
4. Verifica localStorage de nuevo:
   ```javascript
   console.table(Object.keys(localStorage))
   ```

**Resultado esperado:**
- ✅ localStorage se reduce (datos tempor. eliminados)
- ✅ Tokens Supabase (`sb-*`) se mantienen
- ✅ Console muestra: `💎 DEEP CLEAN COMPLETADO`

---

## 📝 Prueba 4: Protección Anti-Bucle (Safe Reload)

**Objetivo:** Verificar que safeReload() bloquea en el 3er intento

**Pasos:**
1. Abre DevTools Console
2. Ejecuta recarga segura 3 veces:
   ```javascript
   import('@/lib/cacheControl').then(m => {
     console.log('Intento 1');
     m.safeReload('Test 1');
   });
   
   // Esperar 2 segundos después de que se recargue, luego:
   // Vuelve a ejecutar en console:
   
   import('@/lib/cacheControl').then(m => {
     console.log('Intento 2');
     m.safeReload('Test 2');
   });
   
   // Esperar 2 segundos, luego:
   
   import('@/lib/cacheControl').then(m => {
     console.log('Intento 3');
     m.safeReload('Test 3'); // ← Este DEBERÍA ser bloqueado
   });
   ```

**Resultado esperado:**
- ✅ Intento 1: Recarga normal
- ✅ Intento 2: Recarga normal
- ✅ Intento 3: Console muestra:
  ```
  [CacheControl] 🚨 BLOQUEADO: Múltiples recargas detectadas
  [CacheControl] ⏹️ Recarga bloqueada para prevenir bucle infinito
  ```

---

## 📝 Prueba 5: Estado de Cache Control

**Objetivo:** Verificar el estado actual del sistema

**Pasos:**
1. Abre DevTools Console
2. Ejecuta:
   ```javascript
   import('@/lib/cacheControl').then(m => {
     console.table(m.getCacheStatus());
   });
   ```

**Resultado esperado:** Tabla con:
```
VERSION:            1714900000000
STOREDVERSION:      1714900000000
HASRELOADED:        false
LOCALSTORAGEKEYS:   8
SESSIONSTORAGEKEYS: 2
WHITELISTEDKEYS:    ["sb-qxmecegq..."]
DEEPCLEANEXECUTED:  false
```

---

## 📝 Prueba 6: BannedGuard Timeout

**Objetivo:** Verificar que BannedGuard renderiza aunque useAuth tarde

**Pasos:**
1. En Network > Throttling: Selecciona "Offline"
2. Recarga la página
3. Observa DevTools Console

**Resultado esperado:**
- ✅ Spinner gira indefinidamente
- ✅ Después de 10 segundos, aparece consola:
  ```
  [BannedGuard] ⏰ Timeout: useAuth tardó demasiado
  ```
- ✅ (Opcionalmente) La app intenta renderizar contenido mismo sin Supabase

**Nota:** Vuelve a seleccionar "Online" para restaurar red

---

## 📝 Prueba 7: Recovery UI Manual

**Objetivo:** Verificar el botón "Limpieza Profunda y Reintentar"

**Pasos:**
1. Simula bloqueo de 5+ segundos (pausa la red)
2. Espera a que LoadingBlockGuard muestre el botón
3. Lee el mensaje: "Se ejecutó Limpieza Profunda..."
4. Presiona: "Limpieza Profunda y Reintentar"

**Resultado esperado:**
- ✅ Botón se deshabilita (muestra spinner)
- ✅ Console: `💎 EJECUTANDO DEEP CLEAN...`
- ✅ Página se recarga automáticamente después de 1.5s
- ✅ Sin bucles infinitos

---

## 📝 Prueba 8: Whitelist de Tokens

**Objetivo:** Confirmar que los tokens NO se eliminan

**Antes:**
```javascript
// Anotar un token existente
localStorage.getItem('sb-qxmecegqnapcjlchjqld-auth-token')
// Resultado: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Ejecutar Deep Clean:**
```javascript
import('@/lib/cacheControl').then(m => m.executeDeepClean());
```

**Después:**
```javascript
// Verificar que el token sigue allí
localStorage.getItem('sb-qxmecegqnapcjlchjqld-auth-token')
// Resultado: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." 
// ← MISMO TOKEN, NO ELIMINADO ✅
```

**Resultado esperado:** ✅ Token se mantiene exactamente igual

---

## 📋 Checklist de Validación

- [ ] Cache Control se ejecuta en main.tsx (mensaje en console)
- [ ] LoadingBlockGuard está en App.tsx (visible en React DevTools)
- [ ] Deep Clean function limpia localStorage pero preserva tokens
- [ ] SafeReload bloquea después de 2 intentos
- [ ] BannedGuard renderiza después de 10s aunque useAuth tarde
- [ ] Recovery UI muestra después de 5s sin cargar
- [ ] Botón "Limpieza Profunda y Reintentar" funciona
- [ ] No hay bucles infinitos en ningún escenario

---

## 🆘 Si Algo No Funciona

### Problema: No veo mensaje de Cache Control

**Solución:**
```javascript
// Verificar que se importó correctamente
Object.keys(window).filter(k => k.includes('CACHE'))
```

### Problema: Deep Clean no funciona

**Solución:**
```javascript
// Verificar localStorage antes/después
const before = Object.keys(localStorage).length;
import('@/lib/cacheControl').then(m => {
  m.executeDeepClean();
  console.log('Antes:', before, '| Después:', Object.keys(localStorage).length);
});
```

### Problema: SafeReload no bloquea

**Solución:**
```javascript
// Verificar contador
sessionStorage.getItem('safe-reload-/')
// Si es '2' o más, debería estar bloqueado
```

---

## 💾 Configuración de Tests Automatizados (Opcional)

Si tienes CI/CD, puedes agregar:

```javascript
// tests/cacheControl.test.ts
describe('Cache Control', () => {
  test('Deep Clean preserves Supabase tokens', async () => {
    const token = localStorage.getItem('sb-token');
    executeDeepClean();
    expect(localStorage.getItem('sb-token')).toBe(token);
  });

  test('SafeReload blocks after 2 attempts', async () => {
    safeReload('test');
    safeReload('test');
    safeReload('test'); // ← Should be blocked
    expect(sessionStorage.getItem('safe-reload-/-blocked')).toBe('true');
  });

  test('LoadingBlockGuard detects 5s blockage', async () => {
    // Simula bloqueo
    jest.advanceTimersByTime(5000);
    // Verifica que Deep Clean se ejecutó
    expect(sessionStorage.getItem('deep-clean-executed')).toBeTruthy();
  });
});
```

---

**¡Todas las pruebas pasadas? ✅ Sistema listo para producción!**
