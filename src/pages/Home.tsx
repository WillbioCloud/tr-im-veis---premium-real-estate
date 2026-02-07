import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import { Icons } from '../components/Icons';
import { useProperties } from '../hooks/useProperties';
import Loading from '../components/Loading';

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
      {/* Hero Section Premium com VÍDEO */}
      <section className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        
        {/* Vídeo de Fundo */}
        <div className="absolute inset-0">
          <video 
            src="https://res.cloudinary.com/dxplpg36m/video/upload/v1770259664/Cria%C3%A7%C3%A3o_de_V%C3%ADdeo_Imobili%C3%A1rio_de_Luxo_cfgwew.mp4" 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
          />
          {/* Overlay Escuro para Legibilidade */}
          <div className="absolute inset-0 bg-black/40"></div>
        </div>

        {/* Conteúdo Central */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 animate-slide-up drop-shadow-lg">
            Encontre o imóvel dos <br/> seus sonhos
          </h1>
          <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl mx-auto drop-shadow-md">
            Exclusividade, conforto e as melhores oportunidades do mercado imobiliário em um só lugar.
          </p>

          {/* Barra de Busca */}
          <form onSubmit={handleSearch} className="max-w-3xl mx-auto bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-2xl flex flex-col md:flex-row gap-2">
            <div className="flex-1 bg-white rounded-xl flex items-center px-4 py-3 shadow-inner">
              <Icons.MapPin className="text-brand-500 mr-3" />
              <input 
                type="text" 
                placeholder="Buscar por cidade, bairro ou condomínio..." 
                className="flex-1 bg-transparent outline-none text-slate-700 placeholder-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-brand-500/50 flex items-center justify-center gap-2">
              <Icons.Search />
              Buscar
            </button>
          </form>
        </div>
      </section>

      {/* Categorias Rápidas */}
      <section className="container mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div onClick={() => navigate('/imoveis?type=Casa')} className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-4 border border-brand-50 dark:border-dark-border group">
            <div className="p-4 bg-brand-50 dark:bg-slate-800 rounded-full text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Icons.Home size={28} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">Casas à venda</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ver opções disponíveis</p>
            </div>
          </div>
          <div onClick={() => navigate('/imoveis?type=Apartamento')} className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-4 border border-brand-50 dark:border-dark-border group">
            <div className="p-4 bg-brand-50 dark:bg-slate-800 rounded-full text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Icons.Building size={28} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">Apartamentos</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Ver opções disponíveis</p>
            </div>
          </div>
          <div onClick={() => navigate('/imoveis?type=Terreno')} className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-xl hover:-translate-y-1 transition-all cursor-pointer flex items-center gap-4 border border-brand-50 dark:border-dark-border group">
            <div className="p-4 bg-brand-50 dark:bg-slate-800 rounded-full text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors">
              <Icons.TrendingUp size={28} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white text-lg">Lotes</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Oportunidades em terrenos</p>
            </div>
          </div>
        </div>
      </section>

      {/* Grid de Bairros Populares (Visual) */}
      <section className="py-20 bg-gray-50 dark:bg-dark-bg transition-colors">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white mb-2">Explore por Estilo de Vida</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-10">Encontre o lugar perfeito para sua rotina.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[500px]">
             {/* Card Grande Esquerda */}
             <div onClick={() => navigate('/imoveis?type=Casa')} className="md:col-span-2 md:row-span-2 relative rounded-2xl overflow-hidden cursor-pointer group">
               <img src="https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="Casas" />
               <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <h3 className="text-white font-serif text-2xl font-bold">Casas Modernas</h3>
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
               <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <h3 className="text-white font-serif text-2xl font-bold">Bairros Nobres</h3>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Destaques (Do Banco de Dados) */}
      <section className="py-20 bg-white dark:bg-dark-bg transition-colors">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-serif font-bold text-slate-800 dark:text-white">Imóveis em Destaque</h2>
              <p className="text-gray-500 dark:text-gray-400 mt-2">Seleção exclusiva para você.</p>
            </div>
            <button onClick={() => navigate('/imoveis')} className="text-brand-600 font-bold hover:text-brand-700 flex items-center gap-2">
              Ver todos <Icons.ArrowRight size={18} />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Loading /></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProperties.length > 0 ? (
                featuredProperties.map(property => (
                  <PropertyCard key={property.id} property={property} />
                ))
              ) : (
                <p className="col-span-3 text-center text-gray-400 py-10">
                  Nenhum imóvel destacado no momento.
                </p>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Home;