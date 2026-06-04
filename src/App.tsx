import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Suspense, lazy, useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CurrencyProvider } from '@/context/CurrencyContext';
import EmergencyErrorBoundary from "./components/EmergencyErrorBoundary";
import Index from "./pages/Index";
import BannedGuard from "./components/BannedGuard";

// Lazy load heavy components
const ClientDashboard = lazy(() => import("./pages/ClientDashboard"));
const AdminAccess = lazy(() => import("./pages/AdminAccess"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const Catalog = lazy(() => import("./pages/Catalog"));
const ProfilePage = lazy(() => import("./pages/Profile"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const saveData = connection?.saveData;
    const slowNetwork = typeof connection?.effectiveType === 'string' && /2g|3g|slow-2g/.test(connection.effectiveType);
    const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia?.('(max-width: 768px)').matches;

    if (saveData || slowNetwork || prefersReducedMotion || isMobile) {
      document.body.classList.add('reduce-motion');
      document.body.classList.add('optimize-graphics');
    } else {
      document.body.classList.remove('reduce-motion');
      document.body.classList.remove('optimize-graphics');
    }

    document.body.style.overflowX = 'hidden';
  }, []);

  const particles = Array.from({ length: 70 }, (_, index) => ({
    id: index,
    top: `${Math.random() * 100}%`,
    left: `${Math.random() * 100}%`,
    size: `${Math.random() * 2 + 1}px`,
    duration: `${Math.random() * 30 + 20}s`,
    delay: `${Math.random() * 8}s`,
    opacity: `${Math.random() * 0.3 + 0.2}`,
  }));

  return (
    <EmergencyErrorBoundary level="page">
      <CurrencyProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <div className="relative min-h-screen overflow-hidden bg-[#030303] text-white">
            <div className="absolute inset-0 app-background-layer" />
            <div className="absolute inset-0 pointer-events-none">
              {particles.map(particle => (
                <span
                  key={particle.id}
                  className="particle"
                  style={{
                    top: particle.top,
                    left: particle.left,
                    width: particle.size,
                    height: particle.size,
                    animationDuration: particle.duration,
                    animationDelay: particle.delay,
                    opacity: particle.opacity,
                  }}
                />
              ))}
            </div>

            <div className="relative z-10">
              <BrowserRouter>
                <BannedGuard>
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/catalog" element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando catálogo...</div>}>
                        <Catalog />
                      </Suspense>
                    } />
                    <Route path="/auth" element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
                        <AuthPage />
                      </Suspense>
                    } />
                    <Route path="/cart" element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
                        <CartPage />
                      </Suspense>
                    } />
                    <Route path="/dashboard" element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
                        <ClientDashboard />
                      </Suspense>
                    } />
                    <Route path="/profile" element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando perfil...</div>}>
                        <ProfilePage />
                      </Suspense>
                    } />
                    <Route path="/admin-access/*" element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando panel de administración...</div>}>
                        <AdminAccess />
                      </Suspense>
                    } />
                    <Route path="*" element={
                      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Cargando...</div>}>
                        <NotFound />
                      </Suspense>
                    } />
                  </Routes>
                </BannedGuard>
              </BrowserRouter>
            </div>
          </div>
        </TooltipProvider>
      </QueryClientProvider>
      </CurrencyProvider>
    </EmergencyErrorBoundary>
  );
};

export default App;
