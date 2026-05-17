/**
 * Admin Verification Helper
 * Functions for admin panel to verify/approve customers and update subscription status
 * Uses RLS-protected Supabase operations (admins have permission via has_role check)
 */

import { supabase } from '@/integrations/supabase/client';

/**
 * Verify a customer (admin operation)
 * Sets verificado = true and updates subscription status to 'confirmed'
 * @param userId - User ID to verify
 * @param subscriptionId - Optional specific subscription to update to 'confirmed'
 * @returns Result object with success/error
 */
export async function verifyCustomer(
  userId: string,
  subscriptionId?: string
) {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    // Step 1: Update profile to mark as verified
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ verificado: true, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (profileError) {
      console.error('[Admin] Profile verification error:', profileError);
      return { success: false, error: profileError.message };
    }

    // Step 2: Update subscription status if specific subscription provided
    if (subscriptionId) {
      const { error: subError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', subscriptionId)
        .eq('user_id', userId);

      if (subError) {
        console.error('[Admin] Subscription status update error:', subError);
        return { success: false, error: subError.message };
      }
    } else {
      // Update all pending subscriptions for this user to 'confirmed'
      const { error: bulkError } = await supabase
        .from('subscriptions')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('status', 'pending_approval');

      if (bulkError) {
        console.error('[Admin] Bulk subscription update error:', bulkError);
        return { success: false, error: bulkError.message };
      }
    }

    return { success: true, message: 'Customer verified successfully' };
  } catch (err) {
    console.error('[Admin] verifyCustomer error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Unverify a customer (admin operation)
 * Sets verificado = false (used for revocation)
 * @param userId - User ID to unverify
 * @returns Result object with success/error
 */
export async function unverifyCustomer(userId: string) {
  try {
    if (!userId) {
      return { success: false, error: 'User ID required' };
    }

    const { error } = await supabase
      .from('profiles')
      .update({ verificado: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId);

    if (error) {
      console.error('[Admin] Unverify error:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message: 'Customer unverified' };
  } catch (err) {
    console.error('[Admin] unverifyCustomer error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Get verification status of a customer
 * @param userId - User ID to check
 * @returns Verification status object
 */
export async function getVerificationStatus(userId: string) {
  try {
    if (!userId) {
      return { verificado: false, error: 'User ID required' };
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('verificado')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('[Admin] Get verification status error:', error);
      return { verificado: false, error: error.message };
    }

    return { verificado: data?.verificado ?? false };
  } catch (err) {
    console.error('[Admin] getVerificationStatus error:', err);
    return { verificado: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Batch verify multiple customers
 * @param userIds - Array of user IDs to verify
 * @returns Result with count of successful verifications
 */
export async function batchVerifyCustomers(userIds: string[]) {
  try {
    if (!userIds || userIds.length === 0) {
      return { success: false, error: 'No user IDs provided', count: 0 };
    }

    // Update profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ verificado: true, updated_at: new Date().toISOString() })
      .in('user_id', userIds);

    if (profileError) {
      console.error('[Admin] Batch profile verification error:', profileError);
      return { success: false, error: profileError.message, count: 0 };
    }

    return { success: true, message: `${userIds.length} customers verified`, count: userIds.length };
  } catch (err) {
    console.error('[Admin] batchVerifyCustomers error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error', count: 0 };
  }
}
