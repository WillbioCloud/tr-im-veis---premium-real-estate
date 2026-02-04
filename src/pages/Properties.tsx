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

  // Carregar Imóveis com Filtros
  useEffect(() => {
    async function fetchProperties() {
      setLoading(true);
      
      let query = supabase.from('properties').select('*');

      // Aplica filtros se existirem na URL
      if (currentCity) {
        // ilike faz busca case-insensitive (ignora maiuscula/minuscula)
        query = query.ilike('location->>city', `%${currentCity}%`);
      }
      
      if (currentType) {
        query = query.eq('type', currentType);
      }

      const { data, error } = await query;

      if (data) {
        // Mapping necessário se o objeto location vier plano do banco ou JSON
        const mappedData = data.map((item: any) => ({
          ...item,
          // Garante que location seja objeto se o banco retornou JSON
          location: typeof item.location === 'string' ? JSON.parse(item.location) : item.location
        }));
        setProperties(mappedData);
      } else {
        console.error(error);
      }
      
      setLoading(false);
    }

    fetchProperties();
  }, [currentCity, currentType]);

  // Handler para atualizar filtros
  const handleFilterChange = (key: string, value: string) => {
    if (value) {
      searchParams.set(key, value);
    } else {
      searchParams.delete(key);
    }
    setSearchParams(searchParams);
  };

  return (
    <div className="bg-gray-50 min-h-screen py-10">
      <div className="container mx-auto px-4">
        
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">Nossos Imóveis</h1>
            <p className="text-gray-500 mt-1">
              {loading ? 'Buscando...' : `${properties.length} imóveis encontrados`}
              {currentCity && ` em "${currentCity}"`}
            </p>
          </div>
          
          {/* Barra de Filtros Simples */}
          <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
             <div className="relative">
               <Icons.MapPin className="absolute left-3 top-3 text-gray-400" size={16}/>
               <input 
                 type="text" 
                 placeholder="Cidade..." 
                 className="pl-9 pr-4 py-2 bg-gray-50 rounded-md text-sm outline-none focus:ring-2 focus:ring-amber-500 w-40"
                 value={currentCity}
                 onChange={(e) => handleFilterChange('city', e.target.value)}
               />
             </div>
             <select 
               className="px-4 py-2 bg-gray-50 rounded-md text-sm outline-none focus:ring-2 focus:ring-amber-500 border-r-8 border-transparent"
               value={currentType}
               onChange={(e) => handleFilterChange('type', e.target.value)}
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
            <p className="text-gray-500">Tente ajustar os filtros ou buscar por outra cidade.</p>
            <button 
              onClick={() => setSearchParams({})}
              className="mt-4 text-amber-600 font-bold hover:underline"
            >
              Limpar filtros
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Properties;