import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Importando Supabase
import { COMPANY_PHONE } from '../constants';
import { Icons } from '../components/Icons';
import { Property, LeadStatus } from '../types';

const PropertyDetail: React.FC = () => {
  const { slug } = useParams();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  
  // Lead Form State
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [formStatus, setFormStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  useEffect(() => {
    async function fetchProperty() {
      if (!slug) return;
      
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('slug', slug)
        .single();

      if (data) {
        setProperty(data as Property);
      } else {
        console.error('Erro ao buscar imóvel:', error);
      }
      setLoading(false);
      window.scrollTo(0, 0);
    }

    fetchProperty();
  }, [slug]);

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadName || !leadPhone || !property) return;

    setFormStatus('sending');

    // 1. Salvar no Supabase (Isso vai para o seu Kanban)
    const { error } = await supabase.from('leads').insert([{
      name: leadName,
      phone: leadPhone,
      status: LeadStatus.NEW,
      property_id: property.id, // Vincula o interesse a este imóvel
      source: 'Página do Imóvel',
      message: `Interesse no imóvel: ${property.title}`
    }]);

    if (error) {
      console.error('Erro ao salvar lead:', error);
      setFormStatus('error');
    } else {
      setFormStatus('success');
      setLeadName('');
      setLeadPhone('');
      
      // Opcional: Redirecionar para WhatsApp automaticamente após cadastro
      // window.open(whatsappLink, '_blank');
    }
  };

  if (loading) return <div className="p-20 text-center animate-pulse">Carregando detalhes...</div>;
  if (!property) return <div className="p-20 text-center text-red-500">Imóvel não encontrado.</div>;

  const whatsappLink = `https://wa.me/${COMPANY_PHONE}?text=Olá, vi o imóvel "${property.title}" (Cód: ${property.id?.slice(0, 6)}) no site e gostaria de agendar uma visita.`;

  return (
    <div className="bg-white">
      {/* Gallery Section */}
      <div className="h-[40vh] md:h-[60vh] bg-gray-200 relative group">
        {property.images && property.images.length > 0 ? (
          <img 
            src={property.images[activeImage]} 
            alt={property.title} 
            className="w-full h-full object-cover transition-all duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">Sem imagens</div>
        )}
        
        {/* Navigation Arrows */}
        {property.images && property.images.length > 1 && (
          <>
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {property.images.map((_, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(idx)}
                  className={`w-3 h-3 rounded-full transition-all shadow-sm ${activeImage === idx ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'}`}
                />
              ))}
            </div>
            <button 
              onClick={() => setActiveImage(prev => prev === 0 ? property.images.length - 1 : prev - 1)}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
            >
              <Icons.ArrowRight className="rotate-180" size={20} />
            </button>
            <button 
              onClick={() => setActiveImage(prev => prev === property.images.length - 1 ? 0 : prev + 1)}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
            >
              <Icons.ArrowRight size={20} />
            </button>
          </>
        )}
      </div>

      <div className="container mx-auto px-4 py-8">
        <Link to="/imoveis" className="text-gray-500 hover:text-amber-600 mb-6 inline-flex items-center gap-1 text-sm">
          <Icons.ArrowRight className="rotate-180" size={14}/> Voltar para lista
        </Link>

        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Info Column */}
          <div className="lg:w-2/3">
            <div className="flex justify-between items-start mb-6">
              <div>
                 <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-3 inline-block">
                   {property.type}
                 </span>
                 <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-2">{property.title}</h1>
                 <p className="text-gray-500 flex items-center gap-2 text-lg">
                   <Icons.MapPin size={20} className="text-amber-500"/> 
                   {property.location?.neighborhood}, {property.location?.city} - {property.location?.state}
                 </p>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-3xl font-bold text-amber-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
                </p>
                <p className="text-gray-400 text-sm mt-1">Ref: {property.id?.slice(0, 8)}...</p>
              </div>
            </div>

            {/* Mobile Price (visible only on small screens) */}
            <div className="md:hidden mb-6">
               <p className="text-3xl font-bold text-amber-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
                </p>
            </div>

            {/* Key Specs */}
            <div className="grid grid-cols-4 gap-4 bg-gray-50 p-6 rounded-xl mb-8 border border-gray-100">
              <div className="text-center border-r last:border-0 border-gray-200">
                <Icons.Bed className="mx-auto text-slate-400 mb-2" size={24} />
                <span className="block font-bold text-xl text-slate-900">{property.bedrooms}</span>
                <span className="text-xs text-gray-500 uppercase">Quartos</span>
              </div>
              <div className="text-center border-r last:border-0 border-gray-200">
                <Icons.Bath className="mx-auto text-slate-400 mb-2" size={24} />
                <span className="block font-bold text-xl text-slate-900">{property.bathrooms}</span>
                <span className="text-xs text-gray-500 uppercase">Banheiros</span>
              </div>
              <div className="text-center border-r last:border-0 border-gray-200">
                <Icons.Car className="mx-auto text-slate-400 mb-2" size={24} />
                <span className="block font-bold text-xl text-slate-900">{property.garage}</span>
                <span className="text-xs text-gray-500 uppercase">Vagas</span>
              </div>
              <div className="text-center">
                <Icons.Home className="mx-auto text-slate-400 mb-2" size={24} />
                <span className="block font-bold text-xl text-slate-900">{property.area}</span>
                <span className="text-xs text-gray-500 uppercase">m²</span>
              </div>
            </div>

            <div className="mb-10">
              <h2 className="text-2xl font-bold text-slate-900 mb-4 border-b pb-2">Sobre o imóvel</h2>
              <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">{property.description}</p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-6 border-b pb-2">Diferenciais</h2>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-3 gap-x-4">
                {property.features?.map(feat => (
                  <li key={feat} className="flex items-center gap-3 text-gray-700 bg-gray-50 p-3 rounded-lg">
                    <Icons.CheckCircle className="text-green-500 flex-shrink-0" size={20} />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar / Lead Form */}
          <div className="lg:w-1/3">
            <div className="bg-white shadow-xl rounded-2xl p-6 border border-gray-100 sticky top-24">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Gostou deste imóvel?</h3>
              <p className="text-gray-500 text-sm mb-6">Preencha seus dados para receber o contato de um especialista.</p>

              {formStatus === 'success' ? (
                <div className="bg-green-50 text-green-700 p-6 rounded-lg text-center animate-fade-in">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icons.CheckCircle className="text-green-600" size={24} />
                  </div>
                  <p className="font-bold text-lg">Solicitação Enviada!</p>
                  <p className="text-sm mb-4">Em breve entraremos em contato.</p>
                  <button onClick={() => setFormStatus('idle')} className="text-xs underline text-green-600">Enviar novo contato</button>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Seu Nome</label>
                    <input 
                      type="text" 
                      required
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                      value={leadName}
                      onChange={e => setLeadName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">WhatsApp / Telefone</label>
                    <input 
                      type="tel" 
                      required
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                      value={leadPhone}
                      onChange={e => setLeadPhone(e.target.value)}
                    />
                  </div>
                  
                  {formStatus === 'error' && (
                    <p className="text-xs text-red-500 text-center">Erro ao enviar. Tente novamente.</p>
                  )}

                  <button 
                    type="submit" 
                    disabled={formStatus === 'sending'}
                    className="w-full bg-slate-900 text-white font-bold py-4 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-70 flex justify-center gap-2"
                  >
                    {formStatus === 'sending' ? 'Enviando...' : 'Solicitar Contato'}
                  </button>
                </form>
              )}

              <div className="mt-6 pt-6 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400 mb-3">Ou fale agora mesmo</p>
                <a 
                  href={whatsappLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-colors shadow-lg shadow-green-200"
                >
                  <Icons.Phone size={20} /> Conversar no WhatsApp
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;