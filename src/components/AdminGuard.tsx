import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { motion } from 'framer-motion';
import { Shield, Loader2 } from 'lucide-react';

interface AdminGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * AdminGuard - Protección descentralizada para rutas de administrador
 * 
 * Características:
 * - Valida que el usuario sea admin (role === 'admin')
 * - Muestra loading mientras verifica
 * - Redirige a /auth si no está logueado
 * - Muestra fallback si no es admin
 * - NO interfiere con catálogo público
 */
export const AdminGuard: React.FC<AdminGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { user, loading, isAdmin } = useAuth();

  // Aún cargando estado de auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground animate-pulse">Verificando Credenciales...</p>
        </div>
      </div>
    );
  }

  // No logueado → ir a auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Logueado pero no es admin → mostrar fallback o acceso denegado
  if (!isAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-screen flex items-center justify-center relative"
      >
        <div className="absolute inset-0 backdrop-blur-md bg-background/80" />
        <div className="relative z-10 glass rounded-2xl p-8 max-w-sm w-full mx-4 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display font-bold text-xl mb-2">Acceso Solo Admin</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Esta sección requiere permisos de administrador. Por favor contacta al administrador del sistema.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 rounded-xl gradient-neon text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Volver al Inicio
          </a>
        </div>
      </motion.div>
    );
  }

  // Admin verificado → renderizar children
  return <>{children}</>;
};

export default AdminGuard;
