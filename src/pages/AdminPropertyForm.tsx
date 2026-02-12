import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { PropertyType, type ListingType } from '../types';

type WizardStep = 'basic' | 'details' | 'media' | 'seo';

interface ImageItem {
  id: string;
  url: string;
}

interface FormState {
  title: string;
  description: string;
  type: string;
  listing_type: ListingType;
  price: number;
  rent_package_price: number;
  down_payment: number;
  financing_available: boolean;
  bedrooms: number;
  bathrooms: number;
  garage: number;
  area: number;
  features: string[];
  zip_code: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  seo_title: string;
  seo_description: string;
}

const STEP_ORDER: WizardStep[] = ['basic', 'details', 'media', 'seo'];

const STEP_META: Record<WizardStep, { label: string; icon: keyof typeof Icons }> = {
  basic: { label: 'Básico', icon: 'Home' },
  details: { label: 'Detalhes', icon: 'List' },
  media: { label: 'Multimídia', icon: 'Image' },
  seo: { label: 'SEO', icon: 'Globe' },
};

const XP_HINTS = [
  'Cadastrar imóvel completo: +50 XP',
  'Responder lead em <1h: +20 XP',
  'Fechar negócio: +500 XP',
];

const defaultForm: FormState = {
  title: '',
  description: '',
  type: PropertyType.HOUSE,
  listing_type: 'sale',
  price: 0,
  rent_package_price: 0,
  down_payment: 0,
  financing_available: true,
  bedrooms: 0,
  bathrooms: 0,
  garage: 0,
  area: 0,
  features: [],
  zip_code: '',
  address: '',
  neighborhood: '',
  city: 'Caldas Novas',
  state: 'GO',
  seo_title: '',
  seo_description: '',
};

const createSlug = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .concat(`-${Math.floor(Math.random() * 10000)}`);

const SortableImageCard: React.FC<{
  image: ImageItem;
  index: number;
  onRemove: (id: string) => void;
  onDragStart: (id: string) => void;
  onDropOn: (id: string) => void;
}> = ({ image, index, onRemove, onDragStart, onDropOn }) => {
  return (
    <div
      className="relative group rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square"
      draggable
      onDragStart={() => onDragStart(image.id)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={() => onDropOn(image.id)}
    >
      <img src={image.url} alt={`Imagem ${index + 1}`} className="w-full h-full object-cover" />

      <div className="absolute inset-x-0 top-0 p-2 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent">
        <span className="text-xs font-bold text-white rounded-full bg-black/40 px-2 py-1">#{index + 1}</span>
        <button
          type="button"
          onClick={() => onRemove(image.id)}
          className="p-1.5 rounded-full bg-red-500 text-white opacity-90 hover:opacity-100"
        >
          <Icons.X size={14} />
        </button>
      </div>

      <div className="absolute bottom-2 right-2 p-2 rounded-xl bg-white/90 text-slate-700 shadow-md">
        <Icons.MoreVertical size={16} />
      </div>
    </div>
  );
};

const AdminPropertyForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = Boolean(id);

  const [step, setStep] = useState<WizardStep>('basic');
  const [formData, setFormData] = useState<FormState>(defaultForm);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [newFeature, setNewFeature] = useState('');
  const [newImageUrl, setNewImageUrl] = useState('');

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetchingCep, setFetchingCep] = useState(false);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [draggingImageId, setDraggingImageId] = useState<string | null>(null);


  const canGoNext = useMemo(() => {
    if (step === 'basic') {
      return formData.title.trim().length > 3 && formData.price > 0;
    }
    if (step === 'details') {
      return formData.city.trim().length > 1 && formData.neighborhood.trim().length > 1;
    }
    if (step === 'media') {
      return images.length > 0;
    }
    return true;
  }, [formData, images.length, step]);

  useEffect(() => {
    if (!isEditing || !id) return;

    const loadProperty = async () => {
      const { data, error } = await supabase.from('properties').select('*').eq('id', id).single();
      if (error || !data) {
        console.error('Erro ao carregar imóvel:', error);
        return;
      }

      setFormData({
        title: data.title || '',
        description: data.description || '',
        type: data.type || PropertyType.HOUSE,
        listing_type: data.listing_type || 'sale',
        price: Number(data.price || 0),
        rent_package_price: Number(data.rent_package_price || 0),
        down_payment: Number(data.down_payment || 0),
        financing_available: data.financing_available ?? true,
        bedrooms: Number(data.bedrooms || 0),
        bathrooms: Number(data.bathrooms || 0),
        garage: Number(data.garage || 0),
        area: Number(data.area || 0),
        features: data.features || [],
        zip_code: data.zip_code || '',
        address: data.address || '',
        neighborhood: data.neighborhood || '',
        city: data.city || '',
        state: data.state || 'GO',
        seo_title: data.seo_title || '',
        seo_description: data.seo_description || '',
      });

      const existingImages: ImageItem[] = (data.images || []).map((url: string, idx: number) => ({
        id: `${idx}-${url}`,
        url,
      }));
      setImages(existingImages);
    };

    loadProperty();
  }, [id, isEditing]);

  const handleInput = (name: keyof FormState, value: string | number | boolean) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const fetchAddressByCep = async () => {
    const cep = formData.zip_code.replace(/\D/g, '');
    if (cep.length !== 8) return;

    try {
      setFetchingCep(true);
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      if (data.erro) return;

      setFormData((prev) => ({
        ...prev,
        address: data.logradouro || prev.address,
        neighborhood: data.bairro || prev.neighborhood,
        city: data.localidade || prev.city,
        state: data.uf || prev.state,
      }));
    } catch (error) {
      console.error('Erro ao consultar CEP:', error);
    } finally {
      setFetchingCep(false);
    }
  };

  const generateDescriptionWithAI = async () => {
    try {
      setGeneratingDescription(true);

      // TODO: Integrar com endpoint seguro (Supabase Edge Function) chamando OpenAI.
      // Exemplo: await fetch('/functions/v1/generate-description', { method: 'POST', body: JSON.stringify({...}) })
      const base = `${formData.type} ${formData.listing_type === 'sale' ? 'à venda' : 'para locação'} em ${formData.neighborhood}, ${formData.city}.`;
      const highlights = [
        `${formData.bedrooms} quartos`,
        `${formData.bathrooms} banheiros`,
        `${formData.area}m²`,
        formData.garage > 0 ? `${formData.garage} vagas` : null,
      ]
        .filter(Boolean)
        .join(', ');

      const amenities = formData.features.length
        ? ` Destaques: ${formData.features.slice(0, 5).join(', ')}.`
        : '';

      const marketingText = `${base} Imóvel com ${highlights}, projeto pensado para conforto, praticidade e valorização.${amenities} Entre em contato para conhecer esta oportunidade exclusiva.`;

      setFormData((prev) => ({
        ...prev,
        description: marketingText,
        seo_description: prev.seo_description || marketingText.slice(0, 155),
      }));
    } finally {
      setGeneratingDescription(false);
    }
  };

  const uploadFileToStorage = async (file: File) => {
    const extension = file.name.split('.').pop();
    const fileName = `${user?.id || 'anon'}/${Date.now()}-${Math.random().toString(36).slice(2)}.${extension}`;

    const { error: uploadError } = await supabase.storage.from('properties').upload(fileName, file, {
      upsert: false,
      cacheControl: '3600',
    });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('properties').getPublicUrl(fileName);
    return data.publicUrl;
  };

  const addFiles = async (files: FileList | File[]) => {
    const incoming = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!incoming.length) return;

    try {
      setUploading(true);
      const uploadedUrls = await Promise.all(incoming.map((file) => uploadFileToStorage(file)));
      const mapped = uploadedUrls.map((url) => ({ id: crypto.randomUUID(), url }));
      setImages((prev) => [...prev, ...mapped]);
    } catch (error) {
      console.error('Erro no upload das imagens:', error);
      alert('Falha ao enviar uma ou mais imagens para o storage.');
    } finally {
      setUploading(false);
    }
  };

  const handleDropArea = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files?.length) {
      await addFiles(event.dataTransfer.files);
    }
  };


  const addImageByUrl = () => {
    if (!newImageUrl.trim()) return;
    setImages((prev) => [...prev, { id: crypto.randomUUID(), url: newImageUrl.trim() }]);
    setNewImageUrl('');
  };

  const removeImage = (idToRemove: string) => {
    setImages((prev) => prev.filter((item) => item.id !== idToRemove));
  };

  const addFeature = () => {
    if (!newFeature.trim()) return;
    setFormData((prev) => ({ ...prev, features: [...prev.features, newFeature.trim()] }));
    setNewFeature('');
  };

  const removeFeature = (feature: string) => {
    setFormData((prev) => ({ ...prev, features: prev.features.filter((item) => item !== feature) }));
  };

  const handleDropOnImage = (targetId: string) => {
    if (!draggingImageId || draggingImageId === targetId) return;

    setImages((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === draggingImageId);
      const newIndex = prev.findIndex((item) => item.id === targetId);
      if (oldIndex < 0 || newIndex < 0) return prev;

      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next;
    });

    setDraggingImageId(null);
  };

  const goNext = () => {
    const index = STEP_ORDER.indexOf(step);
    if (index < STEP_ORDER.length - 1) setStep(STEP_ORDER[index + 1]);
  };

  const goBack = () => {
    const index = STEP_ORDER.indexOf(step);
    if (index > 0) setStep(STEP_ORDER[index - 1]);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      setLoading(true);

      const payload = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        listing_type: formData.listing_type,
        price: Number(formData.price),
        rent_package_price: formData.listing_type === 'rent' ? Number(formData.rent_package_price) : null,
        down_payment: formData.listing_type === 'sale' ? Number(formData.down_payment) : null,
        financing_available: formData.listing_type === 'sale' ? formData.financing_available : null,
        bedrooms: Number(formData.bedrooms),
        bathrooms: Number(formData.bathrooms),
        garage: Number(formData.garage),
        area: Number(formData.area),
        features: formData.features,
        zip_code: formData.zip_code,
        address: formData.address,
        neighborhood: formData.neighborhood,
        city: formData.city,
        state: formData.state,
        seo_title: formData.seo_title || formData.title,
        seo_description: formData.seo_description || formData.description.slice(0, 155),
        images: images.map((item) => item.url),
        agent_id: user?.id,
        slug: isEditing ? undefined : createSlug(formData.title),
      };

      if (isEditing && id) {
        const { error } = await supabase.from('properties').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('properties').insert([payload]);
        if (error) throw error;
      }

      navigate('/admin/imoveis');
    } catch (error) {
      console.error('Erro ao salvar imóvel:', error);
      alert('Não foi possível salvar o imóvel.');
    } finally {
      setLoading(false);
    }
  };

  const StepIcon = STEP_META[step].icon;
  const CurrentStepIcon = Icons[StepIcon];

  return (
    <div className="max-w-6xl mx-auto pb-20 animate-fade-in">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/imoveis')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Icons.ArrowRight className="rotate-180 text-slate-500" />
          </button>
          <div>
            <h1 className="text-3xl font-serif font-bold text-slate-800">
              {isEditing ? 'Editar Imóvel (Wizard)' : 'Novo Imóvel (Wizard)'}
            </h1>
            <p className="text-slate-500 text-sm">Fluxo inteligente para cadastro rápido e completo.</p>
          </div>
        </div>

        <div className="hidden md:block px-4 py-2 rounded-2xl bg-amber-50 border border-amber-100 text-amber-700 text-xs font-semibold">
          {STEP_META[step].label}
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-3 md:p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STEP_ORDER.map((item, index) => {
            const ActiveIcon = Icons[STEP_META[item].icon];
            const isActive = item === step;
            const isDone = STEP_ORDER.indexOf(step) > index;

            return (
              <button
                key={item}
                type="button"
                onClick={() => setStep(item)}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-lg'
                    : isDone
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <ActiveIcon size={16} />
                {STEP_META[item].label}
              </button>
            );
          })}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6 text-slate-800">
            <CurrentStepIcon size={20} className="text-brand-600" />
            <h2 className="font-bold text-xl">{STEP_META[step].label}</h2>
          </div>

          {step === 'basic' && (
            <div className="space-y-6">
              <div className="inline-flex bg-slate-100 rounded-full p-1">
                <button
                  type="button"
                  onClick={() => handleInput('listing_type', 'sale')}
                  className={`px-5 py-2 rounded-full font-semibold text-sm transition-all ${
                    formData.listing_type === 'sale' ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  Venda
                </button>
                <button
                  type="button"
                  onClick={() => handleInput('listing_type', 'rent')}
                  className={`px-5 py-2 rounded-full font-semibold text-sm transition-all ${
                    formData.listing_type === 'rent' ? 'bg-slate-900 text-white' : 'text-slate-600'
                  }`}
                >
                  Aluguel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-slate-600 mb-2">Título do anúncio</label>
                  <input
                    required
                    value={formData.title}
                    onChange={(e) => handleInput('title', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                    placeholder="Ex: Casa alto padrão no Centro"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Tipo de imóvel</label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInput('type', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                  >
                    {Object.values(PropertyType).map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">
                    {formData.listing_type === 'sale' ? 'Preço de venda (R$)' : 'Aluguel mensal (R$)'}
                  </label>
                  <input
                    required
                    type="number"
                    min={0}
                    value={formData.price}
                    onChange={(e) => handleInput('price', Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                  />
                </div>

                {formData.listing_type === 'rent' ? (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-slate-600 mb-2">Pacote (condomínio + taxas) (R$)</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.rent_package_price}
                      onChange={(e) => handleInput('rent_package_price', Number(e.target.value))}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-bold text-slate-600 mb-2">Valor de entrada (R$)</label>
                      <input
                        type="number"
                        min={0}
                        value={formData.down_payment}
                        onChange={(e) => handleInput('down_payment', Number(e.target.value))}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                      />
                    </div>
                    <div className="flex items-end">
                      <label className="w-full inline-flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <input
                          type="checkbox"
                          checked={formData.financing_available}
                          onChange={(e) => handleInput('financing_available', e.target.checked)}
                        />
                        <span className="text-sm font-semibold text-slate-700">Aceita financiamento</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Quartos</label>
                  <input type="number" min={0} value={formData.bedrooms} onChange={(e) => handleInput('bedrooms', Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Banheiros</label>
                  <input type="number" min={0} value={formData.bathrooms} onChange={(e) => handleInput('bathrooms', Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Vagas</label>
                  <input type="number" min={0} value={formData.garage} onChange={(e) => handleInput('garage', Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Área (m²)</label>
                  <input type="number" min={0} value={formData.area} onChange={(e) => handleInput('area', Number(e.target.value))} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">CEP</label>
                  <div className="flex gap-2">
                    <input
                      value={formData.zip_code}
                      onChange={(e) => handleInput('zip_code', e.target.value)}
                      onBlur={fetchAddressByCep}
                      placeholder="00000-000"
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                    />
                    <button
                      type="button"
                      onClick={fetchAddressByCep}
                      className="px-4 rounded-xl bg-slate-900 text-white font-semibold"
                    >
                      {fetchingCep ? '...' : 'Buscar'}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Rua / Endereço</label>
                  <input value={formData.address} onChange={(e) => handleInput('address', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">Bairro</label>
                  <input value={formData.neighborhood} onChange={(e) => handleInput('neighborhood', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">Cidade</label>
                    <input value={formData.city} onChange={(e) => handleInput('city', e.target.value)} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-600 mb-2">UF</label>
                    <input value={formData.state} onChange={(e) => handleInput('state', e.target.value.toUpperCase())} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" maxLength={2} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">Comodidades</label>
                <div className="flex flex-col md:flex-row gap-2 mb-3">
                  <input value={newFeature} onChange={(e) => setNewFeature(e.target.value)} placeholder="Ex: Piscina aquecida" className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none" />
                  <button type="button" onClick={addFeature} className="px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold">Adicionar</button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.features.map((feature) => (
                    <span key={feature} className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-100 border border-slate-200 text-sm text-slate-700">
                      {feature}
                      <button type="button" onClick={() => removeFeature(feature)}><Icons.X size={14} /></button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-slate-600">Descrição</label>
                  <button
                    type="button"
                    onClick={generateDescriptionWithAI}
                    className="text-sm font-bold text-brand-700 hover:underline"
                  >
                    {generatingDescription ? 'Gerando...' : 'Gerar descrição com IA'}
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={formData.description}
                  onChange={(e) => handleInput('description', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                  placeholder="Descreva o imóvel com foco em diferenciais..."
                />
              </div>
            </div>
          )}

          {step === 'media' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Adicionar por URL</label>
                  <div className="flex gap-2">
                    <input
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="https://..."
                      className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl"
                    />
                    <button type="button" onClick={addImageByUrl} className="px-4 rounded-xl bg-slate-900 text-white font-semibold">Add</button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Upload do dispositivo</label>
                  <label className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center gap-2 cursor-pointer hover:border-brand-400 transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => e.target.files && addFiles(e.target.files)}
                    />
                    <Icons.Upload size={16} />
                    <span className="font-semibold text-sm">{uploading ? 'Enviando...' : 'Selecionar imagens'}</span>
                  </label>
                </div>
              </div>

              <div
                className="rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropArea}
              >
                <p className="text-slate-600 font-medium">Arraste e solte imagens aqui para upload</p>
                <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP • reordene depois arrastando no grid</p>
              </div>

              {images.length === 0 ? (
                <p className="text-center text-slate-400 py-10 bg-slate-50 rounded-xl border border-slate-100">
                  Nenhuma imagem adicionada.
                </p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {images.map((image, idx) => (
                    <SortableImageCard
                      key={image.id}
                      image={image}
                      index={idx}
                      onRemove={removeImage}
                      onDragStart={setDraggingImageId}
                      onDropOn={handleDropOnImage}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 'seo' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">SEO Title</label>
                <input
                  value={formData.seo_title}
                  onChange={(e) => handleInput('seo_title', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Título para Google (até 60 caracteres)"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-2">SEO Description</label>
                <textarea
                  rows={4}
                  value={formData.seo_description}
                  onChange={(e) => handleInput('seo_description', e.target.value)}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="Descrição curta para resultados de busca"
                />
              </div>

              <div className="rounded-2xl bg-slate-900 text-white p-5">
                <h4 className="font-semibold mb-3">Gamificação do corretor (preview)</h4>
                <div className="space-y-2 text-sm text-slate-200">
                  {XP_HINTS.map((hint) => (
                    <p key={hint}>• {hint}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 'basic'}
            className="px-5 py-3 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold disabled:opacity-40"
          >
            Voltar
          </button>

          <div className="flex items-center gap-3">
            {step !== 'seo' ? (
              <button
                type="button"
                onClick={goNext}
                disabled={!canGoNext}
                className="px-5 py-3 rounded-xl bg-slate-900 text-white font-semibold disabled:opacity-40"
              >
                Próximo passo
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold shadow-lg flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Icons.Loader2 className="animate-spin" size={16} /> : <Icons.CheckCircle size={16} />}
                {isEditing ? 'Atualizar imóvel' : 'Cadastrar imóvel'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default AdminPropertyForm;