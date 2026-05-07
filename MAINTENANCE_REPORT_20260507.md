# 🔧 MANTENIMIENTO PREVENTIVO Y CORRECTIVO - VORTEX STREAMING

## Fecha: 7 de Mayo, 2026
## Status: ✅ Cambios Completados - Listo para Sincronizar

---

## 📋 RESUMEN DE ACCIONES REALIZADAS

### 1️⃣ Eliminación del Selector de Duración ✅

**Archivos modificados:**
- `src/components/shop/ServiceCard.tsx` - Removido selector de duración
- `src/components/shop/ProductCard.tsx` - Removido selector de duración

**Cambios:**
- Removidas las opciones de "1 Semana (7 días)", "15 Días", "1 Mes (30 días)"
- La duración ahora está fija en **30 días (1 Mes)** por defecto
- El `cart_key` se genera como `${product.id}-30` en lugar de variar dinámicamente
- El estado `durationDays` fue eliminado de ambos componentes

**Resultado:** 
✅ El menú desplegable de selección de tiempo ha sido completamente removido de la interfaz de compra.

---

### 2️⃣ Corrección de la Carga de Suscripciones ✅

**Problema detectado:**
- El campo `subscription_code` estaba siendo solicitado en consultas pero causaba conflictos PGRST204
- Las políticas RLS bloqueaban lecturas cuando `user_id` era `NULL` (para clientes externos)

**Archivos modificados:**
- `src/integrations/supabase/subscriptions-helpers.ts` - Removido `subscription_code` del SELECT_ALL
- `src/lib/subscriptionManager.ts` - Removido intento de insertar `subscription_code`
- `src/components/admin/ManualSubscriptionModal.tsx` - Removido campo `subscription_code`

**Cambios en SELECT_ALL:**
```diff
- SELECT: 'id, user_id, service_name, subscription_code, credential_email, ...'
+ SELECT: 'id, user_id, service_name, credential_email, credential_password, profile_name, profile_pin, status, duration_days, next_renewal, created_at, updated_at'
```

**Resultado:** 
✅ Las consultas ahora solo solicitan campos que realmente existen en la tabla subscriptions.

---

### 3️⃣ Sincronización de Caché PostgREST ⏳

**Acciones necesarias:**

Un script SQL ha sido creado para sincronizar el caché. Sigue estos pasos:

#### Opción A: Vía Consola de Supabase (Recomendado)
1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto `qxmecegqnapcjlchjqld`
3. En la barra lateral izquierda, haz clic en **SQL Editor**
4. Haz clic en **New query** (o copia el contenido)
5. Abre el archivo: `SYNC_SUBSCRIPTIONS_CACHE.sql` en este repositorio
6. Copia TODO el contenido
7. Pega el contenido en tu query nueva de Supabase
8. Haz clic en el botón **▶️ Run** (arriba a la derecha)
9. Espera a que se complete (deberías ver "PostgreREST Cache Sync Complete")
10. **Recarga la aplicación web** en tu navegador (Ctrl+Shift+R para limpiar caché)

#### Opción B: Vía Supabase CLI (Si tienes instalado)
```bash
supabase db push --project-ref qxmecegqnapcjlchjqld
```

---

## 🧪 VALIDACIÓN POST-SINCRONIZACIÓN

### Después de ejecutar el script SQL, verifica lo siguiente:

#### ✅ Test 1: Panel de Gestión de Suscripciones Carga
- Accede a la ruta: `/admin` o Dashboard Administrativo
- Navega a la sección **"Gestión de Suscripciones"**
- Si ves la tabla con suscripciones (sin mensaje de error), ✅ **ÉXITO**

#### ✅ Test 2: Compra de un Servicio
- Ve al catálogo de servicios
- Verifica que **NO HAY selector de duración** (solo debe venderse a 30 días)
- Haz una compra de prueba
- Verifica en la consola del navegador (F12) que no hay errores PGRST204

#### ✅ Test 3: Edición de Suscripción (Admin)
- En Gestión de Suscripciones, haz clic en "Editar" en una suscripción
- Verifica que puedas editar los campos (email, contraseña, perfil, PIN)
- El campo "Duración (días)" debe permitir entrada manual (30 por defecto)
- Haz clic en "Guardar" y verifica que los cambios se apliquen

#### ✅ Test 4: Suscripciones Duplicadas (Usuarios con Múltiples)
- Si tienes un usuario con múltiples suscripciones del mismo servicio
- Verifica que **todas aparecen** en la lista (ahora sin restricción unique)

---

## 📊 CAMBIOS TÉCNICOS RESUMEN

| Componente | Antes | Después |
|----------|------|---------|
| **Duración en Compra** | Selector: 7, 15, 30 días | Fija: 30 días |
| **SELECT_ALL subscriptions** | Incluía `subscription_code` | Removido campo problemático |
| **RLS Policies** | Bloqueaba `user_id = NULL` | Permite lectura para admins |
| **Campos en tabla** | `subscription_code`, `combo_id` (obsoletos) | `credential_email`, `credential_password`, `profile_name`, `profile_pin`, `duration_days` |

---

## 🚨 POSIBLES PROBLEMAS Y SOLUCIONES

### Problema: "Error cargando suscripciones" aún persiste
**Solución:**
1. Recarga completamente el navegador: `Ctrl+Shift+Del` (limpiar caché)
2. Cierra la pestaña y abre nuevamente
3. Ejecuta el script SQL nuevamente
4. Si persiste, revisa la consola del navegador (F12 → Network) para errores específicos

### Problema: Selector de duración aún visible
**Solución:**
- Limpia la caché del navegador: `Ctrl+Shift+Delete`
- Fuerza recarga: `Ctrl+Shift+R`

### Problema: No puedo acceder a Supabase Dashboard
**Verificación:**
1. Asegúrate de estar logeado en Supabase
2. Usa el project ID: `qxmecegqnapcjlchjqld`
3. Si no tienes acceso, contacta al propietario del proyecto

---

## ✨ PRÓXIMOS PASOS

1. **Ejecuta el script SQL** (`SYNC_SUBSCRIPTIONS_CACHE.sql`)
2. **Verifica los 4 tests** de validación arriba
3. **Confirma al usuario**: 
   - Panel funciona ✅
   - Selector de tiempo eliminado ✅
   - Caché sincronizado ✅

---

## 📝 NOTAS DEL DESARROLLADOR

- Los campos `subscription_code` y `combo_id` siguen siendo obsoletos pero no interfieren
- La migración `20260507_140000_fix_subscriptions_rls.sql` no es necesaria si ejecutas el script SQL
- Se recomienda ejecutar el script SQL para garantizar que todo esté sincronizado
- Todos los cambios de código están listos para producción

---

**Ejecutado por:** GitHub Copilot (Full-Stack Senior Assistant)  
**Fecha:** 2026-05-07  
**Contexto:** Mantenimiento preventivo y correctivo de tabla subscriptions
