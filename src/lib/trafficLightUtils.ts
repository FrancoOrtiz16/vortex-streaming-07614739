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
  greenThreshold: 5,         // Verde: más de 5 días
  yellowThreshold: 3,        // Amarillo: 3 días o menos (alerta)
};

/**
 * Calcula los días restantes hasta el vencimiento
 * @param expiryDate - Fecha de vencimiento (ISO string o Date)
 * @returns Días restantes (negativo si ya venció)
 */
export function getDaysUntilExpiry(expiryDate: string | Date | null | undefined): number {
  if (!expiryDate) return -999; // Indefinido, considerar como vencido
  
  const expiry = typeof expiryDate === 'string' 
    ? new Date(expiryDate) 
    : expiryDate;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);
  
  const diffTime = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
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
  
  if (daysLeft < 0) {
    return 'expired'; // Rojo oscuro para vencido
  }
  
  if (daysLeft > mergedConfig.greenThreshold) {
    return 'green';
  }
  
  if (daysLeft <= mergedConfig.yellowThreshold) {
    return 'yellow';
  }
  
  // Entre greenThreshold y yellowThreshold
  return 'yellow';
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
        tooltip: 'Suscripción vigente - Más de 5 días para vencimiento',
      };
    case 'yellow':
      return {
        icon: '🟡',
        label: 'Alerta',
        tooltip: 'Vencimiento próximo - 3 días o menos',
      };
    case 'red':
      return {
        icon: '🔴',
        label: 'Crítico',
        tooltip: 'Muy próximo al vencimiento - 1-2 días',
      };
    case 'expired':
      return {
        icon: '⚫',
        label: 'Vencido',
        tooltip: 'Suscripción vencida - Requiere renovación',
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
