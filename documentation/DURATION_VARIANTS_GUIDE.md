# Función de Variantes de Duración por Grupo

## Descripción General

Esta función permite vender el mismo producto con diferentes periodos de duración (15 días, 1 mes, 3 meses, 6 meses, 1 año) con precios ajustados automáticamente según un multiplicador de precio.

## Archivos Principales

### 1. `src/lib/durationVariants.ts`
Librería core que contiene:
- **`DURATION_VARIANTS`**: Mapeo de variantes por categoría/grupo
- **`getDurationVariantsForGroup(groupName)`**: Obtiene las variantes disponibles para un grupo
- **`calculateAdjustedPrice(basePrice, durationDays, groupName)`**: Calcula el precio ajustado
- **`getDaysForVariant(groupName, variantLabel)`**: Obtiene días para una etiqueta
- **`formatDurationLabel(days)`**: Formatea la duración para mostrar
- **`isValidDurationForGroup(durationDays, groupName)`**: Valida si una duración es válida

### 2. `src/components/shop/DurationSelector.tsx`
Componente React que:
- Renderiza un select dropdown con las duraciones disponibles
- Muestra el precio ajustado para cada opción
- Llama `onDurationSelect` cuando el usuario selecciona una duración
- Integra automáticamente los multiplicadores de precio

### 3. `src/components/shop/ProductCard.tsx`
ProductCard actualizado para:
- Incluir el `DurationSelector` bajo el select de variantes
- Guardar la duración seleccionada en `durationState`
- Ajustar el precio mostrado según la duración
- Pasar `duration_days` al carrito cuando se añade producto

## Flujo de Uso

### Para el Cliente:

1. **Selecciona un producto** en el catálogo
2. **Elige variante** si hay múltiples (plan type, etc)
3. **Selecciona duración**: 15 días, 1 mes, 3 meses, 6 meses, 1 año
4. **Precio ajustado automáticamente** según el multiplicador
5. **Añade al carrito** → el `duration_days` se guarda
6. **En checkout**: la duración se usa para crear/renovar la suscripción

### Para Compras Nuevas:
```
createNewSubscriptionInstance({
  userId: user.id,
  serviceName: item.product.name,
  status: 'pending_approval',
  durationDays: item.product.duration_days  // ← Usa lo seleccionado
});
```

### Para Renovaciones:
```
renewExistingSubscription(subscriptionId)
// ↓ (en subscriptions-helpers.ts)
// Usa duration_days para calcular next_renewal
const nextRenewDate = addVETDays(nowVET, durationDays);
```

## Configuración de Variantes

Editar `src/lib/durationVariants.ts`, sección `DURATION_VARIANTS`:

```typescript
export const DURATION_VARIANTS: Record<string, DurationVariant[]> = {
  streaming: [
    { label: '15 días', days: 15, priceMultiplier: 0.5 },
    { label: '1 mes', days: 30, priceMultiplier: 1.0 },
    { label: '3 meses', days: 90, priceMultiplier: 2.7 },
    // ... más variantes
  ],
  gaming: [
    // ... configuración diferente si lo necesita
  ],
  default: [
    // ... para otros grupos
  ],
};
```

### Multiplicadores de Precio:
- **15 días**: 0.5 (50% del precio mensual)
- **1 mes**: 1.0 (precio base)
- **3 meses**: 2.7 (descuento 10%)
- **6 meses**: 5.0 (descuento 17%)
- **1 año**: 9.5 (descuento 21%)

Se pueden ajustar según lógica de negocio.

## Integración Automática en Checkout

El `CheckoutDialog.tsx` ya detecta automáticamente:

1. Si es **compra nueva** → llama `createNewSubscriptionInstance` con `duration_days`
2. Si es **renovación** → llama `renewExistingSubscription` que actualiza `next_renewal` basado en `duration_days`
3. En el mensaje de WhatsApp, la duración se muestra con `formatDurationLabel(durationDays)`

## Mensajes WhatsApp Actualizado

### Renovación:
```
♻️ ¡RENOVACIÓN PENDIENTE! ♻️

Hola Vortex, Mi renovación se ha procesado.

📌 DETALLE DEL SERVICIO:
🎬 Servicio (1/1): Netflix
📧 Correo: usuario@example.com
🗓️ Tiempo: 3 meses        ← Usa formatDurationLabel()
💰 Comprobante: [link]
```

### Compra Nueva:
```
🛒 *NUEVA COMPRA RECIBIDA*

👤 *Cliente:* Juan
📺 *Servicio:* Netflix (3 meses)  ← Incluye duración
💰 *Monto:* $7.50 (precio ajustado)

⏳ Pendiente por verificar pago.
[comprobante]
```

## Ejemplo: Modificar Multiplicadores

Para ofrecer mayor descuento en planes anuales:

```typescript
// En DURATION_VARIANTS.streaming:
{ label: '1 año', days: 365, priceMultiplier: 9.0 }  // de 9.5 a 9.0
```

**Resultado**: 
- Precio base: $5
- 1 año original: $47.50
- 1 año nuevo: $45.00

## Validación

La función `isValidDurationForGroup()` valida antes de guardar:

```typescript
if (!isValidDurationForGroup(item.product.duration_days, item.product.group_name)) {
  // Error: duración no permitida para este grupo
}
```

## Próximas Mejoras (Opcionales)

- [ ] Descuentos dinámicos según stock
- [ ] Campañas por duración (ej: "3 meses = 15% descuento extra")
- [ ] Historial de precios por duración
- [ ] API para gestionar multiplicadores desde admin
