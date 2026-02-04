import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import { Icons } from '../components/Icons';
import { useProperties } from '../hooks/useProperties';
import Loading from '../components/Loading'; // Importe o Loading novo

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { properties, loading, error } = useProperties();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm) {
      navigate(`/imoveis?city=${encodeURIComponent(searchTerm)}`);
    } else {
      navigate('/imoveis');
    }
  };

  const featuredProperties = properties.filter(p => p.featured).slice(0, 3);

  return (
    <div className="animate-fade-in">
      {/* Hero Section Premium */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        {/* Imagem de Fundo com Zoom Lento */}
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1600596542815-27b88e54e60f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80" 
            alt="Luxury Home" 
            className="w-full h-full object-cover animate-[ping_30s_linear_infinite] scale-100 hover:scale-105 transition-transform duration-[20s]" 
            style={{ animation: 'none' }} // Removemos ping, usamos transition CSS puro se quiser zoom
          />
          {/* Gradiente Duplo para Leitura Perfeita */}
          <div className="absolute inset-0 bg-gradient-to-b from-slate-900/70 via-slate-900/40 to-slate-900/80" />
        </div>

        <div className="relative z-10 container mx-auto px-4 text-center">
          <span className="inline-block py-1 px-3 border border-white/30 rounded-full text-white/90 text-xs font-bold tracking-[0.2em] uppercase mb-6 backdrop-blur-sm animate-slide-up">
            Caldas Novas - GO
          </span>
          <h1 className="text-5xl md:text-7xl font-serif font-bold text-white mb-6 drop-shadow-2xl leading-tight animate-slide-up">
            Realizando sonhos <br/>através de bons negócios imobiliários.
          </h1>
          <p className="text-xl text-gray-200 mb-10 max-w-2xl mx-auto font-light animate-slide-up delay-100">
            Curadoria exclusiva de imóveis para quem sonha com a casa própria.
          </p>

          {/* Barra de Busca Flutuante */}
          <form 
            onSubmit={handleSearch} 
            className="max-w-4xl mx-auto bg-white/10 backdrop-blur-md p-2 rounded-full border border-white/20 shadow-2xl flex flex-col md:flex-row items-center gap-2 animate-slide-up delay-200"
          >
            <div className="flex-grow w-full md:w-auto bg-white rounded-full px-6 py-4 flex items-center gap-3 shadow-inner">
              <Icons.MapPin className="text-brand-500" />
              <input 
                type="text" 
                placeholder="Onde você quer viver? (Ex: Jardins)" 
                className="w-full outline-none text-slate-800 placeholder-slate-400 bg-transparent font-medium"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button type="submit" className="w-full md:w-auto bg-brand-500 hover:bg-brand-600 text-white font-bold py-4 px-10 rounded-full transition-all shadow-lg hover:shadow-brand-500/30 flex items-center justify-center gap-2">
              <Icons.Search size={20} />
              Buscar
            </button>
          </form>
        </div>
      </section>

      {/* Featured Properties */}
      <section className="py-24 bg-brand-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-16">
            <div>
              <span className="text-brand-600 font-bold uppercase tracking-widest text-xs mb-2 block">Coleção Exclusiva</span>
              <h2 className="text-4xl font-serif font-bold text-slate-900">Destaques da Semana</h2>
            </div>
            <button 
              onClick={() => navigate('/imoveis')}
              className="hidden md:flex items-center gap-2 text-slate-900 font-bold border-b-2 border-brand-500 hover:text-brand-600 transition-colors pb-1"
            >
              Ver todo o portfólio <Icons.ArrowRight size={18} />
            </button>
          </div>

          {loading && <Loading />}
          {error && <div className="text-center py-10 text-red-500">Erro ao carregar coleção.</div>}
          
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties.length > 0 ? (
                featuredProperties.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))
              ) : (
                <div className="col-span-3 text-center py-20 bg-white rounded-xl shadow-sm border border-dashed border-gray-300">
                  <p className="text-gray-500">Nenhum imóvel em destaque no momento.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Categorias / Lifestyle */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 text-center mb-16">
           <h2 className="text-4xl font-serif font-bold text-slate-900 mb-4">Viva o seu melhor estilo</h2>
           <p className="text-gray-500">Selecione o que mais combina com seu momento de vida.</p>
        </div>
        
        <div className="container mx-auto px-4 grid grid-cols-1 md:grid-cols-4 gap-4 h-[500px]">
          {/* Card Grande Esquerda */}
          <div 
             onClick={() => navigate('/imoveis?type=Casa')}
             className="md:col-span-2 md:row-span-2 relative rounded-2xl overflow-hidden cursor-pointer group"
          >
            <img src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Casas" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent p-8 flex flex-col justify-end">
              <h3 className="text-white font-serif text-3xl font-bold mb-2">Casas de Luxo</h3>
              <p className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0 duration-500">Privacidade e conforto absoluto.</p>
            </div>
          </div>

          {/* Cards Direita */}
          <div onClick={() => navigate('/imoveis?type=Apartamento')} className="relative rounded-2xl overflow-hidden cursor-pointer group">
            <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Apartamentos" />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
               <h3 className="text-white font-serif text-xl font-bold">Apartamentos</h3>
            </div>
          </div>
          <div onClick={() => navigate('/imoveis?type=Cobertura')} className="relative rounded-2xl overflow-hidden cursor-pointer group">
            <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Coberturas" />
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
               <h3 className="text-white font-serif text-xl font-bold">Coberturas</h3>
            </div>
          </div>
          <div onClick={() => navigate('/imoveis?city=Jardins')} className="md:col-span-2 relative rounded-2xl overflow-hidden cursor-pointer group">
            <img src="https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Bairros" />
            <div className="absolute inset-0 bg-black/50 group-hover:bg-black/30 transition-colors flex items-center justify-center">
               <h3 className="text-white font-serif text-2xl font-bold">Bairros Nobres</h3>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};

export default Home;