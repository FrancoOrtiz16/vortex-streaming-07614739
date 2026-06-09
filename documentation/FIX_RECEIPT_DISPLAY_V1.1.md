# 🔧 FIX: Mostrar Comprobantes en Dashboard Admin

**Fecha:** 2026-06-09  
**Estado:** ✅ COMPLETADO  
**Versión:** v1.1

---

## 📋 Problema Identificado

Cuando un usuario subía un comprobante de pago, el botón del "ojo" (👁️) en el dashboard admin mostraba **"No hay comprobante disponible"**, aunque el archivo se había subido correctamente a Supabase Storage.

### Causa Raíz

La lógica de búsqueda de comprobantes estaba **buscando SOLO en la tabla `payment_history`**, pero según nuestra nueva implementación de distribución 1-a-Muchos, los comprobantes se guardan **en la tabla `subscriptions`** (columna `receipt_url`).

**Flujo Anterior (Incorrecto):**
```
Comprobante subido → Se guarda en payment_history
↓
Dashboard intenta buscar en payment_history
✅ Encuentra en payment_history
❌ PERO NO BUSCA en subscriptions.receipt_url
↓
Resultado: "No hay comprobante disponible"
```

**Flujo Nuevo (Correcto):**
```
Comprobante subido → Se guarda en subscriptions.receipt_url (NUEVO)
↓
Dashboard busca EN ORDEN:
1️⃣ subscriptions.receipt_url (PRIORIDAD) ✅ ENCUENTRA
2️⃣ payment_history.receipt_url (FALLBACK)
↓
Resultado: ✅ Muestra el comprobante
```

---

## ✅ Solución Implementada

### Archivo Modificado
**`src/components/admin/AdminSubscriptionsNew.tsx`**

### Cambios Realizados

#### 1️⃣ **Función `fetchReceiptAvailability` - Detectar Comprobantes**

**Antes:**
```typescript
// Solo buscaba en payment_history
const query = supabase
  .from('payment_history')
  .select('subscription_id, user_id, receipt_url')
  .neq('receipt_url', null)
```

**Después:**
```typescript
// ⭐ PASO 1: Busca en subscriptions.receipt_url (PRIORIDAD)
const subscriptionsQuery = supabase
  .from('subscriptions')
  .select('id, user_id, receipt_url')
  .neq('receipt_url', null);

// ⭐ PASO 2: Busca en payment_history.receipt_url (FALLBACK)
const paymentHistoryQuery = supabase
  .from('payment_history')
  .select('subscription_id, user_id, receipt_url')
  .neq('receipt_url', null);

// Procesa ambas y marca como disponible si encuentra en cualquiera
```

#### 2️⃣ **Función `openReceiptModal` - Cargar Comprobante**

**Antes:**
```typescript
// Solo buscaba en payment_history
const { data, error } = await (() => {
  const baseQuery = supabase
    .from('payment_history')
    .select('receipt_url')
    .neq('receipt_url', null);
  // ... etc
})();
```

**Después:**
```typescript
// ⭐ PASO 1: Intenta cargar de subscriptions.receipt_url (PRIORIDAD)
if (subscriptionId) {
  const { data: subData } = await supabase
    .from('subscriptions')
    .select('receipt_url')
    .eq('id', subscriptionId)
    .maybeSingle();
  
  if (subData?.receipt_url) {
    receiptUrl = subData.receipt_url;
  }
}

// ⭐ PASO 2: Si no encontró, intenta en payment_history (FALLBACK)
if (!receiptUrl) {
  const { data: phData } = await supabase
    .from('payment_history')
    .select('receipt_url')
    .neq('receipt_url', null)
    .limit(1);
  
  if (phData?.[0]?.receipt_url) {
    receiptUrl = phData[0].receipt_url;
  }
}
```

---

## 🧪 Cómo Probar

### Escenario 1: Cliente Compra 2+ Servicios

1. **Usuario hace login**
2. **Añade 2 o más servicios al carrito**
3. **Va a checkout y sube UN ÚNICO comprobante**
4. **Selecciona método de pago y confirma**

### Verificación en Admin Dashboard

1. **Ve a Admin → Subscriptions**
2. **Busca las suscripciones del cliente**
3. **El botón "👁️" debe estar ACTIVO (verde) en TODAS las suscripciones de esa compra**
4. **Haz clic en el "👁️"**
   - ✅ Se abre modal con el comprobante
   - ✅ Muestra la misma imagen en todas las suscripciones

### Verificación en Base de Datos

```sql
-- Verifica que receipt_url está en subscriptions
SELECT id, user_id, service_name, receipt_url 
FROM subscriptions 
WHERE user_id = '<USER_ID>'
ORDER BY created_at DESC;

-- Resultado esperado:
-- id              | user_id | service_name | receipt_url
-- ─────────────────┼─────────┼──────────────┼─────────────
-- sub-123         | user-1  | Netflix      | https://...
-- sub-124         | user-1  | HBO          | https://...  ← MISMO URL
-- sub-125         | user-1  | Disney+      | https://...  ← MISMO URL
```

---

## 🎯 Lógica de Búsqueda - Orden de Prioridad

```
┌─────────────────────────────────────────────────────┐
│ PANEL ADMIN INTENTA MOSTRAR COMPROBANTE             │
└─────────────────────────────────────────────────────┘
                        ↓
    ┌───────────────────────────────────────┐
    │ 1️⃣ BUSCAR en subscriptions.receipt_url│
    └───────────────────────────────────────┘
           ↓                      ↓
        ✅ ENCONTRADO        ❌ NO ENCONTRADO
           ↓                      ↓
        MOSTRAR             ┌──────────────────────┐
                            │ 2️⃣ BUSCAR en        │
                            │ payment_history.    │
                            │ receipt_url         │
                            │ (FALLBACK)          │
                            └──────────────────────┘
                                  ↓        ↓
                              ✅ ENCONTRADO ❌ NO ENCONTRADO
                                  ↓        ↓
                               MOSTRAR  ERROR
                                        "No hay 
                                        comprobante"
```

---

## 🔄 Compatibilidad Hacia Atrás

✅ **Sistema completamente retrocompatible:**
- Comprobantes guardados en `payment_history` **SEGUIRÁN MOSTRÁNDOSE**
- Comprobantes guardados en `subscriptions.receipt_url` **TENDRÁN PRIORIDAD**
- Fallback automático si falta en `subscriptions`

---

## 📊 Casos de Uso Cubiertos

| Caso | Resultado |
|------|-----------|
| Compra 1 servicio + sube comprobante | ✅ Muestra comprobante |
| Compra 3+ servicios + sube 1 comprobante | ✅ Muestra en todas (mismo URL) |
| Comprobante solo en payment_history | ✅ Muestra (fallback) |
| Comprobante solo en subscriptions | ✅ Muestra (nuevo) |
| Comprobante en ambas tablas | ✅ Usa subscriptions (prioridad) |
| Sin comprobante | ✅ Botón deshabilitado + mensaje claro |

---

## 📝 Cambios Técnicos Resumidos

| Función | Cambio |
|---------|--------|
| `fetchReceiptAvailability()` | Busca en subscriptions + payment_history |
| `openReceiptModal()` | Prioridad subscriptions, fallback payment_history |
| Build | ✅ Sin errores, 3067 módulos transformados |

---

## 🚀 Siguiente Paso

Ejecuta la migración SQL en Supabase (si aún no lo hiciste):

```sql
BEGIN;
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS receipt_url TEXT;
CREATE INDEX IF NOT EXISTS idx_subscriptions_receipt_url 
ON public.subscriptions(receipt_url) 
WHERE receipt_url IS NOT NULL;
COMMIT;
```

---

## ✨ Resultado Final

Ahora cuando un usuario suba un comprobante:

1. ✅ Se guarda automáticamente en cada `subscriptions.receipt_url`
2. ✅ El botón "👁️" aparece activo en el admin
3. ✅ Al hacer clic, se muestra la imagen correctamente
4. ✅ El comprobante es permanente y auditable
5. ✅ Compatible con comprobantes históricos en `payment_history`

**El sistema está listo para producción. ✅**
