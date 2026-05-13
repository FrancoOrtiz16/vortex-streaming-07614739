import { useEffect, useState } from 'react';

export const MOBILE_MAX_WIDTH = 768;
export const TABLET_MAX_WIDTH = 1024;

export type ResponsiveState = {
  viewportWidth: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
};

const getResponsiveState = (): ResponsiveState => {
  if (typeof window === 'undefined') {
    return {
      viewportWidth: 0,
      isMobile: false,
      isTablet: false,
      isDesktop: true,
    };
  }

  const viewportWidth = window.innerWidth;
  const isMobile = viewportWidth <= MOBILE_MAX_WIDTH;
  const isTablet = viewportWidth > MOBILE_MAX_WIDTH && viewportWidth <= TABLET_MAX_WIDTH;
  const isDesktop = viewportWidth > TABLET_MAX_WIDTH;

  return {
    viewportWidth,
    isMobile,
    isTablet,
    isDesktop,
  };
};

/**
 * useResponsive
 *
 * Hook para centralizar la lógica de responsive en la aplicación.
 *
 * Cómo funciona:
 * - Define puntos de quiebre estándar para mobile, tablet y desktop.
 * - Usa window.innerWidth y matchMedia para calcular el estado actual.
 * - Actualiza el estado automáticamente cuando cambia el tamaño de la ventana.
 *
 * Uso recomendado:
 * ```ts
 * import { useResponsive } from '@/hooks/useResponsive';
 *
 * const { isMobile, isTablet, isDesktop } = useResponsive();
 *
 * return (
 *   <div className={isMobile ? 'p-4' : 'p-8'}>
 *     {isMobile ? 'Mobile view' : 'Desktop view'}
 *   </div>
 * );
 * ```
 *
 * Este archivo es el único lugar donde se define la lógica de responsive.
 * No se deben agregar ajustes responsive en otros componentes.
 */
export function useResponsive(): ResponsiveState {
  const [responsiveState, setResponsiveState] = useState<ResponsiveState>(() => getResponsiveState());

  useEffect(() => {
    const handleResize = () => {
      setResponsiveState(getResponsiveState());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return responsiveState;
}
