import { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getVETDateInputISO, getVETDateString, addVETDays } from '@/lib/trafficLightUtils';
import { getDurationDaysFromLabel } from '@/lib/durationVariants';

interface ManualSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  services: Array<{ id: string; name: string; price: number; plan_type: string | null }>;
}

interface LinkedProfile {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

export function ManualSubscriptionModal({
  isOpen,
  onClose,
  onSuccess,
  services,
}: ManualSubscriptionModalProps) {
  const FORM_STORE_KEY = 'admin_manual_subscription_form_v1';
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(() => {
    if (typeof window === 'undefined') {
      return {
        clientName: '',
        clientEmail: '',
        serviceId: '',
        serviceName: '',
        servicePrice: 0,
        durationLabel: '1 Mes',
        durationDays: 30,
        credentialEmail: '',
        credentialPassword: '',
        profileName: '',
        profilePin: '',
        externalId: '',
        startDate: getVETDateString(),
        expiryDate: getVETDateString(addVETDays(new Date(), 30)),
      };
    }

    try {
      const raw = window.sessionStorage.getItem(FORM_STORE_KEY);
      if (!raw) throw new Error('No stored form');
      return JSON.parse(raw);
    } catch {
      return {
        clientName: '',
        clientEmail: '',
        serviceId: '',
        serviceName: '',
        servicePrice: 0,
        durationLabel: '1 Mes',
        durationDays: 30,
        credentialEmail: '',
        credentialPassword: '',
        profileName: '',
        profilePin: '',
        externalId: '',
        startDate: getVETDateString(),
        expiryDate: getVETDateString(addVETDays(new Date(), 30)),
      };
    }
  });
  const [linkedProfile, setLinkedProfile] = useState<LinkedProfile | null>(null);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'searching' | 'found' | 'not_found' | 'invalid'>('idle');
  const [emailMessage, setEmailMessage] = useState('');
  const searchTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const email = form.clientEmail.trim().toLowerCase();
    let active = true;

    if (searchTimeoutRef.current) {
      window.clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    setLinkedProfile(null);
    if (!email) {
      setEmailStatus('idle');
      setEmailMessage('');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailStatus('invalid');
      setEmailMessage('Formato de correo no válido');
      return;
    }

    setEmailStatus('searching');
    setEmailMessage('Buscando usuario...');

    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('user_id, display_name, email')
          .eq('email', email)
          .maybeSingle();

        if (!active) return;

        if (error) {
          console.error('[ManualSubscriptionModal] Profile lookup error:', error);
          setEmailStatus('not_found');
          setEmailMessage('Error verificando el correo del cliente');
          return;
        }

        if (!data || !data.user_id) {
          setEmailStatus('not_found');
          setEmailMessage('Usuario no encontrado. El cliente debe registrarse en la página primero');
          return;
        }

        setLinkedProfile(data);
        setEmailStatus('found');
        setEmailMessage(`Usuario encontrado: ${data.display_name || data.email}`);
        setForm((prev) => ({
          ...prev,
          clientName: prev.clientName.trim() || data.display_name || data.email || prev.clientName,
        }));
      } catch (err) {
        if (!active) return;
        console.error('[ManualSubscriptionModal] Profile lookup catch:', err);
        setEmailStatus('not_found');
        setEmailMessage('Error buscando usuario. Intenta de nuevo');
      }
    }, 300);

    return () => {
      active = false;
      if (searchTimeoutRef.current) {
        window.clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = null;
      }
    };
  }, [form.clientEmail]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    if (name === 'serviceName') {
      const selectedService = services.find((svc) => svc.id === value) ?? null;
      const durationDays = selectedService ? getDurationDaysFromLabel(selectedService.plan_type) : 30;
      const startDate = getVETDateString();
      const expiryDate = getVETDateString(addVETDays(new Date(startDate), durationDays));

      setForm((prev) => ({
        ...prev,
        serviceId: selectedService?.id || '',
        serviceName: selectedService?.name || '',
        servicePrice: selectedService?.price ?? 0,
        durationLabel: selectedService?.plan_type || '1 Mes',
        durationDays,
        startDate,
        expiryDate,
      }));
      return;
    }

    setForm((prev) => {
      const next = { ...prev, [name]: value } as typeof prev;

      if (name === 'startDate' && prev.durationDays > 0) {
        const baseDate = new Date(`${value}T00:00:00-04:00`);
        next.expiryDate = getVETDateString(addVETDays(baseDate, prev.durationDays));
      }

      return next;
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(FORM_STORE_KEY, JSON.stringify(form));
  }, [form]);

  const clearPersistedForm = () => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(FORM_STORE_KEY);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!form.clientEmail.trim()) {
        toast.error('El correo del cliente es requerido. Debe ser un usuario registrado.');
        setLoading(false);
        return;
      }

      if (!linkedProfile?.user_id) {
        toast.error('El cliente debe estar vinculado a un usuario registrado antes de crear la suscripción.');
        setLoading(false);
        return;
      }

      if (!form.serviceName.trim()) {
        toast.error('Debes seleccionar un servicio');
        setLoading(false);
        return;
      }

      const durationDays = Number(form.durationDays) || getDurationDaysFromLabel(form.durationLabel);
      const startDate = form.startDate || getVETDateString();
      const expiryDate = form.expiryDate || getVETDateString(addVETDays(new Date(startDate), durationDays));

      const payload = {
        user_id: linkedProfile.user_id,
        service_name: form.serviceName,
        status: 'pending_approval',
        credential_email: form.credentialEmail || null,
        credential_password: form.credentialPassword || null,
        subscription_code: form.externalId || null,
        profile_name: form.profileName || null,
        profile_pin: form.profilePin || null,
        duration_days: durationDays,
        last_renewal: getVETDateInputISO(startDate),
        next_renewal: getVETDateInputISO(expiryDate),
      };

      const { error } = await supabase
        .from('subscriptions')
        .insert([payload]);

      if (error) throw error;

      toast.success(`✅ Suscripción manual creada para ${form.clientName}`);
      onSuccess();
      onClose();
      clearPersistedForm();
      setForm({
        clientName: '',
        clientEmail: '',
        serviceId: '',
        serviceName: '',
        servicePrice: 0,
        durationLabel: '1 Mes',
        durationDays: 30,
        credentialEmail: '',
        credentialPassword: '',
        profileName: '',
        profilePin: '',
        externalId: '',
        startDate: getVETDateString(),
        expiryDate: getVETDateString(addVETDays(new Date(), 30)),
      });
      setLinkedProfile(null);
      setEmailStatus('idle');
      setEmailMessage('');
    } catch (err: any) {
      console.error('[ManualSubscriptionModal] Error:', err);
      toast.error(err?.message || 'Error al crear la suscripción manual');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4 sm:px-6">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-950 border border-white/10 rounded-xl shadow-2xl p-6 sm:p-8 mx-auto flex flex-col items-center">
        <div className="w-full flex items-center justify-between mb-6 gap-4">
          <h2 className="w-full text-xl font-bold text-white text-center">Nueva Suscripción Manual</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4 flex flex-col items-center">
          {/* Información del Cliente */}
          <div className="w-full bg-slate-900/40 border border-white/5 rounded-lg p-4 space-y-3 text-center">
            <h3 className="text-sm font-semibold text-slate-300 text-center">Información del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 justify-center">
              <input
                type="text"
                name="clientName"
                placeholder="Nombre del cliente"
                value={form.clientName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                required
              />
              <div className="space-y-2">
                <input
                  type="email"
                  name="clientEmail"
                  placeholder="Correo del Cliente"
                  value={form.clientEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
                {emailMessage && (
                  <p
                    className={`text-sm ${
                      emailStatus === 'found'
                        ? 'text-emerald-400'
                        : emailStatus === 'searching'
                        ? 'text-slate-300'
                        : 'text-amber-300'
                    }`}
                  >
                    {emailMessage}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Servicio y Fechas */}
          <div className="w-full bg-slate-900/40 border border-white/5 rounded-lg p-4 space-y-3 text-center">
            <h3 className="text-sm font-semibold text-slate-300 text-center">Servicio y Vigencia</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 items-end justify-center">
              <select
                name="serviceName"
                value={form.serviceId || ''}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Seleccionar servicio</option>
                {services.map((svc) => (
                  <option key={svc.id} value={svc.id}>
                    {svc.name} {svc.plan_type ? `· ${svc.plan_type}` : ''}
                  </option>
                ))}
              </select>
              <input
                type="text"
                name="servicePrice"
                value={form.servicePrice ? `$${form.servicePrice.toFixed(2)}` : ''}
                readOnly
                placeholder="Precio auto"
                className="w-full px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-emerald-300 focus:outline-none"
              />
              <input
                type="text"
                name="durationLabel"
                value={form.durationLabel || '1 Mes'}
                readOnly
                placeholder="Duración auto"
                className="w-full px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sky-300 focus:outline-none"
              />
              <input
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
              <input
                type="date"
                name="expiryDate"
                value={form.expiryDate}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Credenciales del Servicio */}
          <div className="w-full bg-slate-900/40 border border-white/5 rounded-lg p-4 space-y-3 text-center">
            <h3 className="text-sm font-semibold text-slate-300 text-center">Credenciales del Servicio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 justify-center">
              <input
                type="email"
                name="credentialEmail"
                placeholder="Email/Usuario de la cuenta"
                value={form.credentialEmail}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="password"
                name="credentialPassword"
                placeholder="Contraseña"
                value={form.credentialPassword}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                name="externalId"
                placeholder="ID-Externo (solo admin)"
                value={form.externalId}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                name="profileName"
                placeholder="Nombre de perfil (opcional)"
                value={form.profileName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <input
                type="text"
                name="profilePin"
                placeholder="PIN/Código (opcional)"
                value={form.profilePin}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Botones */}
          <div className="w-full flex flex-col sm:flex-row gap-3 pt-4 justify-center items-center">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
              disabled={loading || emailStatus !== 'found'}
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creando...' : 'Crear Suscripción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
