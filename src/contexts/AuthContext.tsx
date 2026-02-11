import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type UserWithRole = User & {
  name?: string;
  role?: string;
  phone?: string;
  active?: boolean;
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
  active: true,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfileData = async (supabaseUser: User): Promise<UserWithRole> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, role, phone, active')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (error) {
        if (isAbortError(error)) {
          return buildFallbackUser(supabaseUser);
        }
        return buildFallbackUser(supabaseUser);
      }

      if (!data) {
        return buildFallbackUser(supabaseUser);
      }

      return {
        ...supabaseUser,
        name: data.name ?? undefined,
        role: data.role ?? 'corretor',
        phone: data.phone ?? undefined,
        active: data.active ?? true,
      };
    } catch (error) {
      if (isAbortError(error)) {
        return buildFallbackUser(supabaseUser);
      }
      return buildFallbackUser(supabaseUser);
    }
  };

  const applySession = async (nextSession: Session | null) => {
    setSession(nextSession);

    if (!nextSession?.user) {
      setUser(null);
      return;
    }

    const fullUser = await fetchProfileData(nextSession.user);
    setUser(fullUser);
  };

  const refreshUser = async () => {
    if (!session?.user) return;
    const updatedUser = await fetchProfileData(session.user);
    setUser(updatedUser);
  };

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      setLoading(true);
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!isMounted) return;
        await applySession(currentSession);
      } catch {
        if (!isMounted) return;
        setSession(null);
        setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!isMounted) return;
      setLoading(true);
      try {
        await applySession(nextSession);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
