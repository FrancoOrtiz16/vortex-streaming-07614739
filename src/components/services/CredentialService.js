"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var dialog_1 = require("@/components/ui/dialog");
var useCredentialData_1 = require("@/hooks/useCredentialData");
var framer_motion_1 = require("framer-motion");
var sonner_1 = require("sonner");
var client_1 = require("@/integrations/supabase/client");
var trafficLightUtils_1 = require("@/lib/trafficLightUtils");
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
var CredentialService = function (_a) {
    var _b;
    var subscriptionId = _a.subscriptionId, serviceName = _a.serviceName, _c = _a.triggerLabel, triggerLabel = _c === void 0 ? 'Ver credenciales' : _c, _d = _a.variant, variant = _d === void 0 ? 'button' : _d;
    var _e = (0, useCredentialData_1.useCredentialData)(subscriptionId), credentials = _e.credentials, isLoading = _e.isLoading, error = _e.error, refetch = _e.refetch;
    var _f = (0, react_1.useState)(false), showPassword = _f[0], setShowPassword = _f[1];
    var _g = (0, react_1.useState)(false), showPin = _g[0], setShowPin = _g[1];
    var _h = (0, react_1.useState)(false), isOpen = _h[0], setIsOpen = _h[1];
    // Estados calculados
    var hasCredentials = (credentials === null || credentials === void 0 ? void 0 : credentials.password_cuenta) && credentials.password_cuenta.trim() !== '';
    var daysUntilExpiry = (0, trafficLightUtils_1.getDaysUntilExpiry)(credentials === null || credentials === void 0 ? void 0 : credentials.next_renewal);
    var isExpired = (credentials === null || credentials === void 0 ? void 0 : credentials.next_renewal) ? daysUntilExpiry <= 0 : false;
    var trafficLightStatus = (0, trafficLightUtils_1.getTrafficLightStatus)(credentials === null || credentials === void 0 ? void 0 : credentials.next_renewal);
    var isActiveStatus = ['active', 'Activo', 'confirmed'].includes((credentials === null || credentials === void 0 ? void 0 : credentials.status) || '');
    // ✅ SEGURIDAD: Bloqueo solo cuando vence hoy o ya está vencido
    var isVencido = isExpired || (credentials === null || credentials === void 0 ? void 0 : credentials.status) === 'expired';
    // Estado visual del icono
    var getKeyState = function () {
        if (isVencido)
            return 'expired'; // Rojo/candado - BLOQUEADO
        if (hasCredentials && !isExpired)
            return 'active'; // Mantener acceso mientras la suscripción sigue vigente
        if (isActiveStatus && hasCredentials)
            return 'active'; // Azul/neón - ACCESO PERMITIDO
        return 'pending'; // Gris - EN PREPARACIÓN
    };
    var keyState = getKeyState();
    // Realtime updates
    (0, react_1.useEffect)(function () {
        if (!subscriptionId)
            return;
        var channel = client_1.supabase
            .channel("subscription-".concat(subscriptionId))
            .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'subscriptions',
            filter: "id=eq.".concat(subscriptionId),
        }, function (payload) {
            console.log('[CredentialService] Realtime update:', payload);
            refetch();
        })
            .subscribe();
        return function () {
            client_1.supabase.removeChannel(channel);
        };
    }, [subscriptionId, refetch]);
    if (!subscriptionId) {
        return null;
    }
    // Estado de carga
    if (isLoading) {
        return (<button disabled className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 text-sm font-semibold text-white opacity-50 cursor-not-allowed" aria-label="Cargando credenciales">
        <lucide_react_1.Loader2 className="w-4 h-4 animate-spin"/>
        {variant !== 'icon-only' && 'Cargando...'}
      </button>);
    }
    // Tooltip basado en estado
    var getTooltip = function () {
        if (keyState === 'expired') {
            if ((credentials === null || credentials === void 0 ? void 0 : credentials.status) === 'pending_approval') {
                return 'Acceso bloqueado. Tu pago está pendiente de confirmación. El admin actualizará el estado pronto.';
            }
            return 'Acceso bloqueado. Renueva tu suscripción para ver las credenciales';
        }
        if (keyState === 'pending')
            return 'Credenciales en preparación. El admin las entregará pronto...';
        return '✅ Acceso disponible - Haz clic para ver credenciales';
    };
    // Botón trigger con estados visuales mejorados
    var triggerButton = (<framer_motion_1.motion.button type="button" whileHover={{ scale: keyState !== 'expired' && keyState !== 'pending' ? 1.05 : 1 }} whileTap={{ scale: keyState !== 'expired' && keyState !== 'pending' ? 0.95 : 1 }} onClick={function () {
            if (keyState === 'expired') {
                if ((credentials === null || credentials === void 0 ? void 0 : credentials.status) === 'pending_approval') {
                    sonner_1.toast.error('⏳ Acceso bloqueado. Tu pago está pendiente de confirmación por el administrador.');
                }
                else {
                    sonner_1.toast.error('🔒 Acceso bloqueado. Renueva tu suscripción para ver las credenciales');
                }
                return;
            }
            if (keyState === 'pending') {
                sonner_1.toast.info('⏳ Tus credenciales aún están siendo preparadas. El admin las entregará pronto.');
                return;
            }
            if (keyState === 'active') {
                setIsOpen(true);
            }
        }} className={"inline-flex items-center gap-2 px-3 py-2 rounded-xl font-semibold transition-all duration-300 ".concat(keyState === 'expired'
            ? 'bg-red-500/20 text-red-400 border border-red-500/30 cursor-not-allowed opacity-60 hover:opacity-60'
            : keyState === 'active'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 hover:bg-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/25 opacity-100'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30 cursor-not-allowed opacity-60 hover:opacity-60', " ").concat(variant === 'icon-only' ? 'p-2' : 'text-sm')} title={getTooltip()} disabled={keyState === 'expired' || keyState === 'pending'} aria-label={getTooltip()} data-credential-blocked={keyState === 'expired'}>
      {keyState === 'expired' ? (<lucide_react_1.Lock className="w-4 h-4"/>) : (<lucide_react_1.Key className={"w-4 h-4 ".concat(keyState === 'active' ? 'animate-pulse' : '')}/>)}
      {variant !== 'icon-only' && (keyState === 'expired'
            ? '🔒 Bloqueado'
            : keyState === 'active'
                ? '✓ Credenciales'
                : '⏳ Pendiente')}
    </framer_motion_1.motion.button>);
    return (<dialog_1.Dialog open={isOpen} onOpenChange={setIsOpen}>
      <dialog_1.DialogTrigger asChild>
        {triggerButton}
      </dialog_1.DialogTrigger>

      <dialog_1.DialogContent className="glass border border-primary/20 sm:rounded-2xl max-w-lg backdrop-blur-2xl shadow-2xl shadow-primary/10">
        <dialog_1.DialogHeader>
          <dialog_1.DialogTitle className="font-display text-lg text-white">
            {(credentials === null || credentials === void 0 ? void 0 : credentials.service_name) ? "Credenciales: ".concat(credentials.service_name) : 'Credenciales de Acceso'}
          </dialog_1.DialogTitle>
          <dialog_1.DialogDescription className="text-sm text-muted-foreground">
            {subscriptionId ? "ID: VORTEX-".concat((_b = subscriptionId === null || subscriptionId === void 0 ? void 0 : subscriptionId.slice(0, 8)) === null || _b === void 0 ? void 0 : _b.toUpperCase()) : 'Acceso seguro'}
          </dialog_1.DialogDescription>
        </dialog_1.DialogHeader>

        <div className="space-y-4 mt-6">
          {/* Estado de error */}
          {error && (<framer_motion_1.motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3 flex items-start gap-3">
              <lucide_react_1.AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5"/>
              <div>
                <p className="text-sm font-semibold text-destructive">Error cargando credenciales</p>
                <p className="text-xs text-destructive/80">{error === null || error === void 0 ? void 0 : error.message}</p>
              </div>
            </framer_motion_1.motion.div>)}

          {/* Credenciales pendientes */}
          {keyState === 'pending' && !error && (<framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
              <div className="flex justify-center mb-3">
                <lucide_react_1.Key className="w-8 h-8 text-amber-400"/>
              </div>
              <p className="text-sm font-semibold text-amber-300 mb-1">Credenciales en preparación</p>
              <p className="text-xs text-amber-300/70">
                Tus credenciales están siendo preparadas por el administrador. Recibirás una notificación cuando estén listas.
              </p>
            </framer_motion_1.motion.div>)}

          {/* Suscripción vencida */}
          {keyState === 'expired' && (<framer_motion_1.motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded-3xl border border-red-500/30 bg-red-500/5 p-6 text-center">
              <div className="flex justify-center mb-3">
                <lucide_react_1.Lock className="w-8 h-8 text-red-400"/>
              </div>
              <p className="text-sm font-semibold text-red-300 mb-1">Suscripción vencida</p>
              <p className="text-xs text-red-300/70">
                Tu suscripción ha expirado. Renueva tu servicio para volver a acceder a tus credenciales.
              </p>
            </framer_motion_1.motion.div>)}

          {/* Credenciales disponibles */}
          {keyState === 'active' && credentials && (<framer_motion_1.motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-cyan-500/30 bg-cyan-500/5 p-4 shadow-xl shadow-cyan-500/10 space-y-3">
              {trafficLightStatus === 'yellow' && (<div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-100">
                  Tu servicio vence pronto. ¡No olvides renovar para no perder el acceso!
                </div>)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-cyan-500/30 bg-cyan-500/5 p-4 shadow-xl shadow-cyan-500/10 space-y-3"
            >
              {/* Correo */}
              <CredentialField label="Usuario/Correo" value={credentials === null || credentials === void 0 ? void 0 : credentials.email_cuenta} copyable={true}/>

              {/* Contraseña con toggle */}
              <CredentialField label="Contraseña" value={credentials === null || credentials === void 0 ? void 0 : credentials.password_cuenta} isPassword={true} showPassword={showPassword} onTogglePassword={function () { return setShowPassword(!showPassword); }} copyable={true}/>

              {/* Grid de Perfil y PIN */}
              <div className="grid grid-cols-2 gap-3">
                <CredentialField label="Perfil" value={credentials === null || credentials === void 0 ? void 0 : credentials.perfil} copyable={true}/>
                <CredentialField label="PIN" value={credentials === null || credentials === void 0 ? void 0 : credentials.pin} isPassword={true} showPassword={showPin} onTogglePassword={function () { return setShowPin(!showPin); }} copyable={true}/>
              </div>
            </framer_motion_1.motion.div>)}
        </div>
      </dialog_1.DialogContent>
    </dialog_1.Dialog>);
};
var CredentialField = function (_a) {
    var label = _a.label, value = _a.value, _b = _a.isPassword, isPassword = _b === void 0 ? false : _b, _c = _a.showPassword, showPassword = _c === void 0 ? false : _c, onTogglePassword = _a.onTogglePassword, _d = _a.copyable, copyable = _d === void 0 ? false : _d;
    var displayValue = !value ? 'Pendiente de entrega' : value;
    var isHidden = isPassword && !showPassword;
    var maskedValue = isHidden && value ? '•'.repeat(Math.min(value.length, 16)) : displayValue;
    var handleCopy = function () { return __awaiter(void 0, void 0, void 0, function () {
        var err_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!value)
                        return [2 /*return*/];
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, navigator.clipboard.writeText(value)];
                case 2:
                    _a.sent();
                    sonner_1.toast.success('¡Copiado!');
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _a.sent();
                    console.error('[CredentialService] Copy error:', err_1);
                    sonner_1.toast.error('Error al copiar');
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    }); };
    return (<div className="space-y-1" role="group">
      <label className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground font-semibold">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <button type="button" onClick={handleCopy} disabled={!value} className={"flex-1 px-4 py-3 rounded-2xl text-sm font-mono text-left transition-colors ".concat(value
            ? 'bg-slate-950/80 hover:bg-slate-950 text-white hover:text-cyan-300 cursor-pointer'
            : 'bg-slate-950/50 text-slate-500 cursor-not-allowed', " break-words")} title={value ? 'Haz clic para copiar' : 'Pendiente'}>
          {maskedValue}
        </button>
        {isPassword && value && (<button type="button" onClick={onTogglePassword} className="p-2 rounded-xl hover:bg-slate-950/80 text-muted-foreground hover:text-primary transition-colors" aria-label={showPassword ? 'Ocultar' : 'Mostrar'}>
            {isHidden ? <lucide_react_1.EyeOff className="w-4 h-4"/> : <lucide_react_1.Eye className="w-4 h-4"/>}
          </button>)}
      </div>
    </div>);
};
exports.default = CredentialService;
