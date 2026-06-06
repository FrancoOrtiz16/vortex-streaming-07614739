import { Link } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { motion } from 'framer-motion';
import UserMenu from '@/components/UserMenu';
import { useResponsive } from '@/hooks/useResponsive';

const Header = () => {
  const { count } = useCart();
  const { shouldAnimateOnDevice } = useResponsive();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border" style={{ background: 'hsla(220, 20%, 6%, 0.85)', backdropFilter: 'blur(20px)' }}>
      <div className="container mx-auto px-2 sm:px-3 md:px-4 h-14 sm:h-16 flex items-center justify-between">
        {/* Logo responsivo */}
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <span className="font-display font-bold text-sm sm:text-base md:text-lg tracking-tight italic will-change-transform">
            <span className="text-foreground">VORTEX</span>
            <span className="neon-text"> STREAMING</span>
          </span>
        </Link>

        {/* Right actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/cart"
            aria-label="Carrito de compras"
            className="relative p-1.5 sm:p-2 rounded-lg hover:bg-secondary transition-colors will-change-transform active:scale-95"
          >
            <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
            {count > 0 && (
              <motion.span
                initial={shouldAnimateOnDevice ? { scale: 0 } : false}
                animate={shouldAnimateOnDevice ? { scale: 1 } : false}
                transition={shouldAnimateOnDevice ? { duration: 0.2, type: 'spring', stiffness: 300 } : { duration: 0 }}
                className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full gradient-neon text-[0.5rem] sm:text-[10px] font-bold flex items-center justify-center text-primary-foreground"
              >
                {count > 99 ? '99+' : count}
              </motion.span>
            )}
          </Link>
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default Header;
