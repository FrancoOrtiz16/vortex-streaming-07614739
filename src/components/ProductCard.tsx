import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, ChevronDown } from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  variants?: Product[];
  index: number;
}

const ProductCard = ({ product, variants, index }: ProductCardProps) => {
  const { addItem } = useCart();
  const [selected, setSelected] = useState<Product>(product);

  const hasVariants = variants && variants.length > 1;

  const handleAdd = () => {
    addItem({
      id: selected.id,
      name: selected.name,
      description: selected.description,
      price: selected.price,
      category: selected.category,
      image: selected.image,
      badge: selected.badge || undefined,
    });
    toast.success(`${selected.name} añadido al carrito`);
  };

  const handleVariantChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const found = variants?.find(v => v.id === e.target.value);
    if (found) setSelected(found);
  };

  const scale = (selected.image_scale ?? 100) / 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card/80 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-[0_16px_40px_hsl(var(--primary)/0.12)]"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary/40 flex items-center justify-center">
        <img
          src={selected.image}
          alt={selected.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ transform: `scale(${scale})` }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        {selected.badge && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider gradient-neon text-primary-foreground">
            {selected.badge}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 font-display text-xl font-bold text-foreground">
          {hasVariants ? selected.group_name : selected.name}
        </h3>

        {hasVariants ? (
          <div className="relative mb-3">
            <select
              value={selected.id}
              onChange={handleVariantChange}
              className="w-full appearance-none px-3 py-2 pr-8 rounded-xl bg-secondary text-sm border border-border text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
            >
              {variants!.map(v => (
                <option key={v.id} value={v.id}>
                  {v.plan_type || v.name} — ${v.price.toFixed(2)}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        ) : (
          selected.plan_type && (
            <p className="mb-2 text-sm font-medium text-foreground/85">{selected.plan_type}</p>
          )
        )}

        <p className="mb-4 flex-1 text-sm text-muted-foreground line-clamp-3">
          {selected.description}
        </p>

        <div className="mt-auto">
          <span
            className="font-display text-2xl font-extrabold"
            style={{
              color: '#3b82f6',
              textShadow: '0 0 15px rgba(59, 130, 246, 0.9)',
            }}
          >
            ${selected.price.toFixed(2)}
          </span>
          <button
            onClick={handleAdd}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_24px_rgba(59,130,246,0.4)]"
          >
            <ShoppingCart className="w-4 h-4" />
            Añadir al Carrito
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
