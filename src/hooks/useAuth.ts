import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

const AUTH_READY_TIMEOUT_MS = 4000;

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isBanned, setIsBanned] = useState(false);

  const refreshProfile = async (userId: string | null) => {
    const normalizeRole = (role: unknown) => typeof role === 'string' ? role.trim().toLowerCase() : '';

    if (!userId) {
      console.debug('[Auth] No userId, clearing admin status');
      setIsAdmin(false);
      setIsBanned(false);
      return;
    }

    try {
      console.debug('[Auth] Fetching profile for userId:', userId.slice(0, 8) + '...');

      const [profileRes, rolesRes] = await Promise.all([
        supabase.from('profiles').select('is_active').eq('user_id', userId).maybeSingle(),
        supabase.from('user_roles').select('role').eq('user_id', userId),
      ]);
      const error = profileRes.error || rolesRes.error;
      const data = profileRes.data;
      const roles = (rolesRes.data || [])
        .map((r: any) => normalizeRole(r.role))
        .filter(Boolean);

      if (error) {
        console.error('[Auth] Profile fetch error:', error);
        console.error('[Auth] Error details:', { code: error?.code, message: error?.message });
        setIsAdmin(false);
        setIsBanned(false);
        return;
      }

      const userRole = roles.includes('admin') ? 'admin' : (roles[0] ?? null);
      const { data: authUserData } = await supabase.auth.getUser();
      const metaRole = normalizeRole(
        authUserData?.user?.app_metadata?.app_role ??
        authUserData?.user?.user_metadata?.app_role
      );
      const isAdminRole = userRole === 'admin' || metaRole === 'admin';

      if (!data) {
        console.warn('[Auth] No profile data found for userId:', userId.slice(0, 8) + '...');
        console.log('[Auth] Creating default profile entry or profile does not exist yet');
        setIsAdmin(isAdminRole);
        setIsBanned(false);
        return;
      }

      const isActive = data?.is_active ?? true;

      console.debug('[Auth] Profile loaded:', {
        role: userRole,
        metaRole,
        is_active: isActive,
        isAdmin: isAdminRole,
      });

      setIsAdmin(isAdminRole);
      setIsBanned(isActive === false);

      if (isAdminRole) {
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
    let isActive = true;
    let isInitialSessionApplied = false;

    const applySession = (nextSession: Session | null) => {
      if (!isActive) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setLoading(true);
        const profileTimeout = window.setTimeout(() => {
          if (isActive) {
            console.warn('[Auth] Profile timeout — continuing without blocking render');
            setLoading(false);
          }
        }, AUTH_READY_TIMEOUT_MS);
        void refreshProfile(nextSession.user.id).finally(() => {
          window.clearTimeout(profileTimeout);
          if (isActive) setLoading(false);
        });
      } else {
        setIsAdmin(false);
        setIsBanned(false);
        setLoading(false);
      }
    };

    const readyTimeout = window.setTimeout(() => {
      if (!isActive) return;
      console.warn('[Auth] Session/profile timeout — rendering app in resilient mode');
      setLoading(false);
    }, AUTH_READY_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.debug('[Auth] Auth state changed:', { event: _event, hasSession: !!session });
        applySession(session);
      }
    );

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.debug('[Auth] Initial session check:', { hasSession: !!session });
      applySession(session);
      isInitialSessionApplied = true;
    }).catch((err) => {
      if (!isActive) return;
      console.error('[Auth] getSession error:', err);
      setLoading(false);
      isInitialSessionApplied = true;
    }).finally(() => {
      window.clearTimeout(readyTimeout);
    });

    return () => {
      isActive = false;
      window.clearTimeout(readyTimeout);
      subscription.unsubscribe();
    };
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
