import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const [roleRes, profileRes] = await Promise.all([
              supabase.rpc('has_role', { _user_id: session.user.id, _role: 'admin' }),
              supabase.from('profiles').select('is_active').eq('user_id', session.user.id).maybeSingle(),
            ]);
            setIsAdmin(!!roleRes.data);
            setIsBanned(profileRes.data?.is_active === false);
            setLoading(false);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsBanned(false);
          setLoading(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, isAdmin, isBanned, signOut };
}
