import { useCurrency } from '@/context/CurrencyContext';

export function useExchangeRate() {
  const { rate, loadingRate, convertToVES } = useCurrency();
  return { rate, loading: loadingRate, convertToVES };
}
