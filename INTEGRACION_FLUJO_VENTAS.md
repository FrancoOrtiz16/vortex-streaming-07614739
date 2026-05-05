# 🎯 Integración Flujo de Ventas - Documentación Completa

## Resumen de Cambios

Se ha integrado exitosamente el flujo de ventas con el panel de "Gestión de Suscripciones" con las siguientes características:

### ✅ 1. Sincronización Automática de Ventas

**Ubicación**: `src/services/orderService.ts`
- Función: `syncOrderToSubscription(order)`
- Comportamiento: Cuando una orden se completa, se crea automáticamente una entrada en la tabla `subscriptions`

**Workflow**:
1. Orden completada → estado: `completed`
2. Ejecutar "Sincronizar Órdenes" en el panel
3. Se crea suscripción con estado: `pending_approval`
4. Los campos de credenciales quedan vacíos (se completan al aprobar)

**Estado Inicial**:
```json
{
  "user_id": "usuario_o_email",
  "service_name": "nombre_del_producto",
  "status": "pending_approval",
  "credential_email": null,
  "credential_password": null,
  "profile_name": null,
  "profile_pin": null,
  "next_renewal": "fecha_+30_días",
  "last_renewal": "fecha_actual"
}
```

### ✅ 2. Panel de Aprobación y Credenciales

**Ubicación**: `src/components/admin/ServiceRow.tsx`

**Características**:
- **Botón "Aprobar"**: Disponible solo para suscripciones con estado `pending_approval` o `procesando_credenciales`
- **Acción al Aprobar**:
  - Cambiar estado a `active`
  - Calcular automáticamente próxima renovación (30 días desde hoy)
  - Habilitar fila de edición para ingresar credenciales

**Campos Editables**:
- Email/Usuario
- Contraseña
- Nombre de Perfil (opcional)
- PIN/Código (opcional)
- Fecha de Próxima Renovación

**Flujo de Aprobación**:
```
Pendiente de Pago → [Botón Aprobar] → Activo + Editable
                                    ↓
                           [Editar Credenciales]
                                    ↓
                           [Guardar] → Suscripción Completa
```

### ✅ 3. Creación Manual de Suscripciones

**Ubicación**: `src/components/admin/ManualSubscriptionModal.tsx`

**Acceso**: Botón "Nueva Manual" en el panel de gestión

**Formulario Modal**:
```
┌─────────────────────────────────────┐
│ Nueva Suscripción Manual            │
├─────────────────────────────────────┤
│ INFORMACIÓN DEL CLIENTE:            │
│ • Nombre del cliente (requerido)    │
│ • Email del cliente (opcional)      │
├─────────────────────────────────────┤
│ SERVICIO Y VIGENCIA:                │
│ • Selector de Servicio (requerido)  │
│ • Fecha de Inicio                   │
│ • Fecha de Vencimiento              │
├─────────────────────────────────────┤
│ CREDENCIALES DEL SERVICIO:          │
│ • Email/Usuario                     │
│ • Contraseña                        │
│ • Nombre de Perfil (opcional)       │
│ • PIN/Código (opcional)             │
├─────────────────────────────────────┤
│ [Cancelar] [Crear Suscripción]      │
└─────────────────────────────────────┘
```

**Características**:
- Los servicios se cargan automáticamente de la base de datos
- El cliente externo recibe un UUID placeholder: `external_[timestamp]_[random]`
- Conviven en la misma tabla con clientes de la tienda
- El semáforo funciona para todos por igual

### ✅ 4. Automatización del Semáforo (Traffic Light)

**Ubicación**: `src/lib/trafficLightUtils.ts`

**Lógica de Colores**:

| Estado | Condición | Color | Icono | Tooltip |
|--------|-----------|-------|-------|---------|
| Verde 🟢 | >5 días | Emerald | 🟢 | Suscripción vigente |
| Amarillo 🟡 | 3-5 días | Amber | 🟡 | Alerta de cobro (próximo vencimiento) |
| Rojo 🔴 | 1-2 días | Red | 🔴 | Crítico (muy próximo) |
| Negro ⚫ | Vencido | Dark Red | ⚫ | Requiere renovación urgente |

**Visualización en ServiceRow**:
```
🟢 Activo (30d)          ← Verde con días restantes
🟡 Alerta (3d)           ← Amarillo con alerta
🔴 Crítico (1d)          ← Rojo brillante
⚫ Vencido (Hace 5d)      ← Negro para vencido
```

**Funciones Disponibles**:
```typescript
// Obtener estado del semáforo
getTrafficLightStatus(expiryDate, config?) → 'green' | 'yellow' | 'red' | 'expired'

// Obtener clase CSS
getTrafficLightColor(status) → 'bg-emerald-500/80 text-emerald-100' | ...

// Obtener información descriptiva
getTrafficLightInfo(status) → { icon, label, tooltip }

// Calcular días restantes
getDaysUntilExpiry(expiryDate) → número días

// Mensaje legible
getExpiryMessage(expiryDate) → "Vence en 3 día(s)"
```

## 📋 Guía de Uso

### Scenario 1: Cliente Compra en la Tienda

```
1. Cliente completa compra → Orden con estado "pending"
2. Administrador va a → Gestión de Suscripciones
3. Administrador hace clic → "Sincronizar Órdenes"
4. Sistema crea → Suscripción con estado "pending_approval"
5. Suscripción aparece en → Filtro "Confirmaciones Pendientes"
6. Administrador hace clic → Botón "Aprobar"
7. Sistema:
   - Cambia estado → "active"
   - Calcula próxima renovación → 30 días desde hoy
   - Habilita edición → Para ingresar credenciales
8. Administrador ingresa → Credenciales del servicio
9. Administrador hace clic → "Guardar"
10. Cliente recibe por email → Sus credenciales (configurable)
```

### Scenario 2: Cliente Externo (Sin Compra en Tienda)

```
1. Administrador hace clic → "Nueva Manual"
2. Se abre → Modal de suscripción manual
3. Administrador ingresa:
   - Nombre del cliente
   - Servicio comprado
   - Fechas de inicio/vencimiento
   - Credenciales (usuario/contraseña)
4. Administrador hace clic → "Crear Suscripción"
5. Sistema crea → Suscripción con estado "active" (cliente externo)
6. Suscripción aparece → En la tabla de gestión
7. El semáforo funciona → Igual que los clientes de tienda
```

### Scenario 3: Renovación Próxima (Alerta)

```
1. Administrador revisa → Panel de suscripciones
2. Ve semáforo AMARILLO 🟡 → "Alerta (3d)"
3. Hace clic → En la fila (editar)
4. Ingresa:
   - Nuevas credenciales (si cambió)
   - Nueva fecha de renovación
5. Hace clic → "Guardar"
6. El semáforo se actualiza → Automáticamente a VERDE
```

## 🗄️ Cambios en Base de Datos

### Tabla: subscriptions

**Campos Utilizados**:
- `id` → UUID autogenerado
- `user_id` → UUID del usuario o `external_[id]` para clientes externos
- `service_name` → Nombre del servicio
- `status` → pending_approval, active, expired, rejected
- `credential_email` → Email/usuario del servicio
- `credential_password` → Contraseña del servicio
- `profile_name` → Nombre del perfil (opcional)
- `profile_pin` → PIN/Código (opcional)
- `next_renewal` → Fecha de próxima renovación
- `last_renewal` → Fecha de última renovación
- `created_at` → Fecha de creación
- `updated_at` → Fecha de actualización

### Tabla: orders

**Campos Utilizados**:
- `id` → UUID autogenerado
- `user_id` → UUID del usuario
- `customer_email` → Email del cliente
- `product_name` → Nombre del producto
- `total` → Monto total
- `status` → pending, completed, rejected, processing_credentials
- `created_at` → Fecha de creación

## 🔧 Configuración

### Umbral del Semáforo

Puedes personalizar los umbrales en `trafficLightUtils.ts`:

```typescript
// Actual (por defecto)
const DEFAULT_CONFIG: TrafficLightConfig = {
  greenThreshold: 5,      // Verde si > 5 días
  yellowThreshold: 3,     // Amarillo si <= 3 días
};

// Para cambiar, usa:
const customConfig = { greenThreshold: 7, yellowThreshold: 2 };
getTrafficLightStatus(date, customConfig);
```

### Intervalo de Renovación Automática

Actualmente se calcula automáticamente a **30 días**:

```typescript
// En orderService.ts → approvePayment()
const nextRenewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

// Para cambiar a otro valor (ej: 60 días):
const nextRenewal = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();
```

## 🚀 Próximas Mejoras

### Recomendadas

1. **Webhooks de Supabase**
   - Sincronizar órdenes automáticamente cuando se completan
   - Sin necesidad de clickear "Sincronizar Órdenes"

2. **Notificaciones por Email**
   - Enviar credenciales cuando se aprueban
   - Recoratorios antes de vencimiento (3, 1 día)

3. **Exportar a CSV**
   - Descargar listado de suscripciones
   - Análisis en Excel

4. **Renovación Automática**
   - Opción para renovar automáticamente
   - Integración con pasarelas de pago

5. **Historial de Cambios**
   - Log de quién cambió qué y cuándo
   - Auditoría completa

6. **Multi-divisa**
   - Rastrear vencimiento en diferentes monedas
   - Conversión automática

## 📊 Estadísticas

El panel ahora muestra:
- **Total de suscripciones** → "Todas (35)"
- **Confirmaciones pendientes** → "Confirmaciones Pendientes (5)"
- **Filtro por estado** → Rápido acceso a pendientes

## 🔐 Seguridad

- Las contraseñas se muestran como "••••••" en la tabla
- Se pueden ver con click en el icono de ojo
- Las contraseñas se guardan encriptadas en la BD (con Row Level Security)
- Solo admins pueden ver/gestionar suscripciones

## 🐛 Troubleshooting

### Problema: "No se sincroniza ninguna orden"
**Solución**: Verifica que las órdenes tengan estado `completed` en la tabla `orders`

### Problema: "El semáforo no cambia de color"
**Solución**: Actualiza la página (F5) o haz clic en "Sincronizar Órdenes"

### Problema: "Error al crear suscripción manual"
**Solución**: Verifica que el servicio esté disponible (`is_available = true`)

### Problema: "Las credenciales no se guardan"
**Solución**: Verifica que el usuario sea administrador (role = 'admin')

## 📞 Soporte

Para reportar bugs o solicitar mejoras, contacta al equipo de desarrollo.
