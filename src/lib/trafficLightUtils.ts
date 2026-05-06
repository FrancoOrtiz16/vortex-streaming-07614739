/**
 * Traffic Light / Semáforo - Sistema de alertas por vencimiento
 * Determina el estado visual según días para vencimiento
 * Usando exclusivamente la zona horaria de Venezuela (UTC-4)
 */

export type TrafficLightStatus = 'green' | 'yellow' | 'red' | 'expired';

export interface TrafficLightConfig {
  greenThreshold: number;    // > X días = verde
  yellowThreshold: number;   // <= X días = amarillo
}

const DEFAULT_CONFIG: TrafficLightConfig = {
  greenThreshold: 4,         // Verde: 4 días o más
  yellowThreshold: 3,        // Amarillo: 1-3 días
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Extrae la fecha local en Venezuela (sin hora) de un Date.
 */
export function getVETDateParts(date: Date): { year: number; month: number; day: number } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Caracas',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const parts = formatter.formatToParts(date).reduce(
    (acc, part) => ({ ...acc, [part.type]: part.value }),
    {} as Record<string, string>
  );

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

/**
 * Devuelve el instante UTC que representa el inicio del día en Venezuela.
 */
export function getVETStartOfDay(date: Date = new Date()): Date {
  const { year, month, day } = getVETDateParts(date);
  return new Date(Date.UTC(year, month - 1, day, 4, 0, 0, 0));
}

/**
 * Suma días completos a una fecha en la zona horaria de Venezuela.
 */
export function addVETDays(date: Date, days: number): Date {
  return new Date(getVETStartOfDay(date).getTime() + days * MS_PER_DAY);
}

/**
 * Convierte un valor de input de tipo date (YYYY-MM-DD) a un ISO string fijado a medianoche en Venezuela.
 */
export function getVETDateInputISO(dateValue: string): string {
  const [yearStr, monthStr, dayStr] = dateValue.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (!year || !month || !day) {
    throw new Error('Fecha inválida');
  }

  return new Date(Date.UTC(year, month - 1, day, 4, 0, 0, 0)).toISOString();
}

/**
 * Devuelve una fecha en formato YYYY-MM-DD con base en la hora local de Venezuela.
 */
export function getVETDateString(date: Date = new Date()): string {
  const { year, month, day } = getVETDateParts(date);
  return [year, String(month).padStart(2, '0'), String(day).padStart(2, '0')].join('-');
}

export function getDaysUntilExpiry(expiryDate: string | Date | null | undefined): number {
  if (!expiryDate) return -999; // Indefinido, considerar como vencido

  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : new Date(expiryDate.getTime());
  if (Number.isNaN(expiry.getTime())) return -999;

  const todayStart = getVETStartOfDay();
  const expiryStart = getVETStartOfDay(expiry);

  const diffTime = expiryStart.getTime() - todayStart.getTime();
  const diffDays = Math.ceil(diffTime / MS_PER_DAY);

  return diffDays;
}

export function getTrafficLightStatus(
  expiryDate: string | Date | null | undefined,
  config: Partial<TrafficLightConfig> = {},
): TrafficLightStatus {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const daysLeft = getDaysUntilExpiry(expiryDate);

  if (daysLeft <= 0) {
    return 'red'; // Vencido: la fecha actual es igual o mayor a la fecha próxima
  }

  if (daysLeft >= mergedConfig.greenThreshold) {
    return 'green';
  }

  if (daysLeft >= 1) {
    return 'yellow';
  }

  return 'red';
}

export function getTrafficLightColor(status: TrafficLightStatus): string {
  switch (status) {
    case 'green':
      return 'bg-emerald-500/80 text-emerald-100';
    case 'yellow':
      return 'bg-amber-500/80 text-amber-100';
    case 'red':
      return 'bg-red-500/80 text-red-100';
    case 'expired':
      return 'bg-red-600/90 text-red-100';
    default:
      return 'bg-slate-500/50 text-slate-100';
  }
}

export function getTrafficLightInfo(status: TrafficLightStatus): {
  icon: string;
  label: string;
  tooltip: string;
} {
  switch (status) {
    case 'green':
      return {
        icon: '🟢',
        label: 'Activo',
        tooltip: 'Suscripción vigente - 4 días o más para vencimiento',
      };
    case 'yellow':
      return {
        icon: '🟡',
        label: 'Alerta',
        tooltip: 'Vencimiento próximo - 1 a 3 días restantes',
      };
    case 'red':
      return {
        icon: '🔴',
        label: 'Vencido',
        tooltip: 'Suscripción vencida - Renueva para recuperar acceso',
      };
    case 'expired':
      return {
        icon: '⚫',
        label: 'Vencido',
        tooltip: 'Suscripción vencida - Renueva para recuperar acceso',
      };
    default:
      return {
        icon: '⚪',
        label: 'Desconocido',
        tooltip: 'Estado no determinado',
      };
  }
}

export function getExpiryMessage(expiryDate: string | Date | null | undefined): string {
  const daysLeft = getDaysUntilExpiry(expiryDate);
  
  if (daysLeft < 0) {
    return `Vencido hace ${Math.abs(daysLeft)} día(s)`;
  }
  
  if (daysLeft === 0) {
    return 'Vence hoy';
  }
  
  if (daysLeft === 1) {
    return 'Vence mañana';
  }
  
  if (daysLeft <= 7) {
    return `Vence en ${daysLeft} día(s)`;
  }
  
  return `Vence en ${daysLeft} día(s)`;
}
