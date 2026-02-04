import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase'; // Opcional: Se você gerar tipos do Supabase depois

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificação de segurança para garantir que o .env foi carregado corretamente
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Erro Crítico: Variáveis de ambiente do Supabase não encontradas. ' +
    'Verifique se o arquivo .env.local existe na raiz do projeto e contém VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);