import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import CartPage from "./pages/CartPage";
import ClientDashboard from "./pages/ClientDashboard";
import AdminAccess from "./pages/AdminAccess";
import NotFound from "./pages/NotFound";
import BannedGuard from "./components/BannedGuard";

const queryClient = new QueryClient();

const App = () => {
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
                  <Route path="/auth" element={<AuthPage />} />
                  <Route path="/cart" element={<CartPage />} />
                  <Route path="/dashboard" element={<ClientDashboard />} />
                  <Route path="/admin-access/*" element={<AdminAccess />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BannedGuard>
            </BrowserRouter>
          </div>
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
