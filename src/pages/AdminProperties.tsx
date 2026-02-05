import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Property, PropertyType } from '../types';
import { Icons } from '../components/Icons';
import * as XLSX from 'xlsx'; // Importa a biblioteca de Excel

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const AdminProperties: React.FC = () => {
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
    const { data } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });

    if (data) setProperties(data as any);
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

  // === LÓGICA DE IMPORTAÇÃO DE EXCEL ===
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
    if (importPreview.length === 0) return;
    setImporting(true);

    try {
      // Mapeia as colunas do Excel (português) para o Banco (inglês)
      const formattedData = importPreview.map((row: any) => ({
        title: row['Titulo'] || 'Imóvel sem título',
        description: row['Descricao'] || '',
        price: Number(row['Preco']) || 0,
        type: row['Tipo'] || 'Casa',
        iptu: Number(row['IPTU']) || 0,           // Novo campo rico
        condominium: Number(row['Condominio']) || 0, // Novo campo rico
        bedrooms: Number(row['Quartos']) || 0,
        suites: Number(row['Suites']) || 0,
        bathrooms: Number(row['Banheiros']) || 0,
        area: Number(row['Area']) || 0,
        garage: Number(row['Vagas']) || 0,
        location: {
          city: row['Cidade'] || 'Goiânia',
          neighborhood: row['Bairro'] || '',
          state: row['UF'] || 'GO'
        },
        // Converte string separada por virgula em array
        features: row['Caracteristicas'] ? row['Caracteristicas'].split(',').map((s: string) => s.trim()) : [],
        images: row['Imagens'] ? row['Imagens'].split(',').map((s: string) => s.trim()) : [],
        slug: (row['Titulo'] || 'imovel').toLowerCase().replace(/ /g, '-') + '-' + Math.random().toString(36).substr(2, 5),
        owner_name: row['Proprietario_Nome'],
        owner_phone: row['Proprietario_Tel']
      }));

      const { error } = await supabase.from('properties').insert(formattedData);

      if (error) throw error;

      alert(`${formattedData.length} imóveis importados com sucesso!`);
      setIsImportModalOpen(false);
      setImportPreview([]);
      fetchProperties();
    } catch (error) {
      console.error(error);
      alert('Erro ao importar. Verifique se o formato do Excel está correto.');
    } finally {
      setImporting(false);
    }
  };

  // Filtros existentes...
  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(properties.map((p) => p.type).filter(Boolean)));
    return ['Todos', ...types];
  }, [properties]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return properties.filter((p) => {
      const matchesSearch = !q || (p.title || '').toLowerCase().includes(q) || (p.location?.city || '').toLowerCase().includes(q) || (p.location?.neighborhood || '').toLowerCase().includes(q);
      const matchesType = typeFilter === 'Todos' || p.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [properties, search, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">Imóveis</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gerencie o catálogo. Edite, publique e mantenha tudo organizado.
          </p>
        </div>

        <div className="flex gap-2">
          {/* Botão Importar */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors shadow-sm"
          >
            <Icons.Upload size={18} />
            Importar
          </button>

          <Link
            to="/admin/imoveis/novo"
            className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Icons.Plus size={18} />
            Novo Imóvel
          </Link>
        </div>
      </div>

      {/* Filters (Igual ao anterior) */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, cidade ou bairro…"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-400 dark:text-white"
            />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-emerald-400 font-bold text-slate-700 dark:text-white">
            {availableTypes.map((t) => <option key={t} value={t}>{t === 'Todos' ? 'Todos os tipos' : t}</option>)}
          </select>
          <button onClick={() => { setSearch(''); setTypeFilter('Todos'); }} className="px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors font-extrabold text-slate-700 dark:text-white">Limpar</button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        {/* ... (Header da tabela igual) ... */}
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs font-extrabold uppercase tracking-widest">
              <tr>
                <th className="p-4">Imóvel</th>
                <th className="p-4">Preço / Cond.</th>
                <th className="p-4">Localização</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading ? (
                <tr><td colSpan={4} className="p-10 text-center text-slate-500 animate-pulse">Carregando imóveis…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="p-10 text-center text-slate-500">Nenhum imóvel encontrado.</td></tr>
              ) : (
                filtered.map((prop) => (
                  <tr key={prop.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/50 transition-colors">
                    {/* Imóvel */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 overflow-hidden flex-shrink-0">
                          {prop.images?.[0] ? <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-400"><Icons.Image size={18} /></div>}
                        </div>
                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 dark:text-white truncate">{prop.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            <span className="font-bold">{prop.type}</span>
                            {prop.area ? ` • ${prop.area}m²` : ''}
                            {/* Mostra proprietário se existir (Catálogo Rico) */}
                            {prop.owner_name && <span className="text-amber-600 ml-2">• Prop: {prop.owner_name}</span>}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Preço e Detalhes Ricos */}
                    <td className="p-4">
                      <p className="font-extrabold text-emerald-700 dark:text-emerald-400">{formatBRL(prop.price)}</p>
                      {prop.condominium && prop.condominium > 0 && (
                        <p className="text-[10px] text-slate-400">+ Cond: {formatBRL(prop.condominium)}</p>
                      )}
                    </td>

                    {/* Localização */}
                    <td className="p-4 text-sm text-slate-600 dark:text-slate-300">
                      <p className="font-bold text-slate-700 dark:text-white">{prop.location?.city || '—'}</p>
                      <p className="text-xs text-slate-500">{prop.location?.neighborhood || '—'}</p>
                    </td>

                    {/* Ações */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link to={`/admin/imoveis/editar/${prop.id}`} className="p-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors" title="Editar">
                          <Icons.Edit size={18} className="text-slate-700 dark:text-slate-300" />
                        </Link>
                        <button onClick={() => handleDelete(prop.id)} className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors" title="Excluir">
                          <Icons.Trash size={18} className="text-rose-600" />
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

      {/* === MODAL DE IMPORTAÇÃO === */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <Icons.FileSpreadsheet className="text-emerald-600" />
                Importação em Massa
              </h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Icons.X />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {!importPreview.length ? (
                <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl p-10 text-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer relative">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Icons.Upload className="mx-auto text-emerald-500 mb-4" size={48} />
                  <p className="text-slate-700 dark:text-white font-bold text-lg">Clique ou arraste seu arquivo Excel aqui</p>
                  <p className="text-slate-400 text-sm mt-2">Suporta .xlsx com colunas: Titulo, Descricao, Preco, Bairro, etc.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center gap-3">
                    <Icons.CheckCircle className="text-emerald-600" size={24} />
                    <div>
                      <p className="font-bold text-emerald-800">{importPreview.length} imóveis encontrados!</p>
                      <p className="text-xs text-emerald-600">Prontos para serem adicionados ao catálogo.</p>
                    </div>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 font-bold text-slate-600">
                        <tr>
                          <th className="p-2">Título</th>
                          <th className="p-2">Bairro</th>
                          <th className="p-2">Preço</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {importPreview.slice(0, 5).map((row: any, i) => (
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

            <div className="p-6 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button 
                disabled={importPreview.length === 0 || importing}
                onClick={confirmImport}
                className="px-6 py-3 rounded-xl font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
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