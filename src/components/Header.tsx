import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart, Menu, X, Search } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import UserMenu from '@/components/UserMenu';
import { useAuth } from '@/hooks/useAuth';

const Header = () => {
  const { count } = useCart();
  const { isAdmin } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border" style={{ background: 'hsla(220, 20%, 6%, 0.85)', backdropFilter: 'blur(20px)' }}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display font-bold text-lg tracking-tight italic">
            <span className="text-foreground">VORTEX</span>
            <span className="neon-text"> STREAMING</span>
          </span>
        </Link>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            to="/#catalogo"
            className="px-4 py-2 rounded-lg text-sm font-medium border border-border hover:border-primary/50 transition-colors"
          >
            Ver Tienda
          </Link>
          {isAdmin && (
            <Link
              to="/admin-access"
              className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Admin Principal
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/cart"
            aria-label="Carrito de compras"
            className="relative p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <ShoppingCart className="w-5 h-5" />
            {count > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full gradient-neon text-[10px] font-bold flex items-center justify-center text-primary-foreground"
              >
                {count}
              </motion.span>
            )}
          </Link>
          <UserMenu />
          <button
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-border overflow-hidden"
            style={{ background: 'hsla(220, 20%, 6%, 0.95)' }}
          >
            <nav className="flex flex-col p-4 gap-2">
              <Link to="/#catalogo" onClick={() => setMenuOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                Ver Tienda
              </Link>
              {isAdmin && (
                <Link to="/admin-access" onClick={() => setMenuOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
                  Admin Principal
                </Link>
              )}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};

export default Header;
