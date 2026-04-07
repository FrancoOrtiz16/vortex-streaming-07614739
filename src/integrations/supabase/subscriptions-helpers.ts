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
 * 
 * REMOVED (were causing 400 errors):
 * - subscription_code (doesn't exist in schema)
 * - last_renewal (doesn't exist in schema)
 * - next_renewal (doesn't exist in schema)
 * - custom ID fields (use native UUID instead)
 */

import { supabase } from './client';

// Simple type: only the fields that actually exist
export interface SimpleSubscriptionPayload {
  user_id: string;
  service_name: string;
  status?: string; // defaults to 'pending_approval' in trigger
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
          status: payload.status || 'pending_approval'
        }
      ])
      .select();

    if (error) {
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
      status: p.status || 'pending_approval'
    }));

    const { data, error } = await supabase
      .from('subscriptions')
      .insert(cleanedPayloads)
      .select();

    if (error) {
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
