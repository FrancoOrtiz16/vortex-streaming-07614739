# 🚀 Cache Busting Quick Start Guide

**Última actualización**: 17 de Mayo de 2026  
**Estado**: ✅ Implementación Completada

---

## 🎯 Quick Deploy Checklist

Antes de desplegar cambios a producción, sigue esta checklist:

- [ ] **Código**: Cambios committeados a `main`
- [ ] **Build Local**: `npm run build` ejecutado exitosamente
- [ ] **Hash Verification**: Los archivos en `dist/assets/` tienen hashes nuevos
- [ ] **Testing**: Abrir `npm run preview` y verificar funcionalidad
- [ ] **DevTools Check**: Service Worker activo en Application tab
- [ ] **Git**: Push a `origin main` completado

---

## 📋 Monitoreo Post-Deploy

### Primeras 5 minutos después del deploy

```bash
# Terminal 1: Monitorea logs
npm run preview

# Terminal 2: En otro cliente
curl -I https://vortex-streaming.lovable.app/

# Busca estas cabeceras:
# Cache-Control: no-store, no-cache, must-revalidate
# ✅ Si está presente = Configuración correcta
```

### Verificación en Navegador de Cliente

1. **Abre DevTools** (F12)
2. **Ve a Application tab**
3. **Busca Service Workers**
   - ✅ Debe mostrar: `activated and running`
   - ❌ NO debe mostrar: `waiting to activate`

4. **Busca Cache Storage**
   - ✅ Debe haber: `vortex-static`, `vortex-runtime`
   - Verifica que tenga archivos con hashes nuevos

5. **Abre Console**
   - ✅ Debe haber logs: `[SW Registry] ✅ Service Worker registrado`
   - ✅ Cada 10s: `[VersionCheck] Chequeando actualizaciones`

---

## 🔍 Troubleshooting Rápido

### El banner de actualización no aparece

```javascript
// En DevTools Console:
window.__SW_REGISTRATION__
// Debería retornar un objeto ServiceWorkerRegistration
// Si es null, el SW no se registró
```

### Los archivos no tienen hashes

```bash
# Verifica vite.config.ts
grep -n "entryFileNames\|chunkFileNames" vite.config.ts

# Debería mostrar:
# 22:        entryFileNames: 'assets/[name]-[hash].js',
# 23:        chunkFileNames: 'assets/[name]-[hash].js',

# ❌ Si muestra [name].[hash] sin guión, los hashes pueden no generarse
```

### Service Worker no se actualiza

```bash
# Limpia todo relacionado a SW
rm -rf ~/.cache/vortex*
rm -rf ~/Library/Caches/vortex*  # macOS

# En navegador:
# DevTools → Application → Service Workers
# → Unregister → Reload página
```

---

## 📊 Validación del Sistema

### Automatizado

```bash
# Ejecutar validación completa
chmod +x validate-cache-busting.sh
./validate-cache-busting.sh

# Debería retornar:
# ✅ TODAS LAS VALIDACIONES PASARON!
```

### Manual Step-by-Step

#### 1. Verificar Hashes en Build

```bash
npm run build

# Entrar a dist/
cd dist/assets/

# Listar archivos
ls -la

# Deberías ver:
# -rw-r--r--  index-a3f2b1c.js
# -rw-r--r--  main-8d7e5c2.css
# -rw-r--r--  vendor-f1c9e2d.js

# ✅ Si sí = Hashes están funcionando
```

#### 2. Verificar Meta Tags

```bash
# Buscar en index.html
grep -A 2 "Cache-Control" index.html

# Debería mostrar:
# <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
# <meta http-equiv="Pragma" content="no-cache">
# <meta http-equiv="Expires" content="0">

# ✅ Si sí = Meta tags están presentes
```

#### 3. Verificar SW.js

```bash
# Verificar que existe
ls -la public/sw.js

# ✅ Si existe = Service Worker está presente

# Verificar skipWaiting()
grep "skipWaiting" public/sw.js

# ✅ Si está = SW activará inmediatamente
```

#### 4. Test de Actualización Manual

```bash
# 1. Servir la app
npm run preview

# 2. Abrir en navegador: http://localhost:4173
# 3. Abrir DevTools → Application → Service Workers
# 4. Confirmar: "activated and running"

# 5. En otro terminal, hacer un cambio pequeño
# Ej: src/App.tsx → comentar una línea

# 6. Rebuild
npm run build

# 7. En navegador, esperar 10 segundos
# Debería ver banner: "Nueva versión disponible"
# Auto-actualiza en 2 segundos

# ✅ Si funciona = Sistema está operativo
```

---

## 🎛️ Configuración por Ambiente

### Production

```typescript
// src/App.tsx
<VersionUpdateNotification 
  autoUpdate={true}           // ⚡ Auto-actualizar
  checkInterval={10000}       // 10 segundos
  position="top"
/>
```

Comportamiento:
- Nueva versión → Auto-actualiza en 2 segundos
- Usuario no necesita hacer nada
- Completamente transparente

### Staging

```typescript
<VersionUpdateNotification 
  autoUpdate={false}          // 📋 Pedir confirmación
  checkInterval={15000}       // 15 segundos
  position="top"
/>
```

Comportamiento:
- Nueva versión → Muestra banner
- Usuario puede hacer click en "Actualizar"
- Más control para testing

### Development (Local)

```typescript
// Desactivar notificación en local para no distraer
{process.env.NODE_ENV === 'production' && (
  <VersionUpdateNotification 
    autoUpdate={true}
    checkInterval={10000}
    position="top"
  />
)}
```

---

## 📈 Monitoreo Continuo

### Logs a Revisar en DevTools Console

```
✅ [CacheControl] 🛡️ Inicializando Guardián de Caché...
✅ [SW Registry] ✅ Service Worker registrado exitosamente
✅ [VersionCheck] 🔍 Chequeando actualizaciones del Service Worker...
✅ [VersionCheck] 📢 Actualización de Service Worker encontrada!
✅ [SW] 📦 Installing Service Worker...
✅ [SW] 🔄 Activating Service Worker...
```

### Alertas de Problema

```
❌ [SW Registry] Error registrando Service Worker
❌ [VersionCheck] Error en chequeo periódico
❌ [Watchdog] Bloqueo persistente
```

Si ves estos errores:
1. Abre DevTools Console completo
2. Copia el mensaje de error completo
3. Contacta al equipo DevOps

---

## 🔐 Security Best Practices

### ✅ Lo que Implementamos

| Feature | Implementado |
|---------|:---:|
| Hash-based cache busting | ✅ |
| Service Worker `updateViaCache: 'none'` | ✅ |
| Meta tags `no-cache, must-revalidate` | ✅ |
| `skipWaiting()` para activación inmediata | ✅ |
| `Clients.claim()` para tomar control | ✅ |
| Limpieza de cachés antiguos | ✅ |
| Network-first para HTML/API | ✅ |
| Stale-while-revalidate para assets | ✅ |
| Fallback graceful sin conexión | ✅ |

### ❌ Lo que NO debes hacer

- ❌ Cambiar `updateViaCache` a `true` o `undefined`
- ❌ Usar timestamps en lugar de content hash
- ❌ Remover los meta tags `Cache-Control`
- ❌ Aumentar demasiado el `checkInterval` (> 60s)
- ❌ Desabilitar `skipWaiting()` o `Clients.claim()`

---

## 📞 FAQ

### P: ¿Cuánto tiempo tarda una actualización en llegar a todos los usuarios?

R: 
- **Usuario activo en navegador**: 10-30 segundos (después del chequeo periódico)
- **Usuario que llega nuevo**: Instantáneo (descarga versión actual)
- **Usuario offline**: Verá cambios cuando se conecte y abra la app

### P: ¿Qué pasa si hay un error en el nuevo código?

R:
- El watchdog de `index.html` detecto si la app no monta en 5 segundos
- Muestra botón "Limpieza Profunda"
- Usuario puede recuperarse manualmente
- No hay bucle infinito de recargas

### P: ¿Por qué el hash es tan importante?

R:
- Hash = resumen del contenido del archivo
- Si cambias 1 carácter → hash completamente diferente
- Si no cambias nada → hash idéntico
- Esto hace que el navegador descargue SOLO los archivos que cambiaron

### P: ¿Y si el usuario está en modo offline?

R:
- El Service Worker sirve desde caché
- Cuando se conecte de nuevo, verificará si hay actualizaciones
- Descargará nuevos assets cuando esté disponible la red

### P: ¿Puedo desabilitar las notificaciones?

R:
Sí, en `App.tsx`:
```typescript
{false && <VersionUpdateNotification {...} />}
```

Pero **NO recomendamos** desabilitar en producción.

---

## 🎓 Recursos Adicionales

- 📖 Documentación completa: `documentation/CACHE_BUSTING_IMPLEMENTATION.md`
- 🔧 Script de validación: `validate-cache-busting.sh`
- 📝 Configuración Vite: `vite.config.ts`
- 🛡️ Service Worker: `public/sw.js`
- 🎣 Hook React: `src/hooks/useVersionUpdate.ts`
- 🔔 Componente UI: `src/components/VersionUpdateNotification.tsx`

---

## ✅ Checklist Final (Antes de Production)

- [ ] Ejecuté `validate-cache-busting.sh` con resultado OK
- [ ] Build local genera archivos con hashes
- [ ] DevTools muestra Service Worker activo
- [ ] Meta tags `Cache-Control` presentes en index.html
- [ ] Cambié la configuración del `checkInterval` según ambiente
- [ ] Probé actualización manual en staging
- [ ] Confirmé que no hay errores en Console
- [ ] Documentación revisada y entendida
- [ ] Equipo notificado de los cambios
- [ ] Plan de rollback preparado (si es necesario)

---

**🚀 ¡Listo para desplegar con confianza!**

Cualquier duda: Contacta al equipo DevOps.

**Last Updated**: 17 de Mayo, 2026
