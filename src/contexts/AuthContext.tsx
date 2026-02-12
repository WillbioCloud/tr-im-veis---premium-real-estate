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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);
  const isMounted = useRef(true);

  // Função centralizada e segura para aplicar sessão
  const applySession = useCallback(async (currentSession: Session | null) => {
    if (!isMounted.current) return;

    if (!currentSession?.user) {
      setSession(null);
      setUser(null);
      return;
    }

    try {
      setSession(currentSession);

      // Tenta buscar o perfil
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single();

      if (error) {
        console.warn('Perfil não carregado (usando fallback):', error.message);
      }

      if (!isMounted.current) return;

      // Cria usuário com dados reais OU fallback se o perfil falhar
      const userWithRole: UserWithRole = {
        ...currentSession.user,
        role: profile?.role || 'corretor', // Fallback importante
        name: profile?.name || currentSession.user.user_metadata?.name || 'Usuário',
        avatar_url: profile?.avatar_url,
        level: profile?.level || 1,
        xp: profile?.xp || 0,
        active: profile?.active ?? true,
        profile: profile || null,
      };

      setUser(userWithRole);
    } catch (err) {
      console.error('Erro ao processar sessão:', err);
      // Fallback de emergência para não deslogar
      if (isMounted.current) {
        setUser({ ...currentSession.user, role: 'corretor' } as UserWithRole);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;

    const initAuth = async () => {
      try {
        // 1. Busca sessão inicial
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession && isMounted.current) {
          await applySession(initialSession);
        }
      } catch (error) {
        console.error('Erro na inicialização:', error);
      } finally {
        if (isMounted.current) setLoading(false);
      }
    };

    initAuth();

    // 2. Escuta mudanças de Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted.current) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await applySession(newSession);
      } else if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
      }
    });

    // 3. NOVO: Escuta quando a aba fica visível novamente (Reconexão)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && isMounted.current) {
        console.log('Aba ativa: Verificando sessão...');
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          await applySession(data.session);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted.current = false;
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

  const refreshUser = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await applySession(data.session);
    }
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
