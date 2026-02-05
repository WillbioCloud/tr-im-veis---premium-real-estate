import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Property } from '../types';
import { Icons } from '../components/Icons';

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const AdminProperties: React.FC = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  // UI
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('Todos');

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

  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(properties.map((p) => p.type).filter(Boolean)));
    return ['Todos', ...types];
  }, [properties]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return properties.filter((p) => {
      const matchesSearch =
        !q ||
        (p.title || '').toLowerCase().includes(q) ||
        (p.location?.city || '').toLowerCase().includes(q) ||
        (p.location?.neighborhood || '').toLowerCase().includes(q);

      const matchesType = typeFilter === 'Todos' || p.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [properties, search, typeFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Imóveis</h1>
          <p className="text-sm text-slate-500">
            Gerencie o catálogo. Edite, publique e mantenha tudo organizado.
          </p>
        </div>

        <Link
          to="/admin/imoveis/novo"
          className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-extrabold text-white
                     bg-emerald-600 hover:bg-emerald-700 transition-colors shadow-sm"
        >
          <Icons.Plus size={18} />
          Novo Imóvel
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, cidade ou bairro…"
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-white outline-none
                         focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border border-slate-200 bg-white outline-none
                       focus:ring-2 focus:ring-emerald-400 font-bold text-slate-700"
          >
            {availableTypes.map((t) => (
              <option key={t} value={t}>
                {t === 'Todos' ? 'Todos os tipos' : t}
              </option>
            ))}
          </select>

          <button
            onClick={() => {
              setSearch('');
              setTypeFilter('Todos');
            }}
            className="px-4 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors
                       font-extrabold text-slate-700"
            type="button"
          >
            Limpar
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-extrabold text-slate-500 uppercase tracking-widest">
          <span>Total: {properties.length}</span>
          <span>Exibindo: {filtered.length}</span>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700 text-xs font-extrabold">
              <Icons.Building size={14} />
              Catálogo
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs font-extrabold uppercase tracking-widest">
              <tr>
                <th className="p-4">Imóvel</th>
                <th className="p-4">Preço</th>
                <th className="p-4">Localização</th>
                <th className="p-4 text-center">Ações</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-500 animate-pulse">
                    Carregando imóveis…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-10 text-center text-slate-500">
                    Nenhum imóvel encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map((prop) => (
                  <tr key={prop.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Imóvel */}
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0">
                          {prop.images?.[0] ? (
                            <img src={prop.images[0]} alt={prop.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                              <Icons.Image size={18} />
                            </div>
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="font-extrabold text-slate-900 truncate">{prop.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            <span className="font-bold">{prop.type}</span>
                            {prop.area ? ` • ${prop.area}m²` : ''}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Preço */}
                    <td className="p-4">
                      <p className="font-extrabold text-emerald-700">{formatBRL(prop.price)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        ID: <span className="font-bold">{String(prop.id).slice(0, 6)}</span>
                      </p>
                    </td>

                    {/* Localização */}
                    <td className="p-4 text-sm text-slate-600">
                      <p className="font-bold text-slate-700">
                        {prop.location?.city || '—'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {prop.location?.neighborhood || '—'}
                      </p>
                    </td>

                    {/* Ações */}
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        <Link
                          to={`/admin/imoveis/editar/${prop.id}`}
                          className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                          title="Editar"
                        >
                          <Icons.Edit size={18} className="text-slate-700" />
                        </Link>

                        <button
                          onClick={() => handleDelete(prop.id)}
                          className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors"
                          title="Excluir"
                        >
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
    </div>
  );
};

export default AdminProperties;
