import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { Product } from '@/hooks/useProducts';
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  index: number;
}

const ProductCard = ({ product, index }: ProductCardProps) => {
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem({
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      image: product.image,
      badge: product.badge || undefined,
    });

    toast.success(`${product.name} añadido al carrito`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className="group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card/80 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-[0_16px_40px_hsl(var(--primary)/0.12)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-secondary/40">
        <img
          src={product.image}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        {product.badge && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider gradient-neon text-primary-foreground">
            {product.badge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="mb-1 font-display text-lg font-bold text-foreground">{product.name}</h3>
        {product.plan_type && (
          <p className="mb-2 text-sm font-medium text-foreground/85">{product.plan_type}</p>
        )}
        <p className="mb-4 flex-1 text-sm text-muted-foreground line-clamp-3">
          {product.description}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3">
          <span className="font-display text-lg font-bold text-primary">
            ${product.price.toFixed(2)}
          </span>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-all hover:shadow-[0_0_24px_hsl(var(--primary)/0.35)]"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            Añadir
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
