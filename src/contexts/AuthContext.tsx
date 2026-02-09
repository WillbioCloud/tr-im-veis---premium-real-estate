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
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (name: string, email: string, password: string, metaData?: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Busca dados do perfil na tabela profiles
  const fetchProfileData = async (supabaseUser: User): Promise<UserWithRole> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('name, role, phone, active')
      .eq('id', supabaseUser.id)
      .single();
    if (!error && data) {
      return {
        ...supabaseUser,
        name: data.name,
        role: data.role,
        phone: data.phone,
        active: data.active
      };
    }
    // Fallback caso o perfil ainda não exista ou ocorra erro
    return {
      ...supabaseUser,
      name: (supabaseUser.user_metadata as any)?.name || 'Usuário',
      role: (supabaseUser.user_metadata as any)?.role || 'corretor',
      active: true
    };
  };

  const refreshUser = async () => {
    if (session?.user) {
      const updatedUser = await fetchProfileData(session.user);
      setUser(updatedUser);
    }
  };


  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        const fullUser = await fetchProfileData(session.user);
        setUser(fullUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      if (session?.user) {
        const fullUser = await fetchProfileData(session.user);
        setUser(fullUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);


  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (name: string, email: string, password: string, metaData?: any) => {
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