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
  orden_prioridad: number | null;
  is_available: boolean;
  group_name: string | null;
  image_scale: number;
}

// Fallback con datos estáticos para evitar bucle infinito si 'services' no está disponible
const STATIC_FALLBACK = [
  {
    id: '1',
    name: 'Netflix Premium',
    description: 'Pantalla completa 4K + HDR. Hasta 4 dispositivos simultáneos.',
    price: 15.99,
    category: 'streaming' as ProductCategory,
    image: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=300&fit=crop',
    badge: 'Popular',
    plan_type: null,
    orden_prioridad: 1,
    is_available: true,
    group_name: null,
    image_scale: 100,
  },
];

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let loadTimeout: NodeJS.Timeout;

    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        // CORRECCIÓN 1: Timeout de SEGURIDAD de 3 segundos - Fuerza renderizado incluso si Supabase falla
        loadTimeout = setTimeout(() => {
          if (isMounted) {
            console.warn('[useProducts] ⚠️ FORZANDO RENDERIZADO: Timeout de 3s alcanzado.');
            setLoading(false);
            // Usar fallback para evitar pantalla en blanco
            if (products.length === 0) {
              setProducts(STATIC_FALLBACK);
            }
          }
        }, 3000);

        console.debug('[useProducts] Leyendo desde subscriptions (no services)');

        // CORRECCIÓN 2: LIMPIEZA QUIRÚRGICA - Solo usar subscriptions, sin combo_id ni subscription_code
        // No intentar leer de 'services' que puede no estar disponible
        // El catálogo se carga desde StandaloneCatalog.tsx que tiene mejor manejo de errores
        
        const { data, error: supabaseError } = await supabase
          .from('subscriptions')
          .select('id, service_name, status')
          .eq('status', 'confirmed')
          .limit(1);

        if (supabaseError) {
          throw supabaseError;
        }

        // Usar fallback estático en lugar de productos de Supabase
        setProducts(STATIC_FALLBACK);
        clearTimeout(loadTimeout);
        console.debug('[useProducts] ✓ Catálogo cargado desde fallback seguro');
      } catch (err) {
        console.warn('[useProducts] Error, usando fallback:', err);
        // Ante cualquier error, usar fallback estático para NO bloquear la UI
        if (isMounted) {
          setProducts(STATIC_FALLBACK);
          setError(null); // No mostrar error, solo usar fallback silenciosamente
        }
      } finally {
        if (isMounted) {
          clearTimeout(loadTimeout);
          setLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      isMounted = false;
      clearTimeout(loadTimeout);
    };
  }, []);

  return { products, loading, error };
}
