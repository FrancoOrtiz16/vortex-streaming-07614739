import React, { useState } from 'react';
import { Key, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCredentialData } from '@/hooks/useCredentialData';
import { motion } from 'framer-motion';

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
  const { credentials, isLoading, error, isReady } = useCredentialData(subscriptionId);
  const [showPassword, setShowPassword] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

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

  // Botón trigger
  const triggerButton = (
    <motion.button
      type="button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl font-semibold transition-colors ${
        variant === 'icon-only'
          ? 'text-primary hover:text-primary/80'
          : 'bg-secondary/70 text-sm text-white hover:bg-secondary'
      }`}
      aria-label="Abrir credenciales"
    >
      <Key className="w-4 h-4" />
      {variant !== 'icon-only' && triggerLabel}
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
          {!isReady && !error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 text-center"
            >
              <div className="flex justify-center mb-3">
                <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-amber-300 mb-1">Credenciales en preparación</p>
              <p className="text-xs text-amber-300/70">
                Tus credenciales están siendo preparadas. Por favor espera a que el administrador las confirme.
              </p>
            </motion.div>
          )}

          {/* Credenciales lista */}
          {isReady && credentials && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-white/10 bg-black/50 p-4 shadow-xl shadow-cyan-500/5 space-y-3"
            >
              {/* Correo */}
              <CredentialField
                label="Correo"
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
      // Feedback visual breve podría añadirse aquí
    } catch (err) {
      console.error('[CredentialService] Copy error:', err);
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
