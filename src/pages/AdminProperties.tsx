import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Property } from '../types';
import { Icons } from '../components/Icons';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';
import { TOOLTIPS } from '../constants/tooltips'; // <--- Importando Textos

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

// Componente de Tooltip (Copiado para manter padrão)
const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-flex items-center ml-2 z-20">
    <Icons.Info size={14} className="text-slate-400 cursor-help hover:text-brand-500 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-56 p-2 bg-slate-800 text-white text-xs rounded-lg shadow-xl group-hover:block z-50 text-center leading-relaxed font-normal">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 h-2 w-2 -rotate-45 bg-slate-800"></div>
    </div>
  </div>
);

const AdminProperties: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');

  // Estados do Modal de Importação
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<any[]>([]);

  const fetchProperties = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*, agent:profiles(name, email)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const formattedData: Property[] = data.map((item: any) => ({
          ...item,
          location: item.location || {
            city: item.city || '',
            neighborhood: item.neighborhood || '',
            state: item.state || '',
            address: item.address || ''
          },
          images: item.images || [],
          features: item.features || []
        }));
        setProperties(formattedData);
      }
    } catch (error) {
      console.error("Erro ao buscar imóveis:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este imóvel?')) return;
    const { error } = await supabase.from('properties').delete().eq('id', id);
    if (!error) fetchProperties();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      setImportPreview(data);
    };
    reader.readAsBinaryString(file);
  };

  const confirmImport = async () => {
    setImporting(true);
    try {
      const formattedData = importPreview.map((row: any) => ({
        title: row['Titulo'],
        description: row['Descricao'],
        price: Number(row['Preco']),
        type: row['Tipo'] || 'Casa',
        city: row['Cidade'],
        neighborhood: row['Bairro'],
        state: row['Estado'] || 'GO',
        bedrooms: Number(row['Quartos'] || 0),
        bathrooms: Number(row['Banheiros'] || 0),
        area: Number(row['Area'] || 0),
        garage: Number(row['Vagas'] || 0),
        slug: (row['Titulo'] || '').toLowerCase().replace(/ /g, '-') + '-' + Math.floor(Math.random() * 1000),
        agent_id: user?.id
      }));

      const { error } = await supabase.from('properties').insert(formattedData);
      if (error) throw error;
      
      setIsImportModalOpen(false);
      setImportPreview([]);
      fetchProperties();
      alert('Importação concluída com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao importar. Verifique o formato do arquivo.');
    } finally {
      setImporting(false);
    }
  };

  const filteredProperties = useMemo(() => {
    return properties.filter(p => {
      const neighborhood = p.location?.neighborhood?.toLowerCase() || '';
      const title = p.title?.toLowerCase() || '';
      const searchTerm = search.toLowerCase();

      const matchesSearch = title.includes(searchTerm) || neighborhood.includes(searchTerm);
      const matchesType = typeFilter === 'Todos' || p.type === typeFilter;
      
      return matchesSearch && matchesType;
    });
  }, [properties, search, typeFilter]);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-800 flex items-center">
            {isAdmin ? 'Todos os Imóveis' : 'Meus Imóveis'}
            <InfoTooltip text={TOOLTIPS.properties.pageTitle} />
          </h1>
          <p className="text-slate-500">Gerencie o portfólio imobiliário.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            <Icons.Upload size={18} /> 
            Importar Excel
            <InfoTooltip text={TOOLTIPS.properties.import} />
          </button>
          
          <Link 
            to="/admin/imoveis/novo" 
            className="bg-brand-600 text-white px-5 py-3 rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-200 flex items-center gap-2"
          >
            <Icons.Plus size={20} /> Novo Imóvel
          </Link>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por título, bairro..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-brand-500 transition-colors"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select 
          className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-brand-500"
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="Todos">Todos os Tipos</option>
          <option value="Casa">Casa</option>
          <option value="Apartamento">Apartamento</option>
          <option value="Terreno">Terreno</option>
          <option value="Comercial">Comercial</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-20"><Icons.Loader2 className="animate-spin mx-auto text-brand-600" size={40} /></div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-xs">
                <tr>
                  <th className="p-4">Imóvel</th>
                  <th className="p-4">Preço</th>
                  {isAdmin && (
                    <th className="p-4 flex items-center">
                      Responsável <InfoTooltip text={TOOLTIPS.properties.responsible} />
                    </th>
                  )}
                  <th className="p-4">Localização</th>
                  <th className="p-4 text-right">
                    Ações <InfoTooltip text={TOOLTIPS.properties.actions} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
                {filteredProperties.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-slate-400">
                      Nenhum imóvel encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredProperties.map(property => (
                    <tr key={property.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={property.images?.[0] || 'https://placehold.co/100'} 
                            className="w-12 h-12 rounded-lg object-cover bg-slate-200"
                            alt=""
                          />
                          <div>
                            <p className="font-bold text-slate-800 line-clamp-1">{property.title}</p>
                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase">{property.type}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-bold text-brand-600">
                        {formatBRL(property.price)}
                      </td>
                      
                      {isAdmin && (
                        <td className="p-4">
                          {property.agent ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                {property.agent.name.charAt(0)}
                              </div>
                              <span className="text-xs font-bold text-indigo-600 truncate max-w-[100px]" title={property.agent.email}>
                                {property.agent.name.split(' ')[0]}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
                              Imobiliária
                            </span>
                          )}
                        </td>
                      )}

                      <td className="p-4">
                        {property.location?.neighborhood || 'Bairro N/A'}, {property.location?.city || 'Cidade N/A'}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/admin/imoveis/editar/${property.id}`} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                            <Icons.Edit size={18} />
                          </Link>
                          <button onClick={() => handleDelete(property.id)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors">
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
      )}

      {/* Modal de Importação (Conteúdo igual ao anterior...) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-in overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Icons.FileSpreadsheet className="text-brand-600" />
                Importar Imóveis via Excel
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Icons.X size={24} />
              </button>
            </div>
            
            <div className="p-8">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-brand-400 hover:bg-brand-50 transition-colors cursor-pointer relative">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <Icons.Upload size={48} className="mx-auto text-slate-400 mb-4" />
                <p className="text-slate-600 font-medium">Clique ou arraste sua planilha aqui</p>
                <p className="text-xs text-slate-400 mt-2">Formatos suportados: .xlsx, .xls</p>
              </div>

              {importPreview.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-bold text-slate-700 mb-3">Pré-visualização ({importPreview.length} imóveis)</h4>
                  <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-500 font-bold">
                        <tr>
                          <th className="p-2">Título</th>
                          <th className="p-2">Bairro</th>
                          <th className="p-2">Preço</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {importPreview.slice(0, 5).map((row, i) => (
                          <tr key={i}>
                            <td className="p-2 truncate max-w-[150px]">{row['Titulo']}</td>
                            <td className="p-2">{row['Bairro']}</td>
                            <td className="p-2">{row['Preco']}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {importPreview.length > 5 && <p className="text-center text-xs text-slate-400 p-2">... e mais {importPreview.length - 5}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                disabled={importPreview.length === 0 || importing}
                onClick={confirmImport}
                className="px-6 py-3 rounded-xl font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing ? <Icons.Loader2 className="animate-spin" /> : <Icons.CheckCircle />}
                {importing ? 'Importando...' : 'Confirmar Importação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminProperties;