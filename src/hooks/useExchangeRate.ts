import { useState, useEffect } from 'react';

export function useExchangeRate() {
  const [rate, setRate] = useState<number>(700);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setRate(700);
    setLoading(false);
  }, []);

  const convertToVES = (usd: number) => usd * rate;

  return { rate, loading, convertToVES };
}
