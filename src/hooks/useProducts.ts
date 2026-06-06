import { useState, useEffect } from 'react';
import { supabase, supabaseIsConfigured } from '@/integrations/supabase/client';
import { fallbackProducts } from '@/data/fallbackProducts';
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
  orden_prioridad: number | null;
  is_available: boolean;
  group_name: string | null;
  image_scale: number;
}

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const fetchProducts = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);

      if (!supabaseIsConfigured) {
        const fallback: Product[] = fallbackProducts.map(item => ({
          id: item.id,
          name: item.name,
          description: '',
          price: Number(item.price ?? 0),
          category: item.category,
          image: item.image_url,
          badge: item.badge ?? null,
          plan_type: null,
          orden_prioridad: null,
          is_available: true,
          group_name: null,
          image_scale: 100,
        }));

        setProducts(fallback);
        setError('Catálogo en modo de respaldo. Verifica VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
        setLoading(false);
        return;
      }

      try {
        const { data, error: supabaseError } = await supabase
          .from('services')
          .select('id, name, description, price, category, image_url, badge, plan_type, sort_order, is_available, group_name, image_scale')
          .eq('is_available', true)
          .order('sort_order', { ascending: true });

        if (supabaseError) throw supabaseError;

        const normalized: Product[] = (data ?? []).map((item: any) => ({
          id: item.id || '',
          name: item.name || 'Sin nombre',
          description: item.description || '',
          price: Number(item.price ?? 0),
          category: (item.category === 'gaming' ? 'gaming' : 'streaming') as ProductCategory,
          image: item.image_url || '/placeholder.svg',
          badge: item.badge ?? null,
          plan_type: item.plan_type ?? null,
          orden_prioridad: item.sort_order ?? null,
          is_available: item.is_available ?? false,
          group_name: item.group_name ?? null,
          image_scale: item.image_scale ?? 100,
        }));

        if (!isMounted) return;
        setProducts(normalized);
      } catch (err: any) {
        console.error('[useProducts] Fetch error:', err);
        if (!isMounted) return;
        setError(err?.message || 'Error al cargar el catálogo');
        setProducts([]);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    fetchProducts();

    const channel = supabase
      .channel('products-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [retryKey]);

  return { products, loading, error, retry: () => setRetryKey(key => key + 1) };
}
