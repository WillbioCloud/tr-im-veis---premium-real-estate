import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Property } from '../types';

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true; // Variável de controle para evitar AbortError

    async function fetchProperties() {
      try {
        setLoading(true);
        
        // Busca otimizada trazendo dados dos perfis relacionados
        const { data, error } = await supabase
          .from('properties')
          .select(`
            *,
            profiles (name, email, phone)
          `)
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        if (error) {
          // Ignora erro de cancelamento natural do React
          if (error.message?.includes('AbortError')) return;
          throw error;
        }

        if (data) {
          const mappedProperties: Property[] = data.map((p: any) => ({
            ...p,
            location: {
              city: p.city || '',
              neighborhood: p.neighborhood || '',
              state: p.state || '',
              address: p.address || ''
            },
            features: p.features || [],
            images: p.images || [],
            // Mapeamento seguro do agente a partir do perfil
            agent: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
          }));
          
          setProperties(mappedProperties);
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Erro ao buscar imóveis:", err.message);
          setError(err.message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchProperties();

    return () => {
      isMounted = false; // Cancela atualizações se o componente fechar
    };
  }, []);

  return { properties, loading, error };
}