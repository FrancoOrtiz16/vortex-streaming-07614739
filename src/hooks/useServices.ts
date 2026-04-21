import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  badge: string | null;
  plan_type: string;
  is_available: boolean;
  orden_prioridad: number;
  group_name: string | null;
  image_scale: number;
}

export function useServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      const loadTimeout = setTimeout(() => {
        if (loading) setLoading(false);
      }, 3000);

      try {
        const { data, error } = await supabase
          .from('products')
          .select('id, name, description, price, category, image_url, badge, plan_type, is_available, orden_prioridad, group_name, image_scale')
          .eq('is_available', true)
          .order('orden_prioridad');
        
        if (error) {
          console.error('[useServices] Silent error catch:', error);
          setServices([]);
        } else {
          setServices((data as unknown as Service[]) || []);
        }
      } catch (err) {
        console.error('[useServices] Fetch crash prevented:', err);
      } finally {
        setLoading(false);
        clearTimeout(loadTimeout);
      }
    };

    fetchServices();

    const channel = supabase
      .channel('services-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          fetchServices();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { services, loading };
}
