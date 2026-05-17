/**
 * subscriptionManager — Distinción explícita entre 'Nueva Instancia' y 'Renovación'.
 *
 * - createNewSubscriptionInstance: SIEMPRE crea una fila nueva en `subscriptions`.
 *   Un mismo usuario puede tener N filas para el mismo servicio (multi-instancia).
 * - renewExistingSubscription: actualiza una suscripción existente por su id.
 */
import { supabase } from '@/integrations/supabase/client';
import { fetchProfileWhatsAppPhone } from '@/lib/profilePhone';

async function isUserAdmin(userId: string | null) {
  if (!userId) return false;
  try {
    const { data, error } = await supabase.from('user_roles').select('role').eq('user_id', userId);
    if (error) return false;
    const roles = (data || []).map((r: any) => r.role);
    return roles.includes('admin');
  } catch (err) {
    console.error('[subscriptionManager] isUserAdmin error:', err);
    return false;
  }
}

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

  // Seguridad: verificar sesión actual y perfil con teléfono/WhatsApp
  let currentUserId: string | null = null;
  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getUser();
    if (sessionErr || !sessionData || !sessionData.user) {
      return { data: null, error: { message: 'Sesión no detectada. Inicia sesión para continuar.' } };
    }

    currentUserId = sessionData.user.id;
    if (currentUserId !== userId) {
      return { data: null, error: { message: 'El usuario autenticado no coincide con userId proporcionado' } };
    }

    // Eximir administradores de la comprobación del teléfono
    const admin = await isUserAdmin(currentUserId);
    if (!admin) {
      const phone = await fetchProfileWhatsAppPhone(currentUserId);
      if (!phone) {
        return { data: null, error: { message: 'Para procesar la compra añade tu número de WhatsApp en el perfil.' } };
      }
    } else {
      console.debug('[subscriptionManager] Admin detected - saltando verificación de WhatsApp');
    }
  } catch (err: any) {
    console.error('[subscriptionManager] Error validando sesión/perfil:', err);
    return { data: null, error: { message: 'Error validando sesión/perfil' } };
  }

  // ⚠️ IMPORTANTE: En BD actual, next_renewal NO permite NULL
  // Por eso, usamos una fecha muy lejana como "marcador de pendiente"
  // Cuando el admin aprueba, se actualiza a ahora + durationDays
  
  // Fecha lejana (100 años en el futuro) = "En espera de aprobación"
  const pendingDate = new Date();
  pendingDate.setFullYear(pendingDate.getFullYear() + 100);
  
  const { data, error } = await supabase
    .from('subscriptions')
    .insert([{ 
      user_id: currentUserId as string,
      service_name: serviceName,
      status,
      next_renewal: pendingDate.toISOString(),
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
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }
    if (!currentSub) {
      return { data: null, error: { message: 'Suscripción no encontrada o no accesible para el usuario actual' } };
    }

    // En la fase de renovación pendiente, mantener fecha lejana
    // Solo la acción manual de aprobación debe establecer fecha real
    const pendingDate = new Date();
    pendingDate.setFullYear(pendingDate.getFullYear() + 100);
    
    const { data, error } = await supabase
      .from('subscriptions')
      .update({ 
        status: 'pending_approval',
        next_renewal: pendingDate.toISOString(), // Fecha lejana = aún pendiente
      })
      .eq('id', subscriptionId)
      .select('id, status, next_renewal, duration_days')
      .maybeSingle();

    if (error) {
      console.error('[subscriptionManager] renewExistingSubscription error:', error);
      return { data: null, error };
    }
    if (!data) {
      return { data: null, error: { message: 'No se pudo actualizar la renovación: suscripción no encontrada o RLS bloquea el acceso' } };
    }
    return { data, error: null };
  } catch (err: any) {
    console.error('[subscriptionManager] renewExistingSubscription catch:', err);
    return { data: null, error: err };
  }
}