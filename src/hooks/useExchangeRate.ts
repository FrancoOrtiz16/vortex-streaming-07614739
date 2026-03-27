import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useExchangeRate() {
  const [rate, setRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('app_settings' as any)
        .select('value')
        .eq('key', 'usd_ves_rate')
        .single();
      setRate(parseFloat((data as any)?.value) || 0);
      setLoading(false);
    };
    fetch();
  }, []);

  const convertToVES = (usd: number) => rate > 0 ? usd * rate : 0;

  return { rate, loading, convertToVES };
}
