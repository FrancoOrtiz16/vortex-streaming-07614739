import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  getDurationVariantsForGroup,
  formatDurationLabel,
} from '@/lib/durationVariants';

interface DurationSelectorProps {
  groupName?: string | null;
  basePrice: number;
  onDurationSelect: (days: number) => void;
  defaultDays?: number;
  className?: string;
}

/**
 * Selector de duración de suscripción.
 * Permite al cliente elegir entre 15 días, 1 mes, 3 meses, 6 meses, 1 año.
 * Muestra el precio ajustado automáticamente.
 */
export function DurationSelector({
  groupName,
  basePrice,
  onDurationSelect,
  defaultDays = 30,
  className = '',
}: DurationSelectorProps) {
  const variants = getDurationVariantsForGroup(groupName);
  const [selectedDays, setSelectedDays] = React.useState(defaultDays);

  const handleDurationChange = (days: string) => {
    const daysNum = parseInt(days, 10);
    setSelectedDays(daysNum);
    onDurationSelect(daysNum);
  };

  const selectedVariant = variants.find(v => v.days === selectedDays);

  return (
    <div className={`w-full space-y-2 ${className}`}>
      <label className="text-sm font-medium text-foreground">
        Selecciona duración:
      </label>
      <Select value={selectedDays.toString()} onValueChange={handleDurationChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Selecciona duración" />
        </SelectTrigger>
        <SelectContent>
          {variants.map((variant) => (
            <SelectItem key={variant.days} value={variant.days.toString()}>
              <span>{variant.label}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedVariant && (
        <div className="text-xs text-muted-foreground pt-1">
          <p>
            Precio fijo: <span className="font-semibold text-foreground">${basePrice.toFixed(2)}</span>
          </p>
          <p>Duración: {formatDurationLabel(selectedDays)}</p>
        </div>
      )}
    </div>
  );
}

export default DurationSelector;
