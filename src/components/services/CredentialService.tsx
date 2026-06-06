import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, AlertCircle, Loader2, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCredentialData } from '@/hooks/useCredentialData';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getDaysUntilExpiry, getTrafficLightStatus } from '@/lib/trafficLightUtils';

interface CredentialServiceProps {
  subscriptionId?: string;
  serviceName?: string;
  triggerLabel?: string;
  variant?: 'button' | 'icon-only';
}

/**
 * CredentialService Component - Interfaz modular segura para mostrar credenciales
 * 
 * Estética: Vortex (Oscuro/Neón)
 * Características:
 * - Soporte para múltiples servicios (combos)
 * - Ojo para ver/ocultar contraseña
 * - Manejo de credenciales pendientes
 * - Optional chaining en todas las referencias
 * - Mensaje amigable si no hay credenciales
 */
const CredentialService: React.FC<CredentialServiceProps> = ({
  subscriptionId,
  serviceName,
  triggerLabel = 'Ver credenciales',
  variant = 'button',
}) => {
  const { credentials, isLoading, error, refetch } = useCredentialData(subscriptionId);
  const DIALOG_STATE_KEY = subscriptionId ? `credential_dialog_state_${subscriptionId}_v1` : null;
  const [showPassword, setShowPassword] = useState(() => {
    if (typeof window === 'undefined' || !DIALOG_STATE_KEY) return false;
    try {
      const raw = window.sessionStorage.getItem(DIALOG_STATE_KEY);
      return raw ? JSON.parse(raw).showPassword ?? false : false;
    } catch {
      return false;
    }
  });
  const [showPin, setShowPin] = useState(() => {
    if (typeof window === 'undefined' || !DIALOG_STATE_KEY) return false;
    try {
      const raw = window.sessionStorage.getItem(DIALOG_STATE_KEY);
      return raw ? JSON.parse(raw).showPin ?? false : false;
    } catch {
      return false;
    }
  });
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window === 'undefined' || !DIALOG_STATE_KEY) return false;
    try {
      const raw = window.sessionStorage.getItem(DIALOG_STATE_KEY);
      return raw ? JSON.parse(raw).isOpen ?? false : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !DIALOG_STATE_KEY) return;
    try {
      const raw = window.sessionStorage.getItem(DIALOG_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setShowPassword(parsed.showPassword ?? false);
      setShowPin(parsed.showPin ?? false);
      setIsOpen(parsed.isOpen ?? false);
    } catch {
      // ignore parse failures
    }
  }, [DIALOG_STATE_KEY]);

  useEffect(() => {
    if (typeof window === 'undefined' || !DIALOG_STATE_KEY) return;
    try {
      window.sessionStorage.setItem(
        DIALOG_STATE_KEY,
        JSON.stringify({ isOpen, showPassword, showPin }),
      );
    } catch {
      // ignore write failures
    }
  }, [DIALOG_STATE_KEY, isOpen, showPassword, showPin]);

  // Estados calculados
  const hasCredentials = credentials?.password_cuenta && credentials.password_cuenta.trim() !== '';
  const daysUntilExpiry = getDaysUntilExpiry(credentials?.next_renewal);
  const isExpired = credentials?.next_renewal ? daysUntilExpiry <= 0 : false;
  const trafficLightStatus = getTrafficLightStatus(credentials?.next_renewal);
  const isActiveStatus = ['active', 'Activo', 'confirmed'].includes(credentials?.status || '');

  // ✅ SEGURIDAD: Bloqueo solo cuando vence hoy o ya está vencido
  const isVencido = isExpired || credentials?.status === 'expired';

  // Estado visual del icono
  const getKeyState = () => {
    if (isVencido) return 'expired'; // Rojo/candado - BLOQUEADO
    if (hasCredentials && !isExpired) return 'active'; // Mantener acceso mientras la suscripción sigue vigente
    if (isActiveStatus && hasCredentials) return 'active'; // Azul/neón - ACCESO PERMITIDO
    return 'pending'; // Gris - EN PREPARACIÓN
  };

  const keyState = getKeyState();

  // Realtime updates
  useEffect(() => {
    if (!subscriptionId) return;

    const channel = supabase
      .channel(`subscription-${subscriptionId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'subscriptions',
          filter: `id=eq.${subscriptionId}`,
        },
        (payload) => {
          console.log('[CredentialService] Realtime update:', payload);
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [subscriptionId, refetch]);

  if (!subscriptionId) {
    return null;
  }

  // Estado de carga
  if (isLoading) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 text-sm font-semibold text-white opacity-50 cursor-not-allowed"
        aria-label="Cargando credenciales"
      >
        <Loader2 className="w-4 h-4 animate-spin" />
        {variant !== 'icon-only' && 'Cargando...'}
      </button>
    );
  }

  // Tooltip basado en estado
  const getTooltip = () => {
    if (keyState === 'expired') {
      if (credentials?.status === 'pending_approval') {
        return 'Acceso bloqueado. Tu pago está pendiente de confirmación. El admin actualizará el estado pronto.';
      }
      return 'Acceso bloqueado. Renueva tu suscripción para ver las credenciales';
    }
    if (keyState === 'pending') return 'Credenciales en preparación. El admin las entregará pronto...';
    return '✅ Acceso disponible - Haz clic para ver credenciales';
  };

  // Botón trigger con estados visuales mejorados
  const triggerButton = (
    <motion.button
      type="button"
      whileHover={{ scale: keyState !== 'expired' && keyState !== 'pending' ? 1.05 : 1 }}
      whileTap={{ scale: keyState !== 'expired' && keyState !== 'pending' ? 0.95 : 1 }}
      onClick={() => {
        if (keyState === 'expired') {
          if (credentials?.status === 'pending_approval') {
            toast.error('⏳ Acceso bloqueado. Tu pago está pendiente de confirmación por el administrador.');
          } else {
            toast.error('🔒 Acceso bloqueado. Renueva tu suscripción para ver las credenciales');
          }
          return;
        }
        if (keyState === 'pending') {
          toast.info('⏳ Tus credenciales aún están siendo preparadas. El admin las entregará pronto.');
          return;
        }
        if (keyState === 'active') {
          setIsOpen(true);
        }
      }}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl font-semibold transition-all duration-300 ${
        keyState === 'expired'
          ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed opacity-60 hover:opacity-60'
          : keyState === 'active'
          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/25 opacity-100'
          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30 cursor-not-allowed opacity-60 hover:opacity-60'
      } ${variant === 'icon-only' ? 'p-2' : 'text-sm'}`}
      title={getTooltip()}
      disabled={keyState === 'expired' || keyState === 'pending'}
      aria-label={getTooltip()}
      data-credential-blocked={keyState === 'expired'}
    >
      {keyState === 'expired' ? (
        <Lock className="w-4 h-4" />
      ) : (
        <Key className={`w-4 h-4 ${keyState === 'active' ? 'animate-pulse' : ''}`} />
      )}
      {variant !== 'icon-only' && (
        keyState === 'expired' 
          ? '🔒 Bloqueado' 
          : keyState === 'active' 
          ? '✓ Credenciales' 
          : '⏳ Pendiente'
      )}
    </motion.button>
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>

      <DialogContent className="glass border border-primary/20 sm:rounded-2xl max-w-lg backdrop-blur-2xl shadow-2xl shadow-primary/10">
        <DialogHeader>
          <DialogTitle className="font-display text-lg text-white">
            {credentials?.service_name ? `Credenciales: ${credentials.service_name}` : 'Credenciales de Acceso'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {subscriptionId ? `ID: VORTEX-${subscriptionId?.slice(0, 8)?.toUpperCase()}` : 'Acceso seguro'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-6">
          {/* Estado de error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-3"
            >
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-destructive">Error cargando credenciales</p>
                <p className="text-xs text-destructive/80">{error?.message}</p>
              </div>
            </motion.div>
          )}

          {/* Credenciales pendientes */}
          {keyState === 'pending' && !error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 text-center"
            >
              <div className="flex justify-center mb-3">
                <Key className="w-8 h-8 text-amber-400" />
              </div>
              <p className="text-sm font-semibold text-amber-300 mb-1">Credenciales en preparación</p>
              <p className="text-xs text-amber-300/70">
                Tus credenciales están siendo preparadas por el administrador. Recibirás una notificación cuando estén listas.
              </p>
            </motion.div>
          )}

          {/* Suscripción vencida */}
          {keyState === 'expired' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl border border-red-500/30 bg-red-500/5 p-6 text-center"
            >
              <div className="flex justify-center mb-3">
                <Lock className="w-8 h-8 text-red-400" />
              </div>
              <p className="text-sm font-semibold text-red-300 mb-1">Suscripción vencida</p>
              <p className="text-xs text-red-300/70">
                Tu suscripción ha expirado. Renueva tu servicio para volver a acceder a tus credenciales.
              </p>
            </motion.div>
          )}

          {/* Credenciales disponibles */}
          {keyState === 'active' && credentials && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-cyan-500/30 bg-cyan-500/5 p-4 shadow-xl shadow-cyan-500/10 space-y-3"
            >
              {trafficLightStatus === 'yellow' && (
                <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                  Tu servicio vence pronto. ¡No olvides renovar para no perder el acceso!
                </div>
              )}

              {/* Correo */}
              <CredentialField
                label="Usuario/Correo"
                value={credentials?.email_cuenta}
                copyable={true}
              />

              {/* Contraseña con toggle */}
              <CredentialField
                label="Contraseña"
                value={credentials?.password_cuenta}
                isPassword={true}
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
                copyable={true}
              />

              {/* Grid de Perfil y PIN */}
              <div className="grid grid-cols-2 gap-3">
                <CredentialField
                  label="Perfil"
                  value={credentials?.perfil}
                  copyable={true}
                />
                <CredentialField
                  label="PIN"
                  value={credentials?.pin}
                  isPassword={true}
                  showPassword={showPin}
                  onTogglePassword={() => setShowPin(!showPin)}
                  copyable={true}
                />
              </div>
            </motion.div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Componente auxiliar para cada campo de credencial
 */
interface CredentialFieldProps {
  label: string;
  value?: string | null;
  isPassword?: boolean;
  showPassword?: boolean;
  onTogglePassword?: () => void;
  copyable?: boolean;
}

const CredentialField: React.FC<CredentialFieldProps> = ({
  label,
  value,
  isPassword = false,
  showPassword = false,
  onTogglePassword,
  copyable = false,
}) => {
  const displayValue = !value ? 'Pendiente de entrega' : value;
  const isHidden = isPassword && !showPassword;
  const maskedValue = isHidden && value ? '•'.repeat(Math.min(value.length, 16)) : displayValue;

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success('¡Copiado!');
    } catch (err) {
      console.error('[CredentialService] Copy error:', err);
      toast.error('Error al copiar');
    }
  };

  return (
    <div className="space-y-1" role="group">
      <label className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground font-semibold">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleCopy}
          disabled={!value}
          className={`flex-1 px-4 py-3 rounded-2xl text-sm font-mono text-left transition-colors ${
            value
              ? 'bg-slate-950/80 hover:bg-slate-950 text-white hover:text-cyan-300 cursor-pointer'
              : 'bg-slate-950/50 text-slate-500 cursor-not-allowed'
          } break-words`}
          title={value ? 'Haz clic para copiar' : 'Pendiente'}
        >
          {maskedValue}
        </button>
        {isPassword && value && (
          <button
            type="button"
            onClick={onTogglePassword}
            className="p-2 rounded-xl hover:bg-slate-950/80 text-muted-foreground hover:text-primary transition-colors"
            aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
          >
            {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};

export default CredentialService;
