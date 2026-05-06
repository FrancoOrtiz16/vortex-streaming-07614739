import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, ChevronDown } from 'lucide-react';
import { Service } from '@/hooks/useServices';
import { useCart } from '@/hooks/useCart';
import { toast } from 'sonner';

interface ServiceCardProps {
  service: Service;
  index: number;
}

const durationOptions = [
  { value: 30, label: '1 Mes' },
  { value: 15, label: '15 Días' },
  { value: 7, label: '1 Semana' },
];

const ServiceCard = ({ service, index }: ServiceCardProps) => {
  const { addItem } = useCart();
  const [durationDays, setDurationDays] = useState<number>(30);

  const handleAdd = () => {
    addItem({
      id: service.id,
      name: service.name,
      description: service.description,
      price: service.price,
      category: service.category as 'streaming' | 'gaming',
      image: service.image_url,
      badge: service.badge || undefined,
      duration_days: durationDays,
      cart_key: `${service.id}-${durationDays}`,
    });
    toast.success(`${service.name} añadido al carrito`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -6 }}
      className="group relative rounded-2xl overflow-hidden flex flex-col"
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
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-transparent group-hover:from-primary/5 transition-all duration-500" />
        <img
          src={service.image_url}
          alt={`Logo de ${service.name} - ${service.plan_type} disponible en Vortex Streaming`}
          className="max-h-24 max-w-[80%] object-contain drop-shadow-lg transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div className="px-5 pb-5 flex flex-col flex-1 text-center">
        <h3 className="font-display font-bold text-base mb-0.5" itemProp="name">{service.name}</h3>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4">
          {service.plan_type}
        </p>

        <div className="relative mb-4">
          <label className="sr-only">Duración</label>
          <select
            value={durationDays}
            onChange={(e) => setDurationDays(Number(e.target.value))}
            className="w-full appearance-none rounded-2xl border border-border bg-background px-3 py-2 pr-8 text-sm font-medium text-foreground outline-none transition-all duration-300 focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            {durationOptions.map(option => (
              <option key={option.value} value={option.value} className="bg-background text-foreground">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>

        <p className="text-xs text-muted-foreground mb-4 line-clamp-2 flex-1">
          {service.description}
        </p>

        <div className="font-display font-bold text-3xl mb-4 neon-text">
          ${service.price.toFixed(2)}
        </div>

        <button
          onClick={handleAdd}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-300"
          style={{
            background: 'hsla(210, 100%, 55%, 0.1)',
            border: '1px solid hsla(210, 100%, 55%, 0.2)',
            color: 'hsl(210, 100%, 65%)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'hsl(210, 100%, 55%)';
            e.currentTarget.style.color = 'hsl(220, 20%, 4%)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'hsla(210, 100%, 55%, 0.1)';
            e.currentTarget.style.color = 'hsl(210, 100%, 65%)';
          }}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          Añadir al Carrito
        </button>
      </div>
    </motion.div>
  );
};

export default ServiceCard;
