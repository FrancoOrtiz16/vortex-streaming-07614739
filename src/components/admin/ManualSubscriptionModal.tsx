import { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getVETDateInputISO, getVETDateString } from '@/lib/trafficLightUtils';

interface ManualSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  services: Array<{ id: string; name: string }>;
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
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    clientName: '',
    clientEmail: '',
    serviceName: '',
    credentialEmail: '',
    credentialPassword: '',
    profileName: '',
    profilePin: '',
    startDate: getVETDateString(),
    expiryDate: getVETDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
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
    setForm((prev) => ({ ...prev, [name]: value }));
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

      // ⚠️ IMPORTANTE: Al crear una suscripción manual, debe estar en 'pending_approval'
      // Usar fecha lejana (100 años) en lugar de NULL porque la BD no permite NULL
      const pendingDate = new Date();
      pendingDate.setFullYear(pendingDate.getFullYear() + 100);
      
      const payload = {
        user_id: linkedProfile.user_id,
        service_name: form.serviceName,
        status: 'pending_approval', // Pendiente de aprobación
        credential_email: form.credentialEmail || null,
        credential_password: form.credentialPassword || null,
        profile_name: form.profileName || null,
        profile_pin: form.profilePin || null,
        duration_days: 30,
        next_renewal: pendingDate.toISOString(), // Fecha lejana = marcador de "pendiente"
      };

      const { error } = await supabase
        .from('subscriptions')
        .insert([payload]);

      if (error) throw error;

      toast.success(`✅ Suscripción manual creada para ${form.clientName}`);
      onSuccess();
      onClose();
      setForm({
        clientName: '',
        clientEmail: '',
        serviceName: '',
        credentialEmail: '',
        credentialPassword: '',
        profileName: '',
        profilePin: '',
        startDate: getVETDateString(),
        expiryDate: getVETDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 bg-slate-950 border border-white/10 rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Nueva Suscripción Manual</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información del Cliente */}
          <div className="bg-slate-900/40 border border-white/5 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Información del Cliente</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <div className="bg-slate-900/40 border border-white/5 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Servicio y Vigencia</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <select
                name="serviceName"
                value={form.serviceName}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Seleccionar servicio</option>
                {services.map((svc) => (
                  <option key={svc.id} value={svc.name}>
                    {svc.name}
                  </option>
                ))}
              </select>
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
          <div className="bg-slate-900/40 border border-white/5 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Credenciales del Servicio</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <div className="flex gap-3 pt-4">
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
