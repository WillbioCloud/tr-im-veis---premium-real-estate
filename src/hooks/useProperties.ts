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
        setLoading(true);
        const { data, error } = await supabase
          .from('properties')
          .select('*');

        if (error) {
          throw error;
        }

        if (data) {
          // Mapeamento necessário se o banco retornar campos ligeiramente diferentes
          // Mas como criamos a tabela baseada no tipo, deve bater direto.
          // Ajuste para garantir que 'location' seja montado corretamente se vier plano do banco
          const formattedData: Property[] = data.map((item: any) => ({
            ...item,
            location: {
              city: item.city,
              neighborhood: item.neighborhood,
              state: item.state
            }
          }));
          setProperties(formattedData);
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