import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PropertyCard from '../components/PropertyCard';
import { Icons } from '../components/Icons';
import { Property, PropertyType } from '../types';

const Properties: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros Locais
  const currentCity = searchParams.get('city') || '';
  const currentType = searchParams.get('type') || '';

  useEffect(() => {
    async function fetchProperties() {
      setLoading(true);
      
      try {
        // === CORREÇÃO DA QUERY ===
        // Removemos o 'agent:' e buscamos 'profiles' puro para evitar o Erro 400
        let query = supabase
          .from('properties')
          .select('*, profiles(name, phone, email)'); 

        if (currentCity) {
          query = query.ilike('city', `%${currentCity}%`);
        }
        
        if (currentType) {
          query = query.eq('type', currentType);
        }

        const { data, error } = await query;

        if (error) {
          console.error("Erro Supabase:", error);
          throw error;
        }

        if (data) {
          // === MAPEAMENTO ROBUSTO ===
          const mappedData: Property[] = data.map((item: any) => ({
            ...item,
            // 1. Garante que 'location' exista para o PropertyCard não quebrar
            location: {
              city: item.city || '',
              neighborhood: item.neighborhood || '',
              state: item.state || '',
              address: item.address || ''
            },
            // 2. Transforma 'profiles' (do banco) em 'agent' (do front-end)
            // O Supabase pode retornar 'profiles' como objeto ou array, tratamos os dois.
            agent: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
            
            features: item.features || [],
            images: item.images || []
          }));
          
          setProperties(mappedData);
        }
      } catch (err) {
        console.error("Falha ao buscar imóveis:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProperties();
  }, [currentCity, currentType]);

  const handleFilterChange = (key: string, value: string) => {
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="bg-gray-50 min-h-screen py-20 animate-fade-in">
      <div className="container mx-auto px-4">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div>
            <h1 className="text-4xl font-serif font-bold text-slate-800 mb-2">Imóveis Exclusivos</h1>
            <p className="text-slate-500">Encontre o lar dos seus sonhos em nossa seleção premium.</p>
          </div>

          <div className="flex gap-4 w-full md:w-auto">
             <div className="relative flex-1 md:w-64">
               <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
               <input 
                 type="text" 
                 placeholder="Filtrar por cidade..." 
                 className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 outline-none transition-all shadow-sm"
                 value={currentCity}
                 onChange={e => handleFilterChange('city', e.target.value)}
               />
             </div>
             
             <select 
               className="pl-4 pr-10 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500 outline-none bg-white shadow-sm cursor-pointer"
               value={currentType}
               onChange={e => handleFilterChange('type', e.target.value)}
             >
               <option value="">Todos os Tipos</option>
               {Object.values(PropertyType).map(t => (
                 <option key={t} value={t}>{t}</option>
               ))}
             </select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1,2,3].map(i => (
              <div key={i} className="h-96 bg-gray-200 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : properties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {properties.map(property => (
              <PropertyCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
            <Icons.Search className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-xl font-bold text-gray-700">Nenhum imóvel encontrado</h3>
            <p className="text-gray-500">Tente ajustar os filtros ou verificar a conexão.</p>
            <button 
              onClick={() => setSearchParams({})}
              className="mt-4 text-brand-600 font-bold hover:underline"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Properties;