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

  const scale = (selected.image_scale ?? 100) / 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#111] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-all duration-300 hover:-translate-y-1"
    >
      <div className="relative mb-6 overflow-hidden rounded-[28px] border border-white/5 bg-[#111] shadow-inner">
        <img
          src={selected.image}
          alt={selected.name}
          className="h-[240px] w-full object-cover transition-transform duration-500 group-hover:scale-105"
          style={{ transform: `scale(${scale})` }}
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
        {selected.badge && (
          <span className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-white/80">
            {selected.badge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col">
        <h3 className="mb-2 text-2xl font-bold text-white">{hasVariants ? selected.group_name : selected.name}</h3>
        <p className="mb-4 text-sm font-semibold text-slate-400">Premium Mensual</p>

        {hasVariants ? (
          <div className="relative mb-4">
            <select
              value={selected.id}
              onChange={handleVariantChange}
              className="w-full appearance-none rounded-2xl border border-white/10 bg-[#0f172a] px-4 py-3 pr-10 text-sm font-medium text-white outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              {variants!.map(v => (
                <option key={v.id} value={v.id} className="bg-[#0f172a] text-white">
                  {v.plan_type || v.name} — {formatPrice(v.price)}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        ) : (
          selected.plan_type && (
            <p className="mb-4 text-sm text-slate-400">{selected.plan_type}</p>
          )
        )}

        <p className="mb-6 flex-1 text-sm leading-6 text-slate-300">{selected.description}</p>

        <div className="mt-auto">
          <span
            className="font-display mb-4 block text-3xl font-extrabold"
            style={{
              color: '#3b82f6',
              fontWeight: 800,
              fontSize: '1.75rem',
              textShadow: '0 0 10px rgba(59, 130, 246, 0.9)',
            }}
          >
            {formatPrice(selected.price)}
          </span>

          <button
            onClick={handleAdd}
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_24px_rgba(59,130,246,0.35)]"
          >
            <ShoppingCart className="h-5 w-5" />
            Añadir al Carrito
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
