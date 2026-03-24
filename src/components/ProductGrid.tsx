import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { products, ProductCategory } from '@/data/products';
import ProductCard from './ProductCard';
import { Tv, Gamepad2, LayoutGrid } from 'lucide-react';

const filters: { label: string; value: ProductCategory | 'all'; icon: React.ElementType }[] = [
  { label: 'Todo', value: 'all', icon: LayoutGrid },
  { label: 'Streaming', value: 'streaming', icon: Tv },
  { label: 'Gaming', value: 'gaming', icon: Gamepad2 },
];

const ProductGrid = () => {
  const [searchParams] = useSearchParams();
  const catParam = searchParams.get('cat');
  const [category, setCategory] = useState<ProductCategory | 'all'>(
    (catParam as ProductCategory) || 'all'
  );

  const filtered = category === 'all'
    ? products
    : products.filter(p => p.category === category);

  return (
    <section id="catalogo" className="py-12">
      <div className="container mx-auto px-4">
        <h2 className="sr-only">Catálogo de productos</h2>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((product, i) => (
            <ProductCard key={product.id} product={product} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductGrid;
