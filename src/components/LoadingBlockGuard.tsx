import { useEffect, useState, ReactNode } from 'react';
import { setupLoadingBlockDetector, executeDeepClean, hasDeepCleanBeenExecuted } from '@/lib/cacheControl';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoadingBlockGuardProps {
  children: ReactNode;
  timeoutMs?: number;
}

/**
 * 🛡️ GUARDIÁN DE BLOQUEO DE CARGA
 * Detecta si la aplicación no carga en 5 segundos y ejecuta Auto-Clear
 * 
 * Funciona así:
 * 1. Si el contenido carga dentro de 5s → todo normal
 * 2. Si pasan 5s sin cargar → ejecuta Deep Clean automático
 * 3. Si falla de nuevo → muestra botón de "Limpieza Profunda y Reintentar"
 */
export default function LoadingBlockGuard({ children, timeoutMs = 5000 }: LoadingBlockGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [blockDetected, setBlockDetected] = useState(false);
  const [showRecoveryUI, setShowRecoveryUI] = useState(false);

  useEffect(() => {
    // Iniciar el detector de bloqueo
    const clearBlockDetector = setupLoadingBlockDetector(timeoutMs, (recovered) => {
      setBlockDetected(true);
      setIsLoading(true);

      // Si la recuperación fue exitosa, recargar después de 2 segundos
      if (recovered) {
        setTimeout(() => {
          console.warn('[LoadingBlockGuard] 🔄 Auto-recargando después de Deep Clean...');
          window.location.reload();
        }, 2000);
      } else {
        // Si falló, mostrar UI de recuperación manual
        setTimeout(() => {
          setShowRecoveryUI(true);
        }, 3000);
      }
    });

    // Marcar que el contenido cargó exitosamente
    const contentLoadedTimer = setTimeout(() => {
      setIsLoading(false);
      clearBlockDetector();
      console.debug('[LoadingBlockGuard] ✅ Contenido cargado - Bloqueo no detectado');
    }, 100);

    return () => {
      clearTimeout(contentLoadedTimer);
      clearBlockDetector();
    };
  }, [timeoutMs]);

  // Si ya se ejecutó Deep Clean y aún seguimos aquí, mostrar botón manual
  useEffect(() => {
    if (hasDeepCleanBeenExecuted()) {
      const timer = setTimeout(() => {
        setShowRecoveryUI(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleManualDeepClean = () => {
    console.warn('[LoadingBlockGuard] 🔧 Usuario presionó: Limpieza Profunda y Reintentar');
    setShowRecoveryUI(false);
    setIsLoading(true);

    // Ejecutar Deep Clean manualmente
    executeDeepClean();

    // Recargar después de 1.5 segundos
    setTimeout(() => {
      console.warn('[LoadingBlockGuard] 🔄 Recargando después de Limpieza Profunda manual...');
      window.location.href = window.location.href + (window.location.search ? '&' : '?') + 'deep-clean=' + Date.now();
    }, 1500);
  };

  // Mostrar UI de recuperación si es necesario
  if (showRecoveryUI && blockDetected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030303] text-white p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass rounded-2xl p-8 border border-amber-500/30 bg-amber-500/5"
        >
          <div className="flex flex-col items-center text-center gap-4">
            {/* Icono de alerta */}
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="p-4 rounded-full bg-amber-500/20 border border-amber-500/30"
            >
              <AlertCircle className="w-8 h-8 text-amber-400" />
            </motion.div>

            {/* Título */}
            <h2 className="font-display font-bold text-xl">Aplicación Lenta</h2>

            {/* Descripción */}
            <p className="text-sm text-slate-300 leading-relaxed">
              La aplicación tardó más de lo esperado en cargar. Hemos ejecutado una limpieza automática, pero si el problema persiste, utiliza el botón de abajo.
            </p>

            {/* Botón de acción */}
            <button
              onClick={handleManualDeepClean}
              disabled={isLoading}
              className="w-full mt-4 py-3 px-4 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <RefreshCw className="w-4 h-4" />
                  </motion.span>
                  Procesando...
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4" />
                  Limpieza Profunda y Reintentar
                </>
              )}
            </button>

            {/* Información adicional */}
            <p className="text-xs text-slate-400 mt-4">
              💡 Esto eliminará datos temporales pero mantendrá tu sesión segura.
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // Renderizar contenido normal si no hay bloqueo
  return <>{children}</>;
}
