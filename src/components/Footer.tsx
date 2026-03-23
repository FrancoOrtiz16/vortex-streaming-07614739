import { Tv } from 'lucide-react';

const Footer = () => (
  <footer className="border-t border-border py-8 mt-12">
    <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-md gradient-neon flex items-center justify-center">
          <Tv className="w-3 h-3 text-primary-foreground" />
        </div>
        <span className="font-display font-semibold text-sm">
          <span className="neon-text">Vortex</span> <span className="gold-text">Streaming</span>
        </span>
      </div>
      <p>© 2026 Vortex Streaming. Todos los derechos reservados.</p>
    </div>
  </footer>
);

export default Footer;
