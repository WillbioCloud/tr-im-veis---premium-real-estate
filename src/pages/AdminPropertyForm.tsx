import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Property, PropertyType } from '../types';
import { Icons } from '../components/Icons';


const AdminPropertyForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Estado inicial do formulário
  const [formData, setFormData] = useState<Partial<Property>>({
    title: '',
    description: '',
    price: 0,
    type: PropertyType.APARTMENT,
    bedrooms: 0,
    bathrooms: 0,
    area: 0,
    garage: 0,
    location: { city: '', neighborhood: '', state: '' },
    features: [],
    images: [],
    featured: false,
    slug: ''
  });

  const [featureInput, setFeatureInput] = useState('');

  // Carregar dados se for edição
  useEffect(() => {
    if (isEditing) {
      const fetchProperty = async () => {
        const { data } = await supabase.from('properties').select('*').eq('id', id).single();
        if (data) setFormData(data);
      };
      fetchProperty();
    }
  }, [id, isEditing]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name.includes('.')) {
      // Handle nested location object (e.g., location.city)
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent as keyof Property] as any, [child]: value }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? Number(value) : value
      }));
    }
  };

  const handleCheckbox = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.checked }));
  };

  // Gerenciamento de Features (Tags)
  const addFeature = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && featureInput.trim()) {
      e.preventDefault();
      setFormData(prev => ({
        ...prev,
        features: [...(prev.features || []), featureInput.trim()]
      }));
      setFeatureInput('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features?.filter((_, i) => i !== index)
    }));
  };

  // Upload de Imagens
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    const files = Array.from(e.target.files);
    const newImages: string[] = [];

    for (const file of files) {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('properties')
        .upload(filePath, file);

      if (uploadError) {
        alert('Erro ao fazer upload da imagem: ' + uploadError.message);
        continue;
      }

      const { data } = supabase.storage.from('properties').getPublicUrl(filePath);
      newImages.push(data.publicUrl);
    }

    setFormData(prev => ({
      ...prev,
      images: [...(prev.images || []), ...newImages]
    }));
    setUploading(false);
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Gerar slug simples se não existir
      const slug = formData.slug || formData.title?.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
      const payload = { ...formData, slug };

      if (isEditing) {
        const { error } = await supabase.from('properties').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('properties').insert([payload]);
        if (error) throw error;
      }

      navigate('/admin/imoveis');
    } catch (error: any) {
      alert('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        {isEditing ? 'Editar Imóvel' : 'Novo Imóvel'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Seção Principal */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold text-lg mb-4">Informações Básicas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Título do Anúncio</label>
              <input name="title" className="input" value={formData.title} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Preço (R$)</label>
              <input name="price" type="number" className="input" value={formData.price} onChange={handleChange} required />
            </div>
          </div>

          <div>
            <label className="label">Descrição Completa</label>
            <textarea name="description" className="input h-32" value={formData.description} onChange={handleChange} />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="label">Tipo</label>
              <select name="type" className="input" value={formData.type} onChange={handleChange}>
                {Object.values(PropertyType).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Área (m²)</label>
              <input name="area" type="number" className="input" value={formData.area} onChange={handleChange} />
            </div>
            <div>
              <label className="label">Quartos</label>
              <input name="bedrooms" type="number" className="input" value={formData.bedrooms} onChange={handleChange} />
            </div>
             <div>
              <label className="label">Vagas</label>
              <input name="garage" type="number" className="input" value={formData.garage} onChange={handleChange} />
            </div>
          </div>
        </div>

        {/* Localização */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold text-lg mb-4">Localização</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Cidade</label>
              <input name="location.city" className="input" value={formData.location?.city} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Bairro</label>
              <input name="location.neighborhood" className="input" value={formData.location?.neighborhood} onChange={handleChange} required />
            </div>
            <div>
              <label className="label">Estado (UF)</label>
              <input name="location.state" className="input" value={formData.location?.state} onChange={handleChange} required maxLength={2} />
            </div>
          </div>
        </div>

        {/* Imagens */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-center">
             <h2 className="font-bold text-lg">Galeria de Fotos</h2>
             <label className="cursor-pointer bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
               {uploading ? 'Enviando...' : 'Adicionar Fotos'}
               <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
             </label>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {formData.images?.map((img, index) => (
              <div key={index} className="relative group aspect-video rounded-lg overflow-hidden bg-gray-100">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button 
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Icons.X size={14} />
                </button>
              </div>
            ))}
            {formData.images?.length === 0 && (
              <div className="col-span-full text-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
                Nenhuma imagem adicionada
              </div>
            )}
          </div>
        </div>

        {/* Extras e Features */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
           <h2 className="font-bold text-lg">Diferenciais</h2>
           
           <div className="flex gap-2 mb-4">
             <input 
               className="input" 
               placeholder="Digite um diferencial (ex: Piscina) e tecle Enter" 
               value={featureInput}
               onChange={(e) => setFeatureInput(e.target.value)}
               onKeyDown={addFeature}
             />
           </div>
           
           <div className="flex flex-wrap gap-2">
             {formData.features?.map((feat, index) => (
               <span key={index} className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                 {feat}
                 <button type="button" onClick={() => removeFeature(index)} className="hover:text-amber-900"><Icons.X size={12} /></button>
               </span>
             ))}
           </div>

           <div className="mt-6 pt-6 border-t flex items-center gap-2">
             <input 
               type="checkbox" 
               id="featured"
               name="featured"
               checked={formData.featured}
               onChange={handleCheckbox}
               className="w-5 h-5 text-amber-500 rounded focus:ring-amber-500"
             />
             <label htmlFor="featured" className="font-medium text-slate-800">Destacar este imóvel na Home</label>
           </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex justify-end gap-4 pt-4">
          <button 
            type="button" 
            onClick={() => navigate('/admin/imoveis')}
            className="px-6 py-3 border border-gray-300 rounded-lg font-bold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={loading || uploading}
            className="px-8 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold shadow-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Imóvel'}
          </button>
        </div>
      </form>

      {/* Styles Helper (Tailwind classes for inputs) */}
      <style>{`
        .label { display: block; font-size: 0.875rem; font-weight: 500; color: #374151; margin-bottom: 0.25rem; }
        .input { width: 100%; padding: 0.5rem 1rem; border: 1px solid #d1d5db; border-radius: 0.5rem; outline: none; transition: all 0.2s; }
        .input:focus { ring: 2px; ring-color: #f59e0b; border-color: transparent; }
      `}</style>
    </div>
  );
};

export default AdminPropertyForm;