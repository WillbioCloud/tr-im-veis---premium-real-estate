import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type UserWithRole = User & {
  name?: string;
  role?: string;
};

// Define o formato do contexto
interface AuthContextType {
  session: Session | null;
  user: UserWithRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (name: string, email: string, password: string, metaData?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Pega sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(buildUserWithRole(session?.user));
      setLoading(false);
    });

    // 2. Escuta mudanças (login, logout, etc)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(buildUserWithRole(session?.user));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Função para garantir que user tenha name e role
  const buildUserWithRole = (user: User | null): UserWithRole | null => {
    if (!user) return null;
    const name = (user.user_metadata as any)?.name || undefined;
    const role = (user.user_metadata as any)?.role || undefined;
    return { ...user, name, role };
  };

  // Função de Login
  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  // Função de Cadastro
  const signUp = async (name: string, email: string, password: string, metaData?: any) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, ...metaData }, // Envia nome e role para o banco
      },
    });
    return { error };
  };

  // Função de Logout
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};