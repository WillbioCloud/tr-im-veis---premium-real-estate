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
        // Query corrigida: sem alias 'agent:'
        const { data, error } = await supabase
          .from('properties')
          .select('*, profiles(name, phone, email)')
          .order('created_at', { ascending: false });

        if (error) throw error;

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
            // Mapeia profiles -> agent
            agent: Array.isArray(p.profiles) ? p.profiles[0] : p.profiles
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