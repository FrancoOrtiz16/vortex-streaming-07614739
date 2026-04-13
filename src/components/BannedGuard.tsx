import { useAuth } from '@/hooks/useAuth';
import BannedScreen from './BannedScreen';
import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface BannedGuardProps {
  children: ReactNode;
}

const BannedGuard = ({ children }: BannedGuardProps) => {
  const { isBanned, loading, user } = useAuth();

  // NUNCA devolver null - siempre mostrar algo
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          className="w-12 h-12 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Usuario baneado
  if (user && isBanned) {
    return <BannedScreen />;
  }

  // Permitido - renderizar children
  return <>{children}</>;
};

export default BannedGuard;
