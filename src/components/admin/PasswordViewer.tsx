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
    <div className="flex items-center gap-2">
      <input
        type={showPassword ? 'text' : 'password'}
        value={password}
        readOnly
        className="bg-transparent border-none outline-none text-sm font-mono"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}