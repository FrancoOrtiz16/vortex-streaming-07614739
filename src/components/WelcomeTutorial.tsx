import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const BASE_STORAGE_KEY = 'vortex_welcome_tutorial_seen_v1';

const TUTORIAL_STEPS = [
  {
    title: 'Este es tu panel',
    description:
      'Aquí verás el nombre de tu panel y el acceso rápido para revisar tu cuenta y tus servicios.',
    selector: '#tutorial-dashboard-menu',
    actionLabel: 'Resaltar menú',
    placement: 'bottom',
  },
  {
    title: 'Tu perfil y WhatsApp',
    description:
      'Aquí puedes ir a tu perfil para actualizar tu WhatsApp y tus datos personales en cualquier momento.',
    selector: '#tutorial-dashboard-profile',
    actionLabel: 'Ir al perfil',
    placement: 'right',
  },
  {
    title: 'Historial de pedidos',
    description:
      'En esta sección aparecen tus pedidos recientes y el estado de cada uno.',
    selector: '#tutorial-dashboard-orders',
    actionLabel: 'Ver pedidos',
    placement: 'top',
  },
  {
    title: 'Servicios activos',
    description:
      'Aquí puedes revisar tus suscripciones activas, renovar servicios y abrir sus credenciales.',
    selector: '#tutorial-dashboard-subs',
    actionLabel: 'Ver servicios',
    placement: 'top',
  },
];

interface WelcomeTutorialProps {
  userId?: string | null;
}

export default function WelcomeTutorial({ userId }: WelcomeTutorialProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [bubbleStyles, setBubbleStyles] = useState<{ top: number; left: number; width: number; maxWidth: number }>({
    top: 0,
    left: 0,
    width: 360,
    maxWidth: 360,
  });
  const [isMobile, setIsMobile] = useState(false);

  const storageKey = userId ? `${BASE_STORAGE_KEY}_${userId}` : BASE_STORAGE_KEY;

  const currentStep = useMemo(() => TUTORIAL_STEPS[step - 1] ?? null, [step]);

  // Detectar dispositivo mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!userId || typeof window === 'undefined') return;

    const tutorialSeen = window.localStorage.getItem(storageKey);
    if (tutorialSeen) {
      return;
    }

    setOpen(true);
  }, [storageKey, userId]);

  useEffect(() => {
    if (!open || step === 0 || !currentStep || typeof window === 'undefined') {
      setHighlightRect(null);
      return;
    }

    const updateHighlight = () => {
      const element = document.querySelector(currentStep.selector);
      if (!element) {
        setHighlightRect(null);
        return;
      }

      const rect = element.getBoundingClientRect();
      setHighlightRect(rect);

      // Valores responsivos basados en tamaño de pantalla
      const margin = isMobile ? 12 : 18;
      const maxDialogWidth = Math.min(360, window.innerWidth - margin * 2);
      let width = maxDialogWidth;
      
      let left = rect.left;
      let top = rect.bottom + margin;

      // Ajustar posición del diálogo según placement
      if (currentStep.placement === 'right' && !isMobile) {
        left = rect.right + margin;
        top = rect.top;
      } else if (currentStep.placement === 'top') {
        left = rect.left;
        top = Math.max(margin, rect.top - 240 - margin);
      } else {
        // Bottom placement por defecto
        left = rect.left;
        top = rect.bottom + margin;
      }

      // Asegurar que el diálogo no se salga de pantalla horizontalmente
      if (left + width > window.innerWidth - margin) {
        left = Math.max(margin, window.innerWidth - width - margin);
      }
      if (left < margin) {
        left = margin;
      }

      // Asegurar que el diálogo no se salga de pantalla verticalmente
      const dialogHeight = isMobile ? 280 : 240;
      if (top + dialogHeight > window.innerHeight - margin) {
        top = Math.max(margin, window.innerHeight - dialogHeight - margin);
      }
      if (top < margin) {
        top = margin;
      }

      setBubbleStyles({ top, left, width, maxWidth: width });
    };

    updateHighlight();
    
    // Actualizar en resize y scroll
    window.addEventListener('resize', updateHighlight);
    window.addEventListener('scroll', updateHighlight, true);
    document.addEventListener('orientationchange', updateHighlight);

    return () => {
      window.removeEventListener('resize', updateHighlight);
      window.removeEventListener('scroll', updateHighlight, true);
      document.removeEventListener('orientationchange', updateHighlight);
    };
  }, [currentStep, open, step, isMobile]);

  const completeTutorial = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, '1');
    }
    setOpen(false);
    setStep(0);
  };

  const handleStart = () => {
    setStep(1);
  };

  const handleNext = () => {
    if (step >= TUTORIAL_STEPS.length) {
      completeTutorial();
      return;
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(Math.max(step - 1, 1));
  };

  const handleAction = () => {
    if (!currentStep || typeof window === 'undefined') return;
    const element = document.querySelector(currentStep.selector);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const contentStyle = step === 0 ? {} : {
    position: 'fixed',
    top: `${bubbleStyles.top}px`,
    left: `${bubbleStyles.left}px`,
    width: `${bubbleStyles.width}px`,
    maxWidth: `${bubbleStyles.maxWidth}px`,
    transform: 'none',
    zIndex: 50,
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) completeTutorial(); setOpen(nextOpen); }}>
      <DialogContent 
        className="glass border border-border w-full mx-4 sm:mx-0" 
        style={contentStyle as React.CSSProperties}
      >
        <DialogHeader>
          <DialogTitle className="font-display text-base sm:text-lg">{step === 0 ? '¡Bienvenido!' : currentStep?.title}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            {step === 0
              ? 'Sigue este recorrido para conocer el panel con ayudas visuales en cada sección.'
              : `Paso ${step} de ${TUTORIAL_STEPS.length}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 sm:space-y-4 pb-2 text-xs sm:text-sm text-slate-200">
          {step === 0 ? (
            <div>
              <p className="mb-2 sm:mb-3">
                Verás flechas y regiones resaltadas que te explican qué puedes hacer en cada parte del dashboard.
              </p>
              <p>
                Puedes avanzar paso a paso o omitir el tutorial en cualquier momento.
              </p>
            </div>
          ) : currentStep ? (
            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground">{currentStep.description}</p>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                <Button variant="secondary" onClick={handleAction} className="text-xs sm:text-sm h-8 sm:h-9">{currentStep.actionLabel}</Button>
                <span className="text-xs text-muted-foreground self-center line-clamp-2">El área se resaltará en pantalla.</span>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">No se encontró la sección del tutorial en esta vista.</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end sm:items-center">
          {step === 0 ? (
            <>
              <Button variant="outline" onClick={completeTutorial} className="text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto">Omitir</Button>
              <Button onClick={handleStart} className="text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto">Realizar tutorial</Button>
            </>
          ) : (
            <div className="flex flex-col-reverse sm:flex-row gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={completeTutorial} className="text-xs sm:text-sm h-8 sm:h-9 w-full sm:w-auto">Omitir</Button>
              <div className="flex items-center gap-2 ml-auto w-full sm:w-auto">
                {step > 1 && (
                  <Button variant="secondary" onClick={handleBack} className="text-xs sm:text-sm h-8 sm:h-9 flex-1 sm:flex-none">Anterior</Button>
                )}
                <Button onClick={handleNext} className="text-xs sm:text-sm h-8 sm:h-9 flex-1 sm:flex-none">
                  {step === TUTORIAL_STEPS.length ? 'Finalizar' : 'Siguiente'}
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>

        {highlightRect && (
          <div className="fixed inset-0 pointer-events-none z-40">
            <div
              className="absolute rounded-2xl sm:rounded-3xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
              style={{
                top: Math.max(highlightRect.top - 10, 8),
                left: Math.max(highlightRect.left - 10, 8),
                width: highlightRect.width + 20,
                height: highlightRect.height + 20,
                transition: 'all 0.2s ease',
              }}
            />
            <div
              className="absolute w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/40 border border-primary/70"
              style={{
                top: highlightRect.top + highlightRect.height / 2 - (isMobile ? 24 : 28),
                left: highlightRect.left + highlightRect.width / 2 - (isMobile ? 24 : 28),
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
                  {step === TUTORIAL_STEPS.length ? 'Finalizar' : 'Siguiente'}
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>

        {highlightRect && (
          <div className="fixed inset-0 pointer-events-none">
            <div
              className="absolute rounded-3xl border-2 border-primary/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]"
              style={{
                top: Math.max(highlightRect.top - 10, 8),
                left: Math.max(highlightRect.left - 10, 8),
                width: highlightRect.width + 20,
                height: highlightRect.height + 20,
                transition: 'all 0.2s ease',
              }}
            />
            <div
              className="absolute w-14 h-14 rounded-full bg-primary/40 border border-primary/70"
              style={{
                top: highlightRect.top + highlightRect.height / 2 - 28,
                left: highlightRect.left + highlightRect.width / 2 - 28,
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
