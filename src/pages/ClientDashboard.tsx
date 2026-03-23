import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Package, Clock, CheckCircle, Key } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const mockOrders = [
  { id: 'ORD-001', product: 'Netflix Premium', date: '2026-03-20', status: 'completed' as const, code: 'NF-XXXX-YYYY' },
  { id: 'ORD-002', product: 'Free Fire 1080 Diamantes', date: '2026-03-22', status: 'pending' as const, code: null },
  { id: 'ORD-003', product: 'Spotify Premium', date: '2026-03-23', status: 'completed' as const, code: 'SP-ABCD-EFGH' },
];

const statusConfig = {
  pending: { label: 'Pendiente', icon: Clock, className: 'text-gold' },
  completed: { label: 'Completado', icon: CheckCircle, className: 'text-neon' },
};

const ClientDashboard = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Inicio
          </Link>

          <h1 className="font-display font-bold text-2xl mb-1">Mi Panel</h1>
          <p className="text-sm text-muted-foreground mb-8">Historial de pedidos y códigos.</p>

          <div className="space-y-3">
            {mockOrders.map((order, i) => {
              const s = statusConfig[order.status];
              const Icon = s.icon;
              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-muted-foreground" />
                        <span className="font-display font-semibold text-sm">{order.product}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{order.id} · {order.date}</p>
                    </div>
                    <div className={`flex items-center gap-1.5 text-xs font-medium ${s.className}`}>
                      <Icon className="w-3.5 h-3.5" />
                      {s.label}
                    </div>
                  </div>

                  {order.code && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary text-xs">
                      <Key className="w-3.5 h-3.5 text-gold" />
                      <span className="font-mono">{order.code}</span>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ClientDashboard;
