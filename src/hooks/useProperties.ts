import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Property } from '../types';

/**
 * Hook customizado para buscar e gerenciar a lista de imóveis.
 * Inclui tratamento para AbortError e mapeamento seguro de dados.
 */
export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true; 

    async function fetchProperties() {
      try {
        setLoading(true);
        setError(null);
        
        // Busca os imóveis com um JOIN na tabela profiles para pegar o nome do agente
        const { data, error: supabaseError } = await supabase
          .from('properties')
          .select(`
            *,
            agent:profiles (name, email, phone)
          `)
          .order('created_at', { ascending: false });

        // Se o componente foi fechado durante a requisição, ignoramos o resultado
        if (!isMounted) return;

        if (supabaseError) {
          // TRATAMENTO DO ABORTERROR: 
          // O Chrome dispara isso quando a conexão é resetada ou cancelada.
          // Ignoramos para não mostrar erro "feio" ao usuário.
          if (supabaseError.message?.includes('AbortError') || (supabaseError as any).code === '20') {
            return; 
          }
          throw supabaseError;
        }

        if (data) {
          const mappedProperties: Property[] = data.map((p: any) => ({
            ...p,
            // Normaliza o objeto de localização para o formato esperado pelo frontend
            location: {
              city: p.city || '',
              neighborhood: p.neighborhood || '',
              state: p.state || '',
              address: p.address || ''
            },
            features: Array.isArray(p.features) ? p.features : [],
            images: Array.isArray(p.images) ? p.images : [],
            // Mapeamento seguro: Se o RLS bloquear o perfil, o imóvel ainda aparece sem agente
            agent: p.agent || null
          }));
          
          setProperties(mappedProperties);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Erro técnico na busca de imóveis:", err.message);
          setError("Não foi possível carregar a lista de imóveis no momento.");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProperties();

    return () => {
      isMounted = false; // Cleanup para evitar vazamento de memória e erros de estado
    };
  }, []);

  return { properties, loading, error };
}