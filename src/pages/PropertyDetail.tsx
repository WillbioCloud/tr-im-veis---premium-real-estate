import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useProperties } from '../hooks/useProperties';
import { Icons } from '../components/Icons';
import Loading from '../components/Loading';
import { Property } from '../types';

const PropertyDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { properties, loading } = useProperties();
  const [property, setProperty] = useState<Property | null>(null);
  
  // --- Estados do formulário de contato ---
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: 'Olá, gostaria de agendar uma visita a este imóvel.'
  });
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success'>('idle');

  // --- Estados da Galeria (Lightbox) ---
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    if (properties.length > 0 && slug) {
      const found = properties.find((p) => p.slug === slug || p.id === slug);
      if (found) {
        setProperty(found);
      }
    }
  }, [properties, slug]);

  // --- Lógica de Navegação da Galeria e Teclado ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isGalleryOpen || !property) return;
      if (e.key === 'Escape') closeGallery();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGalleryOpen, currentImageIndex, property]);

  if (loading) return <Loading />;
  
  if (!property && !loading && properties.length > 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-4">Imóvel não encontrado</h2>
        <button onClick={() => navigate('/imoveis')} className="text-slate-900 hover:underline font-medium">
          Voltar para lista de imóveis
        </button>
      </div>
    );
  }

  if (!property) return null;

  const isRent = property.listing_type === 'rent';
  const fullAddress = `${property.location.address || ''}, ${property.location.neighborhood}, ${property.location.city} - ${property.location.state}`;
  const mapUrl = `https://maps.google.com/maps?q=${encodeURIComponent(fullAddress)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;

  // Funções da Galeria
  const openGallery = (index: number) => {
    setCurrentImageIndex(index);
    setIsGalleryOpen(true);
    document.body.style.overflow = 'hidden'; // Evita scroll da página no fundo
  };

  const closeGallery = () => {
    setIsGalleryOpen(false);
    document.body.style.overflow = 'auto'; // Restaura scroll da página
  };

  const nextImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev === property.images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? property.images.length - 1 : prev - 1));
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormStatus('sending');
    setTimeout(() => {
      setFormStatus('success');
      const whatsappMessage = `Olá, tenho interesse no imóvel: ${property.title}. Meu nome é ${contactForm.name}.`;
      const whatsappUrl = `https://wa.me/55${property.agent?.phone?.replace(/\D/g, '') || '64999999999'}?text=${encodeURIComponent(whatsappMessage)}`;
      window.open(whatsappUrl, '_blank');
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20 font-sans">
      
      {/* =========================================
          MODAL DA GALERIA (LIGHTBOX)
      ========================================= */}
      {isGalleryOpen && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fade-in touch-none">
          {/* Top Navbar */}
          <div className="flex items-center justify-between p-4 md:p-6 text-white absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/60 to-transparent pointer-events-none">
            <span className="font-bold tracking-widest text-sm uppercase pointer-events-auto bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm border border-white/10">
              {currentImageIndex + 1} / {property.images.length}
            </span>
            <button 
              onClick={closeGallery} 
              className="p-3 hover:bg-white/20 rounded-full transition-all pointer-events-auto backdrop-blur-sm"
              aria-label="Fechar Galeria"
            >
              <Icons.X size={28} />
            </button>
          </div>

          {/* Área Principal da Imagem */}
          <div className="flex-1 relative flex items-center justify-center w-full h-full" onClick={closeGallery}>
            {/* Botão Voltar (Oculto se houver apenas 1 foto) */}
            {property.images.length > 1 && (
              <button 
                onClick={prevImage} 
                className="absolute left-2 md:left-8 p-3 md:p-4 bg-black/50 hover:bg-black/80 border border-white/10 text-white rounded-full backdrop-blur transition-all z-10"
              >
                <Icons.ArrowLeft size={24} /> 
              </button>
            )}

            <img 
              src={property.images[currentImageIndex]} 
              alt={`Foto ${currentImageIndex + 1}`} 
              className="max-h-full max-w-full object-contain select-none transition-transform duration-300"
              onClick={(e) => e.stopPropagation()} // Impede fechar ao clicar na foto
            />

            {/* Botão Avançar */}
            {property.images.length > 1 && (
              <button 
                onClick={nextImage} 
                className="absolute right-2 md:right-8 p-3 md:p-4 bg-black/50 hover:bg-black/80 border border-white/10 text-white rounded-full backdrop-blur transition-all z-10"
              >
                <Icons.ArrowRight size={24} />
              </button>
            )}
          </div>

          {/* Miniaturas (Carrossel Inferior para Mobile e Desktop) */}
          {property.images.length > 1 && (
            <div className="p-4 md:p-6 bg-black/50 backdrop-blur-md z-20">
              <div className="flex gap-3 overflow-x-auto snap-x pb-2 justify-start md:justify-center [&::-webkit-scrollbar]:hidden">
                {property.images.map((img, idx) => (
                  <img 
                    key={idx}
                    src={img}
                    alt={`Miniatura ${idx + 1}`}
                    className={`h-16 md:h-20 w-24 md:w-32 object-cover cursor-pointer rounded-xl snap-center transition-all duration-300 ${
                      idx === currentImageIndex 
                        ? 'border-2 border-white opacity-100 scale-105 shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                        : 'opacity-40 hover:opacity-100 border border-transparent'
                    }`}
                    onClick={() => setCurrentImageIndex(idx)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {/* ========================================= */}


      {/* --- BREADCRUMBS & TITLE HEADER --- */}
      <div className="bg-white dark:bg-slate-900 pt-8 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            
            {/* NOVO: Botão Voltar Dinâmico */}
            <button 
              onClick={() => navigate(-1)} 
              className="flex items-center gap-2 text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400 transition-colors font-semibold mb-6 group w-fit"
            >
              <Icons.ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              Voltar
            </button>

            <nav className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-6">
                <Link to="/" className="hover:text-black dark:hover:text-white transition-colors">Home</Link>
                <span className="text-slate-300">/</span>
                <Link to="/imoveis" className="hover:text-black dark:hover:text-white transition-colors">Imóveis</Link>
                <span className="text-slate-300">/</span>
                <span className="text-slate-900 dark:text-white truncate max-w-[200px]">{property.location.city}</span>
            </nav>
            <h1 className="text-3xl md:text-5xl font-semibold text-slate-900 dark:text-white leading-tight mb-2">
                {property.title}
            </h1>
            <div className="flex items-center text-slate-500 dark:text-slate-400 gap-2 text-lg font-light">
                <Icons.MapPin size={18} />
                <span>{property.location.neighborhood}, {property.location.city}</span>
            </div>
        </div>
      </div>

      {/* --- GALERIA GRID (Rounded aesthetic) --- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-[300px] md:h-[600px] relative">
            {/* Imagem Principal */}
            <div 
              className="md:col-span-2 md:row-span-2 relative h-full rounded-[2rem] overflow-hidden shadow-sm group cursor-pointer"
              onClick={() => openGallery(0)}
            >
              <img 
                src={property.images[0] || 'https://placehold.co/800x600'} 
                alt={property.title} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              
              <div className="absolute top-6 left-6 flex gap-2">
                <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-full text-sm font-bold shadow-sm uppercase tracking-wider text-slate-900">
                  {property.type}
                </span>
                <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-sm uppercase tracking-wider text-white backdrop-blur-md ${
                  isRent ? 'bg-indigo-600/90' : 'bg-emerald-600/90'
                }`}>
                  {isRent ? 'Aluguel' : 'Venda'}
                </span>
              </div>
            </div>

            {/* Imagens Secundárias */}
            {property.images.slice(1, 5).map((img, idx) => (
              <div 
                key={idx} 
                className="relative h-full hidden md:block rounded-[2rem] overflow-hidden group cursor-pointer"
                onClick={() => openGallery(idx + 1)}
              >
                <img 
                  src={img} 
                  alt={`Visão ${idx + 2}`} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
              </div>
            ))}
            
            <button 
              onClick={() => openGallery(0)}
              className="hidden md:flex absolute bottom-6 right-6 bg-white text-slate-900 px-6 py-3 rounded-full font-bold shadow-xl hover:bg-slate-50 transition-colors items-center gap-2"
            >
              <Icons.Grid size={18} />
              Ver todas as fotos
            </button>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* --- COLUNA ESQUERDA (Info) --- */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* Cards de Métricas (Design Clean) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-b border-slate-200 dark:border-slate-700 pb-8">
                <div className="px-4 md:px-6 py-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <Icons.Maximize size={24} className="text-slate-400" />
                  <div>
                    <span className="block text-xl font-bold text-slate-900 dark:text-white">{property.area} m²</span>
                    <span className="text-xs text-slate-500 font-medium uppercase">Área Útil</span>
                  </div>
                </div>
                <div className="px-4 md:px-6 py-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <Icons.Bed size={24} className="text-slate-400" />
                  <div>
                    <span className="block text-xl font-bold text-slate-900 dark:text-white">{property.bedrooms}</span>
                    <span className="text-xs text-slate-500 font-medium uppercase">Quartos</span>
                  </div>
                </div>
                <div className="px-4 md:px-6 py-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <Icons.Bath size={24} className="text-slate-400" />
                  <div>
                    <span className="block text-xl font-bold text-slate-900 dark:text-white">{property.bathrooms}</span>
                    <span className="text-xs text-slate-500 font-medium uppercase">Banheiros</span>
                  </div>
                </div>
                <div className="px-4 md:px-6 py-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                  <Icons.Car size={24} className="text-slate-400" />
                  <div>
                    <span className="block text-xl font-bold text-slate-900 dark:text-white">{property.garage}</span>
                    <span className="text-xs text-slate-500 font-medium uppercase">Vagas</span>
                  </div>
                </div>
            </div>

            {/* Descrição */}
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">Sobre o imóvel</h2>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-lg whitespace-pre-line font-light">
                {property.description}
              </p>
            </div>

            {/* Features (Pills Style) */}
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-6">Comodidades</h2>
              <div className="flex flex-wrap gap-3">
                {property.features.map((feature, index) => (
                  <span key={index} className="flex items-center gap-2 text-slate-700 dark:text-slate-300 bg-white border border-slate-200 dark:bg-slate-800 dark:border-slate-700 px-5 py-3 rounded-full text-sm font-medium">
                    <Icons.CheckCircle size={16} className="text-slate-900 dark:text-white" />
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {/* Mapa */}
            <div className="rounded-[2rem] overflow-hidden border border-slate-200 h-[400px]">
               <iframe
                  title="Mapa de Localização"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  src={mapUrl}
                  className="grayscale hover:grayscale-0 transition-all duration-500"
                />
            </div>
          </div>

          {/* --- COLUNA DIREITA (Sticky Sidebar) --- */}
          <div className="lg:col-span-4 mt-2 lg:mt-0">
            <div className="lg:sticky lg:top-8">
              
              {/* Card Principal */}
              <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl border border-slate-100 dark:border-slate-700">
                {/* Preço (Dinâmico para Aluguel/Venda) */}
                <div className="mb-8">
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-wide mb-1">
                      {isRent ? 'Aluguel' : 'Preço de Venda'}
                    </p>
                    <h2 className="text-4xl font-bold text-slate-900 dark:text-white flex items-baseline gap-1">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(property.price)}
                        {isRent && <span className="text-xl text-slate-500 font-medium">/mês</span>}
                    </h2>
                </div>

                <hr className="border-slate-100 dark:border-slate-700 my-6" />

                {/* Info Corretor */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-full bg-slate-100 overflow-hidden">
                         <div className="w-full h-full flex items-center justify-center bg-brand-100 text-brand-600 font-bold text-xl">
                            {property.agent?.name?.charAt(0) || 'C'}
                         </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-lg">{property.agent?.name || 'Consultor Especialista'}</h3>
                        <div className="flex items-center gap-1 text-yellow-400 text-sm">
                            <Icons.Star size={14} fill="currentColor" />
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Corretor Premium</span>
                        </div>
                    </div>
                </div>

                {/* Formulário Embutido */}
                {formStatus === 'success' ? (
                  <div className="bg-green-50 p-6 rounded-2xl text-center">
                    <Icons.CheckCircle className="text-green-600 mx-auto mb-2" size={32} />
                    <p className="text-green-800 font-medium">Solicitação enviada!</p>
                  </div>
                ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                         <div className="grid grid-cols-2 gap-4">
                            <button type="button" className="py-2 border-b-2 border-black font-bold text-sm">Agendar Visita</button>
                            <button type="button" className="py-2 border-b-2 border-transparent text-slate-400 font-medium text-sm hover:text-slate-600">Fazer Proposta</button>
                         </div>

                         <input
                            type="text"
                            required
                            placeholder="Seu nome"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-slate-900 outline-none"
                            value={contactForm.name}
                            onChange={e => setContactForm({...contactForm, name: e.target.value})}
                         />
                         <input
                            type="tel"
                            required
                            placeholder="Seu telefone"
                            className="w-full px-4 py-3 rounded-xl bg-slate-50 border-none focus:ring-2 focus:ring-slate-900 outline-none"
                            value={contactForm.phone}
                            onChange={e => setContactForm({...contactForm, phone: e.target.value})}
                         />
                         
                         <button
                            type="submit"
                            disabled={formStatus === 'sending'}
                            className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-full transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2 mt-4"
                        >
                            {formStatus === 'sending' ? 'Enviando...' : 'Solicitar Visita'}
                        </button>

                         <button
                            type="button"
                            onClick={() => window.open(`https://wa.me/55${property.agent?.phone?.replace(/\D/g, '') || '64999999999'}`, '_blank')}
                            className="w-full bg-white border border-slate-200 text-slate-900 font-bold py-4 rounded-full transition-all hover:bg-slate-50 flex items-center justify-center gap-2"
                        >
                            <Icons.MessageCircle size={20} />
                            Conversar no WhatsApp
                        </button>
                    </form>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;