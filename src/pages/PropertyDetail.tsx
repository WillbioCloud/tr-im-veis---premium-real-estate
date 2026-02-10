import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Property, LeadStatus } from '../types';
import { Icons } from '../components/Icons';
import Loading from '../components/Loading';
import { COMPANY_PHONE, COMPANY_NAME } from '../constants';

type VisitHistoryItem = {
  title: string;
  slug: string;
  visited_at: string;
};

const SESSION_HISTORY_KEY = 'tr_session_history';

const isAbortError = (error: unknown): boolean => {
  if (!error) return false;
  const maybeError = error as { name?: string; message?: string; code?: string | number };
  const message = maybeError.message ?? '';

  return (
    maybeError.name === 'AbortError' ||
    maybeError.code === 20 ||
    maybeError.code === '20' ||
    message.includes('AbortError')
  );
};

const readSessionHistory = (): VisitHistoryItem[] => {
  try {
    const raw = localStorage.getItem(SESSION_HISTORY_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is VisitHistoryItem => {
      if (!entry || typeof entry !== 'object') return false;
      const candidate = entry as Partial<VisitHistoryItem>;
      return (
        typeof candidate.title === 'string' &&
        typeof candidate.slug === 'string' &&
        typeof candidate.visited_at === 'string'
      );
    });
  } catch {
    return [];
  }
};

const PropertyDetail: React.FC = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!property) return;

    const history = readSessionHistory();
    const currentVisit: VisitHistoryItem = {
      title: property.title,
      slug: property.slug,
      visited_at: new Date().toISOString(),
    };

    const updatedHistory = [currentVisit, ...history.filter((entry) => entry.slug !== property.slug)].slice(0, 10);
    localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(updatedHistory));
  }, [property]);

  useEffect(() => {
    let isMounted = true;

    const fetchProperty = async () => {
      if (!slug) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('properties')
          .select('*, agent:profiles(name, phone, email)')
          .eq('slug', slug)
          .maybeSingle();

        if (error) {
          if (isAbortError(error)) {
            return;
          }
          throw error;
        }

        if (data && isMounted) {
          setProperty({
            ...data,
            location: {
              city: data.city ?? '',
              neighborhood: data.neighborhood ?? '',
              state: data.state ?? '',
              address: data.address ?? '',
            },
            features: Array.isArray(data.features) ? data.features : [],
            images: Array.isArray(data.images) ? data.images : [],
            agent: data.agent ?? undefined,
          });
        }
      } catch (error) {
        if (isAbortError(error)) {
          return;
        }

        const { data: fallbackData, error: fallbackError } = await supabase
          .from('properties')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        if (fallbackError) {
          if (isAbortError(fallbackError)) {
            return;
          }
          return;
        }

        if (fallbackData && isMounted) {
          setProperty({
            ...fallbackData,
            location: {
              city: fallbackData.city ?? '',
              neighborhood: fallbackData.neighborhood ?? '',
              state: fallbackData.state ?? '',
              address: fallbackData.address ?? '',
            },
            features: Array.isArray(fallbackData.features) ? fallbackData.features : [],
            images: Array.isArray(fallbackData.images) ? fallbackData.images : [],
            agent: undefined,
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    void fetchProperty();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const handleContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property || !name || !phone) return;
    setSending(true);

    try {
      const targetPhone = property.agent?.phone || COMPANY_PHONE;
      const isAgent = Boolean(property.agent);
      const history = readSessionHistory();

      const { error } = await supabase.from('leads').insert([
        {
          name,
          phone,
          status: LeadStatus.NEW,
          source: 'Site - Página do Imóvel',
          property_id: property.id,
          assigned_to: property.agent_id ?? null,
          metadata: {
            visited_properties: history,
            last_property_slug: property.slug,
          },
          message: `Interesse no imóvel: ${property.title} (Ref: ${property.slug})`,
        },
      ]);

      if (error) {
        if (!isAbortError(error)) {
          alert('Erro ao enviar. Tente novamente.');
        }
        return;
      }

      const message = `Olá${
        isAgent && property.agent?.name ? ` ${property.agent.name.split(' ')[0]}` : ''
      }, meu nome é *${name}*. Vi o imóvel *${property.title}* no site e gostaria de mais informações.`;
      const whatsappUrl = `https://wa.me/${targetPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;

      window.open(whatsappUrl, '_blank');
      setName('');
      setPhone('');

      alert('Contato enviado com sucesso!');
    } catch (error) {
      if (!isAbortError(error)) {
        alert('Erro ao enviar. Tente novamente.');
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center"><Loading /></div>;

  if (!property)
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 text-slate-500 bg-gray-50">
        <Icons.AlertTriangle size={48} className="text-amber-500" />
        <h2 className="text-xl font-bold text-slate-800">Imóvel não encontrado</h2>
        <p>O link acessado ({slug}) pode estar incorreto ou o imóvel foi removido.</p>
        <button
          onClick={() => navigate('/imoveis')}
          className="mt-4 px-6 py-2 bg-brand-600 text-white rounded-lg font-bold hover:bg-brand-700 transition-colors"
        >
          Ver outros imóveis
        </button>
      </div>
    );

  return (
    <div className="animate-fade-in bg-white min-h-screen pb-20">
      {/* HEADER DA IMAGEM */}
      <div className="relative h-[60vh] md:h-[70vh] group">
        <img
          src={property.images?.[0] || 'https://placehold.co/1200x800?text=Imovel+Sem+Foto'}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          alt={property.title}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-slate-900/30"></div>

        <button
          onClick={() => navigate(-1)}
          className="absolute top-24 left-3 z-20 bg-white/10 backdrop-blur-md border border-white/20 text-white p-3 rounded-full hover:bg-white hover:text-brand-900 transition-all shadow-lg"
        >
          <Icons.ArrowRight className="rotate-180" size={24} />
        </button>

        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 text-white">
          <div className="container mx-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-brand-600/90 backdrop-blur-sm text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider shadow-lg">
                {property.type}
              </span>
              {property.agent && (
                <span className="bg-emerald-600/90 backdrop-blur-sm text-white px-3 py-1 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow-lg">
                  <Icons.User size={12} /> {property.agent.name.split(' ')[0]}
                </span>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-serif font-bold mb-3 leading-tight drop-shadow-lg">
              {property.title}
            </h1>

            <p className="text-lg md:text-xl text-gray-200 flex items-center gap-2 mb-6 font-medium">
              <Icons.MapPin size={20} className="text-brand-400" />
              {property.location.neighborhood}, {property.location.city}
            </p>

            <div className="inline-block bg-white/10 backdrop-blur-md border border-white/10 px-6 py-3 rounded-xl">
              <p className="text-3xl font-serif font-bold text-brand-400">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CONTEUDO */}
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2 space-y-10">
          {/* Grid de Ícones */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center gap-2 hover:border-brand-200 transition-colors">
              <div className="p-3 bg-white rounded-full shadow-sm text-brand-600"><Icons.Bed size={24} /></div>
              <div>
                <p className="font-bold text-xl text-slate-800">{property.bedrooms}</p>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Quartos</p>
              </div>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center gap-2 hover:border-brand-200 transition-colors">
              <div className="p-3 bg-white rounded-full shadow-sm text-brand-600"><Icons.Bath size={24} /></div>
              <div>
                <p className="font-bold text-xl text-slate-800">{property.bathrooms}</p>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Banheiros</p>
              </div>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center gap-2 hover:border-brand-200 transition-colors">
              <div className="p-3 bg-white rounded-full shadow-sm text-brand-600"><Icons.Car size={24} /></div>
              <div>
                <p className="font-bold text-xl text-slate-800">{property.garage}</p>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Vagas</p>
              </div>
            </div>
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center gap-2 hover:border-brand-200 transition-colors">
              <div className="p-3 bg-white rounded-full shadow-sm text-brand-600"><Icons.Home size={24} /></div>
              <div>
                <p className="font-bold text-xl text-slate-800">
                  {property.area} <span className="text-sm">m²</span>
                </p>
                <p className="text-xs text-slate-500 uppercase font-bold tracking-wide">Área</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-slate-900 font-serif flex items-center gap-3">
              <span className="w-1 h-8 bg-brand-500 rounded-full block"></span>
              Sobre o imóvel
            </h3>
            <div className="prose prose-slate max-w-none text-slate-600 leading-8 text-lg">
              <p className="whitespace-pre-line">{property.description}</p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-slate-900 font-serif flex items-center gap-3">
              <span className="w-1 h-8 bg-brand-500 rounded-full block"></span>
              Diferenciais
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {property.features.map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-brand-200 transition-colors group"
                >
                  <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-full group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                    <Icons.CheckCircle size={16} />
                  </div>
                  <span className="text-slate-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CARD DIREITO (STICKY) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-slate-100 p-8 sticky top-28">
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-slate-100">
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg border-2 border-white ${
                  property.agent
                    ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white'
                    : 'bg-gradient-to-br from-brand-400 to-brand-600 text-white'
                }`}
              >
                {property.agent ? property.agent.name.charAt(0) : 'TR'}
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">
                  {property.agent ? 'Corretor Exclusivo' : 'Atendimento Oficial'}
                </p>
                <h3 className="font-bold text-slate-900 text-lg leading-tight">
                  {property.agent ? property.agent.name : COMPANY_NAME}
                </h3>
                {property.agent && <p className="text-xs text-emerald-600 font-bold mt-0.5">● Online agora</p>}
              </div>
            </div>

            <form onSubmit={handleContact} className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Seu Nome</label>
                <input
                  type="text"
                  required
                  className="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                  placeholder="Como gostaria de ser chamado?"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Seu WhatsApp</label>
                <input
                  type="tel"
                  required
                  className="w-full mt-1 px-4 py-3.5 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all font-medium text-slate-800 placeholder:text-slate-400"
                  placeholder="(DDD) 99999-9999"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className={`w-full py-4 rounded-xl font-bold text-white shadow-xl hover:shadow-2xl transform transition-all hover:-translate-y-1 flex items-center justify-center gap-3 text-base ${
                  property.agent
                    ? 'bg-gradient-to-r from-[#25D366] to-[#128C7E]'
                    : 'bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700'
                }`}
              >
                {sending ? (
                  <Icons.Loader2 className="animate-spin" />
                ) : property.agent ? (
                  <>
                    <Icons.MessageCircle size={20} /> Falar com {property.agent.name.split(' ')[0]}
                  </>
                ) : (
                  <>
                    <Icons.Mail size={20} /> Agendar Visita
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-slate-400 leading-relaxed px-4">
                Ao enviar, você receberá um atendimento personalizado e exclusivo.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
