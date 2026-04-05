import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductCategory } from '@/data/products';
import { useProducts } from '@/hooks/useProducts';
import ProductCard from './ProductCard';
import { Tv, Gamepad2, LayoutGrid, Loader2 } from 'lucide-react';

const filters: { label: string; value: ProductCategory | 'all'; icon: React.ElementType }[] = [
  { label: 'Todo', value: 'all', icon: LayoutGrid },
  { label: 'Streaming', value: 'streaming', icon: Tv },
  { label: 'Gaming', value: 'gaming', icon: Gamepad2 },
];

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
            {filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ProductGrid;
