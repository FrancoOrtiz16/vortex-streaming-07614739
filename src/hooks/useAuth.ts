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
      console.debug('[Auth] No userId, clearing admin status');
      setIsAdmin(false);
      setIsBanned(false);
      return;
    }

    try {
      console.debug('[Auth] Fetching profile for userId:', userId.slice(0, 8) + '...');

      const { data, error } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[Auth] Profile fetch error:', error);
        console.error('[Auth] Error details:', { code: error?.code, message: error?.message });
        setIsAdmin(false);
        setIsBanned(false);
        return;
      }

      if (!data) {
        console.warn('[Auth] No profile data found for userId:', userId.slice(0, 8) + '...');
        console.log('[Auth] Creating default profile entry or profile does not exist yet');
        setIsAdmin(false);
        setIsBanned(false);
        return;
      }

      // Validar role de forma segura
      const userRole = data?.role ?? null;
      const isActive = data?.is_active ?? true;

      console.debug('[Auth] Profile loaded:', {
        role: userRole,
        is_active: isActive,
        isAdmin: userRole === 'admin'
      });

      // Establecer estado de admin si role === 'admin' (case-sensitive)
      setIsAdmin(userRole === 'admin');
      
      // Establecer estado de ban si is_active === false
      setIsBanned(isActive === false);

      if (userRole === 'admin') {
        console.log('[Auth] ✓ Admin user verified:', userId.slice(0, 8) + '...');
      }
    } catch (err) {
      console.error('[Auth] refreshProfile catch error:', err);
      setIsAdmin(false);
      setIsBanned(false);
    }
  };

  useEffect(() => {
    console.debug('[Auth] Initializing auth state...');

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.debug('[Auth] Auth state changed:', { event: _event, hasSession: !!session });

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

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.debug('[Auth] Initial session check:', { hasSession: !!session });

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await refreshProfile(session.user.id);
      } else {
        setIsAdmin(false);
        setIsBanned(false);
      }

      setLoading(false);
    }).catch((err) => {
      console.error('[Auth] getSession error:', err);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      console.debug('[Auth] Signing out user...');
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      setIsBanned(false);
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
    }
  };

  return { user, session, loading, isAdmin, isBanned, signOut, refreshProfile };
}
