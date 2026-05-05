import { supabase } from '@/integrations/supabase/client';

/**
 * orderService — Lógica aislada de pagos/órdenes (Sandboxing).
 * Maneja:
 * - Aprobación/rechazo de pagos
 * - Sincronización automática de órdenes → suscripciones
 * - Gestión de suscripciones pendientes
 */

export interface OrderActionResult {
  ok: boolean;
  error?: string;
  subscriptionId?: string;
}

export interface OrderData {
  id: string;
  user_id?: string;
  customer_email: string;
  product_name: string;
  total: number;
  status: string;
  created_at?: string;
  expiry_date?: string;
}

/**
 * 1. SINCRONIZACIÓN AUTOMÁTICA
 * Cuando una orden se completa, crear automáticamente una entrada en subscriptions
 */
export async function syncOrderToSubscription(
  order: OrderData,
): Promise<OrderActionResult> {
  if (!order.id) return { ok: false, error: 'Order ID requerido' };

  try {
    console.debug('[orderService] Sincronizando orden a suscripción:', order.id);

    let userId = order.user_id;
    if (!userId && order.customer_email) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('email', order.customer_email)
        .maybeSingle();

      if (profileError) throw profileError;
      if (profile?.user_id) {
        userId = profile.user_id;
      }
    }

    if (!userId) {
      return {
        ok: false,
        error: 'No se pudo vincular la orden a un usuario registrado. El cliente debe registrarse primero.',
      };
    }

    const subscriptionPayload = {
      user_id: userId,
      service_name: order.product_name,
      status: 'pending_approval', // Estado inicial: Pendiente de Pago
      credential_email: null,      // Se asignará en la aprobación
      credential_password: null,   // Se asignará en la aprobación
      profile_name: null,          // Opcional
      profile_pin: null,           // Opcional
      next_renewal: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      last_renewal: new Date().toISOString(),
    };

    const { data: subData, error: subError } = await supabase
      .from('subscriptions')
      .insert([subscriptionPayload])
      .select('id')
      .single();

    if (subError) throw subError;

    console.debug('[orderService] Suscripción creada:', subData?.id);

    // Actualizar estado del pedido a 'processing_credentials'
    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: 'processing_credentials' })
      .eq('id', order.id);

    if (orderError) throw orderError;

    return {
      ok: true,
      subscriptionId: subData?.id,
    };
  } catch (err: any) {
    console.error('[orderService.syncOrderToSubscription]', err);
    return { ok: false, error: err?.message || 'Error sincronizando orden' };
  }
}

/**
 * 2. APROBACIÓN DE PAGO
 * Al aprobar en el panel de suscripciones, cambiar estado a 'active'
 * y establecer próxima fecha de renovación
 */
export async function approvePayment(subscriptionId: string): Promise<OrderActionResult> {
  if (!subscriptionId) return { ok: false, error: 'subscriptionId requerido' };

  try {
    console.debug('[orderService] Aprobando pago de suscripción:', subscriptionId);

    // Calcular próxima fecha: 30 días desde ahora
    const nextRenewal = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        next_renewal: nextRenewal,
        last_renewal: new Date().toISOString(),
      })
      .eq('id', subscriptionId);

    if (error) throw error;

    console.debug('[orderService] Pago aprobado para:', subscriptionId);
    return { ok: true };
  } catch (err: any) {
    console.error('[orderService.approvePayment]', err);
    return { ok: false, error: err?.message || 'Error aprobando pago' };
  }
}

/**
 * 3. RECHAZO DE PAGO
 * Rechazar una suscripción pendiente
 */
export async function rejectPayment(subscriptionId: string): Promise<OrderActionResult> {
  if (!subscriptionId) return { ok: false, error: 'subscriptionId requerido' };

  try {
    console.debug('[orderService] Rechazando pago de suscripción:', subscriptionId);

    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'rejected' })
      .eq('id', subscriptionId);

    if (error) throw error;

    return { ok: true };
  } catch (err: any) {
    console.error('[orderService.rejectPayment]', err);
    return { ok: false, error: err?.message || 'Error rechazando pago' };
  }
}

/**
 * 4. OBTENER ÓRDENES PENDIENTES
 * Órdenes de un usuario que aún no se han procesado
 */
export async function getPendingOrdersForUser(userId: string) {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total, product_name, created_at, customer_email')
      .eq('user_id', userId)
      .eq('status', 'pending');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[orderService.getPendingOrdersForUser]', err);
    return [];
  }
}

/**
 * 5. OBTENER ÓRDENES COMPLETADAS - Para sincronización
 * Órdenes con estado 'completed' que aún no tienen suscripción asociada
 */
export async function getCompletedOrdersForSync() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, user_id, customer_email, product_name, total, status, created_at')
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[orderService.getCompletedOrdersForSync]', err);
    return [];
  }
}