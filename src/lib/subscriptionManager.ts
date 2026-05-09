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
  durationDays?: number;
}

export function createVortexCode(serviceName: string) {
  const prefix = serviceName
    .replace(/[^A-Z0-9]/gi, '')
    .toUpperCase()
    .slice(0, 4)
    .padEnd(4, 'X');

  const suffix = crypto?.randomUUID?.()?.split('-')[0].toUpperCase() ||
    Math.random().toString(36).substring(2, 10).toUpperCase();

  return `VORTEX-${prefix}-${suffix}`;
}

export async function createNewSubscriptionInstance({ userId, serviceName, status = 'pending_approval', durationDays = 30 }: NewInstanceInput) {
  if (!userId || !serviceName) {
    return { data: null, error: { message: 'userId y serviceName requeridos' } };
  }

  // ⚠️ IMPORTANTE: En la fase de CREACIÓN, next_renewal debe ser NULL
  // Solo se asignará when admin approves (en approvePayment)
  const { data, error } = await supabase
    .from('subscriptions')
    .insert([{ 
      user_id: userId,
      service_name: serviceName,
      status, // Será 'pending_approval'
      next_renewal: null, // NULL hasta que el admin apruebe
      duration_days: durationDays,
      credential_email: null,
      credential_password: null,
      profile_name: null,
      profile_pin: null,
    }])
    .select('id, user_id, service_name, status, next_renewal, duration_days')
    .single();

  if (error) {
    console.error('[subscriptionManager] createNewSubscriptionInstance error:', error);
  }
  return { data, error };
}

export async function renewExistingSubscription(subscriptionId: string) {
  if (!subscriptionId) return { data: null, error: { message: 'subscriptionId requerido' } };
  
  try {
    // Primero, obtener la suscripción actual para conocer la duración
    const { data: currentSub, error: fetchError } = await supabase
      .from('subscriptions')
      .select('duration_days, next_renewal')
      .eq('id', subscriptionId)
      .single();

    if (fetchError || !currentSub) {
      throw fetchError || new Error('Suscripción no encontrada');
    }

    // En la fase de renovación pendiente, no asignar expiry ni comenzar el conteo.
    // Solo la acción manual de aprobación debe establecer next_renewal.
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        status: 'pending_approval',
        next_renewal: null,
      })
      .eq('id', subscriptionId)
      .select('id, status, next_renewal, duration_days')
      .single();

    if (error) {
      console.error('[subscriptionManager] renewExistingSubscription error:', error);
    }
    return { data, error };
  } catch (err: any) {
    console.error('[subscriptionManager] renewExistingSubscription catch:', err);
    return { data: null, error: err };
  }
}