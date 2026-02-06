import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Property } from '../types';

export function useProperties() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProperties() {
      try {
        // Agora fazemos um JOIN para trazer os dados do corretor (profiles)
        const { data, error } = await supabase
          .from('properties')
          .select('*, agent:profiles(name, phone, email)') // <--- O PULO DO GATO
          .order('created_at', { ascending: false });

        if (error) throw error;

        if (data) {
          // Mapeia os dados planos do banco para o objeto Property do frontend
          const mappedProperties: Property[] = data.map((p: any) => ({
            ...p,
            // Corrige a localização que estava sumindo
            location: {
              city: p.city,
              neighborhood: p.neighborhood,
              state: p.state,
              address: p.address
            },
            // Garante que features e images sejam arrays
            features: p.features || [],
            images: p.images || [],
            // Dados do agente (se existir)
            agent: p.agent
          }));
          
          setProperties(mappedProperties);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, []);

  return { properties, loading, error };
}