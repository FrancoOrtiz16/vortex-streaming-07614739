/**
 * subscriptionManager — Distinción explícita entre 'Nueva Instancia' y 'Renovación'.
 *
 * - createNewSubscriptionInstance: SIEMPRE crea una fila nueva en `subscriptions`.
 *   Un mismo usuario puede tener N filas para el mismo servicio (multi-instancia).
 * - renewExistingSubscription: actualiza una suscripción existente por su id.
 */
import { supabase } from '@/integrations/supabase/client';

export interface NewInstanceInput {
  userId: string;
  serviceName: string;
  status?: string;
}

export async function createNewSubscriptionInstance({ userId, serviceName, status = 'pending_approval' }: NewInstanceInput) {
  if (!userId || !serviceName) {
    return { data: null, error: { message: 'userId y serviceName requeridos' } };
  }
  const now = new Date();
  const nextRenewal = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('subscriptions')
    .insert([{
      user_id: userId,
      service_name: serviceName,
      status,
      last_renewal: now.toISOString(),
      next_renewal: nextRenewal,
      credential_email: null,
      credential_password: null,
      profile_name: null,
      profile_pin: null,
    }])
    .select('id, user_id, service_name, status, next_renewal')
    .single();

  if (error) {
    console.error('[subscriptionManager] createNewSubscriptionInstance error:', error);
  }
  return { data, error };
}

export async function renewExistingSubscription(subscriptionId: string) {
  if (!subscriptionId) return { data: null, error: { message: 'subscriptionId requerido' } };
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ status: 'pending_approval' })
    .eq('id', subscriptionId)
    .select('id, status')
    .single();

  if (error) {
    console.error('[subscriptionManager] renewExistingSubscription error:', error);
  }
  return { data, error };
}