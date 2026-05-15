import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { fetchProfileWhatsAppPhone, saveProfileWhatsAppPhone } from '@/lib/profilePhone';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

const ProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      try {
        const phoneValue = await fetchProfileWhatsAppPhone(user.id);
        setPhone(phoneValue || '');
      } catch (err) {
        console.error('[Profile] Exception', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profiles-${user.id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          const updatedProfile: any = payload.new;
          const oldProfile: any = payload.old;
          const newPhone = updatedProfile.phone ?? updatedProfile.profile_phone ?? null;
          if (newPhone) setPhone(newPhone);

          // Redirigir solo en transición de no verificado -> verificado
          if (!oldProfile?.is_verified && updatedProfile.is_verified) {
            navigate('/');
          }
        })
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const { error } = await saveProfileWhatsAppPhone(user.id, phone);
      if (error) throw error;
      toast.success('Número guardado');
      navigate('/catalog');
    } catch (err: any) {
      console.error('[Profile] Save error', err);
      toast.error(err?.message || 'Error guardando número');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-3xl">
        <h1 className="font-display text-2xl font-bold mb-4">Mi Perfil</h1>
        <div className="glass rounded-2xl p-6">
          <div className="flex flex-col gap-2 mb-4">
            <p className="text-sm text-muted-foreground">Aquí puedes añadir o editar tu número de WhatsApp. Este número se usa para contacto, soporte y entrega de tus compras.</p>
            {phone ? (
              <p className="text-xs text-emerald-300">Número actual: <span className="font-medium text-white">{phone}</span></p>
            ) : (
              <p className="text-xs text-amber-300">Aún no tienes un número de WhatsApp registrado.</p>
            )}
          </div>

          <label className="text-xs text-muted-foreground mb-2 block">Número de WhatsApp</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: +58 412 1234567"
            className="w-full px-3 py-2 rounded-xl bg-secondary text-sm border border-border focus:border-primary focus:outline-none"
          />
          <div className="flex gap-3 mt-4 flex-wrap">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50"
            >
              {saving ? 'Guardando...' : phone ? 'Actualizar WhatsApp' : 'Añadir WhatsApp'}
            </button>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-xl bg-secondary text-secondary-foreground"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
