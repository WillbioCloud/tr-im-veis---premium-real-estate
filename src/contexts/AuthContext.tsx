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

// --- Helpers para tratamento de dados seguros ---
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
  if (!profile) return buildFallbackUser(supabaseUser);
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
  
  // Refs para controle de montagem e estado atual (evita dependências circulares)
  const isMounted = useRef(true);
  const currentUserRef = useRef<UserWithRole | null>(null);

  // Mantém o ref sincronizado com o state
  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

  // Busca dados do perfil
  const fetchProfileData = useCallback(async (currentSession: Session): Promise<UserWithRole> => {
    if (!currentSession.user) return buildFallbackUser(currentSession.user);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .maybeSingle();

      if (error) {
        return buildFallbackUser(currentSession.user);
      }

      return mergeUserWithProfile(currentSession.user, (data as ProfileData | null) ?? null);
    } catch {
      return buildFallbackUser(currentSession.user);
    }
  }, []);

  // Aplica a sessão ao estado (Lógica Principal)
  const applySession = useCallback(async (currentSession: Session | null, forceUpdate = false) => {
    if (!isMounted.current) return;

    if (!currentSession) {
      setSession(null);
      setUser(null);
      setLoading(false);
      return;
    }

    // --- CORREÇÃO CRÍTICA DO LOOP ---
    // Se já temos um usuário carregado e o ID é o mesmo da nova sessão,
    // significa que é apenas um refresh de token (mudança de aba, etc).
    // NÃO recarregamos o perfil para evitar piscar a tela ou loop.
    if (!forceUpdate && currentUserRef.current?.id === currentSession.user.id) {
      console.log('Sessão renovada (Token Refresh). Mantendo estado do usuário.');
      setSession(currentSession); // Apenas atualiza o token novo
      return; 
    }

    // Se chegou aqui, é um login novo ou troca de usuário real
    setSession(currentSession);
    
    // Define usuário básico imediatamente (Optimistic UI)
    const basicUser = buildFallbackUser(currentSession.user);
    setUser(basicUser);

    // Busca dados completos
    const fullUser = await fetchProfileData(currentSession);
    
    if (isMounted.current) {
      setUser(fullUser);
      setLoading(false);
    }
  }, [fetchProfileData]);

  useEffect(() => {
    isMounted.current = true;

    // 1. Inicialização
    supabase.auth.getSession().then(({ data: { session: initSession } }) => {
      applySession(initSession);
    });

    // 2. Listener do Supabase
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted.current) return;
      
      console.log(`Auth Event: ${event}`); 

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        // Passamos 'false' para forceUpdate, ativando a proteção contra loop
        if (newSession) await applySession(newSession, false);
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const refreshUser = async () => {
    if (!session) return;
    const { data } = await supabase.auth.refreshSession();
    // Aqui usamos forceUpdate = true porque o usuário pediu explicitamente para atualizar
    if (data.session) await applySession(data.session, true);
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (name: string, email: string, password: string, metaData?: Record<string, unknown>) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, ...metaData } },
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