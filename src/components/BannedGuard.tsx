import { useAuth } from '@/hooks/useAuth';
import BannedScreen from './BannedScreen';

const BannedGuard = ({ children }: { children: React.ReactNode }) => {
  const { isBanned, loading, user } = useAuth();

  if (loading) return null;
  if (user && isBanned) return <BannedScreen />;
  return <>{children}</>;
};

export default BannedGuard;
