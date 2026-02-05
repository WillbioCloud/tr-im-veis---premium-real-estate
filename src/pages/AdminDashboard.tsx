import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { Lead } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ properties: 0, leads: 0, salesValue: 0, visits: 0 });
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [sourceData, setSourceData] = useState<any[]>([]);

  useEffect(() => { fetchDashboardData(); }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { count: propertiesCount } = await supabase.from('properties').select('*', { count: 'exact', head: true });
      const { count: leadsCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
      const { data: allLeads } = await supabase.from('leads').select('*').order('created_at', { ascending: false });

      if (allLeads) {
        setRecentLeads(allLeads.slice(0, 5) as any);
        const visits = allLeads.filter(l => l.status === 'Visita Agendada').length;
        const closed = allLeads.filter(l => l.status === 'Fechado');
        const sales = closed.reduce((acc, curr) => acc + (curr.value || 0), 0);

        setStats({ properties: propertiesCount || 0, leads: leadsCount || 0, visits, salesValue: sales });

        const statusCounts: Record<string, number> = { 'Novo': 0, 'Qualificando': 0, 'Visita Agendada': 0, 'Proposta': 0, 'Fechado': 0, 'Perdido': 0 };
        allLeads.forEach((l: any) => { if (statusCounts[l.status] !== undefined) statusCounts[l.status]++; });

        setFunnelData([
          { name: 'Novos', value: statusCounts['Novo'], color: '#3b82f6' },
          { name: 'Atend.', value: statusCounts['Qualificando'], color: '#f59e0b' },
          { name: 'Visitas', value: statusCounts['Visita Agendada'], color: '#a855f7' },
          { name: 'Propostas', value: statusCounts['Proposta'], color: '#22c55e' },
          { name: 'Fechados', value: statusCounts['Fechado'], color: '#10b981' },
          { name: 'Perdidos', value: statusCounts['Perdido'], color: '#ef4444' },
        ]);

        const sources: Record<string, number> = {};
        allLeads.forEach((l: any) => { const src = l.source || 'Outros'; sources[src] = (sources[src] || 0) + 1; });
        setSourceData(Object.keys(sources).map((key, index) => ({
          name: key, value: sources[key], color: ['#c68a44', '#334155', '#94a3b8', '#64748b'][index % 4]
        })));
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  const statCards = [
    { label: 'Imóveis Ativos', value: stats.properties, icon: Icons.Building, color: 'bg-blue-500', darkColor: 'dark:bg-blue-600' },
    { label: 'Leads Totais', value: stats.leads, icon: Icons.Users, color: 'bg-green-500', darkColor: 'dark:bg-green-600' },
    { label: 'Vendas (Fechados)', value: formatCurrency(stats.salesValue), icon: Icons.DollarSign, color: 'bg-amber-500', darkColor: 'dark:bg-amber-600' },
    { label: 'Visitas Agendadas', value: stats.visits, icon: Icons.Calendar, color: 'bg-purple-500', darkColor: 'dark:bg-purple-600' },
  ];

  if (loading) return <div className="p-8 text-center animate-pulse text-gray-500 dark:text-gray-400">Carregando métricas...</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Visão Geral</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Métricas em tempo real da sua imobiliária.</p>
        </div>
        <button onClick={fetchDashboardData} className="text-sm bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm">
          <Icons.RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          // CARD: bg-white no claro, dark:bg-dark-card (slate-800) no escuro
          <div key={index} className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-1">
            <div className={`p-4 rounded-lg text-white shadow-lg shadow-gray-200 dark:shadow-none ${stat.color} ${stat.darkColor}`}>
              {stat.icon && <stat.icon size={24} />}
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border flex flex-col h-[400px]">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
            <Icons.TrendingUp size={20} className="text-brand-500" /> Funil de Vendas
          </h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnelData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fontSize: 12, fill: '#94a3b8'}} axisLine={false} tickLine={false} />
                <RechartsTooltip 
                   cursor={{fill: 'rgba(255,255,255,0.1)'}}
                   contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {funnelData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border flex flex-col h-[400px]">
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
            <Icons.PieChart size={20} className="text-slate-500" /> Origem dos Leads
          </h3>
          <div className="flex-1 w-full">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sourceData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {sourceData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff'}} />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
             </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Leads Recentes */}
      <div className="bg-white dark:bg-dark-card p-6 rounded-xl shadow-sm border border-gray-100 dark:border-dark-border">
        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2 mb-6">
          <Icons.Activity size={20} className="text-blue-500" /> Atividade Recente
        </h3>
        <div className="space-y-4">
          {recentLeads.length === 0 && <p className="text-gray-400 text-center text-sm py-4">Nenhum lead recente.</p>}
          {recentLeads.map((lead) => (
            <div key={lead.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 rounded-lg transition-colors border-b border-gray-50 dark:border-slate-700 last:border-0 group cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 flex items-center justify-center font-bold text-sm">
                  {lead.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-slate-800 dark:text-white text-sm">{lead.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(lead.createdAt || lead.created_at || '').toLocaleDateString('pt-BR')} • {lead.source}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                   lead.status === 'Novo' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' :
                   lead.status === 'Fechado' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'
               }`}>
                 {lead.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;