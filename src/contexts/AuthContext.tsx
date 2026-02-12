import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { runWithSessionRecovery, supabase } from '../lib/supabase';

export type UserWithRole = User & {
  name?: string;
  role?: string;
  phone?: string;
  active?: boolean;
  avatar_url?: string;
  level?: string;
  xp?: number;
  next_level_xp?: number;
};

interface AuthContextType {
  session: Session | null;
  user: UserWithRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signUp: (name: string, email: string, password: string, metaData?: Record<string, unknown>) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isAbortError = (error: unknown): boolean => {
  if (!error) return false;
  const maybeError = error as { name?: string; message?: string; code?: string | number };
  const message = maybeError.message ?? '';
  return (
    maybeError.name === 'AbortError' ||
    maybeError.code === 20 ||
    maybeError.code === '20' ||
    message.includes('AbortError')
  );
};

const buildFallbackUser = (supabaseUser: User): UserWithRole => ({
  ...supabaseUser,
  name: (supabaseUser.user_metadata as Record<string, unknown> | undefined)?.name as string | undefined,
  role: ((supabaseUser.user_metadata as Record<string, unknown> | undefined)?.role as string | undefined) ?? 'corretor',
  phone: (supabaseUser.user_metadata as Record<string, unknown> | undefined)?.phone as string | undefined,
  avatar_url: (supabaseUser.user_metadata as Record<string, unknown> | undefined)?.avatar_url as string | undefined,
  level: ((supabaseUser.user_metadata as Record<string, unknown> | undefined)?.level as string | undefined) ?? 'Júnior',
  xp: ((supabaseUser.user_metadata as Record<string, unknown> | undefined)?.xp as number | undefined) ?? 0,
  next_level_xp: ((supabaseUser.user_metadata as Record<string, unknown> | undefined)?.next_level_xp as number | undefined) ?? 100,
  active: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchProfileData = useCallback(async (supabaseUser: User): Promise<UserWithRole> => {
    try {
      const { data, error } = await runWithSessionRecovery(() =>
        supabase
          .from('profiles')
          .select('name, role, phone, active, avatar_url, level, xp, next_level_xp')
          .eq('id', supabaseUser.id)
          .maybeSingle()
      );

      if (error) {
        if (!isAbortError(error)) {
          console.error('Erro ao buscar perfil:', error);
        }
        return buildFallbackUser(supabaseUser);
      }

      const profile = data as {
        name?: string;
        role?: string;
        phone?: string;
        active?: boolean;
        avatar_url?: string;
        level?: string;
        xp?: number;
        next_level_xp?: number;
      } | null;

      if (!profile) {
        return buildFallbackUser(supabaseUser);
      }

      return {
        ...supabaseUser,
        name: profile.name ?? undefined,
        role: profile.role ?? 'corretor',
        phone: profile.phone ?? undefined,
        active: profile.active ?? true,
        avatar_url: profile.avatar_url ?? undefined,
        level: profile.level ?? 'Júnior',
        xp: profile.xp ?? 0,
        next_level_xp: profile.next_level_xp ?? 100,
      };
    } catch (error) {
      console.error('Erro inesperado ao buscar perfil:', error);
      return buildFallbackUser(supabaseUser);
    }
  }, []);

  const applySession = useCallback(async (nextSession: Session | null) => {
    if (!isMounted.current) return;

    setSession(nextSession);

    if (!nextSession?.user) {
      setUser(null);
      return;
    }

    const fullUser = await fetchProfileData(nextSession.user);

    if (isMounted.current) {
      setUser(fullUser);
    }
  }, [fetchProfileData]);

  const recoverSession = useCallback(async () => {
    if (!isMounted.current) return;

    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Erro ao verificar sessão:', error);
      return;
    }

    if (data.session) {
      const expiresAt = data.session.expires_at ?? 0;
      const willExpireSoon = expiresAt * 1000 - Date.now() < 60_000;
      if (willExpireSoon) {
        const { data: refreshedData } = await supabase.auth.refreshSession();
        await applySession(refreshedData.session ?? data.session);
      } else {
        await applySession(data.session);
      }
      return;
    }

    await applySession(null);
  }, [applySession]);

  const refreshUser = async () => {
    if (!session?.user || !isMounted.current) return;
    const updatedUser = await fetchProfileData(session.user);
    if (isMounted.current) {
      setUser(updatedUser);
    }
  };

  useEffect(() => {
    isMounted.current = true;

    const initializeAuth = async () => {
      try {
        await recoverSession();
      } catch (error) {
        console.error('Erro na inicialização da auth:', error);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const onFocusOrVisible = async () => {
      if (!isMounted.current) return;
      if (document.visibilityState === 'visible') {
        await recoverSession();
      }
    };

    window.addEventListener('focus', onFocusOrVisible);
    document.addEventListener('visibilitychange', onFocusOrVisible);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted.current) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
        await applySession(nextSession);
      } else {
        await recoverSession();
      }

      setLoading(false);
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
      window.removeEventListener('focus', onFocusOrVisible);
      document.removeEventListener('visibilitychange', onFocusOrVisible);
    };
  }, [applySession, recoverSession]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (name: string, email: string, password: string, metaData?: Record<string, unknown>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, ...metaData },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
