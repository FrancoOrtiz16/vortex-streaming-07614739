import { supabase } from '@/integrations/supabase/client';

/**
 * orderService — Lógica aislada de pagos/órdenes (Sandboxing).
 * No depende de ningún componente de UI ni renderiza nada.
 * Se inyecta en AdminSubscriptionsNew únicamente como función.
 */

export interface OrderActionResult {
  ok: boolean;
  error?: string;
}

export async function approvePayment(orderId: string): Promise<OrderActionResult> {
  if (!orderId) return { ok: false, error: 'orderId requerido' };
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'completed' })
      .eq('id', orderId);
    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    console.error('[orderService.approvePayment]', err);
    return { ok: false, error: err?.message || 'Error aprobando pago' };
  }
}

export async function rejectPayment(orderId: string): Promise<OrderActionResult> {
  if (!orderId) return { ok: false, error: 'orderId requerido' };
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status: 'rejected' })
      .eq('id', orderId);
    if (error) throw error;
    return { ok: true };
  } catch (err: any) {
    console.error('[orderService.rejectPayment]', err);
    return { ok: false, error: err?.message || 'Error rechazando pago' };
  }
}

export async function getPendingOrdersForUser(userId: string) {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('id, status, total, product_name, created_at')
      .eq('user_id', userId)
      .eq('status', 'pending');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('[orderService.getPendingOrdersForUser]', err);
    return [];
  }
}