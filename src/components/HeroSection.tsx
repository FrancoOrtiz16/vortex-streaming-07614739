import { motion } from 'framer-motion';
import { Sparkles, Zap } from 'lucide-react';

const HeroSection = () => {
  return (
    <section className="relative pt-24 pb-16 overflow-hidden">
      {/* Ambient glow effects */}
      <div className="absolute top-20 left-1/4 w-96 h-96 rounded-full bg-neon/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-40 right-1/4 w-72 h-72 rounded-full bg-gold/5 blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-muted-foreground mb-6">
            <Sparkles className="w-3.5 h-3.5 text-gold" />
            Tu centro de entretenimiento digital
          </div>

          <h1 className="font-display font-bold text-4xl md:text-6xl lg:text-7xl leading-tight mb-4">
            Streaming & Gaming
            <br />
            <span className="neon-text">al instante</span>
          </h1>

          <p className="text-muted-foreground max-w-lg mx-auto text-sm md:text-base mb-8">
            Suscripciones de streaming, recargas de juegos y tarjetas de regalo.
            Entrega inmediata, precios competitivos.
          </p>

          <div className="flex items-center justify-center gap-4">
            <a
              href="#catalogo"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl gradient-neon text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
            >
              <Zap className="w-4 h-4" />
              Explorar Catálogo
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
