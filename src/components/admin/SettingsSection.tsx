import { useState, useEffect } from 'react';
import { Settings, Save, Loader2, DollarSign, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function SettingsSection() {
  const [rate, setRate] = useState('');
  const [whatsappAdmin, setWhatsappAdmin] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingRate, setSavingRate] = useState(false);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data: rateData } = await (supabase.from('app_settings' as any) as any)
          .select('value')
          .eq('key', 'usd_ves_rate')
          .single();
        setRate((rateData as any)?.value || '0');

        const { data: whatsappData } = await (supabase.from('app_settings' as any) as any)
          .select('value')
          .eq('key', 'whatsapp_admin_phone')
          .single();
        setWhatsappAdmin((whatsappData as any)?.value || '');

        setLoading(false);
      } catch (err) {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSaveRate = async () => {
    setSavingRate(true);
    const { error } = await (supabase.from('app_settings' as any) as any)
      .update({ value: rate, updated_at: new Date().toISOString() })
      .eq('key', 'usd_ves_rate');
    if (error) {
      toast.error('Error al guardar la tasa');
    } else {
      toast.success('Tasa actualizada');
    }
    setSavingRate(false);
  };

  const handleSaveWhatsapp = async () => {
    setSavingWhatsapp(true);
    const { error } = await (supabase.from('app_settings' as any) as any)
      .update({ value: whatsappAdmin, updated_at: new Date().toISOString() })
      .eq('key', 'whatsapp_admin_phone');
    if (error) {
      toast.error('Error al guardar el número');
    } else {
      toast.success('Número de WhatsApp actualizado');
    }
    setSavingWhatsapp(false);
  };

  if (loading) return <div className="text-muted-foreground text-sm">Cargando ajustes...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Settings className="w-5 h-5 text-primary" />
        <h2 className="font-display font-bold text-xl">Ajustes</h2>
      </div>

      {/* Side-by-side cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* USD→Bs Rate Card */}
        <div
          className="rounded-lg p-6 border transition-all"
          style={{
            backgroundColor: 'white',
            borderColor: 'var(--color-border-tertiary)',
            borderWidth: '0.5px',
            color: 'var(--foreground)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'var(--admin-primary-blue)', opacity: 0.1 }}
            >
              <DollarSign className="w-5 h-5" style={{ color: 'var(--admin-primary-blue)' }} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm">Tasa de Cambio</h3>
              <p className="text-[11px] opacity-60">USD → Bolívares (VES)</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider opacity-60 block mb-2">Tasa actual (1 USD =)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={rate}
                  onChange={e => setRate(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-secondary text-sm border transition-colors"
                  style={{
                    borderColor: 'var(--color-border-tertiary)',
                    borderWidth: '0.5px',
                  }}
                />
                <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">Bs.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveRate}
              disabled={savingRate}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--admin-primary-blue)' }}
            >
              {savingRate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>

            <p className="text-[11px] opacity-60">
              Se usará en el checkout para mostrar el equivalente en Bolívares.
            </p>
          </div>
        </div>

        {/* WhatsApp Admin Card */}
        <div
          className="rounded-lg p-6 border transition-all"
          style={{
            backgroundColor: 'white',
            borderColor: 'var(--color-border-tertiary)',
            borderWidth: '0.5px',
            color: 'var(--foreground)',
          }}
        >
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#25D366', opacity: 0.1 }}
            >
              <MessageCircle className="w-5 h-5" style={{ color: '#25D366' }} />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm">WhatsApp Admin</h3>
              <p className="text-[11px] opacity-60">Número para notificaciones</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider opacity-60 block mb-2">Número de teléfono</label>
              <input
                type="tel"
                value={whatsappAdmin}
                onChange={e => setWhatsappAdmin(e.target.value)}
                placeholder="+58 XXX XXXXXXX"
                className="w-full px-3 py-2 rounded-lg bg-secondary text-sm border transition-colors"
                style={{
                  borderColor: 'var(--color-border-tertiary)',
                  borderWidth: '0.5px',
                }}
              />
            </div>

            <button
              type="button"
              onClick={handleSaveWhatsapp}
              disabled={savingWhatsapp}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: 'var(--admin-primary-blue)' }}
            >
              {savingWhatsapp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Guardar
            </button>

            <p className="text-[11px] opacity-60">
              Se usará para enviar notificaciones de renovación y otros avisos.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
