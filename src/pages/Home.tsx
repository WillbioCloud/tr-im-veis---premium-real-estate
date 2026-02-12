import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PropertyCard from '../components/PropertyCard';
import { Icons } from '../components/Icons';
import { useProperties } from '../hooks/useProperties';
import Loading from '../components/Loading';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const { properties, loading } = useProperties();

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
    <div className="animate-fade-in bg-slate-50 dark:bg-dark-bg min-h-screen font-sans">
      {/* Hero Section Premium */}
      <section className="relative h-[85vh] w-full p-4 md:p-6 pb-0">
        <div className="relative w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl">
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
            <div className="absolute inset-0 bg-black/30"></div>
            </div>

            {/* Conteúdo Central */}
            <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4">
            <h1 className="text-4xl md:text-7xl font-semibold tracking-tight text-white mb-6 drop-shadow-lg">
                Imóveis para viver <br/> e investir
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-12 max-w-2xl font-light">
                A curadoria mais exclusiva do mercado imobiliário.
            </p>

            {/* Barra de Busca Estilo "Cápsula" */}
            <form onSubmit={handleSearch} className="w-full max-w-4xl bg-white p-2 rounded-full shadow-xl flex flex-col md:flex-row items-center gap-2 animate-slide-up">
                <div className="flex-1 w-full flex items-center px-6 py-3 border-r border-gray-100">
                    <Icons.MapPin className="text-slate-400 mr-3" size={20} />
                    <div className="flex flex-col items-start w-full">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Localização</span>
                        <input 
                        type="text" 
                        placeholder="Cidade, bairro ou condomínio" 
                        className="w-full bg-transparent outline-none text-slate-800 placeholder-slate-400 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                
                {/* Botão de Busca Preto (Pill Shape) */}
                <button className="bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-full font-medium transition-all shadow-lg flex items-center gap-2 w-full md:w-auto justify-center">
                    <Icons.Search size={20} />
                    Buscar
                </button>
            </form>
            </div>
        </div>
      </section>

      {/* Categorias (Inspirado em "Sell with top agents") */}
      <section className="container mx-auto px-6 py-20">
        <div className="flex justify-between items-end mb-10">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-white">O que você procura?</h2>
            <button onClick={() => navigate('/imoveis')} className="hidden md:flex items-center gap-2 text-slate-900 dark:text-white font-medium hover:underline">
                Ver tudo <Icons.ArrowRight size={18} />
            </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { type: 'Casa', icon: Icons.Home, label: 'Casas', desc: 'Conforto e espaço' },
            { type: 'Apartamento', icon: Icons.Building, label: 'Apartamentos', desc: 'Praticidade urbana' },
            { type: 'Terreno', icon: Icons.TrendingUp, label: 'Investimento', desc: 'Lotes e terrenos' }
          ].map((cat, idx) => (
            <div 
                key={idx}
                onClick={() => navigate(`/imoveis?type=${cat.type}`)} 
                className="bg-white dark:bg-dark-card p-8 rounded-[2rem] border border-slate-100 dark:border-dark-border hover:shadow-xl transition-all cursor-pointer group flex flex-col items-start"
            >
              <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-900 dark:text-white group-hover:scale-110 transition-transform">
                <cat.icon size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{cat.label}</h3>
              <p className="text-slate-500 dark:text-gray-400">{cat.desc}</p>
              <div className="mt-8 w-full pt-6 border-t border-slate-100 dark:border-slate-800">
                <span className="inline-block px-6 py-3 rounded-full border border-slate-200 text-slate-900 font-medium text-sm group-hover:bg-slate-900 group-hover:text-white transition-colors">
                    Ver opções
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Grid Visual de Estilo de Vida */}
      <section className="py-20 bg-white dark:bg-dark-bg">
        <div className="container mx-auto px-6">
          <div className="mb-12">
            <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-white mb-4">Explore por Estilo de Vida</h2>
            <p className="text-slate-500 text-lg">Encontre o imóvel que combina com sua rotina.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[600px]">
             <div onClick={() => navigate('/imoveis?type=Casa')} className="md:col-span-2 md:row-span-2 relative rounded-[2.5rem] overflow-hidden cursor-pointer group">
               <img src="https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Casas" />
               <div className="absolute bottom-0 left-0 p-8 w-full bg-gradient-to-t from-black/60 to-transparent">
                  <h3 className="text-white text-3xl font-semibold">Casas Modernas</h3>
                  <p className="text-white/80 mt-2 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0">Design e arquitetura contemporânea</p>
               </div>
             </div>
             
             <div onClick={() => navigate('/imoveis?type=Apartamento')} className="relative rounded-[2.5rem] overflow-hidden cursor-pointer group">
               <img src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Apartamentos" />
               <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors"></div>
               <div className="absolute bottom-6 left-6">
                  <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-full text-sm font-bold text-slate-900">Apartamentos</span>
               </div>
             </div>

             <div onClick={() => navigate('/imoveis?type=Cobertura')} className="relative rounded-[2.5rem] overflow-hidden cursor-pointer group">
               <img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Coberturas" />
               <div className="absolute bottom-6 left-6">
                  <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-full text-sm font-bold text-slate-900">Coberturas</span>
               </div>
             </div>

             <div onClick={() => navigate('/imoveis?city=Jardins')} className="md:col-span-2 relative rounded-[2.5rem] overflow-hidden cursor-pointer group">
               <img src="https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=800&q=80" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" alt="Bairros" />
               <div className="absolute bottom-0 left-0 p-8 w-full bg-gradient-to-t from-black/60 to-transparent">
                  <h3 className="text-white text-2xl font-semibold">Bairros Nobres</h3>
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* Destaques */}
      <section className="py-20 bg-slate-50 dark:bg-dark-bg">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 dark:text-white">Imóveis em Destaque</h2>
              <p className="text-slate-500 mt-2 text-lg">Oportunidades selecionadas recentemente.</p>
            </div>
            <button onClick={() => navigate('/imoveis')} className="px-6 py-3 rounded-full border border-slate-300 hover:border-slate-900 hover:bg-slate-900 hover:text-white transition-all font-medium">
              Ver todos os imóveis
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