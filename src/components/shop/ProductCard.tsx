import { useState, type ChangeEvent, type FC } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, ChevronDown } from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { useResponsive } from '@/hooks/useResponsive';
import { useOptimizedMotion, useWillChange } from '@/hooks/useOptimizedMotion';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  variants?: Product[];
  index: number;
}

const formatPrice = (value: number) => {
  return `$${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const ProductCard: FC<ProductCardProps> = ({ product, variants, index }) => {
  const { addItem } = useCart();
  const [selected, setSelected] = useState<Product>(product);
  const hasVariants = !!variants && variants.length > 1;
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
      duration_days: 30,
      cart_key: `${selected.id}-30`,
    });
    toast.success(`${selected.name} añadido al carrito`);
  };

  const handleVariantChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const found = variants?.find(v => v.id === e.target.value);
    if (found) setSelected(found);
  };

  const { shouldAnimateOnDevice } = useResponsive();
  const { getCardAnimation } = useOptimizedMotion();
  const willChangeProps = useWillChange(shouldAnimateOnDevice);
  const cardAnimationProps = getCardAnimation(index);

  return (
    <motion.div
      {...cardAnimationProps}
      layout={false}
      className="group relative rounded-2xl overflow-hidden flex flex-col min-w-0 w-full transition-shadow duration-300"
      style={{
        background: 'linear-gradient(180deg, hsl(var(--secondary)) 0%, hsl(var(--background)) 100%)',
        border: '1px solid hsl(var(--border))',
        willChange: willChangeProps.style.willChange,
      }}
    >
      {selected.badge && (
        <span className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[0.625rem] sm:text-[10px] font-bold uppercase tracking-wider gradient-neon text-primary-foreground">
          {selected.badge}
        </span>
      )}

      {/* Contenedor de imagen responsivo */}
      <div className="relative flex items-center justify-center h-24 sm:h-32 md:h-40 p-3 sm:p-4 md:p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-transparent" />
        <img
          src={selected.image}
          alt={selected.name}
          className="w-full h-auto object-contain will-change-transform"
          style={{
            maxHeight: 'clamp(5rem, 12vw, 9rem)',
            maxWidth: '100%',
            transform: `scale(${scale})`,
          }}
          loading="lazy"
        />
      </div>

      {/* Contenedor de información responsivo */}
      <div className="px-3 sm:px-4 md:px-5 pb-3 sm:pb-4 md:pb-5 flex flex-col flex-1 text-center">
        <h3 className="font-display font-bold text-sm sm:text-base md:text-lg text-foreground mb-0.5 line-clamp-2">
          {hasVariants ? selected.group_name : selected.name}
        </h3>
        <p className="text-[0.625rem] sm:text-xs uppercase tracking-widest text-[hsl(var(--foreground)/0.6)] mb-2 sm:mb-4">
          Premium Mensual
        </p>

        {/* Select de variantes responsivo */}
        {hasVariants ? (
          <div className="relative mb-2 sm:mb-4">
            <select
              value={selected.id}
              onChange={handleVariantChange}
              className="w-full appearance-none rounded-xl sm:rounded-2xl border border-primary/20 bg-primary/10 px-2.5 sm:px-3 py-1.5 sm:py-2 pr-7 sm:pr-8 text-[0.6875rem] sm:text-sm font-medium text-white outline-none transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              {variants!.map(v => (
                <option key={v.id} value={v.id} className="bg-[#040617] text-white">
                  {v.plan_type || v.name} — {formatPrice(v.price)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 sm:right-3 top-1/2 h-3.5 sm:h-4 w-3.5 sm:w-4 -translate-y-1/2 text-slate-400" />
          </div>
        ) : (
          selected.plan_type && (
            <p className="text-[0.625rem] sm:text-xs text-[hsl(var(--foreground)/0.6)] mb-2 sm:mb-4">{selected.plan_type}</p>
          )
        )}

        {/* Descripción responsiva */}
        <p className="text-[0.6875rem] sm:text-sm md:text-sm text-[hsl(var(--foreground)/0.55)] mb-2 sm:mb-4 line-clamp-2 flex-1">
          {selected.description}
        </p>

        {/* Precio responsivo */}
        <div className="font-display font-bold text-2xl sm:text-2.5xl md:text-3xl mb-2 sm:mb-4 neon-text">
          <span
            style={{
              textShadow: '0 0 15px hsl(var(--primary)/0.8)',
              color: 'hsl(var(--primary))',
            }}
          >
            {priceText}
          </span>
        </div>

        {/* Botón responsivo */}
        <button
          onClick={handleAdd}
          className="w-full flex h-8 sm:h-9 md:h-10 items-center justify-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-primary/20 bg-primary/10 text-[0.625rem] sm:text-xs font-semibold text-primary transition-all duration-300 will-change-transform hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_16px_hsl(var(--primary)/0.4)] active:scale-95"
        >
          <ShoppingCart className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span className="hidden sm:inline">Añadir al Carrito</span>
          <span className="sm:hidden">Añadir</span>
        </button>
      </div>
    </motion.div>
  );
};

export default ProductCard;
