import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Hook centralizado para la gestión de Suscripciones (Ex-Pedidos)
 * Maneja la aprobación, listado detallado y filtrado.
 */
export const useOrderProcessing = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchAdminSubscriptions = useCallback(async () => {
    try {
      // REGLA DE ORO: Solo campos existentes. Sin combo_id ni subscription_code.
      const { data, error } = await supabase
        .from('subscriptions')
        .select(`
          id, 
          user_id, 
          service_name, 
          status, 
          last_renewal, 
          next_renewal,
          email_cuenta,
          password_cuenta,
          perfil,
          pin,
          created_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (err) {
      console.error('[OrderProcessing] Error fetching subs:', err);
      toast.error('No se pudo cargar el listado de suscripciones');
    }
  }, []);

  // Filtrado en tiempo real por Cliente (email/ID) o Servicio
  const filteredSubscriptions = subscriptions.filter(sub => {
    const searchLower = searchTerm.toLowerCase();
    return (
      sub.service_name?.toLowerCase().includes(searchLower) ||
      sub.user_id?.toLowerCase().includes(searchLower) ||
      sub.email_cuenta?.toLowerCase().includes(searchLower)
    );
  });

  // Lógica de "Semáforo" para días restantes
  const getDaysRemaining = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    const diff = new Date(expiryDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const approveOrder = async (orderId: string, userId: string, serviceName: string) => {
    setIsProcessing(true);
    try {
      // 1. Actualizar estado del pedido original a completado (Manteniendo integridad)
      const { error: orderError } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', orderId);

      if (orderError) {
        console.error('[OrderProcessing] Order update failed:', orderError);
      }

      // 2. Crear registro de suscripción individual
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert([{
          user_id: userId,
          service_name: serviceName,
          status: 'Pendiente',
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

  return { 
    approveOrder, 
    fetchAdminSubscriptions, 
    subscriptions: filteredSubscriptions, 
    isProcessing,
    searchTerm,
    setSearchTerm,
    getDaysRemaining
  };
};