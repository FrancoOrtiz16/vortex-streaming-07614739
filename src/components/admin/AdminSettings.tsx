import { useState, useEffect, useCallback } from 'react';
import { Settings, Save, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AdminSectionErrorBoundary } from './AdminSectionErrorBoundary';

function AdminSettingsContent() {
  const [rate, setRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRate = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_settings' as any)
        .select('value')
        .eq('key', 'usd_ves_rate')
        .single();
      
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      setRate((data as any)?.value || '0');
    } catch (err) {
      console.error('[AdminSettings] Fetch error:', err);
      toast.error('Error cargando configuración');
      setRate('0');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRate(); }, [fetchRate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const parsedRate = parseFloat(rate);
      if (isNaN(parsedRate) || parsedRate <= 0) {
        throw new Error('La tasa debe ser un número positivo');
      }

      const { error } = await (supabase.from('app_settings' as any) as any)
        .update({ value: rate, updated_at: new Date().toISOString() })
        .eq('key', 'usd_ves_rate');
      
      if (error) throw error;
      toast.success('Tasa actualizada correctamente');
    } catch (err: any) {
      console.error('[AdminSettings] Save error:', err);
      toast.error(err.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-muted-foreground text-sm">Cargando ajustes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="font-display font-bold text-xl">Configuración de la Aplicación</h2>
        </div>
        <button
          onClick={() => fetchRate()}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          title="Recargar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="glass rounded-xl p-6 max-w-md border border-primary/20">
        <div className="space-y-4">
          <div>
            <h3 className="font-display font-semibold text-sm mb-3">Tasa de Cambio USD → Bolívares (VES)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Esta tasa se usará en el checkout para mostrar el equivalente en Bolívares cuando el cliente elige Pago Móvil o Transferencia.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-muted-foreground font-medium block">
              Tasa de cambio (1 USD =)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                value={rate}
                onChange={e => setRate(e.target.value)}
                placeholder="Ej: 45.50"
                className="flex-1 px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              />
              <span className="text-sm font-medium text-muted-foreground whitespace-nowrap px-3 py-2 rounded-xl bg-secondary border border-border">
                Bs.
              </span>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl gradient-neon text-primary-foreground text-xs font-semibold disabled:opacity-50 transition-opacity"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      <div className="glass rounded-xl p-6 border border-amber-500/20 bg-amber-500/5">
        <h3 className="font-display font-semibold text-sm text-amber-400 mb-2">Información Importante</h3>
        <ul className="text-xs text-muted-foreground space-y-1.5">
          <li>✓ La tasa se actualiza en tiempo real en el checkout</li>
          <li>✓ Afecta SOLO a pedidos con Pago Móvil o Transferencia Bancaria</li>
          <li>✓ Los valores en USD permanecen invariables</li>
          <li>✓ Cambios inmediatos (sin necesidad de reiniciar la aplicación)</li>
        </ul>
      </div>
    </div>
  );
}

export function AdminSettings() {
  return (
    <AdminSectionErrorBoundary sectionName="Configuración">
      <AdminSettingsContent />
    </AdminSectionErrorBoundary>
  );
}
