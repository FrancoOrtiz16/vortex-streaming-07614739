import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ManualSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  services: Array<{ id: string; name: string }>;
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
    startDate: new Date().toISOString().split('T')[0],
    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0],
  });

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
      // Validaciones
      if (!form.clientName.trim()) {
        toast.error('El nombre del cliente es requerido');
        setLoading(false);
        return;
      }

      if (!form.serviceName.trim()) {
        toast.error('Debes seleccionar un servicio');
        setLoading(false);
        return;
      }

      // Crear suscripción manual (sin user_id real)
      // Para clientes externos, user_id es null

      const payload = {
        user_id: null, // Clientes externos no tienen user_id
        service_name: form.serviceName,
        status: 'active', // Las suscripciones manuales se crean activas
        credential_email: form.credentialEmail || null,
        credential_password: form.credentialPassword || null,
        profile_name: form.profileName || null,
        profile_pin: form.profilePin || null,
        next_renewal: new Date(form.expiryDate).toISOString(),
        last_renewal: new Date(form.startDate).toISOString(),
      };

      const { error } = await supabase
        .from('subscriptions')
        .insert([payload]);

      if (error) throw error;

      toast.success(
        `✅ Suscripción manual creada para ${form.clientName}`,
      );
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
        startDate: new Date().toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
      });
    } catch (err: any) {
      console.error('[ManualSubscriptionModal] Error:', err);
      toast.error(
        err?.message || 'Error al crear la suscripción manual',
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 bg-slate-950 border border-white/10 rounded-xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">
            Nueva Suscripción Manual
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Información del Cliente */}
          <div className="bg-slate-900/40 border border-white/5 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">
              Información del Cliente
            </h3>
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
              <input
                type="email"
                name="clientEmail"
                placeholder="Email del cliente (opcional)"
                value={form.clientEmail}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Servicio y Fechas */}
          <div className="bg-slate-900/40 border border-white/5 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">
              Servicio y Vigencia
            </h3>
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
            <h3 className="text-sm font-semibold text-slate-300">
              Credenciales del Servicio
            </h3>
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
              disabled={loading}
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
