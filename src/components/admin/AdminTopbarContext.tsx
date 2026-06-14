import { createContext, useContext, useState, ReactNode } from 'react';

interface TopbarAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  icon?: any;
}

interface AdminTopbarContextType {
  title: string;
  subtitle?: string;
  syncStatus: 'synced' | 'syncing' | 'error';
  exportAction?: TopbarAction;
  primaryAction?: TopbarAction;
  setTopbarContent: (content: {
    title: string;
    subtitle?: string;
    syncStatus?: 'synced' | 'syncing' | 'error';
    exportAction?: TopbarAction;
    primaryAction?: TopbarAction;
  }) => void;
}

const AdminTopbarContext = createContext<AdminTopbarContextType | undefined>(undefined);

export function AdminTopbarProvider({ children }: { children: ReactNode }) {
  const [topbar, setTopbar] = useState({
    title: 'Dashboard',
    subtitle: 'Bienvenido al panel de administración',
    syncStatus: 'synced' as const,
    exportAction: undefined,
    primaryAction: undefined,
  });

  const setTopbarContent = (content: Parameters<typeof setTopbar>[0]) => {
    setTopbar((prev) => ({
      ...prev,
      ...content,
    }));
  };

  return (
    <AdminTopbarContext.Provider
      value={{
        ...topbar,
        setTopbarContent,
      }}
    >
      {children}
    </AdminTopbarContext.Provider>
  );
}

export function useAdminTopbar() {
  const context = useContext(AdminTopbarContext);
  if (!context) {
    throw new Error('useAdminTopbar must be used within AdminTopbarProvider');
  }
  return context;
}
