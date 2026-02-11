import { useEffect, useState } from 'react';
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

const isAbortError = (error: unknown): boolean => {
  if (!error) return false;
  const maybeError = error as { name?: string; message?: string; code?: string | number };
  const message = maybeError.message ?? '';

  return (
    maybeError.name === 'AbortError' ||
    maybeError.code === 20 ||
    maybeError.code === '20' ||
    message.includes('AbortError')
  );
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

  useEffect(() => {
    let isMounted = true;

    const fetchProperties = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: joinError } = await supabase
          .from('properties')
          .select(`
            *,
            agent:profiles (name, email, phone)
          `)
          .order('created_at', { ascending: false });

        if (!isMounted) return;

        if (joinError) {
          if (isAbortError(joinError)) {
            return;
          }

          const { data: fallbackData, error: fallbackError } = await supabase
            .from('properties')
            .select('*')
            .order('created_at', { ascending: false });

          if (!isMounted) return;

          if (fallbackError) {
            if (isAbortError(fallbackError)) {
              return;
            }
            throw fallbackError;
          }

          const mappedFallback = (fallbackData ?? []).map((property) =>
            normalizeProperty({ ...(property as RawProperty), agent: null })
          );
          setProperties(mappedFallback);
          return;
        }

        const mappedProperties = (data ?? []).map((property) => normalizeProperty(property as RawProperty));
        setProperties(mappedProperties);
      } catch {
        if (!isMounted) return;
        setError('Não foi possível carregar a lista de imóveis no momento.');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchProperties();

    return () => {
      isMounted = false;
    };
  }, []);

  return { properties, loading, error };
}
