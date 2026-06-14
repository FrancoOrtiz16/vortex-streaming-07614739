import { Activity, Download } from 'lucide-react';
import { useAdminTopbar } from './AdminTopbarContext';

export function AdminTopbar() {
  const { title, subtitle, syncStatus, exportAction, primaryAction } = useAdminTopbar();

  return (
    <div className="h-[52px] flex items-center justify-between px-6 border-b gap-4" style={{ borderColor: 'var(--color-border-tertiary)' }}>
      {/* Left: Title & Subtitle */}
      <div className="flex-1 min-w-0">
        <h1 className="text-15px font-display font-bold" style={{ color: 'var(--foreground)' }}>
          {title}
        </h1>
        {subtitle && <p className="text-[11px] opacity-60 mt-0.5">{subtitle}</p>}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Sync Indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full transition-all ${
              syncStatus === 'syncing' ? 'animate-pulse' : syncStatus === 'error' ? 'bg-destructive' : 'bg-emerald-500'
            }`}
          />
          <span className="text-[11px] opacity-60 capitalize">{syncStatus === 'synced' ? 'Sincronizado' : syncStatus}</span>
        </div>

        {/* Export Button */}
        {exportAction && (
          <button
            onClick={exportAction.onClick}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors hover:bg-secondary text-sm"
            style={{ borderColor: 'var(--color-border-tertiary)' }}
          >
            <Download className="w-4 h-4" />
            <span>{exportAction.label}</span>
          </button>
        )}

        {/* Primary Action Button */}
        {primaryAction && (
          <button
            onClick={primaryAction.onClick}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-white text-sm font-medium transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--admin-primary-blue)' }}
          >
            {primaryAction.icon && <primaryAction.icon className="w-4 h-4" />}
            <span>{primaryAction.label}</span>
          </button>
        )}
      </div>
    </div>
  );
}
