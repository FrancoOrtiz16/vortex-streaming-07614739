import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Loader2, Plus, Download, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { KPICardsGrid } from './KPICardsGrid';
import { UserAccordionRow } from './UserAccordionRow';
import { useAdminTopbar } from './AdminTopbarContext';

interface UserWithSubscriptions {
  userId: string;
  userName: string;
  userEmail: string;
  subscriptions: Array<{
    id: string;
    service_name: string;
    status: string;
    next_renewal: string | null;
    password: string | null;
  }>;
}

export default function AdminSubscriptionsNew() {
  const { setTopbarContent } = useAdminTopbar();
  const [users, setUsers] = useState<UserWithSubscriptions[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserWithSubscriptions[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [expandAll, setExpandAll] = useState(false);

  // Load data
  const fetchData = async () => {
    try {
      setLoading(true);
      const [subsRes, profilesRes] = await Promise.all([
        supabase
          .from('subscriptions')
          .select('id, user_id, service_name, status, next_renewal, credential_password')
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('user_id, display_name, email'),
      ]);

      if (subsRes.error) throw subsRes.error;

      const profiles = new Map<string, { name: string; email: string }>();
      (profilesRes.data || []).forEach((p: any) => {
        profiles.set(p.user_id, {
          name: p.display_name || 'Usuario',
          email: p.email || '',
        });
      });

      // Group subscriptions by user
      const userMap = new Map<string, UserWithSubscriptions>();
      
      (subsRes.data || []).forEach((sub: any) => {
        const profile = profiles.get(sub.user_id);
        const userName = profile?.name || 'Usuario';
        const userEmail = profile?.email || '';

        if (!userMap.has(sub.user_id)) {
          userMap.set(sub.user_id, {
            userId: sub.user_id,
            userName,
            userEmail,
            subscriptions: [],
          });
        }

        userMap.get(sub.user_id)!.subscriptions.push({
          id: sub.id,
          service_name: sub.service_name,
          status: sub.status,
          next_renewal: sub.next_renewal,
          password: sub.credential_password,
        });
      });

      const usersArray = Array.from(userMap.values());
      setUsers(usersArray);
      setFilteredUsers(usersArray);
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      toast.error('Error al cargar suscripciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Calculate KPI metrics
  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const totalSubscriptions = users.reduce((sum, u) => sum + u.subscriptions.length, 0);
    
    const expiringCount = users.reduce((sum, u) => {
      return sum + u.subscriptions.filter(sub => {
        if (!sub.next_renewal) return false;
        const daysUntil = Math.ceil((new Date(sub.next_renewal).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return daysUntil <= 5 && daysUntil > 0;
      }).length;
    }, 0);

    const pendingCount = users.reduce((sum, u) => {
      return sum + u.subscriptions.filter(sub => sub.status === 'pending').length;
    }, 0);

    return [
      { label: 'Usuarios con suscripción', value: totalUsers.toString() },
      { label: 'Suscripciones activas', value: totalSubscriptions.toString() },
      { label: 'Vencen en ≤5d', value: expiringCount.toString() },
      { label: 'Pendientes de pago', value: pendingCount.toString() },
    ];
  }, [users]);

  // Handle search
  useEffect(() => {
    if (!search.trim()) {
      setFilteredUsers(users);
      return;
    }

    const query = search.toLowerCase();
    const filtered = users.filter(user => {
      const matchesUser = 
        user.userName.toLowerCase().includes(query) ||
        user.userEmail.toLowerCase().includes(query);
      const matchesService = user.subscriptions.some(sub =>
        sub.service_name.toLowerCase().includes(query)
      );
      return matchesUser || matchesService;
    });

    setFilteredUsers(filtered);
  }, [search, users]);

  // Update topbar
  useEffect(() => {
    setTopbarContent({
      title: 'Suscripciones',
      subtitle: `${filteredUsers.length} ${filteredUsers.length === 1 ? 'usuario' : 'usuarios'}`,
      syncStatus: 'synced',
    });
  }, [filteredUsers.length, setTopbarContent]);

  // Toggle expand all
  const handleExpandAll = () => {
    if (expandAll) {
      setExpandedUsers(new Set());
    } else {
      setExpandedUsers(new Set(filteredUsers.map(u => u.userId)));
    }
    setExpandAll(!expandAll);
  };

  return (
    <div>
      {/* KPI Cards */}
      <KPICardsGrid cards={metrics} />

      {/* Search & Actions */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 flex items-center gap-2 px-4 py-2 rounded-lg border" style={{ borderColor: 'var(--color-border-tertiary)', borderWidth: '0.5px' }}>
          <Search className="w-4 h-4 opacity-50" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o servicio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm"
          />
        </div>

        <button
          onClick={handleExpandAll}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-secondary"
          style={{ borderColor: 'var(--color-border-tertiary)', borderWidth: '0.5px' }}
        >
          {expandAll ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {expandAll ? 'Contraer todo' : 'Expandir todo'}
        </button>

        <button
          onClick={() => toast.info('Exportar en desarrollo')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors hover:bg-secondary"
          style={{ borderColor: 'var(--color-border-tertiary)', borderWidth: '0.5px' }}
        >
          <Download className="w-4 h-4" />
          Exportar
        </button>

        <button
          onClick={() => toast.info('Crear en desarrollo')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--admin-primary-blue)' }}
        >
          <Plus className="w-4 h-4" />
          Crear
        </button>
      </div>

      {/* Users Accordion */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No se encontraron suscripciones</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((user) => (
            <UserAccordionRow
              key={user.userId}
              userId={user.userId}
              userName={user.userName}
              userEmail={user.userEmail}
              subscriptions={user.subscriptions}
              isExpanded={expandedUsers.has(user.userId)}
              onToggle={() => {
                const newSet = new Set(expandedUsers);
                if (newSet.has(user.userId)) {
                  newSet.delete(user.userId);
                } else {
                  newSet.add(user.userId);
                }
                setExpandedUsers(newSet);
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
