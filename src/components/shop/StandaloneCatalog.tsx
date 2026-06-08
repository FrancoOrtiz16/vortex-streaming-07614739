import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, supabaseIsConfigured } from '@/integrations/supabase/client';
import { fallbackProducts } from '@/data/fallbackProducts';
import { fetchProfileWhatsAppPhone } from '@/lib/profilePhone';
import { useAuth } from '@/hooks/useAuth';
import { useEffect } from 'react';
import { useCurrency } from '@/context/CurrencyContext';
import type { ProductCategory } from '@/data/products';
import ProductCard from './ProductCard';
import { AdminPreviewBar } from '../AdminPreviewBar';
import { Tv, Gamepad2, LayoutGrid, AlertCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

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

const StandaloneCatalog: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAdmin, user } = useAuth();
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const { refreshRate } = useCurrency();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<ProductCategory | 'all'>('all');
  const [profilePhone, setProfilePhone] = useState<string | null>(null);
  const [profileCreatedAt, setProfileCreatedAt] = useState<string | null>(null);

  // Detectar si estamos en modo previsualización admin
  const isAdminPreview = searchParams.get('preview') === 'admin' && isAdmin;

  const handleReturnToPanel = () => {
    // Volver al panel de administración
    window.history.back();
  };

  const fetchProducts = async (retryCount = 0): Promise<Product[]> => {
    const maxRetries = 2;
    const retryDelay = 1000 * (retryCount + 1); // Exponential backoff: 1s, 2s

    try {
      console.debug('[StandaloneCatalog] Fetching catalog from Supabase products (attempt', retryCount + 1, ')');
      const { data, error: supabaseError } = await supabase
        .from('services')
        .select('id, name, price, image_url, description, category, badge, plan_type, sort_order, is_available, group_name, image_scale')
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

      if (supabaseError) throw supabaseError;

      return (data ?? []).map((item: any) => ({
        id: item.id || '',
        name: item.name || 'Sin nombre',
        description: item.description || '',
        price: Number(item.price ?? 0),
        category: (item.category === 'gaming' ? 'gaming' : 'streaming') as ProductCategory,
        image_url: item.image_url || '/placeholder.svg',
        image_scale: item.image_scale ?? 100,
        badge: item.badge ?? null,
        plan_type: item.plan_type ?? null,
        orden_prioridad: item.sort_order ?? 999,
        is_available: item.is_available ?? false,
        group_name: item.group_name ?? null,
      }));
    } catch (err: any) {
      console.error('[StandaloneCatalog] Fetch error (attempt', retryCount + 1, '):', err);
      
      if (retryCount < maxRetries) {
        console.warn('[StandaloneCatalog] Retrying in', retryDelay, 'ms...');
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return fetchProducts(retryCount + 1);
      }
      
      throw new Error(err?.message || 'Error al cargar catálogo');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadCatalog = async () => {
      if (!isMounted) return;
      setLoading(true);
      setError(null);

      if (!supabaseIsConfigured) {
        setError('Catálogo en modo de respaldo. Verifica VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.');
        setProducts(fallbackProducts as unknown as Product[]);
        setLoading(false);
        return;
      }

      try {
        // Forzar refresco de la tasa al montar el catálogo
        try { await refreshRate(); } catch (e) { console.warn('[StandaloneCatalog] refreshRate failed', e); }

        const fresh = await fetchProducts();
        if (!isMounted) return;
        setProducts(fresh);
      } catch (err: any) {
        if (!isMounted) return;
        setError('No se pudo cargar el catálogo desde Supabase. Mostrando catálogo local de respaldo.');
        setProducts(fallbackProducts as unknown as Product[]);
      } finally {
        if (!isMounted) return;
        setLoading(false);
      }
    };

    loadCatalog();

    const channel = supabase
      .channel('standalone-catalog-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'services' }, () => {
        console.debug('[StandaloneCatalog] Realtime update received, reloading catalog');
        loadCatalog();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [isAdminPreview]);

  // Cargar perfil para validar WhatsApp y detectar cuentas recientes
  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('created_at')
          .eq('user_id', user.id)
          .limit(1)
          .single();

        const phone = await fetchProfileWhatsAppPhone(user.id);
        setProfilePhone(phone);
        setProfileCreatedAt(data?.created_at || null);

        if (!phone && data?.created_at) {
          const created = new Date(data.created_at).getTime();
          const now = Date.now();
          const tenMinutes = 10 * 60 * 1000;
          if (now - created <= tenMinutes) {
            setShowWhatsAppModal(true);
          }
        }
      } catch (err) {
        console.warn('[StandaloneCatalog] Error loading profile', err);
      }
    };

    loadProfile();
  }, [user?.id]);

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
      <>
        {isAdminPreview && <AdminPreviewBar onReturnToPanel={handleReturnToPanel} />}
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
      </>
    );
  }

  return (
    <>
      {isAdminPreview && <AdminPreviewBar onReturnToPanel={handleReturnToPanel} />}

      {showWhatsAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="max-w-md w-full glass rounded-2xl p-6 text-center">
            <h3 className="font-display text-lg font-bold mb-2">Te falta añadir un número de WhatsApp</h3>
            <p className="text-sm text-muted-foreground mb-4">Para procesar compras y recibir soporte necesitamos tu número de WhatsApp. Añádelo en tu perfil para continuar.</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => { navigate('/profile'); }}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold"
              >
                Ir a mi perfil
              </button>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground"
              >
                Recordármelo luego
              </button>
            </div>
          </div>
        </div>
      )}

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

          {error && grouped.length > 0 && (
            <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-8 text-center mb-6">
              <AlertCircle className="mx-auto h-8 w-8 text-amber-400 mb-4" />
              <h3 className="font-display font-semibold text-lg text-amber-300 mb-2">{error}</h3>
            </div>
          )}

          {grouped.length === 0 ? (
            <div className="rounded-3xl border border-slate-700/30 bg-slate-800/10 p-8 text-center">
              <h3 className="font-display font-semibold text-lg text-slate-300 mb-2">No hay productos disponibles</h3>
              <p className="text-sm text-slate-400">Vuelve pronto para más contenido</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
              {grouped.map((item, i) => {
                const toHookProduct = (p: Product) => ({ ...p, image: p.image_url });
                return (
                  <ProductCard
                    key={`${item.representative.id}-${item.key}`}
                    product={toHookProduct(item.representative) as any}
                    variants={item.variants.map(toHookProduct) as any}
                    index={i}
                  />
                );
              })}
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default StandaloneCatalog;

