import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook para procesar la lógica de negocio de pedidos sin depender de la UI de Orders.
 * Implementa el flujo: Aprobación -> Creación de Suscripción 'Pendiente'.
 */
export const useOrderProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const approveOrder = async (orderId: string, userId: string, serviceName: string) => {
    setIsProcessing(true);
    try {
      // 1. Actualizar estado del pedido a completado
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (orderError) throw orderError;

      // 2. Crear registro en subscriptions con estado 'Pendiente'
      // REGLA DE ORO: Solo campos permitidos para evitar PGRST204
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: userId,
          service_name: serviceName,
          status: 'Pendiente',
          // Las credenciales nacen nulas para ser asignadas en 'AdminSubscriptionsNew'
          email_cuenta: null,
          password_cuenta: null,
          perfil: null,
          pin: null
        }]);

      if (subError) throw subError;

      toast.success('Pedido aprobado. Suscripción lista para entrega en el panel de Suscripciones.');
      return { success: true };
    } catch (error: any) {
      console.error('[OrderProcessing] Critical Error:', error);
      toast.error('Error al procesar pedido: ' + (error.message || 'Error desconocido'));
      return { success: false, error };
    } finally {
      setIsProcessing(false);
    }
  };

  return { approveOrder, isProcessing };
};