import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

const AdminPropertyForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    type: 'Casa',
    city: 'Caldas Novas',
    neighborhood: '',
    state: 'GO',
    bedrooms: 0,
    bathrooms: 0,
    area: 0,
    garage: 0,
    features: [] as string[],
    images: [] as string[]
  });

  const [newImageUrl, setNewImageUrl] = useState('');
  const [newFeature, setNewFeature] = useState('');

  // Carregar dados se for edição
  useEffect(() => {
    if (isEditing) {
      const fetchProp = async () => {
        const { data } = await supabase.from('properties').select('*').eq('id', id).single();
        if (data) {
          setFormData({
            title: data.title,
            description: data.description || '',
            price: data.price,
            type: data.type,
            city: data.city || data.location?.city || '',
            neighborhood: data.neighborhood || data.location?.neighborhood || '',
            state: data.state || data.location?.state || 'GO',
            bedrooms: data.bedrooms,
            bathrooms: data.bathrooms,
            area: data.area,
            garage: data.garage,
            features: data.features || [],
            images: data.images || []
          });
        }
      };
      fetchProp();
    }
  }, [id, isEditing]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // === LÓGICA DE IMAGENS (LINK + UPLOAD) ===

  const addImageUrl = () => {
    if (newImageUrl) {
      setFormData((prev) => ({ ...prev, images: [...prev.images, newImageUrl] }));
      setNewImageUrl('');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload para o Bucket 'properties'
      const { error: uploadError } = await supabase.storage.from('properties').upload(filePath, file);

      if (uploadError) throw uploadError;

      // Pegar URL Pública
      const { data } = supabase.storage.from('properties').getPublicUrl(filePath);

      if (data) {
        setFormData((prev) => ({ ...prev, images: [...prev.images, data.publicUrl] }));
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao fazer upload da imagem.');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  // === LÓGICA DE FEATURES ===
  const addFeature = () => {
    if (newFeature) {
      setFormData((prev) => ({ ...prev, features: [...prev.features, newFeature] }));
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData((prev) => ({ ...prev, features: prev.features.filter((_, i) => i !== index) }));
  };

  // === SALVAR ===
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const slug =
        formData.title.toLowerCase().replace(/ /g, '-') + '-' + Math.floor(Math.random() * 1000);

      const payload = {
        ...formData,
        slug: isEditing ? undefined : slug, // Só gera slug se for novo
        agent_id: user?.id // Vincula ao corretor logado
      };

      if (isEditing) {
        await supabase.from('properties').update(payload).eq('id', id);
      } else {
        await supabase.from('properties').insert([payload]);
      }
      navigate('/admin/imoveis');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar imóvel.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 animate-fade-in">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin/imoveis')}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Icons.ArrowRight className="rotate-180 text-slate-500" />
        </button>
        <h1 className="text-3xl font-serif font-bold text-slate-800">
          {isEditing ? 'Editar Imóvel' : 'Cadastrar Imóvel'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Bloco 1: Informações Básicas */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Icons.Home className="text-brand-500" size={20} /> Informações Principais
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-600 mb-2">Título do Anúncio</label>
              <input
                required
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                placeholder="Ex: Casa Linda no Centro"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Tipo</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
              >
                <option value="Casa">Casa</option>
                <option value="Apartamento">Apartamento</option>
                <option value="Terreno">Terreno</option>
                <option value="Comercial">Comercial</option>
                <option value="Cobertura">Cobertura</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-600 mb-2">Preço (R$)</label>
              <input
                required
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-600 mb-2">Descrição Completa</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-brand-500"
                placeholder="Descreva os detalhes..."
              />
            </div>
          </div>
        </div>

        {/* Bloco 2: Multimídia (Upload) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
            <Icons.Image className="text-brand-500" size={20} /> Galeria de Fotos
          </h3>

          {/* Área de Upload e Link */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">
                Adicionar por Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none"
                />
                <button
                  type="button"
                  onClick={addImageUrl}
                  className="bg-slate-800 text-white px-4 rounded-xl hover:bg-slate-700 font-bold"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex-1">
              <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">
                Upload do Dispositivo
              </label>
              <label
                className={`flex items-center justify-center gap-2 w-full p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-brand-500 hover:bg-brand-50 transition-all ${
                  uploading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="hidden"
                />
                {uploading ? (
                  <Icons.Loader2 className="animate-spin text-brand-600" />
                ) : (
                  <Icons.Upload className="text-slate-400" />
                )}
                <span className="text-sm font-bold text-slate-500">
                  {uploading ? 'Enviando...' : 'Escolher Arquivo'}
                </span>
              </label>
            </div>
          </div>

          {/* Grid de Preview */}
          {formData.images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {formData.images.map((img, idx) => (
                <div
                  key={idx}
                  className="relative group aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200"
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                  >
                    <Icons.X size={14} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-400 py-8 italic bg-slate-50 rounded-xl border border-slate-100">
              Nenhuma imagem adicionada.
            </p>
          )}
        </div>

        {/* Bloco 3: Detalhes e Endereço */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-700 mb-4">Detalhes</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-sm">Quartos</label>
                <input
                  type="number"
                  name="bedrooms"
                  value={formData.bedrooms}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-sm">Banheiros</label>
                <input
                  type="number"
                  name="bathrooms"
                  value={formData.bathrooms}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-sm">Vagas</label>
                <input
                  type="number"
                  name="garage"
                  value={formData.garage}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-sm">Área (m²)</label>
                <input
                  type="number"
                  name="area"
                  value={formData.area}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-700 mb-4">Localização</h3>
            <div className="space-y-4">
              <div>
                <label className="label-sm">Cidade</label>
                <input name="city" value={formData.city} onChange={handleChange} className="input-field" />
              </div>
              <div>
                <label className="label-sm">Bairro</label>
                <input
                  name="neighborhood"
                  value={formData.neighborhood}
                  onChange={handleChange}
                  className="input-field"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <Icons.Loader2 className="animate-spin" /> : <Icons.CheckCircle />}
            {isEditing ? 'Atualizar Imóvel' : 'Cadastrar Imóvel'}
          </button>
        </div>

        {/* Estilos locais para inputs repetitivos */}
        <style>{`
          .label-sm { display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 0.5rem; }
          .input-field { width: 100%; padding: 0.75rem; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; outline: none; transition: all; }
          .input-field:focus { border-color: #d97706; }
        `}</style>
      </form>
    </div>
  );
};

export default AdminPropertyForm;
