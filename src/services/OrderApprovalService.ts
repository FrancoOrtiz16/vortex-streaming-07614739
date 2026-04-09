import { supabase } from '@/integrations/supabase/client';

export async function approveOrderPayment(orderId: string) {
  if (!orderId) {
    return { data: null, error: { message: 'Order id is required' } };
  }

  const { data, error } = await supabase
    .from('orders')
    .update({ status: 'Aprobado/Confirmado' })
    .eq('id', orderId)
    .select('id, status');

  return { data, error };
}
