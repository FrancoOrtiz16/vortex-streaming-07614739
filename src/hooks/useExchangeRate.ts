import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useExchangeRate() {
  const [rate, setRate] = useState<number>(700);
  const [loading, setLoading] = useState(false);

  // Fixed rate of 700 Bs/USD
  useEffect(() => {
    setRate(700);
    setLoading(false);
  }, []);

  const convertToVES = (usd: number) => usd * rate;

  return { rate, loading, convertToVES };
}
