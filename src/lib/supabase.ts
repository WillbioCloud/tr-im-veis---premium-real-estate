import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Erro Crítico: Variáveis de ambiente do Supabase não encontradas.');
}

declare global {
  interface Window {
    __trimoveisSupabase?: ReturnType<typeof createClient>;
  }
}

const createSupabaseSingleton = () =>
  createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: { 'x-application-name': 'trimoveis-crm' },
    },
  });

export const supabase =
  window.__trimoveisSupabase ?? (window.__trimoveisSupabase = createSupabaseSingleton());

const isRecoverableAuthError = (error: unknown): boolean => {
  if (!error) return false;
  const message = `${(error as { message?: string }).message ?? ''}`.toLowerCase();
  return (
    message.includes('jwt') ||
    message.includes('expired') ||
    message.includes('network') ||
    message.includes('failed to fetch')
  );
};

export async function runWithSessionRecovery<T>(executor: () => Promise<T>): Promise<T> {
  try {
    return await executor();
  } catch (error) {
    if (!isRecoverableAuthError(error)) {
      throw error;
    }

    const { error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError) {
      throw error;
    }

    return executor();
  }
}