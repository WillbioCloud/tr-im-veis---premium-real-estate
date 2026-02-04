import { createClient } from '@supabase/supabase-js';

// Substitua pelas suas chaves do Supabase (Project Settings > API)
// Idealmente, coloque em um arquivo .env como VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'SUA_URL_DO_SUPABASE_AQUI';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'SUA_KEY_ANON_AQUI';

export const supabase = createClient(supabaseUrl, supabaseKey);