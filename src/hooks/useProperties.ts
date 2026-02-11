import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Property } from '../types';

type RawProperty = Omit<Property, 'location'> & {
  city?: string | null;
  neighborhood?: string | null;
  state?: string | null;
  address?: string | null;
  features?: unknown;
  images?: unknown;
  agent?: {
    name?: string | null;
    email?: string | null;
    phone?: string | null;
  } | null;
};

const normalizeProperty = (p: RawProperty): Property => ({
  ...p,
  location: {
    city: p.city ?? '',
    neighborhood: p.neighborhood ?? '',
    state: p.state ?? '',
    address: p.address ?? '',
  },
  features: Array.isArray(p.features) ? (p.features as string[]) : [],
  images: Array.isArray(p.images) ? (p.images as string[]) : [],
  agent: p.agent
    ? {
        name: p.agent.name ?? 'Corretor',
        email: p.agent.email ?? '',
        phone: p.agent.phone ?? '',
      }
    : undefined,
});

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Ref para evitar vazamento de memória do Realtime
  const channelRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchProperties = async () => {
      try {
        // Tenta buscar com o JOIN (Requer permissão de acesso à tabela profiles)
        const { data, error: joinError } = await supabase
          .from('properties')
          .select(`*, agent:profiles (name, email, phone)`)
          .order('created_at', { ascending: false });

        if (joinError) throw joinError;

        if (isMounted && data) {
          const mapped = data.map((p) => normalizeProperty(p as RawProperty));
          setProperties(mapped);
          setError(null);
        }
      } catch (err) {
        // FALLBACK: Se falhar (ex: usuário deslogado não pode ler 'profiles'), busca simples
        console.warn('Erro ao buscar com join, tentando busca simples...', err);
        
        const { data: simpleData, error: simpleError } = await supabase
          .from('properties')
          .select('*')
          .order('created_at', { ascending: false });

        if (isMounted) {
          if (simpleError) {
            console.error('Erro fatal ao buscar imóveis:', simpleError);
            setError('Não foi possível carregar os imóveis.');
          } else if (simpleData) {
            const mapped = simpleData.map((p) => normalizeProperty({ ...p, agent: null } as RawProperty));
            setProperties(mapped);
            setError(null);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // 1. Busca Inicial
    fetchProperties();

    // 2. Configuração do REALTIME (Ouvindo mudanças no banco)
    channelRef.current = supabase
      .channel('public:properties')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'properties' },
        () => {
          // Se houver qualquer mudança (novo, delete, update), recarrega a lista
          fetchProperties();
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      isMounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  return { properties, loading, error };
}