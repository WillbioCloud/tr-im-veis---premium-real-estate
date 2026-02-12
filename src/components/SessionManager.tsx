// src/components/SessionManager.tsx
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const TOKEN_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

export const SessionManager = () => {
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return;

    const interval = window.setInterval(async () => {
      const { error } = await supabase.auth.refreshSession();

      if (error) {
        console.warn('Falha ao renovar token silenciosamente:', error);
      }
    }, TOKEN_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
    };
  }, [session]);

  return null;
};