import { Users, BarChart3, Package, CreditCard, LogOut, Shield, CalendarClock, ClipboardList, Boxes, Settings, Eye, Store } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Usuarios', url: '/admin-access/users', icon: Users },
  { title: 'Inventario', url: '/admin-access/inventory', icon: Boxes },
  { title: 'Suscripciones', url: '/admin-access/subscriptions', icon: CalendarClock },
  { title: 'Ventas', url: '/admin-access/sales', icon: BarChart3 },
  { title: 'Pagos', url: '/admin-access/payments', icon: CreditCard },
  { title: 'Ajustes', url: '/admin-access/settings', icon: Settings },
];

interface AdminSidebarProps {
  onSignOut: () => void;
}

export function AdminSidebar({ onSignOut }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const navigate = useNavigate();

  const handleViewStore = () => {
    // Navega a la ruta del catálogo para modo observador
    navigate('/catalog');
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            {!collapsed && <span className="font-display font-bold neon-text">Vortex Admin</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                      activeClassName="bg-secondary text-primary font-medium neon-text"
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Store Preview Section */}
        <SidebarGroup className="border-t border-border mt-4">
          <SidebarGroupLabel className={!collapsed ? 'text-xs' : ''}>
            {!collapsed && <span>Previsualización</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={handleViewStore}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                  title="Ver Tienda"
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Store Preview Button in Sidebar */}
      <div className="p-3 border-t border-border">
        <button
        type="button"
          onClick={handleViewStore}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium text-sm"
          title="Ver Tienda en Nueva Pestaña"
        >
          <Eye className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Ver Tienda</span>}
        </button>
      </div>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onSignOut} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Cerrar Sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
