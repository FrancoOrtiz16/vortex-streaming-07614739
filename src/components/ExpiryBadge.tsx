import { cn } from '@/lib/utils';

interface ExpiryBadgeProps {
  nextRenewal: string;
  className?: string;
}

export function ExpiryBadge({ nextRenewal, className }: ExpiryBadgeProps) {
  const now = new Date();
  const expiry = new Date(nextRenewal);
  const diffMs = expiry.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  let color: string;
  let label: string;

  if (daysLeft <= 0) {
    color = 'bg-destructive/20 text-destructive';
    label = 'Vencido';
  } else if (daysLeft <= 2) {
    color = 'bg-destructive/20 text-destructive';
    label = `Faltan ${daysLeft} día${daysLeft > 1 ? 's' : ''}`;
  } else if (daysLeft <= 7) {
    color = 'bg-amber-500/20 text-amber-400';
    label = `Faltan ${daysLeft} días`;
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
