import { useState, useEffect } from 'react';
import { Settings, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SettingsSection() {
  const [rate, setRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('app_settings' as any)
      .select('value')
      .eq('key', 'usd_ves_rate')
      .single()
      .then(({ data }) => {
        setRate((data as any)?.value || '0');
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await (supabase.from('app_settings' as any) as any)
      .update({ value: rate, updated_at: new Date().toISOString() })
      .eq('key', 'usd_ves_rate');
    if (error) {
      toast.error('Error al guardar');
    } else {
      toast.success('Tasa actualizada');
    }
    setSaving(false);
  };

  if (loading) return <div className="text-muted-foreground text-sm">Cargando ajustes...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-xl">Ajustes</h2>
      </div>

      <div className="glass rounded-xl p-6 max-w-md">
        <h3 className="font-display font-semibold text-sm mb-4">Tasa USD → Bolívares (VES)</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-muted-foreground mb-1.5 block">Tasa actual (1 USD =)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                value={rate}
                onChange={e => setRate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Bs.</span>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="self-end flex items-center gap-1.5 px-4 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Guardar
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-3">
          Esta tasa se usará en el checkout para mostrar el equivalente en Bolívares al elegir Pago Móvil o Transferencia.
        </p>
      </div>
    </div>
  );
}
