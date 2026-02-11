import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Tipo expandido para incluir roles e dados do perfil
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

// Cria um usuário de fallback caso o perfil não carregue do banco
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
  
  // Ref para garantir que não atualizaremos estado se o componente desmontar
  const isMounted = useRef(true);

  // Função centralizada para buscar dados do perfil
  const fetchProfileData = useCallback(async (supabaseUser: User): Promise<UserWithRole> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, role, phone, active')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (error) {
        if (!isAbortError(error)) {
          console.error('Erro ao buscar perfil:', error);
        }
        return buildFallbackUser(supabaseUser);
      }

      // CORREÇÃO AQUI: Forçamos o tipo para evitar o erro 'never'
      const profile = data as { name?: string; role?: string; phone?: string; active?: boolean } | null;

      if (!profile) {
        return buildFallbackUser(supabaseUser);
      }

      return {
        ...supabaseUser,
        name: profile.name ?? undefined,
        role: profile.role ?? 'corretor',
        phone: profile.phone ?? undefined,
        active: profile.active ?? true,
      };
    } catch (error) {
      console.error('Erro inesperado ao buscar perfil:', error);
      return buildFallbackUser(supabaseUser);
    }
  }, []);

  // Aplica a sessão e carrega o usuário enriquecido
  const applySession = useCallback(async (nextSession: Session | null) => {
    if (!isMounted.current) return;
    
    setSession(nextSession);

    if (!nextSession?.user) {
      setUser(null);
      return;
    }

    // Carrega o perfil do banco
    const fullUser = await fetchProfileData(nextSession.user);
    
    if (isMounted.current) {
      setUser(fullUser);
    }
  }, [fetchProfileData]);

  // Função exposta para recarregar dados manualmente
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
        // 1. Pega sessão inicial
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (isMounted.current) {
          await applySession(initialSession);
        }
      } catch (error) {
        console.error('Erro na inicialização da auth:', error);
      } finally {
        if (isMounted.current) {
          setLoading(false);
        }
      }
    };

    // Inicia processo
    initializeAuth();

    // 2. Escuta mudanças (Login, Logout, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (isMounted.current) {
        if (_event === 'SIGNED_OUT') {
           setSession(null);
           setUser(null);
           setLoading(false);
        } else {
           await applySession(nextSession);
           setLoading(false);
        }
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
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