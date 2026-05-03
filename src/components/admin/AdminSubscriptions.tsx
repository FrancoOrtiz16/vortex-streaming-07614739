import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Search, Loader2, RefreshCw, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import ServiceRow, { type ServiceRowData } from './ServiceRow';
import { AdminSectionErrorBoundary } from './AdminSectionErrorBoundary';

function AdminSubscriptionsContent() {
  const [rows, setRows] = useState<ServiceRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending'>('all');
  const isMountedRef = useRef(true);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [subsRes, profilesRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('id, user_id, service_name, status, next_renewal, last_renewal, credential_email, credential_password, profile_name, profile_pin')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('user_id, display_name, email'),
      ]);

      if (subsRes.error) {
        toast.error('Error cargando suscripciones');
        console.error('[AdminSubscriptions] Subscriptions fetch error:', subsRes.error);
        if (isMountedRef.current) setRows([]);
        return;
      }

      const profileMap = new Map<string, { display_name: string | null; email: string | null }>();
      (profilesRes.data || []).forEach((p: any) => profileMap.set(p.user_id, p));

      const mapped: ServiceRowData[] = (subsRes.data || []).map((s: any) => {
        const prof = profileMap.get(s.user_id);
        return {
          id: s.id,
          user_id: s.user_id,
          service_name: s.service_name,
          status: s.status,
          next_renewal: s.next_renewal,
          last_renewal: s.last_renewal,
          credential_email: s.credential_email,
          credential_password: s.credential_password,
          profile_name: s.profile_name,
          profile_pin: s.profile_pin,
          client_label: prof?.display_name || prof?.email || s.user_id?.slice(0, 8) || 'Desconocido',
          order_id: null,
        };
      });

      if (isMountedRef.current) setRows(mapped);
    } catch (err) {
      console.error('[AdminSubscriptions] Fetch error:', err);
      toast.error('Error cargando datos');
      if (isMountedRef.current) setRows([]);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAll();
    return () => { isMountedRef.current = false; };
  }, [fetchAll]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = rows;
    if (filter === 'pending') {
      list = list.filter((r) => r.status === 'pending_approval' || r.status === 'procesando_credenciales');
    }
    if (q) {
      list = list.filter((r) =>
        r.client_label.toLowerCase().includes(q) ||
        r.service_name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, search, filter]);

  const pendingCount = useMemo(
    () => rows.filter((r) => r.status === 'pending_approval' || r.status === 'procesando_credenciales').length,
    [rows]
  );

  const activeCount = useMemo(
    () => rows.filter((r) => r.status === 'active').length,
    [rows]
  );

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-white flex items-center gap-2">
            <CalendarClock className="w-6 h-6 text-primary" />
            Gestión de Suscripciones
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Cada fila es independiente. Edita, confirma o elimina sin afectar a las demás.
          </p>
        </div>
        <button
          onClick={() => fetchAll()}
          className="p-2 rounded-lg hover:bg-secondary transition-colors"
          title="Recargar"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="relative w-full">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por cliente o servicio..."
          className="w-full rounded-xl border border-border bg-secondary/70 py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-primary transition-colors"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
            filter === 'all'
              ? 'bg-primary text-primary-foreground shadow-[0_0_20px_hsl(var(--primary)/0.3)]'
              : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
          }`}
        >
          Todas ({rows.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2 ${
            filter === 'pending'
              ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
          }`}
        >
          Confirmaciones Pendientes
          {pendingCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/20 px-1.5 text-[10px]">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs font-semibold uppercase tracking-wider hover:bg-blue-500/20 transition-all flex items-center gap-2"
          title="Suscripciones activas"
        >
          Activas
          {activeCount > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-400 px-1.5 text-[10px] text-white font-bold">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      <div className="w-full overflow-x-auto rounded-lg border border-white/10 bg-black/40">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Última</TableHead>
              <TableHead>Próxima</TableHead>
              <TableHead>Semáforo</TableHead>
              <TableHead>Contraseña</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <ServiceRow key={row.id} data={row} onChanged={fetchAll} />
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {search || filter === 'pending' 
              ? 'No se encontraron suscripciones.'
              : ''}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminSubscriptions() {
  return (
    <AdminSectionErrorBoundary sectionName="Suscripciones">
      <AdminSubscriptionsContent />
    </AdminSectionErrorBoundary>
  );
}
