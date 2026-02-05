import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';

interface Template {
  id: string;
  title: string;
  content: string;
}

const AdminConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'templates' | 'profile'>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estado para Edição/Criação
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    const { data } = await supabase.from('message_templates').select('*').order('created_at', { ascending: true });
    if (data) setTemplates(data as any);
    setLoading(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    if (editingId) {
      await supabase.from('message_templates').update(formData).eq('id', editingId);
    } else {
      await supabase.from('message_templates').insert([formData]);
    }

    setFormData({ title: '', content: '' });
    setEditingId(null);
    fetchTemplates();
  };

  const handleEdit = (tpl: Template) => {
    setEditingId(tpl.id);
    setFormData({ title: tpl.title, content: tpl.content });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este modelo?')) return;
    await supabase.from('message_templates').delete().eq('id', id);
    fetchTemplates();
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Configurações</h1>
      <p className="text-gray-500 mb-8">Personalize seu sistema e automações.</p>

      {/* Navegação de Abas */}
      <div className="flex gap-6 border-b border-gray-200 mb-8">
        <button 
          onClick={() => setActiveTab('templates')}
          className={`pb-4 px-2 text-sm font-bold transition-colors border-b-2 ${activeTab === 'templates' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Templates de Mensagem
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`pb-4 px-2 text-sm font-bold transition-colors border-b-2 ${activeTab === 'profile' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Perfil & Empresa
        </button>
      </div>

      {/* CONTEÚDO: TEMPLATES */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Coluna Esquerda: Formulário */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm h-fit">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Icons.Edit size={18} className="text-brand-500"/> 
              {editingId ? 'Editar Modelo' : 'Novo Modelo'}
            </h3>
            
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título do Modelo</label>
                <input 
                  type="text" 
                  placeholder="Ex: Boas vindas..." 
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-500 outline-none"
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conteúdo da Mensagem</label>
                <div className="bg-blue-50 p-2 rounded text-xs text-blue-700 mb-2">
                  <strong>Dica:</strong> Use <code>{'{nome}'}</code> para o nome do cliente e <code>{'{imovel}'}</code> para o título do imóvel.
                </div>
                <textarea 
                  placeholder="Olá {nome}, ..." 
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-500 outline-none h-32 resize-none"
                  value={formData.content}
                  onChange={e => setFormData({...formData, content: e.target.value})}
                  required
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                {editingId && (
                  <button 
                    type="button" 
                    onClick={() => { setEditingId(null); setFormData({title:'', content:''}); }}
                    className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                )}
                <button 
                  type="submit" 
                  className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 transition-colors"
                >
                  Salvar Modelo
                </button>
              </div>
            </form>
          </div>

          {/* Coluna Direita: Lista */}
          <div className="space-y-4">
             {loading ? <p className="text-center py-10 text-gray-400">Carregando...</p> : (
               templates.map(tpl => (
                 <div key={tpl.id} className="bg-white p-4 rounded-xl border border-gray-200 hover:border-brand-300 transition-all group relative">
                   <div className="pr-16">
                     <h4 className="font-bold text-slate-800 mb-1">{tpl.title}</h4>
                     <p className="text-sm text-gray-500 line-clamp-2 italic">"{tpl.content}"</p>
                   </div>
                   
                   <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button 
                       onClick={() => handleEdit(tpl)}
                       className="p-2 text-blue-500 hover:bg-blue-50 rounded"
                       title="Editar"
                     >
                       <Icons.Edit size={16} />
                     </button>
                     <button 
                       onClick={() => handleDelete(tpl.id)}
                       className="p-2 text-red-500 hover:bg-red-50 rounded"
                       title="Excluir"
                     >
                       <Icons.Trash size={16} />
                     </button>
                   </div>
                 </div>
               ))
             )}
             {templates.length === 0 && !loading && (
               <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">
                 Nenhum modelo criado.
               </div>
             )}
          </div>
        </div>
      )}

      {/* CONTEÚDO: PERFIL (Fase C) */}
      {activeTab === 'profile' && (
        <div className="bg-white p-8 rounded-xl border border-gray-200 text-center">
          <div className="w-20 h-20 bg-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Icons.Users size={32} className="text-gray-400"/>
          </div>
          <h3 className="text-lg font-bold text-slate-800">Gerenciamento de Equipe</h3>
          <p className="text-gray-500 max-w-md mx-auto mt-2">
            Em breve você poderá adicionar outros corretores, definir níveis de acesso (Admin/Corretor) e distribuir leads automaticamente.
          </p>
          <button className="mt-6 px-4 py-2 bg-gray-100 text-gray-400 rounded-lg cursor-not-allowed font-medium">
            Disponível na versão Pro
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminConfig;