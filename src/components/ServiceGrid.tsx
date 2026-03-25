import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useServices } from '@/hooks/useServices';
import ServiceCard from './ServiceCard';
import { Tv, Gamepad2, LayoutGrid, Loader2 } from 'lucide-react';

const filters = [
  { label: 'Todo', value: 'all', icon: LayoutGrid },
  { label: 'Streaming', value: 'streaming', icon: Tv },
  { label: 'Gaming', value: 'gaming', icon: Gamepad2 },
] as const;

const ServiceGrid = () => {
  const [searchParams] = useSearchParams();
  const catParam = searchParams.get('cat');
  const [category, setCategory] = useState<string>(catParam || 'all');
  const { services, loading } = useServices();

  const filtered = category === 'all'
    ? services
    : services.filter(s => s.category === category);

  return (
    <section id="catalogo" className="py-16">
      <div className="container mx-auto px-4">
        <div className="mb-10">
          <h2 className="font-display font-bold text-3xl md:text-4xl mb-2">
            Servicios <span className="neon-text">Streaming</span>
          </h2>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Cuentas 100% personales con garantía
          </p>
        </div>

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

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((service, i) => (
              <ServiceCard key={service.id} service={service} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ServiceGrid;
