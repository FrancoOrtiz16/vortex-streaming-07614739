import { supabase } from '@/integrations/supabase/client';
import { createNewSubscriptionInstance, renewExistingSubscription } from '@/lib/subscriptionManager';

function parseDurationDaysFromProductName(productName: string) {
  return 30;
}
}

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

    const renewalMatches = Array.from(
      order.product_name.matchAll(/Renovación:\s*VORTEX-([A-Z0-9]{8})/gi),
      (match) => match[1],
    );

    if (renewalMatches.length > 0) {
      console.debug('[orderService] Orden de renovación detectada:', renewalMatches.join(', '));
      let firstSubscriptionId: string | undefined;
      let matchedAny = false;

      for (const shortId of renewalMatches) {
        const normalizedShortId = shortId.toLowerCase();
        const { data: existingSubs, error: existingError } = await supabase
          .from('subscriptions')
          .select('id')
          .ilike('id', `${normalizedShortId}%`)
          .limit(1);

        if (existingError) throw existingError;

        if (!existingSubs || existingSubs.length === 0) {
          console.warn('[orderService] Renovación no encontrada en subscriptions para:', shortId);
          continue;
        }

        matchedAny = true;
        const subscriptionId = existingSubs[0].id;
        if (!firstSubscriptionId) firstSubscriptionId = subscriptionId;

        const { data: updateResult, error: updateError } = await renewExistingSubscription(subscriptionId);
        if (updateError) throw updateError;
        console.debug('[orderService] Suscripción de renovación marcada como pendiente de confirmación:', subscriptionId, updateResult);
      }

      if (!matchedAny) {
        return { ok: false, error: 'No se encontró ninguna suscripción asociada para esta renovación' };
      }

      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'processing_credentials' })
        .eq('id', order.id);

      if (orderError) throw orderError;

      return {
        ok: true,
        subscriptionId: firstSubscriptionId,
      };
    }

    const quantityMatch = order.product_name.match(/x(\d+)/i);
    const quantity = quantityMatch ? Number(quantityMatch[1]) : 1;
    const cleanServiceName = order.product_name.replace(/\s*x\d+$/i, '').trim();
    let createdCount = 0;

    const durationDays = parseDurationDaysFromProductName(order.product_name);
    for (let i = 0; i < quantity; i++) {
      const { error: createError } = await createNewSubscriptionInstance({
        userId,
        serviceName: cleanServiceName,
        status: 'pending_approval',
        durationDays,
      });
      if (createError) {
        throw createError;
      }
      createdCount++;
    }

    if (createdCount === 0) {
      return { ok: false, error: 'No se pudo crear ninguna suscripción nueva' };
    }

    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: 'processing_credentials' })
      .eq('id', order.id);

    if (orderError) throw orderError;

    return {
      ok: true,
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

    // Obtener la suscripción actual para conocer la duración
    const { data: currentSub, error: fetchError } = await supabase
      .from('subscriptions')
      .select('duration_days')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !currentSub) {
      throw fetchError || new Error('Suscripción no encontrada');
    }

    // Calcular fecha de próxima renovación: now + duration_days
    const durationDays = currentSub.duration_days || 30;
    const now = new Date();
    const nextRenewDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        last_renewal: now.toISOString(),
        next_renewal: nextRenewDate.toISOString(),
      })
      .eq('id', subscriptionId)
      .select('user_id, service_name')
      .single();

    if (error) throw error;

    if (data?.user_id && data?.service_name) {
      await markOrderCompletedForSubscription(data.user_id, data.service_name);
    }

    console.debug('[orderService] Pago aprobado para:', subscriptionId);
    return { ok: true };
  } catch (err: any) {
    console.error('[orderService.approvePayment]', err);
    return { ok: false, error: err?.message || 'Error aprobando pago' };
  }
}

export async function markOrderCompletedForSubscription(
  userId: string | null,
  serviceName: string,
): Promise<OrderActionResult> {
  if (!userId || !serviceName) {
    return { ok: false, error: 'userId y serviceName son requeridos' };
  }

  try {
    console.debug('[orderService] Marcando orden como completada para usuario:', userId, 'servicio:', serviceName);

    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('user_id', userId)
      .ilike('product_name', `%${serviceName}%`)
      .in('status', ['pending', 'pending_approval', 'processing_credentials']);

    if (error) throw error;

    return { ok: true };
  } catch (err: any) {
    console.error('[orderService.markOrderCompletedForSubscription]', err);
    return { ok: false, error: err?.message || 'Error actualizando orden' };
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