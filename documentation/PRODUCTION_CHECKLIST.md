# ✅ CHECKLIST DE PRODUCCIÓN - Vortex Streaming

## PRE-DEPLOY

### 1. Validación Local
```bash
# Limpiar caché
npm run clean
# Instalar dependencias
npm install
# Compilar
npm run build
# Sin errores = ✅
```

### 2. Testing en Localhost
```
[] Abrir http://localhost:5173
[] VER catálogo en página principal
[] NO pantalla negra
[] Filtros (Streaming/Gaming) funcionan
[] Click en producto abre detalles
[] Header + Footer visibles
[] Logo visible
```

### 3. Testing Admin (Franco)
```
[] Hacer login con Franco en /auth
[] Ir a /admin-access
[] Dashboard admin carga
[] AdminSubscriptionsNew muestra suscripciones
[] Click para editar credenciales funciona
[] Sin errores en console
```

### 4. Testing Catálogo
```
[] ProductGrid renderiza productos
[] Spinner durante carga
[] Si hay error: botón "Reintentar" visible
[] Si vacío: "No hay productos disponibles"
[] Filtrar por categoría funciona
```

### 5. Testing Credentials (Llave 🔑)
```
[] Login como cliente
[] Ir a /dashboard
[] Ver suscripciones confirmadas
[] Click botón "🔑 Credenciales"
[] Modal abre correctamente
[] Ver/ocultar contraseña funciona
[] Si no hay: "Credenciales en preparación"
```

---

## CHECKS ANTES DE GIT PUSH

```bash
# Verificar que no hay console.error por PGRST204
npm run build 2>&1 | grep -i "pgrst204"
# Resultado esperado: (vacío)

# Verificar que no hay archivos sin guardar
git status
# Resultado esperado: working tree clean

# Revisar cambios
git diff
# Resultado esperado: solo cambios intentados
```

---

## DEPLOY A VERCEL/PRODUCTION

### 1. Build en servidor
```
✅ Verificar que build-time no hay PGRST204
✅ Verificar que las funciones Supabase accesibles
✅ Verificar que variables de entorno correctas
```

### 2. Runtime checks
```
[] Abrir app en producción
[] Console devtools: NO errores [Auth]
[] Console devtools: NO errores [useProducts]
[] Catálogo carga
[] Admin access funciona
[] Credenciales visibles
```

### 3. Smoke Test (Post-Deploy)
```
[] Página principal abre
[] Catálogo se ve
[] Admin puede acceder
[] Clientes pueden ver suscripciones
[] Sin pantalla negra en ningún caso
```

---

## ARCHIVOS CRÍTICOS PARA REVISAR

```
✅ src/App.tsx
   - Import EmergencyErrorBoundary
   - Rutas correctas
   - BannedGuard presente

✅ src/components/BannedGuard.tsx
   - NUNCA devuelve null
   - Spinner durante loading

✅ src/pages/Index.tsx
   - ErrorBoundary envuelve ProductGrid
   - Suspense para componentes

✅ src/components/EmergencyErrorBoundary.tsx
   - NUEVO archivo creado
   - Captura errores globales

✅ src/components/admin/AdminSubscriptionsNew.tsx
   - Sin updated_at en select()
   - Solo campos reales

✅ src/hooks/useProducts.ts
   - Try/catch presente
   - Error state retornado

✅ src/hooks/useAuth.ts
   - Logging de admin presente
   - Role check case-sensitive
```

---

## MONITOREO POST-DEPLOY

### Errores a buscar en console:
```
❌ [useProducts] Supabase error
   → Revisar campos en select()
   → Revisar BD connection

❌ PGRST204
   → Revisar campos zombis
   → Función AdminSubscriptionsNew

❌ TypeError: Cannot read property... of null
   → Revisar optional chaining (?.
)
   → Revisar ErrorBoundary
```

### Logs esperados OK:
```
✅ [Auth] Initializing auth state...
✅ [useProducts] Fetching products...
✅ [useProducts] Loaded X products successfully
✅ [Auth] ✓ Admin user verified (si Franco logueado)
```

---

## ROLLBACK SI ALGO SALE MAL

```bash
# Ver commits recientes
git log --oneline -10

# Revertir al commit anterior
git revert HEAD
git push origin main

# O revertir a un commit específico
git revert <commit-hash>
git push origin main
```

---

## CONTACTO CON STAKEHOLDERS

```
Si hay problema post-deploy:
1. NO entrar en pánico
2. Revisar EMERGENCY_REPAIR.md
3. Verificar console en DevTools (F12)
4. Buscar logs [Auth], [useProducts], PGRST204
5. Si PGRST204: revisar campos en AdminSubscriptionsNew.tsx
6. Si pantalla negra: verificar que EmergencyErrorBoundary está importado
7. Rollback si es necesario
```

---

## TIMELINE RECOMENDADO

```
[ ] 10 min: Testing local completo
[ ] 5 min: Git push con cambios limpios
[ ] 5 min: Deploy a staging (si existe)
[ ] 10 min: Smoke test en staging
[ ] 5 min: Deploy a producción
[ ] 10 min: Verificación post-deploy
[ ] 5 min: Notificación a Franco/stakeholders
```

---

## ARCHIVOS NUEVOS EN ESTE DEPLOY

1. `EmergencyErrorBoundary.tsx` - Global error handling
2. `EMERGENCY_REPAIR.md` - Documentación de reparación
3. `PRODUCTION_CHECKLIST.md` - Este documento

---

**Fecha**: 2026-04-13  
**Versión**: Emergency Repair v1  
**Status**: ✅ LISTO PARA DEPLOY  
**Último que tocó**: GitHub Copilot  
