import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type ProfileData = {
  id?: string;
  role?: string;
  name?: string;
  avatar_url?: string;
  level?: number;
  xp?: number;
  phone?: string;
  active?: boolean;
  email?: string;
  [key: string]: unknown;
};

export type UserWithRole = User & {
  name?: string;
  role?: string;
  avatar_url?: string;
  level?: number;
  xp?: number;
  phone?: string;
  active?: boolean;
  profile?: ProfileData | null;
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

// Helper para verificar erros de cancelamento (AbortError)
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

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildFallbackUser = (supabaseUser: User): UserWithRole => {
  const metadata = (supabaseUser.user_metadata as Record<string, unknown> | undefined) ?? {};
  return {
    ...supabaseUser,
    name: (metadata.name as string | undefined) ?? undefined,
    role: (metadata.role as string | undefined) ?? 'corretor',
    avatar_url: (metadata.avatar_url as string | undefined) ?? undefined,
    level: toNumber(metadata.level, 1),
    xp: toNumber(metadata.xp, 0),
    phone: (metadata.phone as string | undefined) ?? undefined,
    active: true,
    profile: null,
  };
};

const mergeUserWithProfile = (supabaseUser: User, profile: ProfileData | null): UserWithRole => {
  if (!profile) {
    return buildFallbackUser(supabaseUser);
  }

  return {
    ...supabaseUser,
    ...profile,
    id: supabaseUser.id,
    email: supabaseUser.email,
    user_metadata: supabaseUser.user_metadata,
    app_metadata: supabaseUser.app_metadata,
    aud: supabaseUser.aud,
    created_at: supabaseUser.created_at,
    role: (profile.role as string | undefined) ?? 'corretor',
    name: (profile.name as string | undefined) ?? undefined,
    avatar_url: (profile.avatar_url as string | undefined) ?? undefined,
    level: toNumber(profile.level, 1),
    xp: toNumber(profile.xp, 0),
    phone: (profile.phone as string | undefined) ?? undefined,
    active: profile.active ?? true,
    profile,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Ref para garantir que não atualizaremos estado se o componente desmontar
  const isMounted = useRef(true);

  // Função centralizada para buscar dados do perfil
  const fetchProfileData = useCallback(async (supabaseUser: User): Promise<UserWithRole> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (error) {
        if (!isAbortError(error)) {
          console.error('Erro ao buscar perfil:', error);
        }
        return buildFallbackUser(supabaseUser);
      }

      const profile = (data as ProfileData | null) ?? null;
      return mergeUserWithProfile(supabaseUser, profile);
    } catch (error) {
      if (!isAbortError(error)) {
        console.error('Erro inesperado ao buscar perfil:', error);
      }
      return buildFallbackUser(supabaseUser);
    }
  }, []);

  // 1. Função blindada para aplicar sessão sem quebrar o app
  const applySession = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user) {
      setSession(null);
      setUser(null);
      return;
    }

    try {
      setSession(currentSession);

      // Tenta buscar o perfil, mas NÃO TRAVA se falhar
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();

      if (error) {
        console.warn('Perfil não carregado (usando fallback):', error.message);
      }

      // Monta o usuário mesclando dados da sessão + perfil (ou fallback)
      const userWithRole: UserWithRole = {
        ...currentSession.user,
        role: profile?.role || 'corretor',
        name: profile?.name || currentSession.user.user_metadata?.name || 'Usuário',
        avatar_url: profile?.avatar_url,
        level: profile?.level || 1,
        xp: profile?.xp || 0,
        active: profile?.active ?? true,
      };

      setUser(userWithRole);
    } catch (err) {
      console.error('Erro crítico no applySession:', err);
      // Mesmo com erro crítico, mantemos o usuário logado com dados básicos
      setUser({ ...currentSession.user, role: 'corretor' } as UserWithRole);
    }
  }, []);

  // Função exposta para recarregar dados manualmente
  const refreshUser = async () => {
    if (!session?.user || !isMounted.current) return;
    const updatedUser = await fetchProfileData(session.user);
    if (isMounted.current) {
      setUser(updatedUser);
    }
  };

  // 2. useEffect com Listener de Visibilidade e Inicialização
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        // Busca sessão inicial
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          await applySession(session);
        }
      } catch (error) {
        console.error('Erro na inicialização:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    // Listener de eventos do Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await applySession(session);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    // 3. NOVO: Listener para quando o usuário troca de aba e volta
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Aba visível: Revalidando sessão...');
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await applySession(data.session);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [applySession]);

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
