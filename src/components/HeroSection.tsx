import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative pt-24 pb-12 overflow-hidden">
      {/* Dot grid background */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'radial-gradient(hsl(210 100% 55%) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      {/* Ambient glow */}
      <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-40 right-1/3 w-72 h-72 rounded-full bg-primary/3 blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl"
        >
          <h1 className="font-display font-bold text-4xl md:text-5xl lg:text-6xl leading-tight mb-4">
            Tu centro de
            <br />
            <span className="neon-text">entretenimiento digital</span>
          </h1>

          <p className="text-muted-foreground max-w-md text-sm md:text-base mb-8">
            Suscripciones de streaming, recargas de juegos y más.
            Entrega inmediata y precios competitivos.
          </p>

          <a
            href="#catalogo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-neon text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            <Zap className="w-4 h-4" />
            Ver Tienda
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
