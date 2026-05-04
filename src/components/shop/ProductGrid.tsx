import { ElementType, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCategory } from '@/data/products';
import { useProducts, Product } from '@/hooks/useProducts';
import ProductCard from './ProductCard';
import { Tv, Gamepad2, LayoutGrid, Loader2, AlertCircle } from 'lucide-react';

const filters: { label: string; value: ProductCategory | 'all'; icon: ElementType }[] = [
  { label: 'Todo', value: 'all', icon: LayoutGrid },
  { label: 'Streaming', value: 'streaming', icon: Tv },
  { label: 'Gaming', value: 'gaming', icon: Gamepad2 },
];

interface GroupedItem {
  key: string;
  representative: Product;
  variants: Product[];
}

const ProductGrid = () => {
  const [searchParams] = useSearchParams();
  const catParam = searchParams.get('cat');
  const { products, loading, error } = useProducts();
  const [category, setCategory] = useState<ProductCategory | 'all'>((catParam as ProductCategory) || 'all');

  const filtered = category === 'all'
    ? products
    : products?.filter(p => p?.category === category) ?? [];

  const grouped = useMemo<GroupedItem[]>(() => {
    const map = new Map<string, Product[]>();
    const singles: Product[] = [];

    filtered.forEach(p => {
      if (p?.group_name) {
        const existing = map.get(p.group_name) || [];
        existing.push(p);
        map.set(p.group_name, existing);
      } else {
        singles.push(p);
      }
    });

    const result: GroupedItem[] = [];

    map.forEach((variants, groupName) => {
      result.push({
        key: groupName,
        representative: variants[0],
        variants,
      });
    });

    singles.forEach(p => {
      result.push({
        key: p?.id || `single-${Math.random()}`,
        representative: p,
        variants: [p],
      });
    });

    result.sort(
      (a, b) =>
        (a.representative?.orden_prioridad ?? 999) -
        (b.representative?.orden_prioridad ?? 999)
    );

    return result;
  }, [filtered]);

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

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-8 w-8 text-amber-400" />
            </div>
            <h3 className="font-display font-semibold text-lg text-amber-300 mb-2">
              Error cargando catálogo
            </h3>
            <p className="text-sm text-amber-300/80 mb-4">
              {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="inline-block px-4 py-2 rounded-xl bg-amber-500 text-amber-50 text-sm font-semibold hover:bg-amber-600 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : grouped?.length === 0 ? (
          <div className="rounded-3xl border border-slate-700/30 bg-slate-800/10 p-8 text-center">
            <h3 className="font-display font-semibold text-lg text-slate-300 mb-2">
              No hay productos disponibles
            </h3>
            <p className="text-sm text-slate-400">
              Vuelve pronto para más contenido
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-5 md:gap-3">
            {grouped?.map((item, i) => (
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

export default ProductGrid;
