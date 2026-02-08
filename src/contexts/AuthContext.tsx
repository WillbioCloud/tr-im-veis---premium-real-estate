import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';

export type UserWithRole = User & {
  role?: 'admin' | 'corretor';
  name?: string;
};

interface AuthContextType {
  session: Session | null;
  user: UserWithRole | null;
  loading: boolean;
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, name: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  const lastFetchToken = useRef(0);

  const buildFallbackUser = (sessionUser: User): UserWithRole => {
    const metaName = (sessionUser.user_metadata as any)?.name;
    const metaRole = (sessionUser.user_metadata as any)?.role;

    return {
      ...sessionUser,
      role: (metaRole as 'admin' | 'corretor') || 'corretor',
      name: metaName || 'Usuário',
    };
  };

  const fetchProfile = async (sessionUser: User | null) => {
    const token = ++lastFetchToken.current;

    if (!sessionUser) {
      setUser(null);
      return;
    }

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('name, role')
        .eq('id', sessionUser.id)
        .single();

      if (token !== lastFetchToken.current) return;

      if (profile && !error) {
        setUser({
          ...sessionUser,
          role: (profile.role as 'admin' | 'corretor') || 'corretor',
          name: profile.name || (sessionUser.user_metadata as any)?.name || 'Usuário',
        });
      } else {
        setUser(buildFallbackUser(sessionUser));
      }
    } catch (err) {
      if (token !== lastFetchToken.current) return;
      console.error('Erro ao carregar perfil:', err);
      setUser(buildFallbackUser(sessionUser));
    }
  };

  const refreshProfile = async () => {
    await fetchProfile(session?.user ?? null);
  };

  useEffect(() => {
    let isMounted = true;

    // Unificamos a inicialização e a escuta de mudanças em um único lugar
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return;

      // Se for um evento de "SIGNED_OUT", limpamos tudo e paramos o loading
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(nextSession);

      if (nextSession?.user) {
        await fetchProfile(nextSession.user);
      } else {
        setUser(null);
      }

      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const signUp = async (email: string, pass: string, name: string, phone: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { name, phone, role: 'corretor' },
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);