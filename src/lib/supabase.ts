import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Erro Crítico: Variáveis de ambiente do Supabase não encontradas.'
  );
}

// Configuração ROBUSTA para evitar desconexão
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true, // Garante que o login sobreviva ao refresh/navegação
    autoRefreshToken: true, // Renova o token automaticamente
    detectSessionInUrl: true,
  },
  // Melhoria para Realtime não cair do nada
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
  // Cache global para evitar re-instanciamento
  global: {
    headers: { 'x-application-name': 'trimoveis-crm' },
  },
});