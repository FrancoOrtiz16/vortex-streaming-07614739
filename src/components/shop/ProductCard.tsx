import { useState, type ChangeEvent, type FC } from 'react';
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

const formatPrice = (value: number) => {
  return `$${value.toFixed(2).replace('.', ',')}`;
};

const ProductCard: FC<ProductCardProps> = ({ product, variants, index }) => {
  const { addItem } = useCart();
  const [selected, setSelected] = useState<Product>(product);
  const hasVariants = !!variants && variants.length > 1;
  const exchangeRate = 700;
  const priceText = formatPrice(selected.price);
  const scale = (selected.image_scale ?? 100) / 100;

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

  const handleVariantChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const found = variants?.find(v => v.id === e.target.value);
    if (found) setSelected(found);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      className="group relative rounded-2xl overflow-hidden flex flex-col transition-shadow duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.15)]"
      style={{
        background: 'linear-gradient(180deg, hsl(var(--secondary)) 0%, hsl(var(--background)) 100%)',
        border: '1px solid hsl(var(--border))',
      }}
    >
      {selected.badge && (
        <span className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider gradient-neon text-primary-foreground">
          {selected.badge}
        </span>
      )}

      <div className="relative flex items-center justify-center h-40 p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-transparent group-hover:from-primary/5 transition-all duration-500" />
        <img
          src={selected.image}
          alt={selected.name}
          className="object-contain drop-shadow-lg transition-transform duration-500 group-hover:scale-110"
          style={{ maxHeight: '9rem', maxWidth: '120%' }}
          loading="lazy"
        />
      </div>

      <div className="px-5 pb-5 flex flex-col flex-1 text-center">
        <h3 className="font-display font-bold text-lg text-foreground mb-0.5">
          {hasVariants ? selected.group_name : selected.name}
        </h3>
        <p className="text-xs uppercase tracking-widest text-[hsl(var(--foreground)/0.6)] mb-4">
          Premium Mensual
        </p>

        {hasVariants ? (
          <div className="relative mb-4">
            <select
              value={selected.id}
              onChange={handleVariantChange}
              className="w-full appearance-none rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2 pr-8 text-sm font-medium text-white outline-none transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {variants!.map(v => (
                <option key={v.id} value={v.id} className="bg-[#040617] text-white">
                  {v.plan_type || v.name} — {formatPrice(v.price)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        ) : (
          selected.plan_type && (
            <p className="text-xs text-[hsl(var(--foreground)/0.6)] mb-4">{selected.plan_type}</p>
          )
        )}

        <p className="text-sm text-[hsl(var(--foreground)/0.55)] mb-4 line-clamp-2 flex-1">
          {selected.description}
        </p>

        <div className="font-display font-bold text-3xl mb-4 neon-text">
          <span
            title={`Tasa de cambio ${exchangeRate} Bs/USD`}
            style={{
              textShadow: '0 0 15px hsl(var(--primary)/0.8)',
              color: 'hsl(var(--primary))',
            }}
          >
            {priceText}
          </span>
        </div>

        <button
          onClick={handleAdd}
          className="w-full flex h-10 items-center justify-center gap-2 rounded-xl border border-primary/20 bg-primary/10 text-xs font-semibold text-primary transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_16px_hsl(var(--primary)/0.4)]"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Añadir al Carrito
        </button>
      </div>
    </motion.div>
  );
};

export default ProductCard;
