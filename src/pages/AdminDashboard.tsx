import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // Importe o cliente
import { Icons } from '../components/Icons';
import { Lead, Property } from '../types';

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    properties: 0,
    leads: 0,
    salesValue: 0,
    visits: 0
  });
  const [recentLeads, setRecentLeads] = useState<Lead[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // 1. Total de Imóveis
      const { count: propertiesCount } = await supabase
        .from('properties')
        .select('*', { count: 'exact', head: true });

      // 2. Total de Leads (Geral)
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      // 3. Leads em "Visita" (Para o card de Visitas Agendadas)
      const { count: visitsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Visita Agendada'); // Certifique-se que a string bate com o Enum LeadStatus

      // 4. Leads Recentes (Para a lista lateral)
      const { data: leadsData } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // 5. Valor em "Fechados" (Soma do campo 'value' dos leads com status 'Fechado')
      // Nota: Isso requer que você tenha leads fechados com valor preenchido no banco
      const { data: closedLeads } = await supabase
        .from('leads')
        .select('value')
        .eq('status', 'Fechado');
      
      const totalSales = closedLeads?.reduce((acc, lead) => acc + (lead.value || 0), 0) || 0;

      setStats({
        properties: propertiesCount || 0,
        leads: leadsCount || 0,
        visits: visitsCount || 0,
        salesValue: totalSales
      });

      if (leadsData) setRecentLeads(leadsData as any);

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);

  // Cards de Estatísticas Configurados
  const statCards = [
    { label: 'Imóveis Ativos', value: stats.properties, icon: Icons.Building, color: 'bg-blue-500' },
    { label: 'Leads Totais', value: stats.leads, icon: Icons.Users, color: 'bg-green-500' },
    { label: 'Vendas (Fechados)', value: formatCurrency(stats.salesValue), icon: Icons.DollarSign, color: 'bg-amber-500' },
    { label: 'Visitas Agendadas', value: stats.visits, icon: Icons.Calendar, color: 'bg-purple-500' },
  ];

  if (loading) return <div className="p-8 text-center animate-pulse">Carregando métricas...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
          <p className="text-sm text-gray-500">Métricas em tempo real da sua imobiliária.</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors shadow-sm"
        >
          <Icons.RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all hover:-translate-y-1">
            <div className={`p-4 rounded-lg text-white shadow-lg shadow-gray-200 ${stat.color}`}>
              {stat.icon && <stat.icon size={24} />}
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Seção Principal (Gráfico + Lista) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico Placeholder (Fase C) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Icons.TrendingUp size={20} className="text-blue-500" />
              Performance de Vendas
            </h3>
            <select className="text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1 outline-none">
              <option>Últimos 30 dias</option>
              <option>Este Ano</option>
            </select>
          </div>
          
          <div className="flex-1 flex items-center justify-center bg-gray-50 rounded-lg border border-dashed border-gray-200 relative group cursor-pointer overflow-hidden">
             <div className="text-center z-10">
               <Icons.BarChart size={48} className="mx-auto mb-2 text-gray-300" />
               <p className="text-gray-400 text-sm font-medium">Gráfico de Conversão</p>
               <span className="text-xs text-brand-500 bg-brand-50 px-2 py-1 rounded mt-2 inline-block">Em breve na Versão Pro</span>
             </div>
             <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/40 group-hover:scale-105 transition-transform duration-1000"></div>
          </div>
        </div>

        {/* Lista de Leads Recentes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Icons.Activity size={20} className="text-amber-500" />
              Leads Recentes
            </h3>
          </div>
          <div className="space-y-4">
            {recentLeads.length === 0 && <p className="text-gray-400 text-center text-sm py-4">Nenhum lead recente.</p>}
            
            {recentLeads.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer border-b border-gray-50 last:border-0 group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-sm">
                    {lead.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-slate-800 text-sm truncate w-32">{lead.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      {new Date(lead.createdAt || lead.created_at || '').toLocaleDateString('pt-BR')}
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      {lead.source}
                    </p>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full ${
                  lead.status === 'Novo' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                }`} title={lead.status}></div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;