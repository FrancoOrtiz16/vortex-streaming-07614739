import { useAuth } from '@/hooks/useAuth';
import BannedScreen from './BannedScreen';
import { motion } from 'framer-motion';
import { ReactNode, useState, useEffect } from 'react';

interface BannedGuardProps {
  children: ReactNode;
}

const BannedGuard = ({ children }: BannedGuardProps) => {
  const { isBanned, loading, user } = useAuth();
  const [timedOut, setTimedOut] = useState(false);

  // Timeout de seguridad: si useAuth tarda más de 10 segundos, forzar renderizado
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.warn('[BannedGuard] ⏰ Timeout de seguridad: useAuth tardó demasiado');
        setTimedOut(true);
      }
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [loading]);

  // NUNCA devolver null - siempre mostrar algo
  if (loading && !timedOut) {
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

  // Si se alcanzó timeout o si ya no está cargando
  if (timedOut || !loading) {
    // Usuario baneado
    if (user && isBanned) {
      return <BannedScreen />;
    }

    // Permitido - renderizar children
    return <>{children}</>;
  }

  // Fallback (nunca debería llegar aquí)
  return <>{children}</>;
};

export default BannedGuard;
