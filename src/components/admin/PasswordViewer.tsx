import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordViewerProps {
  password: string | null;
}

export default function PasswordViewer({ password }: PasswordViewerProps) {
  const [showPassword, setShowPassword] = useState(false);

  if (!password) {
    return <span className="text-muted-foreground">No disponible</span>;
  }

  return (
    <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
      <input
        type={showPassword ? 'text' : 'password'}
        value={password}
        readOnly
        className="min-w-0 flex-1 bg-transparent border-none outline-none text-xs sm:text-sm font-mono truncate"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        {showPassword ? <EyeOff className="w-3.5 sm:w-4 h-3.5 sm:h-4" /> : <Eye className="w-3.5 sm:w-4 h-3.5 sm:h-4" />}
      </button>
    </div>
  );
}