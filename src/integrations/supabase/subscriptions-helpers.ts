/**
 * Supabase Subscriptions Helper Functions
 * Wrapper functions with robust validation, error handling, and type safety
 * Prevents error 400 from malformed queries
 */

import { supabase } from './client';

// Type guards and validators
export const isValidUUID = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
};

export const validateUserId = (userId: unknown): boolean => {
  if (!userId) return false;
  return isValidUUID(userId);
};

export const validateServiceName = (serviceName: unknown): boolean => {
  if (typeof serviceName !== 'string' || serviceName.trim().length === 0) return false;
  return serviceName.length <= 255;
};

// Safe query wrappers
export async function getSubscriptionsByUserId(userId: unknown) {
  try {
    if (!validateUserId(userId)) {
      console.error('[Subscriptions] Invalid userId provided:', userId);
      return { data: null, error: { message: 'Invalid user ID format' } };
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId as string)
      .order('next_renewal', { ascending: true });

    if (error) {
      console.error('[Subscriptions] Query error:', error);
      return { data, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[Subscriptions] getSubscriptionsByUserId catch:', err);
    return { data: null, error: err };
  }
}

export async function getAllSubscriptions() {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Subscriptions] Query error:', error);
      return { data, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[Subscriptions] getAllSubscriptions catch:', err);
    return { data: null, error: err };
  }
}

export async function getSubscriptionById(subscriptionId: unknown) {
  try {
    if (typeof subscriptionId !== 'string' || subscriptionId.trim().length === 0) {
      console.error('[Subscriptions] Invalid subscriptionId:', subscriptionId);
      return { data: null, error: { message: 'Invalid subscription ID' } };
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId as string)
      .single();

    if (error) {
      console.error('[Subscriptions] Query error:', error);
      return { data, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[Subscriptions] getSubscriptionById catch:', err);
    return { data: null, error: err };
  }
}

export interface CreateSubscriptionPayload {
  user_id: string;
  service_name: string;
  status: string;
  subscription_code: string;
  last_renewal?: string;
  next_renewal?: string;
  profile_name?: string | null;
  profile_pin?: string | null;
}

export async function createSubscription(payload: CreateSubscriptionPayload) {
  try {
    // Validate all required fields
    if (!validateUserId(payload.user_id)) {
      console.error('[Subscriptions] Invalid user_id:', payload.user_id);
      return { data: null, error: { message: 'Invalid user ID' } };
    }

    if (!validateServiceName(payload.service_name)) {
      console.error('[Subscriptions] Invalid service_name:', payload.service_name);
      return { data: null, error: { message: 'Invalid service name' } };
    }

    if (!payload.subscription_code || payload.subscription_code.trim().length === 0) {
      console.error('[Subscriptions] Missing subscription_code');
      return { data: null, error: { message: 'Missing subscription code' } };
    }

    if (!payload.status || ['pending_approval', 'active', 'expired'].indexOf(payload.status) === -1) {
      console.error('[Subscriptions] Invalid status:', payload.status);
      return { data: null, error: { message: 'Invalid status' } };
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([
        {
          user_id: payload.user_id,
          service_name: payload.service_name.trim(),
          status: payload.status,
          subscription_code: payload.subscription_code,
          last_renewal: payload.last_renewal || new Date().toISOString(),
          next_renewal: payload.next_renewal || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          profile_name: payload.profile_name || null,
          profile_pin: payload.profile_pin || null,
        },
      ])
      .select();

    if (error) {
      console.error('[Subscriptions] Insert error:', error);
      return { data, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[Subscriptions] createSubscription catch:', err);
    return { data: null, error: err };
  }
}

export async function createBulkSubscriptions(payloads: CreateSubscriptionPayload[]) {
  try {
    if (!Array.isArray(payloads) || payloads.length === 0) {
      console.error('[Subscriptions] Invalid payloads array');
      return { data: null, error: { message: 'Invalid payloads' } };
    }

    // Validate all records before inserting
    for (const payload of payloads) {
      if (!validateUserId(payload.user_id)) {
        console.error('[Subscriptions] Invalid user_id in bulk:', payload.user_id);
        return { data: null, error: { message: `Invalid user ID in record` } };
      }

      if (!validateServiceName(payload.service_name)) {
        console.error('[Subscriptions] Invalid service_name in bulk:', payload.service_name);
        return { data: null, error: { message: `Invalid service name in record` } };
      }
    }

    const cleanedPayloads = payloads.map(p => ({
      user_id: p.user_id,
      service_name: p.service_name.trim(),
      status: p.status,
      subscription_code: p.subscription_code,
      last_renewal: p.last_renewal || new Date().toISOString(),
      next_renewal: p.next_renewal || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      profile_name: p.profile_name || null,
      profile_pin: p.profile_pin || null,
    }));

    const { data, error } = await supabase.from('subscriptions').insert(cleanedPayloads).select();

    if (error) {
      console.error('[Subscriptions] Bulk insert error:', error);
      return { data, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[Subscriptions] createBulkSubscriptions catch:', err);
    return { data: null, error: err };
  }
}

export async function updateSubscription(subscriptionId: unknown, updates: Record<string, unknown>) {
  try {
    if (typeof subscriptionId !== 'string' || subscriptionId.trim().length === 0) {
      console.error('[Subscriptions] Invalid subscriptionId:', subscriptionId);
      return { data: null, error: { message: 'Invalid subscription ID' } };
    }

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', subscriptionId as string)
      .select();

    if (error) {
      console.error('[Subscriptions] Update error:', error);
      return { data, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[Subscriptions] updateSubscription catch:', err);
    return { data: null, error: err };
  }
}

export async function deleteSubscription(subscriptionId: unknown) {
  try {
    if (typeof subscriptionId !== 'string' || subscriptionId.trim().length === 0) {
      console.error('[Subscriptions] Invalid subscriptionId for delete:', subscriptionId);
      return { error: { message: 'Invalid subscription ID' } };
    }

    const { error } = await supabase.from('subscriptions').delete().eq('id', subscriptionId as string);

    if (error) {
      console.error('[Subscriptions] Delete error:', error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('[Subscriptions] deleteSubscription catch:', err);
    return { error: err };
  }
}

export async function getSubscriptionCredentials(subscriptionId: unknown) {
  try {
    if (typeof subscriptionId !== 'string' || subscriptionId.trim().length === 0) {
      console.error('[Subscriptions] Invalid subscriptionId for RPC:', subscriptionId);
      return { data: null, error: { message: 'Invalid subscription ID' } };
    }

    const { data, error } = await supabase.rpc('get_subscription_credentials', {
      _subscription_id: subscriptionId as string,
    });

    if (error) {
      console.error('[Subscriptions] RPC error:', error);
      return { data, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[Subscriptions] getSubscriptionCredentials catch:', err);
    return { data: null, error: err };
  }
}

export async function setSubscriptionCredentials(
  subscriptionId: unknown,
  email: string,
  password: string
) {
  try {
    if (typeof subscriptionId !== 'string' || subscriptionId.trim().length === 0) {
      console.error('[Subscriptions] Invalid subscriptionId for RPC:', subscriptionId);
      return { error: { message: 'Invalid subscription ID' } };
    }

    const { error } = await supabase.rpc('set_subscription_credentials', {
      _subscription_id: subscriptionId as string,
      _credential_email: email,
      _credential_password: password,
    });

    if (error) {
      console.error('[Subscriptions] RPC error:', error);
      return { error };
    }

    return { error: null };
  } catch (err) {
    console.error('[Subscriptions] setSubscriptionCredentials catch:', err);
    return { error: err };
  }
}
