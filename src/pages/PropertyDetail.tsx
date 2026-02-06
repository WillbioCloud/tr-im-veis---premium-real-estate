import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Property, LeadStatus } from '../types';
import { Icons } from '../components/Icons';
import Loading from '../components/Loading';
import { COMPANY_PHONE, COMPANY_NAME } from '../constants';

const PropertyDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Formulário de Lead
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchProperty = async () => {
      // Se não tiver ID, para o loading imediatamente
      if (!id) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        // Tenta buscar com os dados do corretor
        const { data, error } = await supabase
          .from('properties')
          .select('*, agent:profiles(name, phone, email)')
          .eq('id', id)
          .maybeSingle(); // maybeSingle evita erro 406 se não achar

        if (error) {
          console.error('Erro Supabase:', error);
          throw error;
        }

        if (data && isMounted) {
          const adapted: Property = {
            ...data,
            location: {
              city: data.city,
              neighborhood: data.neighborhood,
              state: data.state
            },
            agent: data.agent // Pode vir null se não tiver corretor, e tudo bem
          };
          setProperty(adapted);
        }
      } catch (err) {
        console.error("Falha ao carregar imóvel:", err);
      } finally {
        // O FINALLY garante que o loading SEMPRE pare, independente de erro
        if (isMounted) setLoading(false);
      }
    };

    fetchProperty();
    
    return () => { isMounted = false; };
  }, [id]);

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !name || !phone) return;
    setSending(true);

    try {
      const assignedTo = property.agent_id || null;
      const targetPhone = property.agent?.phone || COMPANY_PHONE;
      const isAgent = !!property.agent_id;

      await supabase.from('leads').insert([{
        name,
        phone,
        status: LeadStatus.NEW,
        source: 'Site - Página do Imóvel',
        // property_id: property.id, // Descomente se tiver criado a coluna property_id na tabela leads
        assigned_to: assignedTo,
        message: `Interesse no imóvel: ${property.title}`
      }]);

      const message = `Olá${isAgent && property.agent?.name ? ' ' + property.agent.name : ''}, meu nome é *${name}*. Vi o imóvel *${property.title}* no site e gostaria de mais informações.`;
      const whatsappUrl = `https://wa.me/${targetPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      
      window.open(whatsappUrl, '_blank');
      setName(''); setPhone('');
      
    } catch (error) {
      console.error(error);
      alert('Erro ao enviar. Tente novamente.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loading /></div>;
  
  if (!property) return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 text-slate-500">
      <Icons.AlertTriangle size={48} className="text-amber-500"/>
      <p>Imóvel não encontrado ou indisponível.</p>
      <button onClick={() => navigate('/imoveis')} className="text-brand-600 font-bold hover:underline">Voltar para lista</button>
    </div>
  );

  return (
    <div className="animate-fade-in bg-white min-h-screen pb-20">
      {/* HEADER DA IMAGEM */}
      <div className="relative h-[60vh] md:h-[70vh] group">
        <img 
          src={property.images?.[0] || 'https://placehold.co/1200x800'} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          alt={property.title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30"></div>
        
        <button 
          onClick={() => navigate(-1)} 
          className="absolute top-6 left-6 z-20 bg-white/10 backdrop-blur-md border border-white/20 text-white p-3 rounded-full hover:bg-white hover:text-brand-900 transition-all shadow-lg"
        >
          <Icons.ArrowRight className="rotate-180" size={24} />
        </button>

        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 text-white">
          <div className="container mx-auto">
            <div className="flex gap-2 mb-4">
               <span className="bg-brand-600/90 backdrop-blur text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">
                 {property.type}
               </span>
               {property.agent && (
                 <span className="bg-green-600/90 backdrop-blur text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                   <Icons.User size={12} /> {property.agent.name.split(' ')[0]}
                 </span>
               )}
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold mb-2 leading-tight">{property.title}</h1>
            
            <p className="text-lg md:text-xl text-gray-300 flex items-center gap-2 mb-6">
              <Icons.MapPin size={20} className="text-brand-400" />
              {property.location.neighborhood}, {property.location.city} - {property.location.state}
            </p>
            
            <p className="text-4xl font-serif font-bold text-brand-400">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
            </p>
          </div>
        </div>
      </div>

      {/* CONTEUDO */}
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
          
          {/* Grid de Ícones */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white rounded-full shadow-sm text-brand-600"><Icons.Bed size={24} /></div>
              <div><p className="font-bold text-lg text-slate-800">{property.bedrooms}</p><p className="text-xs text-slate-500 uppercase font-bold">Quartos</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white rounded-full shadow-sm text-brand-600"><Icons.Bath size={24} /></div>
              <div><p className="font-bold text-lg text-slate-800">{property.bathrooms}</p><p className="text-xs text-slate-500 uppercase font-bold">Banheiros</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white rounded-full shadow-sm text-brand-600"><Icons.Car size={24} /></div>
              <div><p className="font-bold text-lg text-slate-800">{property.garage}</p><p className="text-xs text-slate-500 uppercase font-bold">Vagas</p></div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white rounded-full shadow-sm text-brand-600"><Icons.Home size={24} /></div>
              <div><p className="font-bold text-lg text-slate-800">{property.area} m²</p><p className="text-xs text-slate-500 uppercase font-bold">Área</p></div>
            </div>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-6 font-serif flex items-center gap-2">
              <Icons.Info className="text-brand-500" size={24}/> Sobre o imóvel
            </h3>
            <p className="text-slate-600 leading-8 text-lg whitespace-pre-line">{property.description}</p>
          </div>

          <div>
            <h3 className="text-2xl font-bold text-slate-900 mb-6 font-serif flex items-center gap-2">
              <Icons.Star className="text-brand-500" size={24}/> Diferenciais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {property.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-brand-200 transition-colors">
                  <Icons.CheckCircle size={20} className="text-emerald-500" />
                  <span className="text-slate-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD DIREITO (STICKY) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 p-8 sticky top-28">
            
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-100">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg ${property.agent ? 'bg-gradient-to-br from-green-500 to-emerald-700 text-white' : 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'}`}>
                {property.agent ? property.agent.name.charAt(0) : 'TR'}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">
                  {property.agent ? 'Corretor Exclusivo' : 'Central de Vendas'}
                </p>
                <h3 className="font-bold text-slate-900 text-xl leading-tight">
                  {property.agent ? property.agent.name : COMPANY_NAME}
                </h3>
              </div>
            </div>

            <form onSubmit={handleContact} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Seu Nome</label>
                <input 
                  type="text" 
                  required
                  className="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-medium text-slate-800"
                  placeholder="Nome completo"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Seu WhatsApp</label>
                <input 
                  type="tel" 
                  required
                  className="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-medium text-slate-800"
                  placeholder="(DDD) 90000-0000"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <button 
                type="submit" 
                disabled={sending}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-xl hover:shadow-2xl transform transition-all hover:-translate-y-1 flex items-center justify-center gap-3 text-lg ${
                  property.agent 
                    ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500' 
                    : 'bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700'
                }`}
              >
                {sending ? (
                  <Icons.Loader2 className="animate-spin" />
                ) : property.agent ? (
                  <>
                    <Icons.MessageCircle size={22} /> Chamar no WhatsApp
                  </>
                ) : (
                  <>
                    <Icons.Mail size={22} /> Agendar Visita
                  </>
                )}
              </button>
              
              <p className="text-center text-xs text-slate-400 leading-relaxed">
                Ao enviar, você concorda em ser contatado pela nossa equipe para agendamento de visitas.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;