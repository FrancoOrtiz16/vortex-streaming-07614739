# TODO: Implementación del Plan de Mejoras Admin Panel Vortex Streaming

## Plan Aprobado
- ✅ Transformar AdminSubscriptionsNew.tsx a tabla profesional
- ✅ Eliminar OrdersSection.tsx completamente  
- ✅ Añadir optional chaining para prevenir pantallas negras
- ✅ Verificar Supabase queries seguras (ya OK)
- ✅ UX: search live, badges dinámicos, acciones per-fila

## Pasos Pendientes
### 1. ✅ OrdersSection.tsx eliminado (no usado/no linkeado)
### 2. ✅ Rediseñar AdminSubscriptionsNew.tsx a tabla profesional [COMPLETADO]
   - Imports añadidos (Table, Badge, ExpiryBadge)
   - Functions statusColor/Label, confirmRenewal
   - Tabla shadcn con columnas Cliente/Servicio/Estado/Badge/Última/Próxima/Semáforo/Acciones
   - Inline edit tr, Confirmar btn, search live, combos rows
   - Optional chaining ? añadida
   - Copiar estructura table de SubscriptionsSection.tsx
   - Columnas: Servicio, Estado (badge), Última renovación (created_at), Próxima (proxima_fecha), Semáforo (ExpiryBadge), Acciones (Editar/Confirmar/Eliminar)
   - Mantener combo parsing a rows individuales
   - Inline edit form en row expandida
   - Confirmar botón si status pending/procesando → active
   - Search live por cliente/servicio

### 3. Añadir optional chaining en accesos datos [Pendiente]
### 4. Test funcionalidad [Pendiente]
### 5. attempt_completion [Pendiente]
