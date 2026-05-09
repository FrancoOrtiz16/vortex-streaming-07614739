import { cn } from '@/lib/utils';
import { getDaysUntilExpiry } from '@/lib/trafficLightUtils';

interface ExpiryBadgeProps {
  nextRenewal: string | null | undefined;
  className?: string;
}

export function ExpiryBadge({ nextRenewal, className }: ExpiryBadgeProps) {
  // ⚠️ Si no hay fecha de vencimiento, está pendiente de aprobación
  if (!nextRenewal) {
    return (
      <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-500/20 text-slate-300', className)}>
        Esperando Aprobación
      </span>
    );
  }

  const daysLeft = getDaysUntilExpiry(nextRenewal);

  let color: string;
  let label: string;

  if (daysLeft < 0) {
    color = 'bg-destructive/20 text-destructive';
    label = 'Vencido';
  } else if (daysLeft === 0) {
    color = 'bg-destructive/20 text-destructive';
    label = 'Vence hoy';
  } else if (daysLeft <= 3) {
    color = 'bg-amber-500/20 text-amber-400';
    label = `Faltan ${daysLeft} día${daysLeft > 1 ? 's' : ''}`;
  } else {
    color = 'bg-emerald-500/20 text-emerald-400';
    label = `Faltan ${daysLeft} días`;
  }

  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider', color, className)}>
      {label}
    </span>
  );
}
