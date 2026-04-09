import { Key } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { CredentialRecord } from '@/types_v2';

export interface CredentialKeyModalProps {
  records?: CredentialRecord[];
  serviceName?: string;
  subscriptionId?: string;
  triggerLabel?: string;
}

const normalizeComboRecords = (records: CredentialRecord[] = [], serviceName?: string) => {
  const baseRecords = records.length > 0 ? records : [{ service_name: serviceName }];

  if (baseRecords.length === 1 && baseRecords[0]?.service_name?.includes('+')) {
    const parts = baseRecords[0].service_name.split('+').map(part => part.trim()).filter(Boolean);

    return parts.map((service, index) => ({
      service_name: service,
      email_cuenta: baseRecords[0]?.email_cuenta,
      password_cuenta: baseRecords[0]?.password_cuenta,
      perfil: baseRecords[0]?.perfil,
      pin: baseRecords[0]?.pin,
      comboIndex: index,
    } as CredentialRecord & { comboIndex: number }));
  }

  return baseRecords;
};

export default function CredentialKeyModal({ records = [], serviceName, subscriptionId, triggerLabel }: CredentialKeyModalProps) {
  const displayRecords = normalizeComboRecords(records, serviceName);
  const isCombo = displayRecords.length > 1;
  const title = isCombo ? `Combo de acceso` : `Credenciales de ${serviceName ?? 'servicio'}`;
  const description = subscriptionId ? `ID: VORTEX-${subscriptionId.slice(0, 8).toUpperCase()}` : 'Acceso seguro a credenciales';

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/70 text-sm font-semibold text-white hover:bg-secondary transition-colors"
          aria-label="Abrir credenciales"
        >
          <Key className="w-4 h-4" />
          {triggerLabel ?? 'Ver credenciales'}
        </button>
      </DialogTrigger>
      <DialogContent className="glass border-border sm:rounded-2xl max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {displayRecords.map((record, index) => (
            <div key={`${record.service_name ?? 'servicio'}-${index}`} className="rounded-3xl border border-white/10 bg-black/50 p-4 shadow-xl shadow-cyan-500/5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground mb-1">Servicio</p>
                  <p className="text-sm font-semibold text-white">{record.service_name ?? serviceName ?? 'Servicio'}</p>
                </div>
                {isCombo && <span className="rounded-full bg-primary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-primary">Plataforma {index + 1}</span>}
              </div>

              <div className="grid gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Correo</p>
                  <p className="rounded-2xl bg-slate-950/80 px-4 py-3 text-sm text-white break-words">{record.email_cuenta ?? 'Pendiente de entrega'}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Contraseña</p>
                  <p className="rounded-2xl bg-slate-950/80 px-4 py-3 text-sm text-white break-words">{record.password_cuenta ?? 'Pendiente de entrega'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Perfil</p>
                    <p className="rounded-2xl bg-slate-950/80 px-4 py-3 text-sm text-white break-words">{record.perfil ?? 'Pendiente de entrega'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">PIN</p>
                    <p className="rounded-2xl bg-slate-950/80 px-4 py-3 text-sm text-white break-words">{record.pin ?? 'Pendiente de entrega'}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
