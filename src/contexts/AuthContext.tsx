import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type ProfileData = {
  id?: string;
  role?: string;
  name?: string;
  avatar_url?: string;
  level?: number;
  xp?: number;
  active?: boolean;
  [key: string]: unknown;
};

export type UserWithRole = User & {
  name?: string;
  role?: string;
  avatar_url?: string;
  level?: number;
  xp?: number;
  active?: boolean;
  profile?: ProfileData | null;
};

interface AuthContextType {
  session: Session | null;
  user: UserWithRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signUp: (
    name: string,
    email: string,
    password: string,
    metaData?: Record<string, unknown>
  ) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const buildFallbackUser = (supabaseUser: User): UserWithRole => {
  const metadata = (supabaseUser.user_metadata as Record<string, unknown> | undefined) ?? {};

  return {
    ...supabaseUser,
    name: (metadata.name as string | undefined) ?? 'Usuário',
    role: (metadata.role as string | undefined) ?? 'corretor',
    avatar_url: (metadata.avatar_url as string | undefined) ?? undefined,
    level: toNumber(metadata.level, 1),
    xp: toNumber(metadata.xp, 0),
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
    role: profile.role ?? 'corretor',
    name: profile.name ?? (supabaseUser.user_metadata?.name as string | undefined) ?? 'Usuário',
    avatar_url: profile.avatar_url,
    level: toNumber(profile.level, 1),
    xp: toNumber(profile.xp, 0),
    active: profile.active ?? true,
    profile,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  const isMounted = useRef(true);
  const initialLoadResolved = useRef(false);

  const resolveInitialLoading = useCallback(() => {
    if (!isMounted.current || initialLoadResolved.current) {
      return;
    }

    initialLoadResolved.current = true;
    setLoading(false);
  }, []);

  const fetchProfileData = useCallback(async (supabaseUser: User): Promise<UserWithRole> => {
    const fallbackUser = buildFallbackUser(supabaseUser);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (error) {
        console.warn('Falha ao carregar profile. Mantendo sessão com fallback.', error.message);
        return fallbackUser;
      }

      return mergeUserWithProfile(supabaseUser, (data as ProfileData | null) ?? null);
    } catch (error) {
      console.warn('Erro inesperado no profile. Mantendo sessão com fallback.', error);
      return fallbackUser;
    }
  }, []);

  const applySession = useCallback(
    async (nextSession: Session | null) => {
      if (!isMounted.current) return;

      if (!nextSession?.user) {
        setSession(null);
        setUser(null);
        return;
      }

      const supabaseUser = nextSession.user;
      setSession(nextSession);

      // Sessão Suprema: usuário entra imediatamente se a sessão existe.
      const fallbackUser = buildFallbackUser(supabaseUser);
      setUser(fallbackUser);

      const profileUser = await fetchProfileData(supabaseUser);
      if (!isMounted.current) return;

      setUser(profileUser);
    },
    [fetchProfileData]
  );

  const refreshUser = useCallback(async () => {
    if (!isMounted.current || !session?.user) return;

    const nextUser = await fetchProfileData(session.user);
    if (!isMounted.current) return;

    setUser(nextUser);
  }, [fetchProfileData, session]);

  const silentRevalidateSession = useCallback(async () => {
    try {
      const {
        data: { session: existingSession },
      } = await supabase.auth.getSession();

      if (existingSession) {
        await applySession(existingSession);
        return;
      }

      const {
        data: { session: refreshedSession },
      } = await supabase.auth.refreshSession();

      if (refreshedSession) {
        await applySession(refreshedSession);
      }
    } catch (error) {
      console.warn('Revalidação silenciosa falhou.', error);
    }
  }, [applySession]);

  useEffect(() => {
    isMounted.current = true;

    const initializeAuth = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        await applySession(initialSession);
      } catch (error) {
        console.error('Falha ao inicializar autenticação.', error);
      } finally {
        // Sem loops: loading é resolvido ao fim da primeira verificação.
        resolveInitialLoading();
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted.current) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        resolveInitialLoading();
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await applySession(nextSession);
        resolveInitialLoading();
      }
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible' || !isMounted.current) {
        return;
      }

      await silentRevalidateSession();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [applySession, resolveInitialLoading, silentRevalidateSession]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (
    name: string,
    email: string,
    password: string,
    metaData?: Record<string, unknown>
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          ...metaData,
        },
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