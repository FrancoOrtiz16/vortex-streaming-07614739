# 🚀 Mejoras Futuras - Opcionales Avanzadas

## Fase 2: Webhooks Automáticos

### 1. Trigger Automático de Sincronización

Crea una Edge Function en Supabase que se ejecute automáticamente cuando se completa una orden:

```typescript
// supabase/functions/sync-order-to-subscription/index.ts
import { serve } from 'https://deno.land/std@0.132.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Validar webhook
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const body = await req.json();
  const { record, type } = body;

  // Si es una orden completada
  if (type === 'INSERT' && record.status === 'completed') {
    try {
      // Crear suscripción
      const { error } = await supabase.from('subscriptions').insert([{
        user_id: record.user_id || `external_order_${record.id}`,
        service_name: record.product_name,
        status: 'pending_approval',
        credential_email: null,
        credential_password: null,
        next_renewal: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        last_renewal: new Date().toISOString(),
      }]);

      if (error) throw error;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } catch (err) {
      console.error('Error:', err);
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }

  return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
});
```

### 2. Configurar Webhook en Supabase

En `supabase/config.toml`:

```toml
[functions.sync_order_to_subscription]
verify_jwt = false
```

## Fase 3: Notificaciones por Email

### 1. Envío de Credenciales al Aprobar

Actualizar `ServiceRow.tsx` para enviar email:

```typescript
const handleApprovePendingPayment = async () => {
  // ... código existente ...
  
  // Después de actualizar suscripción
  try {
    // Llamar a Edge Function para enviar email
    const response = await fetch('/api/send-credentials-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription_id: data.id,
        user_id: data.user_id,
        email: data.credential_email,
      }),
    });
    
    if (response.ok) {
      toast.success('✅ Credenciales enviadas por email');
    }
  } catch (err) {
    console.error('Error enviando email:', err);
  }
};
```

### 2. Recordatorios Automáticos

Edge Function para recordatorios:

```typescript
// supabase/functions/send-expiry-reminders/index.ts
export async function sendExpiryReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .lte('next_renewal', tomorrow.toISOString())
    .gte('next_renewal', new Date().toISOString());
  
  for (const sub of subscriptions) {
    // Enviar email de recordatorio
  }
}
```

## Fase 4: Exportación y Reportes

### 1. Exportar a CSV

```typescript
// src/utils/exportUtils.ts
export function exportSubscriptionsToCSV(subscriptions: ServiceRowData[]) {
  const headers = [
    'Cliente',
    'Servicio',
    'Estado',
    'Última Renovación',
    'Próxima Renovación',
    'Días Restantes',
  ];

  const rows = subscriptions.map(sub => [
    sub.client_label,
    sub.service_name,
    sub.status,
    new Date(sub.last_renewal || '').toLocaleDateString(),
    new Date(sub.next_renewal || '').toLocaleDateString(),
    getDaysUntilExpiry(sub.next_renewal),
  ]);

  const csv = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `suscripciones_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}
```

### 2. Agregar Botón a AdminSubscriptionsNew

```tsx
<button
  onClick={() => exportSubscriptionsToCSV(filtered)}
  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition"
>
  <Download className="w-4 h-4" />
  Exportar CSV
</button>
```

## Fase 5: Renovación Automática

### 1. Pagos Recurrentes

Integración con Stripe o pasarela local:

```typescript
// src/services/renewalService.ts
export async function processRecurringRenewals() {
  // Obtener suscripciones que vencen hoy
  const today = new Date().toISOString().split('T')[0];
  
  const { data: expiringSubscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('status', 'active')
    .lte('next_renewal', today);
  
  for (const sub of expiringSubscriptions) {
    // Procesar pago
    // Actualizar next_renewal
  }
}
```

## Fase 6: Auditoría y Historial

### 1. Tabla de Auditoría

```sql
CREATE TABLE subscription_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'approve', 'edit', 'delete', 'renew'
  old_status TEXT,
  new_status TEXT,
  changes JSONB,
  created_at TIMESTAMP DEFAULT now()
);
```

### 2. Función para Registrar Cambios

```typescript
export async function logSubscriptionChange(
  subscriptionId: string,
  action: string,
  oldStatus: string,
  newStatus: string,
  changes: Record<string, any>
) {
  const { data: { user } } = await supabase.auth.getUser();
  
  await supabase.from('subscription_audit_log').insert([{
    subscription_id: subscriptionId,
    admin_id: user?.id,
    action,
    old_status: oldStatus,
    new_status: newStatus,
    changes,
  }]);
}
```

## Fase 7: Dashboard Analítico

### 1. Widgets de Estadísticas

```typescript
// src/components/admin/SubscriptionMetrics.tsx
export function SubscriptionMetrics({ subscriptions }: Props) {
  const total = subscriptions.length;
  const active = subscriptions.filter(s => s.status === 'active').length;
  const pending = subscriptions.filter(s => s.status === 'pending_approval').length;
  const expired = subscriptions.filter(s => s.status === 'expired').length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <MetricCard label="Total" value={total} color="blue" />
      <MetricCard label="Activas" value={active} color="green" />
      <MetricCard label="Pendientes" value={pending} color="yellow" />
      <MetricCard label="Vencidas" value={expired} color="red" />
    </div>
  );
}
```

### 2. Gráficos de Vencimiento

```typescript
// src/components/admin/ExpiryChart.tsx
export function ExpiryChart({ subscriptions }: Props) {
  const data = {
    labels: ['< 3 días', '3-7 días', '7-30 días', '> 30 días'],
    datasets: [{
      label: 'Suscripciones por vencimiento',
      data: [
        subscriptions.filter(s => getDaysUntilExpiry(s.next_renewal) < 3).length,
        subscriptions.filter(s => getDaysUntilExpiry(s.next_renewal) >= 3 && getDaysUntilExpiry(s.next_renewal) <= 7).length,
        subscriptions.filter(s => getDaysUntilExpiry(s.next_renewal) > 7 && getDaysUntilExpiry(s.next_renewal) <= 30).length,
        subscriptions.filter(s => getDaysUntilExpiry(s.next_renewal) > 30).length,
      ],
    }],
  };

  return <BarChart data={data} />;
}
```

## Fase 8: Multi-Moneda

### 1. Rastrear Vencimiento en Diferentes Monedas

```typescript
// src/lib/currencyUtils.ts
export interface SubscriptionWithCurrency {
  subscription: Subscription;
  currency: 'USD' | 'EUR' | 'VES';
  price: number;
  renewalValue: number;
}

export async function convertPriceForRenewal(
  originalPrice: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number> {
  const rate = await getExchangeRate(fromCurrency, toCurrency);
  return originalPrice * rate;
}
```

## Resumen de Mejoras

| Fase | Función | Complejidad | Tiempo Est. |
|------|---------|------------|-----------|
| 2 | Webhooks Automáticos | Media | 4 horas |
| 3 | Notificaciones Email | Media | 6 horas |
| 4 | Exportación CSV | Baja | 2 horas |
| 5 | Renovación Automática | Alta | 8 horas |
| 6 | Auditoría | Media | 4 horas |
| 7 | Dashboard | Alta | 10 horas |
| 8 | Multi-Moneda | Media | 5 horas |

## Priorización Recomendada

1. **Webhooks** → Elimina la necesidad de clickear
2. **Email** → Mejor UX para clientes
3. **CSV** → Facilita análisis
4. **Dashboard** → Visión general del negocio
5. **Renovación Automática** → Ingreso recurrente
6. **Auditoría** → Compliance
7. **Multi-Moneda** → Expansión global
