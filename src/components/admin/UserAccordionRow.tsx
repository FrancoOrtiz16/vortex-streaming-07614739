import { useState } from 'react';
import { ChevronDown, Eye, Edit, MessageCircle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Subscription {
  id: string;
  service_name: string;
  status: string;
  next_renewal: string | null;
  password: string | null;
}

interface UserAccordionRowProps {
  userId: string;
  userName: string;
  userEmail: string;
  subscriptions: Subscription[];
  isExpanded: boolean;
  onToggle: () => void;
  onViewPassword?: (subscriptionId: string) => void;
  onEditSubscription?: (subscriptionId: string) => void;
  onNotifyWhatsapp?: (subscriptionId: string) => void;
  onDeleteSubscription?: (subscriptionId: string) => void;
}

export function UserAccordionRow({
  userId,
  userName,
  userEmail,
  subscriptions,
  isExpanded,
  onToggle,
  onViewPassword,
  onEditSubscription,
  onNotifyWhatsapp,
  onDeleteSubscription,
}: UserAccordionRowProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .slice(0, 2)
      .map(part => part[0].toUpperCase())
      .join('')
      .slice(0, 2);
  };

  const hasExpiringSubscriptions = subscriptions.some(sub => {
    if (!sub.next_renewal) return false;
    const daysUntilRenewal = Math.ceil(
      (new Date(sub.next_renewal).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilRenewal <= 5 && daysUntilRenewal > 0;
  });

  const getDaysUntilRenewal = (nextRenewal: string | null) => {
    if (!nextRenewal) return null;
    return Math.ceil((new Date(nextRenewal).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const getStatusChipColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/20 text-emerald-400';
      case 'pending':
        return 'bg-amber-500/20 text-amber-400';
      case 'expired':
        return 'bg-red-500/20 text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className="mb-2">
      {/* User Row */}
      <div
        className="flex items-center justify-between p-4 border transition-all hover:bg-secondary cursor-pointer"
        onClick={onToggle}
        style={{
          borderColor: 'var(--color-border-tertiary)',
          borderWidth: '0.5px',
          borderRadius: '8px',
        }}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Avatar */}
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
            style={{
              backgroundColor: `hsl(var(--color-background-info))`,
            }}
          >
            {getInitials(userName)}
          </div>

          {/* User Info */}
          <div className="flex-1 min-w-0">
            <p className="text-13px font-medium truncate">{userName}</p>
            <p className="text-[11px] opacity-60 truncate">{userEmail}</p>
          </div>

          {/* Badge & Warning */}
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="text-[11px] font-medium px-2 py-1 rounded-full"
              style={{
                backgroundColor: 'var(--admin-primary-blue)',
                color: 'white',
                opacity: 0.8,
              }}
            >
              {subscriptions.length} {subscriptions.length === 1 ? 'suscripción' : 'suscripciones'}
            </span>

            {hasExpiringSubscriptions && (
              <span
                className="text-[11px] font-medium px-2 py-1 rounded-full"
                style={{
                  backgroundColor: '#F59E0B',
                  color: 'white',
                }}
              >
                Vence pronto
              </span>
            )}
          </div>
        </div>

        {/* Expand Button */}
        <motion.button
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-3 p-1 hover:bg-secondary rounded-lg shrink-0"
        >
          <ChevronDown className="w-4 h-4" />
        </motion.button>
      </div>

      {/* Expanded Subscriptions Table */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-6 mt-2 p-4 bg-secondary/20 border" style={{ borderColor: 'var(--color-border-tertiary)', borderWidth: '0.5px', borderRadius: '8px' }}>
              {subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin suscripciones activas</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="admin-table w-full">
                    <thead>
                      <tr>
                        <th>Servicio</th>
                        <th>Estado</th>
                        <th>Próxima renovación</th>
                        <th>Semáforo</th>
                        <th>Contraseña</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map((sub) => {
                        const daysUntil = getDaysUntilRenewal(sub.next_renewal);
                        const isExpiringSoon = daysUntil !== null && daysUntil <= 5 && daysUntil > 0;

                        return (
                          <tr key={sub.id}>
                            <td className="font-medium">{sub.service_name}</td>
                            <td>
                              <span className={`status-chip ${getStatusChipColor(sub.status)}`}>
                                {sub.status === 'active' && 'Activa'}
                                {sub.status === 'pending' && 'Pendiente'}
                                {sub.status === 'expired' && 'Vencida'}
                              </span>
                            </td>
                            <td>
                              {sub.next_renewal
                                ? new Date(sub.next_renewal).toLocaleDateString('es-VE')
                                : '—'}
                            </td>
                            <td>
                              {daysUntil !== null && (
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[12px] font-medium`}
                                  style={{
                                    backgroundColor: isExpiringSoon ? '#FEF3C7' : '#D1FAE5',
                                    color: isExpiringSoon ? '#92400E' : '#065F46',
                                  }}
                                >
                                  <span
                                    className="w-2 h-2 rounded-full"
                                    style={{
                                      backgroundColor: isExpiringSoon ? '#F59E0B' : '#10B981',
                                    }}
                                  />
                                  {daysUntil} {daysUntil === 1 ? 'día' : 'días'}
                                </span>
                              )}
                            </td>
                            <td>
                              {sub.password && sub.password !== '' ? (
                                <span className="text-muted-foreground">••••••</span>
                              ) : (
                                <span className="text-muted-foreground text-sm">No disponible</span>
                              )}
                            </td>
                            <td>
                              <div className="flex items-center gap-2">
                                <button
                                  className="admin-icon-button"
                                  onClick={() => onViewPassword?.(sub.id)}
                                  title="Ver contraseña"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  className="admin-icon-button"
                                  onClick={() => onEditSubscription?.(sub.id)}
                                  title="Editar"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                {isExpiringSoon && (
                                  <button
                                    className="admin-icon-button"
                                    onClick={() => onNotifyWhatsapp?.(sub.id)}
                                    title="Notificar por WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  className="admin-icon-button danger"
                                  onClick={() => onDeleteSubscription?.(sub.id)}
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
