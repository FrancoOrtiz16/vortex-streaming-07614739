import { useEffect, useState } from 'react';

export const MOBILE_MAX_WIDTH = 768;
export const TABLET_MAX_WIDTH = 1024;

export type ResponsiveState = {
  viewportWidth: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  shouldAnimateOnDevice: boolean;
};

/**
 * Obtiene el estado responsivo de forma segura y sincrónica.
 * Lee primero del estado global inicializado por responsiveInit.ts
 */
const getResponsiveState = (): ResponsiveState => {
  if (typeof window === 'undefined') {
    return {
      viewportWidth: 0,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      shouldAnimateOnDevice: true,
    };
  }

  // Leer estado pre-inicializado (responsiveInit.ts cargó esto primero)
  const globalState = (window as any).__RESPONSIVE_STATE__;
  if (globalState && globalState.timestamp) {
    return {
      ...globalState,
      shouldAnimateOnDevice: globalState.isDesktop || globalState.isTablet,
    };
  }

  // Fallback si responsiveInit no se cargó (nunca debería pasar)
  const viewportWidth = window.innerWidth;
  const isMobile = viewportWidth <= MOBILE_MAX_WIDTH;
  const isTablet = viewportWidth > MOBILE_MAX_WIDTH && viewportWidth <= TABLET_MAX_WIDTH;
  const isDesktop = viewportWidth > TABLET_MAX_WIDTH;

  return {
    viewportWidth,
    isMobile,
    isTablet,
    isDesktop,
    shouldAnimateOnDevice: isDesktop || isTablet,
  };
};

/**
 * useResponsive - Hook para control centralizado de responsive y animaciones
 *
 * Cómo funciona:
 * - Inicialización PRIORITARIA: responsiveInit.ts carga ANTES de React
 * - Estado sincrónico: Acceso inmediato al estado sin delay
 * - Animaciones controladas: shouldAnimateOnDevice controla si animar basado en dispositivo
 * - Actualización en tiempo real: Re-calcula en resize/orientationchange
 *
 * Propiedades:
 * - viewportWidth: Ancho actual del viewport en pixels
 * - isMobile: true si ≤ 768px
 * - isTablet: true si 768px < viewport ≤ 1024px
 * - isDesktop: true si > 1024px
 * - shouldAnimateOnDevice: true si es tablet o desktop (animaciones habilitadas)
 *
 * Uso:
 * ```ts
 * import { useResponsive } from '@/hooks/useResponsive';
 *
 * const { isMobile, shouldAnimateOnDevice } = useResponsive();
 *
 * return (
 *   <motion.div
 *     initial={shouldAnimateOnDevice ? { opacity: 0 } : false}
 *     animate={{ opacity: 1 }}
 *   >
 *     {isMobile ? 'Mobile view' : 'Desktop view'}
 *   </motion.div>
 * );
 * ```
 *
 * Las animaciones siempre están CONTROLADAS:
 * - En mobile: Sin animaciones de entrada (rendimiento)
 * - En tablet/desktop: Animaciones suaves habilitadas
 */
export function useResponsive(): ResponsiveState {
  const [responsiveState, setResponsiveState] = useState<ResponsiveState>(() => getResponsiveState());

  useEffect(() => {
    const handleResize = () => {
      setResponsiveState(getResponsiveState());
    };

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('orientationchange', handleResize, { passive: true });

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return responsiveState;
}
