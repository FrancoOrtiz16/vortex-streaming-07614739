import { ShieldX } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const BannedScreen = () => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'hsl(222, 47%, 3%)' }}>
      <div className="glass rounded-2xl p-10 max-w-md text-center">
        <ShieldX className="w-16 h-16 text-destructive mx-auto mb-4" />
        <h1 className="font-display font-bold text-2xl mb-2">Cuenta Suspendida</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Tu cuenta ha sido desactivada por un administrador. Si crees que esto es un error, contacta al soporte técnico.
        </p>
        <button
          onClick={handleSignOut}
          className="px-6 py-2.5 rounded-xl bg-destructive text-destructive-foreground font-semibold text-sm hover:opacity-90 transition-opacity"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default BannedScreen;
