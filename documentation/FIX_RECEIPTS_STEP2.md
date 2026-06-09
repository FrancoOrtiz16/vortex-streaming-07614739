# 🔧 PLAN DE ACCIÓN: Restaurar Comprobantes de Clientes Anteriores

**Fecha:** 2026-06-09  
**Estado:** 🔴 Comprobantes de clientes anteriores no se muestran

---

## 📋 Problema Identificado

Los clientes que **subieron comprobantes ANTES de mis cambios** tienen:
- ✅ El archivo guardado en Supabase Storage
- ✅ Registro en `payment_history` con `receipt_url`
- ❌ Botón "👁️" **bloqueado** (no muestra comprobante)

**Causa:** Ahora el código busca en AMBAS tablas (`subscriptions` y `payment_history`), pero la búsqueda podría no estar optimizada para comprobantes antiguos.

---

## ✅ Soluciones Implementadas (Ya Hecho)

He mejorado la lógica de búsqueda de dos formas:

### 1️⃣ En `fetchReceiptAvailability()` (línea ~250)
```typescript
// Intento 1: Buscar por subscription_id
const { data: phBySubId } = await supabase
  .from('payment_history')
  .select('subscription_id, user_id, receipt_url')
  .in('subscription_id', subscriptionIds)
  .neq('receipt_url', null);

// Intento 2: Si no encuentra, buscar por user_id
if (paymentData.length === 0) {
  const { data: phByUserId } = await supabase
    .from('payment_history')
    .select('subscription_id, user_id, receipt_url')
    .in('user_id', userIds)
    .neq('receipt_url', null);
}
```

**Beneficio:** Ahora es más robusta y encuentra comprobantes incluso si están guardados de forma ligeramente diferente.

### 2️⃣ En `openReceiptModal()` (línea ~348)
```typescript
// Búsqueda robusta por subscription_id primero
if (subscriptionId) {
  const { data: phBySub } = await supabase
    .from('payment_history')
    .select('receipt_url')
    .eq('subscription_id', subscriptionId)
    .neq('receipt_url', null)
    .limit(1);
}

// Luego por user_id si no encuentra
if (!receiptUrl && userId) {
  const { data: phByUser } = await supabase
    .from('payment_history')
    .select('receipt_url')
    .eq('user_id', userId)
    .neq('receipt_url', null)
    .limit(1);
}
```

---

## 🧪 Cómo Probar Ahora

### Paso 1: Recarga la App
- **En navegador:** Ctrl+Shift+R (o Cmd+Shift+R en Mac)
- **Limpia cache:** F12 → Application → Clear Storage → Reload

### Paso 2: Ve a Admin Dashboard
- **Sección:** Admin → Subscriptions
- **Busca:** Clientes que previamente subieron comprobantes

### Paso 3: Verifica el Botón "👁️"
- Si ahora está **VERDE (activo)** → ✅ El problema se resolvió
- Si sigue **GRIS (bloqueado)** → ❌ Revisa paso siguiente

---

## 🔍 Diagnóstico Avanzado (Si Sigue Sin Funcionar)

### Comando para Verificar Datos en BD

Abre la **Supabase SQL Editor** y ejecuta:

```sql
-- Ver si hay comprobantes en payment_history para un usuario específico
SELECT 
  id,
  subscription_id,
  user_id,
  receipt_url,
  created_at,
  CASE WHEN receipt_url IS NOT NULL THEN '✅' ELSE '❌' END as tiene_comprobante
FROM payment_history
WHERE user_id = '<REEMPLAZA_CON_USER_ID>'
ORDER BY created_at DESC
LIMIT 10;
```

**¿Qué buscar?**
- ✅ Columna `receipt_url` llena (no NULL)
- ✅ Columna `subscription_id` con un valor

### Si la Búsqueda NO Encuentra Comprobantes

Significa que están guardados pero SIN vinculación correcta. Necesitarías ejecutar un **script de migración de datos** para crear la vinculación.

---

## 🚀 Siguiente Paso CRÍTICO

### Si Aún Sigue Sin Funcionar:

1. **Envíame una captura** mostrando:
   - Admin Dashboard con una suscripción de un cliente
   - El botón "👁️" bloqueado

2. **Dime el user_id** del cliente (puedes copiar de la fila)

3. **Ejecuta la consulta SQL anterior** y comparte el resultado

Esto me dirá exactamente dónde están guardados los comprobantes y podré crear un script para asociarlos correctamente.

---

## 📝 Cambios Realizados en el Código

| Función | Mejora |
|---------|--------|
| `fetchReceiptAvailability()` | Busca primero por subscription_id, luego por user_id |
| `openReceiptModal()` | Búsqueda progresiva: subscriptions → payment_history (subscription_id) → payment_history (user_id) |
| Build | ✅ Sin errores, 1,427 KB (AdminAccess) |

---

## ✨ Resultado Esperado

Después de hacer reload completo, todos los botones "👁️" deberían:

| Caso | Resultado |
|------|-----------|
| Nuevo comprobante (después de mis cambios) | ✅ Verde + Funciona |
| Comprobante antiguo | ✅ Verde + Funciona (ahora con búsqueda mejorada) |
| Sin comprobante | ❌ Gris + Mensaje claro |

---

**⏭️ Próximo paso:** Haz reload y prueba. Si sigue sin funcionar, ejecúta la query SQL de diagnóstico.
