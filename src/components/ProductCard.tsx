import { useState, type ChangeEvent } from 'react';
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

const ProductCard = ({ product, variants, index }: ProductCardProps) => {
  const { addItem } = useCart();
  const [selected, setSelected] = useState<Product>(product);
  const hasVariants = !!variants && variants.length > 1;

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

  const EXCHANGE_RATE = 700;
  const rawPrice = selected.price;
  const priceText = formatPrice(rawPrice);
  const scale = (selected.image_scale ?? 100) / 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      whileHover={{ y: -2 }}
      className="w-full flex flex-col overflow-hidden rounded-2xl bg-black p-3 shadow-[0_20px_60px_rgba(0,0,0,0.45)] transition-all duration-300"
    >
      <div className="relative mb-4 overflow-hidden rounded-2xl border border-white/10 bg-black">
        <img
          src={selected.image}
          alt={selected.name}
          className="h-44 w-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ transform: `scale(${scale})` }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        {selected.badge && (
          <span className="absolute right-3 top-3 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/85">
            {selected.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <h3 className="mb-1 text-lg font-bold text-white">{hasVariants ? selected.group_name : selected.name}</h3>
        <p className="mb-3 text-xs font-medium text-slate-400">Premium Mensual</p>

        {hasVariants ? (
          <div className="relative mb-3">
            <select
              value={selected.id}
              onChange={handleVariantChange}
              className="w-full appearance-none rounded-2xl border border-white/10 bg-white/5 px-3 py-2 pr-8 text-sm font-medium text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {variants!.map(v => (
                <option key={v.id} value={v.id} className="bg-black text-white">
                  {v.plan_type || v.name} — {formatPrice(v.price)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        ) : (
          selected.plan_type && (
            <p className="mb-3 text-xs text-slate-400">{selected.plan_type}</p>
          )
        )}

        <p className="mb-4 flex-1 text-sm leading-5 text-slate-300">{selected.description}</p>

        <div className="mt-auto">
          <span
            title="Tasa de cambio 700"
            style={{
              textShadow: '0 0 10px #3b82f6',
              color: '#3b82f6',
              fontSize: '1.25rem',
              fontWeight: '800',
            }}
          >
            {priceText}
          </span>
          <button
            onClick={handleAdd}
            className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 text-sm font-semibold text-white transition-all hover:bg-blue-500"
          >
            <ShoppingCart className="h-4 w-4" />
            Añadir al Carrito
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
