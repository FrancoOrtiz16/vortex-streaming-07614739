/**
 * Traffic Light / Semáforo - Sistema de alertas por vencimiento
 * Determina el estado visual según días para vencimiento
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

/**
 * Calcula los días restantes hasta el vencimiento
 * @param expiryDate - Fecha de vencimiento (ISO string o Date)
 * @returns Días restantes (negativo si ya venció)
 */
function getVETDateParts(date: Date): { year: number; month: number; day: number } {
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

export function getDaysUntilExpiry(expiryDate: string | Date | null | undefined): number {
  if (!expiryDate) return -999; // Indefinido, considerar como vencido

  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : new Date(expiryDate.getTime());
  if (Number.isNaN(expiry.getTime())) return -999;

  const today = new Date();

  const vetExpiry = getVETDateParts(expiry);
  const vetToday = getVETDateParts(today);

  const expiryUtcMidnight = Date.UTC(vetExpiry.year, vetExpiry.month - 1, vetExpiry.day);
  const todayUtcMidnight = Date.UTC(vetToday.year, vetToday.month - 1, vetToday.day);

  const diffTime = expiryUtcMidnight - todayUtcMidnight;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Obtiene el estado del semáforo basado en la fecha de vencimiento
 * @param expiryDate - Fecha de vencimiento
 * @param config - Configuración personalizada (opcional)
 * @returns Estado: 'green' | 'yellow' | 'red' | 'expired'
 */
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

/**
 * Obtiene el color CSS para mostrar el semáforo
 * @param status - Estado del semáforo
 * @returns Clase CSS para aplicar al elemento
 */
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

/**
 * Obtiene el icono y mensaje descriptivo del semáforo
 * @param status - Estado del semáforo
 * @returns { icon, label, tooltip }
 */
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

/**
 * Formatea un mensaje legible sobre el vencimiento
 * @param expiryDate - Fecha de vencimiento
 * @returns Mensaje descriptivo
 */
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
