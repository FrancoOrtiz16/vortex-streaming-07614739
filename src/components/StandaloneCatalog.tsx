import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import type { ProductCategory } from '@/data/products';
import ProductCard from './ProductCard';
import { Tv, Gamepad2, LayoutGrid, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: ProductCategory;
  image_url: string;
  image_scale?: number;
  badge: string | null;
  plan_type: string | null;
  orden_prioridad: number | null;
  is_available: boolean;
  group_name: string | null;
}

interface GroupedItem {
  key: string;
  representative: Product;
  variants: Product[];
}

const CACHE_KEY = 'standalone_catalog_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getStaticFallback = (): Product[] => {
  const staticData = [
    {
      id: '1',
      name: 'Netflix Premium',
      description: 'Pantalla completa 4K + HDR. Hasta 4 dispositivos simultáneos.',
      price: 15.99,
      category: 'streaming' as ProductCategory,
      image_url: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=300&fit=crop',
      image_scale: 100,
      badge: 'Popular',
      plan_type: null,
      orden_prioridad: 999,
      is_available: true,
      group_name: null,
    },
    {
      id: '2',
      name: 'Disney+ Anual',
      description: 'Acceso a todo el catálogo de Disney, Marvel, Star Wars y más.',
      price: 89.99,
      category: 'streaming' as ProductCategory,
      image_url: 'https://images.unsplash.com/photo-1616530940355-351fabd9524b?w=400&h=300&fit=crop',
      image_scale: 100,
      badge: 'Oferta',
      plan_type: null,
      orden_prioridad: 999,
      is_available: true,
      group_name: null,
    },
    {
      id: '3',
      name: 'Spotify Premium',
      description: 'Música sin anuncios, descarga offline y audio de alta calidad.',
      price: 9.99,
      category: 'streaming' as ProductCategory,
      image_url: 'https://images.unsplash.com/photo-1614680376573-df3480f0c6ff?w=400&h=300&fit=crop',
      image_scale: 100,
      badge: null,
      plan_type: null,
      orden_prioridad: 999,
      is_available: true,
      group_name: null,
    },
    {
      id: '4',
      name: 'HBO Max',
      description: 'Series exclusivas, películas de estreno y documentales premium.',
      price: 12.99,
      category: 'streaming' as ProductCategory,
      image_url: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=400&h=300&fit=crop',
      image_scale: 100,
      badge: null,
      plan_type: null,
      orden_prioridad: 999,
      is_available: true,
      group_name: null,
    },
    {
      id: '5',
      name: 'Free Fire - 1080 Diamantes',
      description: 'Recarga directa a tu cuenta. Entrega en menos de 5 minutos.',
      price: 9.99,
      category: 'gaming' as ProductCategory,
      image_url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop',
      image_scale: 100,
      badge: 'Rápido',
      plan_type: null,
      orden_prioridad: 999,
      is_available: true,
      group_name: null,
    },
    {
      id: '6',
      name: 'PUBG Mobile - 600 UC',
      description: 'Unknown Cash para compras dentro del juego.',
      price: 7.99,
      category: 'gaming' as ProductCategory,
      image_url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=300&fit=crop',
      image_scale: 100,
      badge: null,
      plan_type: null,
      orden_prioridad: 999,
      is_available: true,
      group_name: null,
    },
    {
      id: '7',
      name: 'Roblox - 800 Robux',
      description: 'Robux para personalizar tu avatar y acceder a experiencias premium.',
      price: 9.99,
      category: 'gaming' as ProductCategory,
      image_url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop',
      image_scale: 100,
      badge: 'Nuevo',
      plan_type: null,
      orden_prioridad: 999,
      is_available: true,
      group_name: null,
    },
    {
      id: '8',
      name: 'PlayStation Plus 3 Meses',
      description: 'Juegos mensuales gratis, multijugador online y descuentos exclusivos.',
      price: 24.99,
      category: 'gaming' as ProductCategory,
      image_url: 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=400&h=300&fit=crop',
      image_scale: 100,
      badge: null,
      plan_type: null,
      orden_prioridad: 999,
      is_available: true,
      group_name: null,
    }
  ] as Product[];
  return staticData;
};

const StandaloneCatalog: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');

  // Load from cache
  const loadFromCache = (): Product[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp > CACHE_TTL) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  };

  // Save to cache
  const saveToCache = (data: Product[]) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch {}
  };

  const fetchProducts = async (): Promise<Product[]> => {
    try {
      console.debug('[StandaloneCatalog] Fetching products from Supabase');
      const { data, error: supabaseError } = await supabase
        .from('products')
        .select('id, name, price, image_url, description, category, badge, plan_type, orden_prioridad, is_available, group_name, image_scale')
        .eq('is_available', true)
        .order('orden_prioridad', { ascending: true });

      if (supabaseError) throw supabaseError;

      if (!data || data.length === 0) {
        console.warn('[StandaloneCatalog] No products found');
        return [];
      }

      // Normalize
      const normalized: Product[] = data.map((item: any) => ({
        id: item.id || '',
        name: item.name || 'Sin nombre',
        description: item.description || '',
        price: Number(item.price || 0),
        category: (item.category === 'gaming' ? 'gaming' : 'streaming') as ProductCategory,
        image_url: item.image_url || '/placeholder.svg',
        image_scale: item.image_scale ?? 100,
        badge: item.badge ?? null,
        plan_type: item.plan_type ?? null,
        orden_prioridad: item.orden_prioridad ?? 999,
        is_available: item.is_available ?? true,
        group_name: item.group_name ?? null,
      }));

      console.debug(`[StandaloneCatalog] Loaded ${normalized.length} products`);
      saveToCache(normalized);
      return normalized;
    } catch (err: any) {
      console.error('[StandaloneCatalog] Fetch error:', err);
      throw new Error(err.message || 'Error al cargar catálogo');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      setError(null);

      // Try cache first
      const cached = loadFromCache();
      if (cached && cached.length > 0) {
        console.debug('[StandaloneCatalog] Using cache');
        setProducts(cached);
        setLoading(false);
      }

      // Fetch fresh
      try {
        const fresh = await fetchProducts();
        setProducts(fresh);
      } catch (err: any) {
        console.error('[StandaloneCatalog] Fetch failed:', err);
        setError(err.message);
        // Ultimate fallback
        const fallback = getStaticFallback();
        setProducts(fallback);
        toast.error('Usando catálogo de respaldo');
      } finally {
        setLoading(false);
      }
    };

    init();

    // Realtime
    const channel = supabase
      .channel('standalone-catalog-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        console.debug('[StandaloneCatalog] Realtime update');
        init();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const catParam = searchParams.get('cat');
  useEffect(() => {
    if (catParam && (catParam === 'streaming' || catParam === 'gaming')) {
      setCategory(catParam as ProductCategory);
    }
  }, [catParam]);

  const filtered = category === 'all' ? products : products.filter(p => p.category === category);

  const grouped = useMemo<GroupedItem[]>(() => {
    const map = new Map<string, Product[]>();
    const singles: Product[] = [];

    filtered.forEach(p => {
      if (p.group_name) {
        const existing = map.get(p.group_name) || [];
        existing.push(p);
        map.set(p.group_name, existing);
      } else {
        singles.push(p);
      }
    });

    const result: GroupedItem[] = Array.from(map.entries()).map(([groupName, variants]) => ({
      key: groupName,
      representative: variants[0],
      variants,
    }));

    singles.forEach(p => {
      result.push({
        key: p.id,
        representative: p,
        variants: [p],
      });
    });

    return result.sort((a, b) => (a.representative.orden_prioridad ?? 999) - (b.representative.orden_prioridad ?? 999));
  }, [filtered]);

  const filters = [
    { label: 'Todo', value: 'all' as const, icon: LayoutGrid },
    { label: 'Streaming', value: 'streaming' as const, icon: Tv },
    { label: 'Gaming', value: 'gaming' as const, icon: Gamepad2 },
  ];

  const ProductCardSkeleton = () => (
    <div className="rounded-2xl p-4 border border-border bg-secondary/50 overflow-hidden">
      <div className="h-40 bg-muted rounded-xl mb-4 animate-pulse" />
      <div className="space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-7 w-20 mx-auto" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  );

  if (loading) {
    return (
      <section id="catalogo" className="py-16 bg-transparent">
        <div className="mx-auto max-w-[1480px] px-4">
          <div className="mb-10 rounded-3xl bg-[#111111] px-8 py-8">
            <Skeleton className="h-12 w-80" />
            <Skeleton className="h-4 w-32 mt-3" />
          </div>
          <div className="mb-8 flex flex-wrap items-center gap-3 pb-2">
            {filters.map((_, i) => (
              <Skeleton key={i} className="h-10 w-24 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="catalogo" className="py-16 bg-transparent">
      <div className="mx-auto max-w-[1480px] px-4">
        <div className="mb-10 rounded-3xl bg-[#111111] px-8 py-8">
          <h2 className="font-display text-4xl font-bold text-white md:text-5xl">
            Catálogo de <span className="text-blue-500">Streaming</span> y Gaming
          </h2>
          <p className="mt-3 text-sm uppercase tracking-[0.32em] text-slate-400">
            Productos disponibles en tiempo real
          </p>
        </div>

        <div className="mb-8 flex flex-wrap items-center gap-3 pb-2">
          {filters.map(f => {
            const Icon = f.icon;
            const active = category === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setCategory(f.value)}
                className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(59,130,246,0.22)]'
                    : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-300'}`} />
                {f.label}
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-amber-400 mb-4" />
            <h3 className="font-display font-semibold text-lg text-amber-300 mb-2">{error}</h3>
            <button
              onClick={() => window.location.reload()}
              className="inline-block px-4 py-2 rounded-xl bg-amber-500 text-amber-50 text-sm font-semibold hover:bg-amber-600"
            >
              Reintentar
            </button>
          </div>
        ) : grouped.length === 0 ? (
          <div className="rounded-3xl border border-slate-700/30 bg-slate-800/10 p-8 text-center">
            <h3 className="font-display font-semibold text-lg text-slate-300 mb-2">No hay productos disponibles</h3>
            <p className="text-sm text-slate-400">Vuelve pronto para más contenido</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
            {grouped.map((item, i) => (
              <ProductCard
                key={item.key}
                product={item.representative}
                variants={item.variants}
                index={i}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default StandaloneCatalog;

