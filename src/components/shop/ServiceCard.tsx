import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { Service } from '@/hooks/useServices';
import { useCart } from '@/hooks/useCart';
import { useResponsive } from '@/hooks/useResponsive';
import { toast } from 'sonner';

interface ServiceCardProps {
  service: Service;
  index: number;
}

const ServiceCard = ({ service, index }: ServiceCardProps) => {
  const { addItem } = useCart();

  const handleAdd = () => {
    const isGamingRecharge = service.category === 'gaming' && service.category !== 'streaming';
    
    addItem({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
      category: service.category as 'streaming' | 'gaming',
      image: service.image_url,
      badge: service.badge || undefined,
      duration_days: isGamingRecharge ? undefined : 30,
      cart_key: `${service.id}-${isGamingRecharge ? 'gaming' : 30}`,
      product_type: isGamingRecharge ? 'gaming_recharge' : 'subscription',
    });
    toast.success(`${service.name} añadido al carrito`);
  };

  const { shouldAnimateOnDevice } = useResponsive();

  return (
    <motion.div
      initial={shouldAnimateOnDevice ? { opacity: 0, y: 30 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldAnimateOnDevice ? { duration: 0.4, delay: index * 0.08 } : { duration: 0 }}
      layout={false}
      className="group relative rounded-2xl overflow-hidden flex flex-col min-w-0 w-full"
      style={{
        background: 'linear-gradient(180deg, hsl(215 25% 12%) 0%, hsl(220 20% 8%) 100%)',
        border: '1px solid hsla(210, 100%, 55%, 0.1)',
      }}
    >
      {service.badge && (
        <span className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider gradient-neon text-primary-foreground">
          {service.badge}
        </span>
      )}

      {/* Logo area */}
      <div className="relative flex items-center justify-center h-40 p-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-transparent" />
        <img
          src={service.image_url}
          alt={`Logo de ${service.name} - ${service.plan_type} disponible en Vortex Streaming`}
          className="w-full h-auto max-h-24 object-contain"
          style={{ maxWidth: '100%' }}
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="px-5 pb-5 flex flex-col flex-1 text-center">
        <h3 className="font-display font-bold text-base mb-0.5" itemProp="name">{service.name}</h3>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
          {service.plan_type}
        </p>

        <p className="text-xs text-muted-foreground mb-4 line-clamp-2 flex-1">
          {service.description}
        </p>

        <div className="font-display font-bold text-3xl mb-4 neon-text">
          ${service.price.toFixed(2)}
        </div>

        <button
          onClick={handleAdd}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-colors duration-300 border border-[hsla(210,100%,55%,0.2)] bg-[hsla(210,100%,55%,0.1)] text-[hsl(210,100%,65%)] hover:bg-[hsl(210,100%,55%)] hover:text-[hsl(220,20%,4%)]"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Añadir al Carrito
        </button>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
