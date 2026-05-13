# 🔄 Cambios Clave - Error de 60 Días (Vista Rápida)

## 1. subscriptionManager.ts - Crear Sin Fecha
```typescript
// ❌ ANTES:
const nextRenewal = addVETDays(nowVET, durationDays).toISOString();
insert([{ 
  next_renewal: nextRenewal,  // ❌ Asignado automáticamente
  ...
}])

// ✅ AHORA:
insert([{ 
  next_renewal: null,  // ✅ NULL hasta aprobación
  ...
}])
```

---

## 2. ManualSubscriptionModal.tsx - Estado Pendiente
```typescript
// ❌ ANTES:
const payload = {
  status: 'active',
  next_renewal: getVETDateInputISO(form.expiryDate),
}

// ✅ AHORA:
const payload = {
  status: 'pending_approval',  // ✅ Pendiente de aprobación
  next_renewal: null,          // ✅ Sin fecha de vencimiento
}
```

---

## 3. ExpiryBadge.tsx - Mostrar "Esperando Aprobación"
```typescript
// ❌ ANTES:
export function ExpiryBadge({ nextRenewal, className }: ExpiryBadgeProps) {
  const daysLeft = getDaysUntilExpiry(nextRenewal);  // ❌ Podría fallar si es NULL
  // ...

// ✅ AHORA:
export function ExpiryBadge({ nextRenewal, className }: ExpiryBadgeProps) {
  if (!nextRenewal) {  // ✅ Detectar NULL
    return <span>Esperando Aprobación</span>;
  }
  const daysLeft = getDaysUntilExpiry(nextRenewal);
  // ...
```

---

## 4. orderService.ts - approvePayment() usa VET
```typescript
// ❌ ANTES:
const now = new Date();
const nextRenewDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

// ✅ AHORA:
const { getVETStartOfDay, addVETDays } = await import('@/lib/trafficLightUtils');
const nowVET = getVETStartOfDay();
const nextRenewDate = addVETDays(nowVET, durationDays);  // ✅ Consistencia VET
```

---

## 5. Base de Datos - Migración
```sql
-- Limpiar subscripciones en pending_approval que tenían next_renewal asignada
UPDATE public.subscriptions
SET next_renewal = NULL
WHERE status = 'pending_approval'
  AND next_renewal IS NOT NULL;
```

---

## Impacto Inmediato

| Acción | Antes | Después |
|--------|-------|---------|
| Crear suscripción | next_renewal = now + 30d | next_renewal = NULL |
| UI muestra | "Faltan 30 días" | "Esperando Aprobación" |
| Admin aprueba | next_renewal recalculado (60d) | next_renewal = now + 30d (correcto) |
| Semáforo comienza | Después de 60 días | Inmediatamente después de aprobar |

---

## ✅ Todo Testeable Manualmente

1. **Crear subscription manual** → Debe tener `status='pending_approval'` y `next_renewal=NULL`
2. **Hacer click "Aprobar"** → Debe cambiar `status='active'`, asignar `next_renewal`
3. **Verificar UI** → Debe mostrar "Esperando Aprobación" → después de aprobar → "Faltan 29 días"

---

**Status:** ✅ Implementado y sin errores de compilación
