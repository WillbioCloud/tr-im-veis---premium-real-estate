import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Property } from '../types';
import { Icons } from '../components/Icons';

const AdminProperties: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProperties = async () => {
    const { data } = await supabase.from('properties').select('*').order('created_at', { ascending: false });
    if (data) setProperties(data as any); // Type cast rápido, idealmente mapear
    setLoading(false);
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este imóvel?')) {
      await supabase.from('properties').delete().eq('id', id);
      fetchProperties();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Gerenciar Imóveis</h1>
        <Link 
          to="/admin/imoveis/novo" 
          className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Icons.Plus size={18} /> Novo Imóvel
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 text-gray-600 text-sm font-medium">
            <tr>
              <th className="p-4">Título</th>
              <th className="p-4">Preço</th>
              <th className="p-4">Localização</th>
              <th className="p-4 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">Carregando...</td></tr>
            ) : properties.length === 0 ? (
              <tr><td colSpan={4} className="p-8 text-center text-gray-500">Nenhum imóvel cadastrado.</td></tr>
            ) : (
              properties.map((prop) => (
                <tr key={prop.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{prop.title}</p>
                    <p className="text-xs text-gray-500">{prop.type} • {prop.area}m²</p>
                  </td>
                  <td className="p-4 font-medium text-amber-600">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prop.price)}
                  </td>
                  <td className="p-4 text-gray-600 text-sm">
                    {prop.location?.neighborhood}, {prop.location?.city}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-center gap-2">
                      <Link to={`/admin/imoveis/editar/${prop.id}`} className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                        <Icons.Edit size={18} />
                      </Link>
                      <button 
                        onClick={() => handleDelete(prop.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Icons.Trash size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminProperties;