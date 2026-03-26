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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
