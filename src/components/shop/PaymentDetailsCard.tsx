import { Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface PaymentDetail {
  label: string;
  value: string;
  icon?: string;
}

interface PaymentDetailsCardProps {
  methodName: string;
  methodType: string;
  accountInfo: string;
  instructions?: string | null;
  onCopy?: (value: string) => void;
}

/**
 * Parsea el account_info y extrae los detalles de Pago Móvil en filas separadas.
 * Prioriza Cédula, Teléfono y Banco, pero conserva otros datos si existen.
 */
function parsePaymentDetails(accountInfo: string): PaymentDetail[] {
  const rawFields = accountInfo
    .split(/\n|,/) // soporta líneas y comas como separadores
    .map((field) => field.trim())
    .filter(Boolean);

  const patterns = {
    phone: /^(?:\+?\d{1,3}[-.\s]?)?\d{7,14}$/, 
    cedula: /^[VE]\.?\s?\d{1,3}\.?\d{1,3}\.\d{3,4}$/i,
    account: /^\d{10,20}$/, 
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  };

  const normalized: Record<string, PaymentDetail | undefined> = {};
  const generic: PaymentDetail[] = [];

  rawFields.forEach((field) => {
    const normalizedField = field.replace(/\s+/g, ' ').trim();
    if (!normalizedField) return;

    const [keyRaw, ...rest] = normalizedField.split(':');
    const labelCandidate = keyRaw.trim();
    const valueCandidate = rest.length > 0 ? rest.join(':').trim() : normalizedField;
    const lower = normalizedField.toLowerCase();

    const trySet = (key: string, label: string, value: string) => {
      if (!normalized[key]) {
        normalized[key] = {
          label,
          value: value.trim(),
        };
      }
    };

    if (/\b(cedula|cédula|rif|identidad|id)\b/i.test(lower)) {
      trySet('cedula', 'Cédula', valueCandidate || labelCandidate);
      return;
    }

    if (/\b(teléfono|telefono|phone|whatsapp|celular|movil)\b/i.test(lower)) {
      trySet('phone', 'Teléfono', valueCandidate || labelCandidate);
      return;
    }

    if (/\b(banco|bank)\b/i.test(lower)) {
      trySet('bank', 'Banco', valueCandidate || labelCandidate);
      return;
    }

    if (/\b(titular|nombre|propietario)\b/i.test(lower)) {
      trySet('holder', 'Titular', valueCandidate || labelCandidate);
      return;
    }

    if (patterns.email.test(valueCandidate) && !normalized.email) {
      trySet('email', 'Email', valueCandidate);
      return;
    }

    if (patterns.cedula.test(valueCandidate) && !normalized.cedula) {
      trySet('cedula', 'Cédula', valueCandidate);
      return;
    }

    if (patterns.phone.test(valueCandidate) && !normalized.phone) {
      trySet('phone', 'Teléfono', valueCandidate);
      return;
    }

    if (patterns.account.test(valueCandidate) && !normalized.account) {
      trySet('account', 'Número de Cuenta', valueCandidate);
      return;
    }

    generic.push({
      label: labelCandidate === valueCandidate ? 'Detalle' : labelCandidate,
      value: valueCandidate,
    });
  });

  const orderedKeys = ['cedula', 'phone', 'bank', 'holder', 'email', 'account'];
  const details: PaymentDetail[] = orderedKeys
    .map((key) => normalized[key])
    .filter(Boolean) as PaymentDetail[];

  return [...details, ...generic];
}
const PaymentDetailsCard = ({
  methodName,
  methodType,
  accountInfo,
  instructions,
  onCopy,
}: PaymentDetailsCardProps) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const details = parsePaymentDetails(accountInfo);

  const handleCopy = (value: string, index: number) => {
    navigator.clipboard.writeText(value);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success('¡Copiado!');
    onCopy?.(value);
  };

  return (
    <div className="space-y-3">
      {/* Header con nombre del método */}
      <div className="rounded-2xl border border-slate-700/50 bg-slate-950/80 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-semibold text-sm text-foreground">
              {methodName}
            </h3>
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.25em] mt-0.5">
              {methodType}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-base font-bold">
            {methodName.charAt(0)}
          </div>
        </div>
      </div>

      {/* Detalles estructurados */}
      <div className="space-y-2">
        {details.map((detail, idx) => (
          <div
            key={idx}
            className="group rounded-2xl border border-slate-700/50 bg-slate-900/70 p-2 sm:p-3 transition-all duration-200"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-[0.22em] mb-1">
                  {detail.label}
                </p>
                <code className="block text-sm font-mono text-foreground break-all leading-snug">
                  {detail.value}
                </code>
              </div>

              {/* Botón de copiar adaptado a móvil */}
              <button
                onClick={() => handleCopy(detail.value, idx)}
                className="flex-shrink-0 inline-flex items-center justify-center rounded-2xl bg-slate-800/80 border border-slate-700/70 hover:bg-primary/20 hover:border-primary/40 transition-all duration-200 min-h-[44px] min-w-[44px] p-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                title="Copiar valor"
                aria-label={`Copiar ${detail.label}`}
              >
                {copiedIndex === idx ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-300 hover:text-foreground transition-colors" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Instrucciones adicionales (si existen) */}
      {instructions && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2 sm:p-3">
          <p className="text-[10px] font-medium text-amber-200 uppercase tracking-[0.22em] mb-1">
            📝 Instrucciones
          </p>
          <p className="text-[11px] text-foreground/90 leading-snug break-all">
            {instructions}
          </p>
        </div>
      )}
    </div>
  );
};

export default PaymentDetailsCard;
