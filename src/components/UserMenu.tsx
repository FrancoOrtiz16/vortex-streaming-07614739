import { User, ShoppingCart, LayoutDashboard, LogOut, Shield } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const UserMenu = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (!user) {
    return (
      <Link
        to="/auth"
        className="p-2 rounded-lg hover:bg-secondary transition-colors"
      >
        <User className="w-5 h-5" />
      </Link>
    );
  }

  const displayName =
    user.user_metadata?.display_name ||
    user.email?.split('@')[0] ||
    'Usuario';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary transition-colors outline-none">
          <div className="w-7 h-7 rounded-full gradient-neon flex items-center justify-center text-primary-foreground text-xs font-bold">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">
            {displayName}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52 glass border-border backdrop-blur-xl rounded-xl p-1.5"
      >
        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
          <Link to="/dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4" />
            Mi Perfil / Historial
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
          <Link to="/cart" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Mi Carrito
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild className="rounded-lg cursor-pointer">
            <Link to="/admin-access" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Panel Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator className="bg-border" />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="rounded-lg cursor-pointer text-destructive focus:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Cerrar Sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
