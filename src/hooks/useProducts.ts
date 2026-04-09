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

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, description, price, category, image_url, badge, plan_type, sort_order, is_available, group_name, image_scale')
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
      } else {
        const normalized = (data as ServiceRow[] | null | undefined)?.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: Number(item.price || 0),
          category: (item.category === 'gaming' ? 'gaming' : 'streaming') as ProductCategory,
          image: item.image_url,
          badge: item.badge,
          plan_type: item.plan_type,
          orden_prioridad: item.sort_order,
          is_available: item.is_available,
          group_name: item.group_name,
          image_scale: item.image_scale ?? 100,
        })) ?? [];

        setProducts(normalized);
      }
      setLoading(false);
    };

    fetchProducts();

    const channel = supabase
      .channel('services-products-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        () => fetchProducts()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { products, loading };
}
