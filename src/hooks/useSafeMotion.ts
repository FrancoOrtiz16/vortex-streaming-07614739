import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

export function useSafeMotion() {
  const [safeMotion, setSafeMotion] = useState(false);

  useEffect(() => {
    const getSafeMotion = () => {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      const saveData = connection?.saveData;
      const effectiveType = typeof connection?.effectiveType === 'string' ? connection.effectiveType : '';
      const slowNetwork = /2g|3g|slow-2g/.test(effectiveType);
      const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const isMobile = window.matchMedia?.(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches;
      return saveData || slowNetwork || prefersReducedMotion || isMobile || document.body.classList.contains('reduce-motion');
    };

    const update = () => {
      setSafeMotion(getSafeMotion());
    };

    update();

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobileQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    motionQuery.addEventListener?.('change', update);
    mobileQuery.addEventListener?.('change', update);

    return () => {
      motionQuery.removeEventListener?.('change', update);
      mobileQuery.removeEventListener?.('change', update);
    };
  }, []);

  return safeMotion;
}
