import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { ProductCategory } from '@/data/products';

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  image: string;
  badge: string | null;
  plan_type: string | null;
  orden_prioridad: number | null;
  is_available: boolean;
  group_name: string | null;
  image_scale: number;
}

interface ServiceRow {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  badge: string | null;
  plan_type: string | null;
  sort_order: number | null;
  is_available: boolean;
  group_name: string | null;
  image_scale: number;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        // Timeout de seguridad de 3 segundos
        const loadTimeout = setTimeout(() => {
          if (loading) {
            console.warn('[useProducts] Anti-loop: Timeout de 3s alcanzado. Forzando UI.');
            setLoading(false);
          }
        }, 3000);

        console.debug('[useProducts] Fetching products from table: products');

        const { data, error: supabaseError } = await supabase
          .from('products')
          .select('id, name, description, price, category, image_url, badge, plan_type, orden_prioridad, is_available, group_name, image_scale')
          .eq('is_available', true)
          .order('orden_prioridad', { ascending: true });

        if (supabaseError) {
          console.error('[useProducts] Supabase error:', supabaseError);
          setError(supabaseError.message || 'Error al cargar productos');
          setProducts([]);
          setLoading(false);
          return;
        }

        if (!data || data.length === 0) {
          console.warn('[useProducts] No products found in Supabase');
          setProducts([]);
          setLoading(false);
          return;
        }

        // Normalizar datos de manera segura con optional chaining
        const normalized = (data as ServiceRow[] | null | undefined)?.map((item) => ({
          id: item?.id || '',
          name: item?.name || 'Producto sin nombre',
          description: item?.description || '',
          price: Number(item?.price || 0),
          category: (item?.category === 'gaming' ? 'gaming' : 'streaming') as ProductCategory,
          image: item?.image_url || '/placeholder.png',
          badge: item?.badge ?? null,
          plan_type: item?.plan_type ?? null,
          orden_prioridad: item?.orden_prioridad ?? null,
          is_available: item?.is_available ?? true,
          group_name: item?.group_name ?? null,
          image_scale: item?.image_scale ?? 100,
        })) ?? [];

        setProducts(normalized);
        clearTimeout(loadTimeout);
        console.debug('[useProducts] Loaded', normalized.length, 'products successfully');
      } catch (err) {
        console.error('[useProducts] Catch error:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();

    // Realtime subscription
    const channel = supabase
      .channel('services-products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => {
          console.debug('[useProducts] Realtime update detected, refetching...');
          fetchProducts();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug('[useProducts] Realtime subscription active');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { products, loading, error };
}
