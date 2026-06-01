import { useResponsive } from './useResponsive';

/**
 * Animaciones optimizadas para 60 FPS
 * Utiliza transform + opacity en lugar de propiedades pesadas
 * Proporciona variantes preconstruidas para casos de uso comunes
 */

export const ANIMATION_VARIANTS = {
  /* Entrada suave */
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 },
  },

  /* Deslizamiento desde arriba */
  slideDown: {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  /* Deslizamiento desde abajo */
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 20 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  /* Deslizamiento izquierda a derecha */
  slideRight: {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },

  /* Escalado suave con fade */
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.25, ease: 'easeOut' },
  },

  /* Escalado al hover */
  scaleHover: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.2, type: 'spring', stiffness: 300 },
  },

  /* Rotación de carga */
  spin: {
    animate: { rotate: 360 },
    transition: { duration: 2, repeat: Infinity, ease: 'linear' },
  },

  /* Flotación */
  float: {
    animate: { y: [-10, 10, -10] },
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },

  /* Brillo (pulse) */
  pulse: {
    animate: { opacity: [1, 0.5, 1] },
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },

  /* Parpadeo suave */
  shimmer: {
    initial: { backgroundPosition: '0% 0%' },
    animate: { backgroundPosition: '100% 0%' },
    transition: { duration: 2, repeat: Infinity, ease: 'linear' },
  },

  /* Lista stagger */
  container: {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  },

  item: {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  },
};

/**
 * Hook para obtener configuración segura de animaciones basada en dispositivo
 */
export function useOptimizedMotion() {
  const { shouldAnimateOnDevice, isMobile } = useResponsive();

  /**
   * Retorna la variante de animación segura
   * Si el dispositivo no soporta animaciones, retorna null
   */
  const getSafeVariant = (variant: typeof ANIMATION_VARIANTS[keyof typeof ANIMATION_VARIANTS]) => {
    if (!shouldAnimateOnDevice) {
      return null;
    }
    return variant;
  };

  /**
   * Retorna animaciones staggered optimizadas para listas
   */
  const getStaggerConfig = (itemCount: number, baseDelay = 0.05) => {
    if (!shouldAnimateOnDevice) {
      return { staggerChildren: 0, delayChildren: 0 };
    }

    return {
      staggerChildren: baseDelay,
      delayChildren: 0,
      ease: 'easeOut',
    };
  };

  /**
   * Retorna configuración de transición suave
   */
  const getSmoothTransition = (duration = 0.3, delay = 0) => {
    if (!shouldAnimateOnDevice) {
      return { duration: 0, delay: 0 };
    }

    return {
      duration,
      delay,
      ease: [0.25, 0.46, 0.45, 0.94], // cubic-bezier estándar
    };
  };

  /**
   * Retorna propiedades para hover y tap optimizadas
   */
  const getInteractionProps = () => {
    if (!shouldAnimateOnDevice) {
      return {
        whileHover: {},
        whileTap: {},
        transition: {},
      };
    }

    return {
      whileHover: { scale: 1.02, transition: { duration: 0.2 } },
      whileTap: { scale: 0.98, transition: { duration: 0.1 } },
      transition: { type: 'spring', stiffness: 300, damping: 30 },
    };
  };

  /**
   * Retorna propiedades para tarjetas de producto optimizadas
   */
  const getCardAnimation = (index: number) => {
    if (!shouldAnimateOnDevice) {
      return {
        initial: false as const,
        animate: undefined,
        exit: undefined,
        transition: { duration: 0 },
      };
    }

    return {
      initial: { opacity: 0, y: 30, scale: 0.95 },
      animate: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          duration: 0.35,
          delay: index * 0.05,
          ease: 'easeOut',
        },
      },
      exit: { opacity: 0, scale: 0.9 },
      whileHover: {
        scale: 1.03,
        y: -5,
        transition: { duration: 0.2, type: 'spring', stiffness: 400 },
      },
      whileTap: {
        scale: 0.97,
      },
    };
  };

  /**
   * Retorna propiedades para animaciones de scroll
   */
  const getScrollAnimation = () => {
    if (!shouldAnimateOnDevice) {
      return {
        initial: false,
        whileInView: false,
      };
    }

    return {
      initial: { opacity: 0, y: 40 },
      whileInView: { opacity: 1, y: 0 },
      viewport: { once: true, margin: '0px 0px -100px 0px' },
      transition: { duration: 0.5, ease: 'easeOut' },
    };
  };

  return {
    shouldAnimateOnDevice,
    isMobile,
    getSafeVariant,
    getStaggerConfig,
    getSmoothTransition,
    getInteractionProps,
    getCardAnimation,
    getScrollAnimation,
    ANIMATION_VARIANTS,
  };
}

/**
 * Hook para control de will-change en animaciones
 * Mejora rendimiento indicando al navegador propiedades que van a cambiar
 */
export function useWillChange(shouldAnimate: boolean) {
  const willChangeProps = {
    style: {
      willChange: shouldAnimate ? 'transform, opacity' : 'auto',
      contain: shouldAnimate ? 'paint' : 'auto',
    } as React.CSSProperties,
  };

  return willChangeProps;
}

/**
 * Configuraciones predefinidas para elementos comunes
 */
export const MOTION_PRESETS = {
  /* Tarjeta de producto */
  productCard: {
    containerVariants: {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: 0.1,
        },
      },
    },
    itemVariants: {
      hidden: { opacity: 0, y: 30, scale: 0.9 },
      show: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
          type: 'spring',
          stiffness: 100,
          damping: 15,
        },
      },
    },
  },

  /* Modal o dialog */
  modal: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0.2 },
    },
    content: {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 20 },
      transition: { duration: 0.3, type: 'spring', stiffness: 300 },
    },
  },

  /* Menú desplegable */
  dropdown: {
    initial: { opacity: 0, y: -10, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.95 },
    transition: { duration: 0.15, type: 'spring', stiffness: 500 },
  },

  /* Notificación/Toast */
  toast: {
    initial: { opacity: 0, x: 400, scale: 0.8 },
    animate: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: 400, scale: 0.8 },
    transition: { duration: 0.3, ease: 'easeOut' },
  },
};
