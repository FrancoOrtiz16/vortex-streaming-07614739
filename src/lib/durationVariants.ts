/**
 * Mapeo de duraciones de productos según grupo variante.
 * Permite vender el mismo producto con diferentes periodos.
 */

export interface DurationVariant {
  label: string;
  days: number;
  priceMultiplier: number; // Multiplicador de precio base (mantener para compatibilidad, no se usa en la UI)
}

export const PLAN_DURATION_OPTIONS = [
  { label: '15 días', days: 15 },
  { label: '1 Mes', days: 30 },
  { label: '3 Meses', days: 90 },
  { label: '6 Meses', days: 180 },
  { label: '1 Año', days: 365 },
] as const;

/**
 * Definición de variantes de duración disponibles.
 * Se pueden expandir o modificar según necesidad.
 */
export const DURATION_VARIANTS: Record<string, DurationVariant[]> = {
  // Streaming estándar (Netflix, Disney+, HBO Max, Spotify, etc.)
  streaming: [
    { label: '15 días', days: 15, priceMultiplier: 1 },
    { label: '1 Mes', days: 30, priceMultiplier: 1 },
    { label: '3 Meses', days: 90, priceMultiplier: 1 },
    { label: '6 Meses', days: 180, priceMultiplier: 1 },
    { label: '1 Año', days: 365, priceMultiplier: 1 },
  ],
  // Gaming estándar
  gaming: [
    { label: '15 días', days: 15, priceMultiplier: 1 },
    { label: '1 Mes', days: 30, priceMultiplier: 1 },
    { label: '3 Meses', days: 90, priceMultiplier: 1 },
    { label: '6 Meses', days: 180, priceMultiplier: 1 },
    { label: '1 Año', days: 365, priceMultiplier: 1 },
  ],
  // Por defecto (usado si no hay categoría específica)
  default: [
    { label: '15 días', days: 15, priceMultiplier: 1 },
    { label: '1 Mes', days: 30, priceMultiplier: 1 },
    { label: '3 Meses', days: 90, priceMultiplier: 1 },
    { label: '6 Meses', days: 180, priceMultiplier: 1 },
    { label: '1 Año', days: 365, priceMultiplier: 1 },
  ],
};

/**
 * Obtiene las variantes de duración para una categoría o grupo.
 * @param groupName - Nombre del grupo/categoría del producto
 * @returns Array de variantes disponibles para ese grupo
 */
export function getDurationVariantsForGroup(groupName?: string | null): DurationVariant[] {
  if (!groupName) return DURATION_VARIANTS.default;
  
  // Buscar en el mapeo (case-insensitive)
  const key = Object.keys(DURATION_VARIANTS).find(
    k => k.toLowerCase() === groupName.toLowerCase()
  );
  
  return key ? DURATION_VARIANTS[key] : DURATION_VARIANTS.default;
}

/**
 * Obtiene los días correspondientes a una variante de duración.
 * @param groupName - Nombre del grupo/categoría
 * @param variantLabel - Label de la variante (ej: "1 mes")
 * @returns Número de días, o 30 como default
 */
export function getDaysForVariant(groupName?: string | null, variantLabel?: string): number {
  if (!variantLabel) return 30;

  const variant = PLAN_DURATION_OPTIONS.find(
    v => v.label.toLowerCase() === variantLabel.toLowerCase()
  );

  return variant?.days ?? 30;
}

export function getDurationDaysFromLabel(label?: string | null): number {
  return PLAN_DURATION_OPTIONS.find(v => v.label.toLowerCase() === (label || '').toLowerCase())?.days ?? 30;
}

/**
 * Calcula el precio ajustado según la duración.
 * @param basePrice - Precio base del producto
 * @param durationDays - Número de días
 * @param groupName - Nombre del grupo (para consultar multiplicadores)
 * @returns Precio ajustado
 */
export function calculateAdjustedPrice(
  basePrice: number,
  durationDays: number,
  groupName?: string | null
): number {
  const variants = getDurationVariantsForGroup(groupName);
  const variant = variants.find(v => v.days === durationDays);
  
  if (variant) {
    return Math.round(basePrice * variant.priceMultiplier * 100) / 100;
  }
  
  // Si no encuentra variante exacta, calcular proporcionalmente
  const oneMonthVariant = variants.find(v => v.days === 30);
  const dayRate = oneMonthVariant 
    ? (basePrice * oneMonthVariant.priceMultiplier) / 30 
    : basePrice / 30;
  
  return Math.round(dayRate * durationDays * 100) / 100;
}

/**
 * Obtiene el label de duración formateado para mostrar.
 * @param days - Número de días
 * @returns Label formateado (ej: "1 mes", "3 meses")
 */
export function formatDurationLabel(days: number): string {
  if (days === 15) return '15 días';
  if (days === 30) return '1 Mes';
  if (days === 90) return '3 Meses';
  if (days === 180) return '6 Meses';
  if (days === 365) return '1 Año';
  
  // Para duraciones custom
  if (days % 30 === 0) {
    const months = Math.round(days / 30);
    return `${months} mes${months > 1 ? 'es' : ''}`;
  }
  
  if (days % 7 === 0) {
    const weeks = Math.round(days / 7);
    return `${weeks} semana${weeks > 1 ? 's' : ''}`;
  }
  
  return `${days} días`;
}

/**
 * Valida si una duración es válida para un grupo.
 * @param durationDays - Días a validar
 * @param groupName - Nombre del grupo
 * @returns true si la duración es válida
 */
export function isValidDurationForGroup(durationDays: number, groupName?: string | null): boolean {
  const variants = getDurationVariantsForGroup(groupName);
  return variants.some(v => v.days === durationDays);
}
