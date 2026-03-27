import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { UsersSection } from '@/components/admin/UsersSection';
import { SalesSection } from '@/components/admin/SalesSection';
import { ProductsSection } from '@/components/admin/ProductsSection';
import { PaymentsSection } from '@/components/admin/PaymentsSection';
import { SubscriptionsSection } from '@/components/admin/SubscriptionsSection';
import { InventorySection } from '@/components/admin/InventorySection';
import { OrdersSection } from '@/components/admin/OrdersSection';
import { SettingsSection } from '@/components/admin/SettingsSection';

export default function AdminAccess() {
  const { user, loading, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  // If not logged in, redirect to auth
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
    }
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Logged in but not admin → access denied
  if (user && !isAdmin) {
    return <AccessDenied />;
  }

  // Admin verified → show dashboard
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AdminSidebar onSignOut={signOut} />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border px-4 glass">
            <SidebarTrigger className="mr-3" />
            <Shield className="w-4 h-4 text-primary mr-2" />
            <span className="font-display font-bold text-sm neon-text">Vortex Streaming</span>
          </header>
          <main className="flex-1 p-6 overflow-y-auto">
            <Routes>
              <Route index element={<Navigate to="users" replace />} />
              <Route path="users" element={<UsersSection />} />
              <Route path="inventory" element={<InventorySection />} />
              <Route path="orders" element={<OrdersSection />} />
              <Route path="subscriptions" element={<SubscriptionsSection />} />
              <Route path="sales" element={<SalesSection />} />
              <Route path="products" element={<ProductsSection />} />
              <Route path="payments" element={<PaymentsSection />} />
              <Route path="settings" element={<SettingsSection />} />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function AccessDenied() {
  return (
    <div className="min-h-screen flex items-center justify-center relative">
      <div className="absolute inset-0 backdrop-blur-md bg-background/80" />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 glass rounded-2xl p-8 max-w-sm w-full mx-4 text-center"
      >
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="font-display font-bold text-xl mb-2">Acceso Denegado</h2>
        <p className="text-muted-foreground text-sm mb-4">
          Tu cuenta no tiene permisos de administrador. Contacta al administrador del sistema.
        </p>
        <a
          href="/"
          className="inline-block px-4 py-2 rounded-xl gradient-neon text-primary-foreground text-sm font-semibold"
        >
          Volver al Inicio
        </a>
      </motion.div>
    </div>
  );
}
