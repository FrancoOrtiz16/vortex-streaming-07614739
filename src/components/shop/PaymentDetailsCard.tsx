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
 * Parsea el account_info y extrae los detalles de pago estructurados
 * Intenta identificar: Teléfono/Número de Cuenta, Cédula/RIF, Banco, Nombre del Titular
 */
function parsePaymentDetails(accountInfo: string): PaymentDetail[] {
  const lines = accountInfo
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const details: PaymentDetail[] = [];
  const patterns = {
    phone: /^(\+?\d{1,3}[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}$/,
    cedula: /^[VE][-.]?\d{1,3}\.?\d{1,3}\.?\d{3,4}$/,
    account: /^\d{10,20}$/,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  };

  const fieldLabels = {
    phone: '📱 Teléfono / Número de Cuenta',
    cedula: '🆔 Cédula / RIF',
    account: '💳 Número de Cuenta',
    email: '📧 Email',
    bank: '🏦 Banco',
    holder: '👤 Nombre del Titular',
  };

  lines.forEach((line) => {
    let matched = false;

    // Detectar teléfono
    if (patterns.phone.test(line) && !details.find(d => d.label.includes('Teléfono'))) {
      details.push({
        label: fieldLabels.phone,
        value: line,
      });
      matched = true;
    }
    // Detectar cédula/RIF
    else if (patterns.cedula.test(line) && !details.find(d => d.label.includes('Cédula'))) {
      details.push({
        label: fieldLabels.cedula,
        value: line,
      });
      matched = true;
    }
    // Detectar email
    else if (patterns.email.test(line) && !details.find(d => d.label.includes('Email'))) {
      details.push({
        label: fieldLabels.email,
        value: line,
      });
      matched = true;
    }
    // Detectar número de cuenta
    else if (patterns.account.test(line) && !details.find(d => d.label.includes('Cuenta'))) {
      details.push({
        label: fieldLabels.account,
        value: line,
      });
      matched = true;
    }

    // Si no es un patrón reconocible, mostrar como dato genérico
    if (!matched) {
      const lowerLine = line.toLowerCase();

      if (lowerLine.includes('banco') || lowerLine.includes('bank')) {
        if (!details.find(d => d.label.includes('Banco'))) {
          const value = line.replace(/banco[:\s]*/i, '').trim();
          details.push({
            label: fieldLabels.bank,
            value,
          });
        }
      } else if (
        lowerLine.includes('titular') ||
        lowerLine.includes('nombre') ||
        lowerLine.includes('propietario')
      ) {
        if (!details.find(d => d.label.includes('Titular'))) {
          const value = line.replace(/(titular|nombre|propietario)[:\s]*/i, '').trim();
          details.push({
            label: fieldLabels.holder,
            value,
          });
        }
      } else {
        // Dato genérico - mostrar tal como está
        details.push({
          label: line.split(':')[0].trim(),
          value: line.split(':').slice(1).join(':').trim() || line,
        });
      }
    }
  });

  return details;
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
    <div className="space-y-4">
      {/* Header con nombre del método */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-semibold text-base text-foreground">
              {methodName}
            </h3>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-0.5">
              {methodType}
            </p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-lg font-bold">
            {methodName.charAt(0)}
          </div>
        </div>
      </div>

      {/* Detalles estructurados */}
      <div className="space-y-2">
        {details.map((detail, idx) => (
          <div
            key={idx}
            className="group rounded-lg border border-border/40 bg-background/40 hover:bg-background/60 hover:border-primary/30 p-3 sm:p-4 transition-all duration-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  {detail.label}
                </p>
                <code className="block text-sm sm:text-base font-mono text-foreground break-all word-break">
                  {detail.value}
                </code>
              </div>

              {/* Botón de copiar elegante */}
              <button
                onClick={() => handleCopy(detail.value, idx)}
                className="flex-shrink-0 p-2 sm:p-2.5 rounded-lg bg-secondary/40 border border-border/40 hover:bg-primary/20 hover:border-primary/40 transition-all duration-200 opacity-0 group-hover:opacity-100 sm:opacity-100 focus:opacity-100"
                title="Copiar valor"
                aria-label={`Copiar ${detail.label}`}
              >
                {copiedIndex === idx ? (
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground hover:text-foreground transition-colors" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Instrucciones adicionales (si existen) */}
      {instructions && (
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 sm:p-4">
          <p className="text-xs font-medium text-amber-200 uppercase tracking-wider mb-2">
            📝 Instrucciones
          </p>
          <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed break-all">
            {instructions}
          </p>
        </div>
      )}

      {/* Nota de seguridad */}
      <div className="rounded-lg border border-slate-500/20 bg-slate-500/5 p-3">
        <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold">💡 Tip:</span> Haz clic o toca un campo para copiar directamente al portapapeles.
        </p>
      </div>
    </div>
  );
};

export default PaymentDetailsCard;
