import { useEffect, useState } from 'react';
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
    title: 'Bienvenido a tu panel',
    description:
      'Aquí verás tus pedidos recientes, tus servicios activos y tendrás acceso rápido a tu perfil.',
  },
  {
    title: 'Navega el catálogo',
    description:
      'Haz clic en Catálogo para ver todos los servicios disponibles y añadirlos a tu carrito.',
  },
  {
    title: 'Gestiona tu cuenta',
    description:
      'En Perfil puedes actualizar WhatsApp, revisar tu información y cambiar tus datos cuando quieras.',
  },
];

interface WelcomeTutorialProps {
  userId?: string | null;
}

export default function WelcomeTutorial({ userId }: WelcomeTutorialProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const storageKey = userId ? `${BASE_STORAGE_KEY}_${userId}` : BASE_STORAGE_KEY;

  useEffect(() => {
    if (!userId) return;
    if (typeof window === 'undefined') return;

    const tutorialSeen = window.localStorage.getItem(storageKey);
    if (tutorialSeen) {
      return;
    }

    setOpen(true);
  }, [storageKey, userId]);

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

  const currentStep = TUTORIAL_STEPS[step - 1];

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) completeTutorial(); setOpen(nextOpen); }}>
      <DialogContent className="glass border border-border max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">¡Bienvenido!</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {step === 0
              ? '¿Quieres ver un breve tutorial para usar la página sin inconvenientes?'
              : `Paso ${step} de ${TUTORIAL_STEPS.length}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pb-2 text-sm text-slate-200">
          {step === 0 ? (
            <div>
              <p className="mb-3">
                Este recorrido te ayudará a entender dónde ver tus pedidos, cómo acceder a tus servicios y cómo usar el catálogo.
              </p>
              <p>
                Si prefieres volver más tarde, puedes omitirlo ahora y no se volverá a mostrar para tu cuenta.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-white">{currentStep.title}</h3>
              <p className="text-sm text-muted-foreground">{currentStep.description}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          {step === 0 ? (
            <>
              <Button variant="outline" onClick={completeTutorial}>Omitir</Button>
              <Button onClick={handleStart}>Realizar tutorial</Button>
            </>
          ) : (
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:items-center w-full">
              <Button variant="outline" onClick={completeTutorial}>Omitir</Button>
              <div className="flex items-center gap-2 ml-auto">
                {step > 1 && (
                  <Button variant="secondary" onClick={handleBack}>Anterior</Button>
                )}
                <Button onClick={handleNext}>
                  {step === TUTORIAL_STEPS.length ? 'Finalizar' : 'Siguiente'}
                </Button>
              </div>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
