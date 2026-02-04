import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import { Icons } from '../components/Icons';
import { useProperties } from '../hooks/useProperties'; // Importando o hook

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Substituindo o MOCK_PROPERTIES pelo hook
  const { properties, loading, error } = useProperties();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm) {
      navigate(`/imoveis?city=${encodeURIComponent(searchTerm)}`);
    } else {
      navigate('/imoveis');
    }
  };

  // Filtrando destaques dos dados reais
  const featuredProperties = properties.filter(p => p.featured).slice(0, 3);

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative h-[600px] flex items-center justify-center">
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1600596542815-27b88e54e60f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
            alt="Luxury Home" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 to-slate-900/30" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 drop-shadow-lg">
            Encontre o imóvel dos seus sonhos
          </h1>
          <p className="text-xl text-gray-200 mb-10 max-w-2xl mx-auto drop-shadow-md">
            A curadoria mais exclusiva de propriedades de alto padrão.
          </p>

          <form onSubmit={handleSearch} className="max-w-4xl mx-auto bg-white p-2 rounded-full shadow-2xl flex flex-col md:flex-row items-center gap-2">
            <div className="flex-grow w-full md:w-auto px-6 py-3 flex items-center gap-3 border-b md:border-b-0 md:border-r border-gray-100">
              <Icons.MapPin className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Qual cidade ou bairro?" 
                className="w-full outline-none text-gray-700 bg-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="hidden md:flex items-center px-6 py-3 gap-3 w-1/4 border-r border-gray-100 text-gray-500 cursor-pointer hover:text-gray-800">
              <Icons.Home />
              <span>Tipo</span>
            </div>
            <button type="submit" className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-4 px-8 rounded-full transition-colors">
              Buscar
            </button>
          </form>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <span className="text-amber-600 font-bold uppercase tracking-wider text-sm">Exclusividade</span>
              <h2 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mt-2">Destaques da Coleção</h2>
            </div>
            <button 
              onClick={() => navigate('/imoveis')}
              className="hidden md:flex items-center gap-2 text-slate-900 font-medium hover:text-amber-600 transition-colors"
            >
              Ver todos <Icons.ArrowRight size={18} />
            </button>
          </div>

          {/* Loading / Error States */}
          {loading && <div className="text-center py-10">Carregando imóveis exclusivos...</div>}
          {error && <div className="text-center py-10 text-red-500">Erro ao carregar imóveis. Tente novamente.</div>}
          
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties.length > 0 ? (
                featuredProperties.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))
              ) : (
                <div className="col-span-3 text-center text-gray-500">
                  Nenhum imóvel em destaque no momento.
                </div>
              )}
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <button onClick={() => navigate('/imoveis')} className="btn-secondary">
              Ver todos imóveis
            </button>
          </div>
        </div>
      </section>

      {/* Neighborhoods / SEO Section */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-serif font-bold text-slate-900 mb-10 text-center">Explore por Região</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {['Jardins', 'Alphaville', 'Vila Nova Conceição', 'Lago Sul'].map((hood, i) => (
              <div 
                key={hood} 
                onClick={() => navigate(`/imoveis?city=${hood}`)}
                className="relative h-64 rounded-xl overflow-hidden cursor-pointer group"
              >
                <img 
                  src={`https://picsum.photos/400/600?random=${i+10}`} 
                  alt={hood} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-xl font-bold">{hood}</h3>
                  <span className="text-xs opacity-90 group-hover:underline">Ver propriedades</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-slate-900 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-serif font-bold mb-12">O que dizem nossos clientes</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-800 p-8 rounded-2xl relative">
                <div className="text-amber-500 text-4xl font-serif absolute top-4 left-6">"</div>
                <p className="text-gray-300 italic mb-6 pt-4">
                  Excelente atendimento. A equipe da TR Imóveis entendeu exatamente o que eu buscava.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <div className="w-10 h-10 bg-gray-600 rounded-full" />
                  <div className="text-left">
                    <p className="font-bold">Cliente Satisfeito</p>
                    <p className="text-xs text-gray-400">Comprador Verificado</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;