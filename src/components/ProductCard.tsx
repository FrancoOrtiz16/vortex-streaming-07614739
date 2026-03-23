import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { Product } from '@/data/products';
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  index: number;
}

const ProductCard = ({ product, index }: ProductCardProps) => {
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem(product);
    toast.success(`${product.name} añadido al carrito`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ scale: 1.03, y: -4 }}
      className="glass-hover rounded-xl overflow-hidden group cursor-pointer flex flex-col"
    >
      <div className="relative overflow-hidden aspect-[4/3]">
        <img
          src={product.image}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        {product.badge && (
          <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider gradient-neon text-primary-foreground">
            {product.badge}
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-display font-semibold text-base mb-1">{product.name}</h3>
        <p className="text-xs text-muted-foreground mb-3 flex-1 line-clamp-2">
          {product.description}
        </p>
        <div className="flex items-center justify-between mt-auto">
          <span className="font-display font-bold text-lg gold-text">
            ${product.price.toFixed(2)}
          </span>
          <button
            onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg gradient-neon text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
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
