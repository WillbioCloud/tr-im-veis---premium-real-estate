import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import { MOCK_PROPERTIES } from '../constants';
import { PropertyType } from '../types';
import { Icons } from '../components/Icons';

const Properties: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialCity = searchParams.get('city') || '';

  const [filters, setFilters] = useState({
    city: initialCity,
    type: '',
    minPrice: '',
    maxPrice: '',
    bedrooms: '',
  });

  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  const filteredProperties = useMemo(() => {
    return MOCK_PROPERTIES.filter(p => {
      const matchCity = !filters.city || 
        p.location.city.toLowerCase().includes(filters.city.toLowerCase()) || 
        p.location.neighborhood.toLowerCase().includes(filters.city.toLowerCase());
      
      const matchType = !filters.type || p.type === filters.type;
      
      const matchMinPrice = !filters.minPrice || p.price >= Number(filters.minPrice);
      const matchMaxPrice = !filters.maxPrice || p.price <= Number(filters.maxPrice);
      const matchBeds = !filters.bedrooms || p.bedrooms >= Number(filters.bedrooms);

      return matchCity && matchType && matchMinPrice && matchMaxPrice && matchBeds;
    });
  }, [filters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4">
        
        {/* Header Listing */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-900">Imóveis à Venda</h1>
            <p className="text-gray-500 mt-1">{filteredProperties.length} imóveis encontrados</p>
          </div>
          <button 
            className="md:hidden flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow text-sm font-bold"
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
          >
            <Icons.Filter size={16} /> Filtros
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className={`md:w-1/4 ${showFiltersMobile ? 'block' : 'hidden md:block'}`}>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 sticky top-24">
              <div className="flex justify-between items-center mb-4 md:hidden">
                 <h3 className="font-bold">Filtros</h3>
                 <button onClick={() => setShowFiltersMobile(false)}><Icons.X /></button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Localização</label>
                  <input 
                    type="text" 
                    placeholder="Cidade ou Bairro" 
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    value={filters.city}
                    onChange={(e) => handleFilterChange('city', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tipo de Imóvel</label>
                  <select 
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                    value={filters.type}
                    onChange={(e) => handleFilterChange('type', e.target.value)}
                  >
                    <option value="">Todos</option>
                    {Object.values(PropertyType).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Preço (R$)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      placeholder="Min" 
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    />
                    <input 
                      type="number" 
                      placeholder="Max" 
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Quartos</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map(num => (
                      <button
                        key={num}
                        onClick={() => handleFilterChange('bedrooms', filters.bedrooms === String(num) ? '' : String(num))}
                        className={`flex-1 py-2 rounded border text-sm transition-colors ${
                          filters.bedrooms === String(num) 
                            ? 'bg-slate-900 text-white border-slate-900' 
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {num}+
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                   onClick={() => setFilters({city: '', type: '', minPrice: '', maxPrice: '', bedrooms: ''})}
                   className="w-full py-2 text-sm text-gray-500 hover:text-red-500 underline"
                >
                  Limpar Filtros
                </button>
              </div>
            </div>
          </aside>

          {/* Grid */}
          <div className="md:w-3/4">
            {filteredProperties.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProperties.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-xl shadow-sm">
                <Icons.Search className="mx-auto text-gray-300 mb-4" size={48} />
                <h3 className="text-xl font-bold text-gray-800">Nenhum imóvel encontrado</h3>
                <p className="text-gray-500">Tente ajustar seus filtros de busca.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Properties;
