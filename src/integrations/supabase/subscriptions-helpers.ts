/**
 * ROLLBACK & SIMPLIFICATION: Subscriptions Helper Functions
 * Using ONLY native Supabase fields that exist in the actual table
 * 
 * Confirmed fields in subscriptions table:
 * - id (UUID, auto-generated) 
 * - user_id (UUID)
 * - service_name (STRING)
 * - status (STRING: pending_approval, active, expired)
 * - created_at (TIMESTAMP, auto-set by Supabase)
 * - updated_at (TIMESTAMP, auto-set by Supabase)
 * - credential_email (TEXT, optional)
 * - credential_password (TEXT, optional)
 * - profile_name (TEXT, optional)
 * - profile_pin (TEXT, optional)
 * - combo_id (UUID, optional - for grouping services in combos)
 * 
 * REMOVED (were causing 400 errors):
 * - subscription_code (use service name + ID instead)
 * - fecha_inicio / proxima_fecha (use last_renewal / next_renewal)
 */

import { supabase } from './client';

// Simple type: only the fields that actually exist
export interface SimpleSubscriptionPayload {
  user_id: string;
  service_name: string;
  status?: string;
  last_renewal?: string;
  next_renewal?: string;
  credential_email?: string | null;
  credential_password?: string | null;
  profile_name?: string | null;
  profile_pin?: string | null;
  combo_id?: string | null;
}

export interface SimpleSubscriptionUpdatePayload {
  status?: string;
  last_renewal?: string;
  next_renewal?: string;
  credential_email?: string | null;
  credential_password?: string | null;
  profile_name?: string | null;
  profile_pin?: string | null;
  combo_id?: string | null;
}

function logPGRST204Error(error: any, payload: Record<string, unknown> | Record<string, unknown>[]) {
  if (error?.code === 'PGRST204') {
    console.error('[Subscriptions] Schema cache missing columns detected. Payload keys:',
      Array.isArray(payload)
        ? Array.from(new Set(payload.flatMap(Object.keys)))
        : Object.keys(payload)
    );
    console.error('[Subscriptions] PGRST204 details:', error);
  }
}

/**
 * Create a single subscription with minimal fields
 * Supabase will auto-generate: id, created_at, updated_at
 */
export async function createSimpleSubscription(payload: SimpleSubscriptionPayload) {
  try {
    console.debug('[Subscriptions] Creating simple subscription:', {
      user_id: payload.user_id?.slice(0, 8) + '...',
      service_name: payload.service_name,
      status: payload.status || 'pending_approval'
    });

    const { data, error } = await supabase
      .from('subscriptions')
      .insert([
        {
          user_id: payload.user_id,
          service_name: payload.service_name,
          status: payload.status || 'pending_approval',
          last_renewal: payload.last_renewal,
          next_renewal: payload.next_renewal,
          credential_email: payload.credential_email || null,
          credential_password: payload.credential_password || null,
          profile_name: payload.profile_name || null,
          profile_pin: payload.profile_pin || null,
          combo_id: payload.combo_id || null,
        }
      ])
      .select();

    if (error) {
      logPGRST204Error(error, {
        user_id: payload.user_id,
        service_name: payload.service_name,
        status: payload.status || 'pending_approval',
        last_renewal: payload.last_renewal,
        next_renewal: payload.next_renewal,
        credential_email: payload.credential_email,
        credential_password: payload.credential_password,
        profile_name: payload.profile_name,
        profile_pin: payload.profile_pin,
        combo_id: payload.combo_id,
      });
      console.error('[Subscriptions] Insert error:', error);
      return { data: null, error };
    }

    console.debug('[Subscriptions] Created successfully:', data?.[0]?.id?.slice(0, 8) + '...');
    return { data, error: null };
  } catch (err) {
    console.error('[Subscriptions] createSimpleSubscription catch:', err);
    return { data: null, error: err };
  }
}

/**
 * Create multiple subscriptions in bulk
 * Each gets auto-generated UUID
 */
export async function createSimpleBulkSubscriptions(payloads: SimpleSubscriptionPayload[]) {
  try {
    if (!payloads || payloads.length === 0) {
      console.warn('[Subscriptions] Empty payloads array');
      return { data: null, error: null };
    }

    console.debug('[Subscriptions] Creating bulk subscriptions:', payloads.length);

    const cleanedPayloads = payloads.map(p => ({
      user_id: p.user_id,
      service_name: p.service_name,
      status: p.status || 'pending_approval',
      last_renewal: p.last_renewal,
      next_renewal: p.next_renewal,
      credential_email: p.credential_email || null,
      credential_password: p.credential_password || null,
      profile_name: p.profile_name || null,
      profile_pin: p.profile_pin || null,
      combo_id: p.combo_id || null,
    }));

    const { data, error } = await supabase
      .from('subscriptions')
      .insert(cleanedPayloads)
      .select();

    if (error) {
      logPGRST204Error(error, cleanedPayloads);
      console.error('[Subscriptions] Bulk insert error:', error);
      return { data, error };
    }

    console.debug('[Subscriptions] Bulk created successfully:', data?.length, 'items');
    return { data, error: null };
  } catch (err) {
    console.error('[Subscriptions] createSimpleBulkSubscriptions catch:', err);
    return { data: null, error: err };
  }
}

/**
 * Get subscriptions for a user
 */
export async function getUserSubscriptions(userId: string) {
  try {
    if (!userId) {
      console.warn('[Subscriptions] Empty userId');
      return { data: null, error: { message: 'No user ID' } };
    }

    console.debug('[Subscriptions] Fetching for user:', userId.slice(0, 8) + '...');

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Subscriptions] Fetch error:', error);
      return { data, error };
    }

    console.debug('[Subscriptions] Fetched:', data?.length, 'items');
    return { data, error: null };
  } catch (err) {
    console.error('[Subscriptions] getUserSubscriptions catch:', err);
    return { data: null, error: err };
  }
}

/**
 * Get all subscriptions (admin)
 */
export async function getAllSubscriptionsAdmin() {
  try {
    console.debug('[Subscriptions] Fetching all subscriptions (admin)');

    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Subscriptions] Admin fetch error:', error);
      return { data, error };
    }

    console.debug('[Subscriptions] Admin fetched:', data?.length, 'items');
    return { data, error: null };
  } catch (err) {
    console.error('[Subscriptions] getAllSubscriptionsAdmin catch:', err);
    return { data: null, error: err };
  }
}

/**
 * Delete a subscription
 */
export async function deleteSimpleSubscription(subscriptionId: string) {
  try {
    if (!subscriptionId) {
      console.warn('[Subscriptions] Empty subscription ID');
      return { error: { message: 'No subscription ID' } };
    }

    console.debug('[Subscriptions] Deleting:', subscriptionId.slice(0, 8) + '...');

    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', subscriptionId);

    if (error) {
      console.error('[Subscriptions] Delete error:', error);
      return { error };
    }

    console.debug('[Subscriptions] Deleted successfully');
    return { error: null };
  } catch (err) {
    console.error('[Subscriptions] deleteSimpleSubscription catch:', err);
    return { error: err };
  }
}

/**
 * Update subscription status
 */
export async function updateSimpleSubscriptionStatus(subscriptionId: string, status: string) {
  try {
    if (!subscriptionId || !status) {
      console.warn('[Subscriptions] Missing params');
      return { data: null, error: { message: 'Missing params' } };
    }

    console.debug('[Subscriptions] Updating status:', subscriptionId.slice(0, 8) + '...', '→', status);

    const { data, error } = await supabase
      .from('subscriptions')
      .update({ status })
      .eq('id', subscriptionId)
      .select();

    if (error) {
      console.error('[Subscriptions] Update error:', error);
      return { data, error };
    }

    console.debug('[Subscriptions] Updated successfully');
    return { data, error: null };
  } catch (err) {
    console.error('[Subscriptions] updateSimpleSubscriptionStatus catch:', err);
    return { data: null, error: err };
  }
}

/**
 * Get credentials via RPC (if exists)
 */
export async function getSubscriptionCredentials(subscriptionId: string) {
  try {
    if (!subscriptionId) {
      console.warn('[Subscriptions] Empty subscription ID');
      return { data: null, error: { message: 'No subscription ID' } };
    }

    const { data, error } = await supabase.rpc('get_subscription_credentials', {
      _subscription_id: subscriptionId
    });

    if (error) {
      console.warn('[Subscriptions] RPC error (expected if function not exists):', error.message);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('[Subscriptions] getSubscriptionCredentials catch:', err);
    return { data: null, error: err };
  }
}

/**
 * Update a subscription record with credentials, renewal or status changes.
 */
export async function updateSimpleSubscription(subscriptionId: string, payload: SimpleSubscriptionUpdatePayload) {
  try {
    if (!subscriptionId) {
      console.warn('[Subscriptions] Empty subscription ID');
      return { data: null, error: { message: 'No subscription ID' } };
    }

    console.debug('[Subscriptions] Updating subscription:', subscriptionId.slice(0, 8) + '...', payload);

    const { data, error } = await supabase
      .from('subscriptions')
      .update(payload)
      .eq('id', subscriptionId)
      .select();

    if (error) {
      console.error('[Subscriptions] Update error:', error);
      return { data: null, error };
    }

    console.debug('[Subscriptions] Updated successfully');
    return { data, error: null };
  } catch (err) {
    console.error('[Subscriptions] updateSimpleSubscription catch:', err);
    return { data: null, error: err };
  }
}
