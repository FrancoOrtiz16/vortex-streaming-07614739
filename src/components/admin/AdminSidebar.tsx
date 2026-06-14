import { Users, BarChart3, CreditCard, LogOut, Shield, CalendarClock, Boxes, Settings } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
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

const navSections = [
  {
    title: 'General',
    items: [
      { title: 'Ventas', url: '/admin-access/sales', icon: BarChart3 },
      { title: 'Suscripciones', url: '/admin-access/subscriptions', icon: CalendarClock },
      { title: 'Usuarios', url: '/admin-access/users', icon: Users },
    ],
  },
  {
    title: 'Catálogo',
    items: [
      { title: 'Inventario', url: '/admin-access/inventory', icon: Boxes },
      { title: 'Pagos', url: '/admin-access/payments', icon: CreditCard },
    ],
  },
  {
    title: 'Sistema',
    items: [
      { title: 'Ajustes', url: '/admin-access/settings', icon: Settings },
    ],
  },
];

interface AdminSidebarProps {
  onSignOut: () => void;
}

export function AdminSidebar({ onSignOut }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { user } = useAuth();
  const location = useLocation();

  const getInitials = (email?: string | null) => {
    if (!email) return 'AD';
    const parts = email.split('@')[0].split('.');
    return parts.map(p => p[0].toUpperCase()).join('').slice(0, 2);
  };

  const isActive = (url: string) => location.pathname === url;

  return (
    <Sidebar
      collapsible="icon"
      className="border-r"
      style={{ backgroundColor: 'var(--admin-sidebar-bg)' }}
    >
      <SidebarContent>
        {/* Header */}
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2 px-3 py-3">
            <Shield className="w-4 h-4" style={{ color: 'var(--admin-primary-blue)' }} />
            {!collapsed && (
              <span
                className="font-display font-bold"
                style={{ color: 'var(--admin-primary-blue)' }}
              >
                Vortex Admin
              </span>
            )}
          </SidebarGroupLabel>
        </SidebarGroup>

        {/* Navigation Sections */}
        {navSections.map((section, idx) => (
          <div key={section.title}>
            <SidebarGroup>
              <SidebarGroupLabel
                className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider"
                style={{ opacity: 0.5 }}
              >
                {!collapsed && section.title}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {section.items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className="admin-nav-link flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200"
                          activeClassName="admin-nav-link-active"
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

            {/* Divider between sections */}
            {idx < navSections.length - 1 && !collapsed && (
              <div
                className="mx-3 my-2 h-px"
                style={{ backgroundColor: 'var(--admin-divider)' }}
              />
            )}
          </div>
        ))}
      </SidebarContent>

      {/* Footer with User Pill */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg">
              {/* Avatar Initials Circle */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ backgroundColor: 'var(--admin-primary-blue)' }}
              >
                {getInitials(user?.email)}
              </div>
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {user?.email?.split('@')[0] || 'Admin'}
                  </p>
                  <p
                    className="text-[10px] truncate"
                    style={{ opacity: 0.6 }}
                  >
                    Administrator
                  </p>
                </div>
              )}
            </div>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={onSignOut}
              className="text-muted-foreground hover:text-destructive transition-colors"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!collapsed && <span>Cerrar Sesión</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
