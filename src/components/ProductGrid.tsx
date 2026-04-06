import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCategory } from '@/data/products';
import { useProducts, Product } from '@/hooks/useProducts';
import ProductCard from './ProductCard';
import { Tv, Gamepad2, LayoutGrid, Loader2 } from 'lucide-react';

const filters: { label: string; value: ProductCategory | 'all'; icon: React.ElementType }[] = [
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
  const { products, loading } = useProducts();
  const [category, setCategory] = useState<ProductCategory | 'all'>(
    (catParam as ProductCategory) || 'all'
  );

  const filtered = category === 'all'
    ? products
    : products.filter(p => p.category === category);

  // Group products by group_name
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
        key: p.id,
        representative: p,
        variants: [p],
      });
    });

    // Sort by first item's sort_order
    result.sort((a, b) => (a.representative.orden_prioridad ?? 999) - (b.representative.orden_prioridad ?? 999));

    return result;
  }, [filtered]);

  return (
    <section id="catalogo" className="py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <h2 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Catálogo de <span className="neon-text">Streaming</span> y Gaming
          </h2>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Productos disponibles en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-3 mb-8 overflow-x-auto pb-2">
          {filters.map(f => {
            const Icon = f.icon;
            const active = category === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setCategory(f.value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  active
                    ? 'gradient-neon text-primary-foreground'
                    : 'glass text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className="w-4 h-4" />
                {f.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

export default ProductGrid;
