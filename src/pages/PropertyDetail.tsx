import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { MOCK_PROPERTIES, COMPANY_PHONE } from '../constants';
import { Icons } from '../components/Icons';
import { Property } from '../types';

const PropertyDetail: React.FC = () => {
  const { slug } = useParams();
  const [property, setProperty] = useState<Property | undefined>(undefined);
  const [activeImage, setActiveImage] = useState(0);
  
  // Lead Form State
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);

  useEffect(() => {
    // Simulate API fetch by slug
    const found = MOCK_PROPERTIES.find(p => p.slug === slug);
    setProperty(found);
    window.scrollTo(0, 0);
  }, [slug]);

  if (!property) return <div className="p-20 text-center">Carregando imóvel...</div>;

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(leadName && leadPhone) {
      // Simulate API call
      setTimeout(() => setFormSuccess(true), 1000);
    }
  };

  const whatsappLink = `https://wa.me/${COMPANY_PHONE}?text=Olá, vi o imóvel ${property.title} (Ref: ${property.id}) no site e gostaria de mais informações.`;

  return (
    <div className="bg-white">
      {/* Gallery Section */}
      <div className="h-[40vh] md:h-[60vh] bg-gray-100 relative group">
        <img 
          src={property.images[activeImage]} 
          alt={property.title} 
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {property.images.map((_, idx) => (
            <button 
              key={idx}
              onClick={() => setActiveImage(idx)}
              className={`w-3 h-3 rounded-full transition-all ${activeImage === idx ? 'bg-white scale-110' : 'bg-white/50'}`}
            />
          ))}
        </div>
        <button 
          onClick={() => setActiveImage(prev => prev === 0 ? property.images.length - 1 : prev - 1)}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all"
        >
          <Icons.ArrowRight className="rotate-180" />
        </button>
        <button 
          onClick={() => setActiveImage(prev => prev === property.images.length - 1 ? 0 : prev + 1)}
          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all"
        >
          <Icons.ArrowRight />
        </button>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-12">
          
          {/* Info Column */}
          <div className="lg:w-2/3">
            <div className="flex justify-between items-start mb-6">
              <div>
                 <span className="text-amber-600 font-bold tracking-wide text-sm uppercase mb-2 block">{property.type}</span>
                 <h1 className="text-3xl md:text-4xl font-serif font-bold text-slate-900 mb-2">{property.title}</h1>
                 <p className="text-gray-500 flex items-center gap-2 text-lg">
                   <Icons.MapPin size={20}/> {property.location.neighborhood}, {property.location.city} - {property.location.state}
                 </p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold text-amber-600">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
                </p>
                <p className="text-gray-400 text-sm">Código: {property.id}</p>
              </div>
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
                <span className="text-xs text-gray-500 uppercase">m² Úteis</span>
              </div>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Sobre o imóvel</h2>
              <p className="text-gray-600 leading-relaxed text-lg">{property.description}</p>
            </div>

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Diferenciais</h2>
              <ul className="grid grid-cols-2 gap-y-3">
                {property.features.map(feat => (
                  <li key={feat} className="flex items-center gap-3 text-gray-700">
                    <Icons.CheckCircle className="text-green-500" size={20} />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sidebar / Lead Form */}
          <div className="lg:w-1/3">
            <div className="bg-white shadow-xl rounded-2xl p-6 border border-gray-100 sticky top-24">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Interessou?</h3>
              <p className="text-gray-500 text-sm mb-6">Agende uma visita ou tire suas dúvidas com nossos especialistas.</p>

              {formSuccess ? (
                <div className="bg-green-50 text-green-700 p-4 rounded-lg text-center">
                  <Icons.CheckCircle className="mx-auto mb-2" size={32} />
                  <p className="font-bold">Mensagem enviada!</p>
                  <p className="text-sm">Em breve entraremos em contato.</p>
                </div>
              ) : (
                <form onSubmit={handleLeadSubmit} className="space-y-4">
                  <div>
                    <input 
                      type="text" 
                      placeholder="Seu nome"
                      required
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none"
                      value={leadName}
                      onChange={e => setLeadName(e.target.value)}
                    />
                  </div>
                  <div>
                    <input 
                      type="tel" 
                      placeholder="WhatsApp / Telefone"
                      required
                      className="w-full border border-gray-200 rounded-lg px-4 py-3 focus:ring-2 focus:ring-amber-500 outline-none"
                      value={leadPhone}
                      onChange={e => setLeadPhone(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors">
                    Solicitar Contato
                  </button>
                </form>
              )}

              <div className="mt-6 pt-6 border-t border-gray-100">
                <a 
                  href={whatsappLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-green-500 text-white font-bold py-3 rounded-lg hover:bg-green-600 transition-colors"
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
