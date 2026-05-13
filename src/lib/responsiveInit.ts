/**
 * Inicializador de Responsive - Carga con PRIORIDAD antes de React
 * 
 * Este archivo se ejecuta ANTES de que React monte la aplicación,
 * estableciendo el estado responsive inicial para prevenir glitches de animación.
 */

const MOBILE_MAX_WIDTH = 768;
const TABLET_MAX_WIDTH = 1024;

const initResponsiveState = (): void => {
  if (typeof window === 'undefined') return;

  const viewportWidth = window.innerWidth;
  const isMobile = viewportWidth <= MOBILE_MAX_WIDTH;
  const isTablet = viewportWidth > MOBILE_MAX_WIDTH && viewportWidth <= TABLET_MAX_WIDTH;
  const isDesktop = viewportWidth > TABLET_MAX_WIDTH;

  // Almacenar estado inicial de forma global para acceso sincrónico
  (window as any).__RESPONSIVE_STATE__ = {
    viewportWidth,
    isMobile,
    isTablet,
    isDesktop,
    timestamp: Date.now(),
  };

  // Agregar clases al body para control de CSS inmediato
  if (isMobile) {
    document.documentElement.dataset.responsive = 'mobile';
    document.documentElement.classList.add('responsive-mobile');
  } else if (isTablet) {
    document.documentElement.dataset.responsive = 'tablet';
    document.documentElement.classList.add('responsive-tablet');
  } else {
    document.documentElement.dataset.responsive = 'desktop';
    document.documentElement.classList.add('responsive-desktop');
  }

  // Marcar que se inicializó el responsive
  (window as any).__RESPONSIVE_INIT_DONE__ = true;
};

// Ejecutar inmediatamente cuando este archivo carga
initResponsiveState();

// Actualizar listeners en tiempo real para mantener sincronizado
const setupResponsiveListeners = (): void => {
  const updateResponsiveState = (): void => {
    if (typeof window === 'undefined') return;

    const viewportWidth = window.innerWidth;
    const isMobile = viewportWidth <= MOBILE_MAX_WIDTH;
    const isTablet = viewportWidth > MOBILE_MAX_WIDTH && viewportWidth <= TABLET_MAX_WIDTH;

    // Actualizar estado global
    (window as any).__RESPONSIVE_STATE__ = {
      viewportWidth,
      isMobile,
      isTablet,
      isDesktop: !isMobile && !isTablet,
      timestamp: Date.now(),
    };

    // Actualizar clases en HTML element
    document.documentElement.classList.remove('responsive-mobile', 'responsive-tablet', 'responsive-desktop');
    if (isMobile) {
      document.documentElement.dataset.responsive = 'mobile';
      document.documentElement.classList.add('responsive-mobile');
    } else if (isTablet) {
      document.documentElement.dataset.responsive = 'tablet';
      document.documentElement.classList.add('responsive-tablet');
    } else {
      document.documentElement.dataset.responsive = 'desktop';
      document.documentElement.classList.add('responsive-desktop');
    }
  };

  window.addEventListener('resize', updateResponsiveState, { passive: true });
  window.addEventListener('orientationchange', updateResponsiveState, { passive: true });
};

// Configurar listeners cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupResponsiveListeners);
} else {
  setupResponsiveListeners();
}
