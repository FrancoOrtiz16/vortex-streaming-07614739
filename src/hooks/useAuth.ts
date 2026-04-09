import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  const refreshProfile = async (userId: string | null) => {
    if (!userId) {
      setIsAdmin(false);
      setIsBanned(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('[Auth] profile fetch error:', error);
      setIsAdmin(false);
      setIsBanned(false);
      return;
    }

    setIsAdmin(data?.role === 'admin');
    setIsBanned(data?.is_active === false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await refreshProfile(session.user.id);
        } else {
          setIsAdmin(false);
          setIsBanned(false);
        }

        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await refreshProfile(session.user.id);
      } else {
        setIsAdmin(false);
        setIsBanned(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, isAdmin, isBanned, signOut };
}
