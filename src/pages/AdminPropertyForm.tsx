import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Property } from '../types';
import { Icons } from '../components/Icons';

const emptyProperty: Partial<Property> = {
  title: '',
  description: '',
  price: 0,
  type: '',
  area: undefined,
  images: [],
  location: {
    city: '',
    neighborhood: '',
    address: ''
  }
};

const AdminPropertyForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [property, setProperty] = useState<Partial<Property>>(emptyProperty);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) loadProperty();
  }, [id]);

  const loadProperty = async () => {
    setLoading(true);
    const { data } = await supabase.from('properties').select('*').eq('id', id).single();
    if (data) setProperty(data as any);
    setLoading(false);
  };

  const handleChange = (field: string, value: any) => {
    setProperty((prev) => ({ ...prev, [field]: value }));
  };

  const handleLocationChange = (field: string, value: string) => {
    setProperty((prev) => ({
      ...prev,
      location: {
        ...(prev.location || {}),
        [field]: value
      }
    }));
  };

  const handleAddImage = () => {
    setProperty((prev) => ({
      ...prev,
      images: [...(prev.images || []), '']
    }));
  };

  const handleImageChange = (index: number, value: string) => {
    const imgs = [...(property.images || [])];
    imgs[index] = value;
    setProperty((prev) => ({ ...prev, images: imgs }));
  };

  const handleRemoveImage = (index: number) => {
    const imgs = [...(property.images || [])];
    imgs.splice(index, 1);
    setProperty((prev) => ({ ...prev, images: imgs }));
  };

  const handleSave = async () => {
    if (!property.title || !property.price) return alert('Título e preço são obrigatórios.');

    setSaving(true);

    if (id) {
      await supabase.from('properties').update(property).eq('id', id);
    } else {
      await supabase.from('properties').insert([property]);
    }

    setSaving(false);
    navigate('/admin/imoveis');
  };

  if (loading) {
    return <div className="text-center py-20 text-slate-500 animate-pulse">Carregando imóvel...</div>;
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          {id ? 'Editar Imóvel' : 'Novo Imóvel'}
        </h1>
        <p className="text-sm text-slate-500">
          Preencha os dados abaixo para publicar no site e CRM.
        </p>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="font-extrabold text-slate-900">Informações</h3>

          <input
            value={property.title || ''}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Título"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <textarea
            value={property.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Descrição"
            rows={5}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={property.price || ''}
              onChange={(e) => handleChange('price', Number(e.target.value))}
              placeholder="Preço"
              className="px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400"
            />

            <input
              value={property.type || ''}
              onChange={(e) => handleChange('type', e.target.value)}
              placeholder="Tipo (Casa, Lote...)"
              className="px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <input
            type="number"
            value={property.area || ''}
            onChange={(e) => handleChange('area', Number(e.target.value))}
            placeholder="Área (m²)"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Localização */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h3 className="font-extrabold text-slate-900">Localização</h3>

          <input
            value={property.location?.city || ''}
            onChange={(e) => handleLocationChange('city', e.target.value)}
            placeholder="Cidade"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <input
            value={property.location?.neighborhood || ''}
            onChange={(e) => handleLocationChange('neighborhood', e.target.value)}
            placeholder="Bairro"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400"
          />

          <input
            value={property.location?.address || ''}
            onChange={(e) => handleLocationChange('address', e.target.value)}
            placeholder="Endereço"
            className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
      </div>

      {/* Imagens */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-extrabold text-slate-900">Imagens</h3>
          <button
            onClick={handleAddImage}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-extrabold"
          >
            <Icons.Plus size={16} />
            Adicionar
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(property.images || []).map((img, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-3 space-y-2">
              <input
                value={img}
                onChange={(e) => handleImageChange(idx, e.target.value)}
                placeholder="URL da imagem"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-emerald-400"
              />

              {img && (
                <img src={img} alt="" className="w-full h-40 object-cover rounded-lg" />
              )}

              <button
                onClick={() => handleRemoveImage(idx)}
                className="text-xs text-rose-600 font-extrabold hover:underline"
              >
                Remover imagem
              </button>
            </div>
          ))}

          {(property.images || []).length === 0 && (
            <div className="text-sm text-slate-500 italic">Nenhuma imagem adicionada.</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={() => navigate('/admin/imoveis')}
          className="px-5 py-3 rounded-xl border border-slate-200 font-extrabold hover:bg-slate-50"
        >
          Cancelar
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar Imóvel'}
        </button>
      </div>
    </div>
  );
};

export default AdminPropertyForm;
