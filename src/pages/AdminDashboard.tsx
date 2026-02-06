import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { TOOLTIPS } from '../constants/tooltips';
import { LeadStatus } from '../types';

// Função auxiliar para formatar dinheiro
const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  // Estado unificado para estatísticas
  const [stats, setStats] = useState({
    totalProperties: 0,
    totalLeads: 0,
    activeDeals: 0,
    conversionRate: 0
  });

  const [recentLeads, setRecentLeads] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Buscas Paralelas para Performance
      const [propsResponse, leadsResponse, activeLeadsResponse] = await Promise.all([
        supabase.from('properties').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true })
          .not('status', 'in', `(${LeadStatus.LOST},${LeadStatus.CLOSED})`) // Leads ativos
      ]);

      // 2. Busca Leads Recentes (Top 5)
      const { data: recent } = await supabase
        .from('leads')
        .select(`
          id, name, score, status, created_at,
          property:properties(title)
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalProperties: propsResponse.count || 0,
        totalLeads: leadsResponse.count || 0,
        activeDeals: activeLeadsResponse.count || 0,
        conversionRate: 12.5 // Simulação (pode ser calculado depois: fechados / total * 100)
      });

      if (recent) setRecentLeads(recent);

    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      
      {/* === CABEÇALHO === */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-800">
            Olá, {user?.name?.split(' ')[0] || 'Gestor'}
          </h1>
          <p className="text-slate-500 mt-1">Aqui está o panorama da sua imobiliária hoje.</p>
        </div>
        <div className="text-sm text-slate-400 font-medium bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* === KPIS (CARDS DE MÉTRICAS) === */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Imóveis */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
              <Icons.Home size={24} />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">+2 novos</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800 relative z-10">{loading ? '...' : stats.totalProperties}</h3>
          <p className="text-sm text-slate-500 relative z-10">Imóveis Ativos</p>
          <Icons.Home className="absolute -bottom-4 -right-4 text-slate-50 w-32 h-32 rotate-[-15deg] group-hover:rotate-0 transition-transform duration-500" />
        </div>

        {/* Leads Totais */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform">
              <Icons.Users size={24} />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">+12%</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800 relative z-10">{loading ? '...' : stats.totalLeads}</h3>
          <p className="text-sm text-slate-500 relative z-10">Total de Leads</p>
          <Icons.Users className="absolute -bottom-4 -right-4 text-slate-50 w-32 h-32 rotate-[-15deg] group-hover:rotate-0 transition-transform duration-500" />
        </div>

        {/* Negócios Ativos */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-xl group-hover:scale-110 transition-transform">
              <Icons.DollarSign size={24} />
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">Em andamento</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800 relative z-10">{loading ? '...' : stats.activeDeals}</h3>
          <p className="text-sm text-slate-500 relative z-10">Negociações Abertas</p>
          <Icons.DollarSign className="absolute -bottom-4 -right-4 text-slate-50 w-32 h-32 rotate-[-15deg] group-hover:rotate-0 transition-transform duration-500" />
        </div>

        {/* Taxa de Conversão */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="flex justify-between items-start mb-4 relative z-10">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl group-hover:scale-110 transition-transform">
              <Icons.TrendingUp size={24} />
            </div>
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">+2.1%</span>
          </div>
          <h3 className="text-3xl font-bold text-slate-800 relative z-10">{loading ? '...' : stats.conversionRate}%</h3>
          <p className="text-sm text-slate-500 relative z-10">Taxa de Conversão</p>
          <Icons.TrendingUp className="absolute -bottom-4 -right-4 text-slate-50 w-32 h-32 rotate-[-15deg] group-hover:rotate-0 transition-transform duration-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* === COLUNA ESQUERDA: LEADS RECENTES === */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
              <Icons.Clock size={20} className="text-brand-600" />
              Últimos Leads
            </h3>
            <button 
              onClick={() => navigate('/admin/leads')}
              className="text-sm text-brand-600 font-bold hover:underline"
            >
              Ver todos
            </button>
          </div>

          <div className="space-y-4">
            {recentLeads.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Nenhum lead recente.</p>
            ) : (
              recentLeads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 hover:border-brand-200 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${
                      lead.score > 70 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : 'bg-gradient-to-br from-slate-400 to-slate-500'
                    }`}>
                      {lead.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{lead.name}</p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">
                        {lead.property?.title || 'Interesse Geral'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase mb-1 ${
                      lead.status === 'Novo' ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-600'
                    }`}>
                      {lead.status}
                    </span>
                    <p className="text-xs font-bold text-brand-600">{lead.score} pts</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* === COLUNA DIREITA: EXPLICAÇÃO DO SCORE (PREMIUM) === */}
        <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-xl text-white p-8 relative overflow-hidden flex flex-col justify-center">
          {/* Elemento Decorativo de Fundo */}
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Icons.Activity size={180} />
          </div>
          
          <h3 className="font-serif font-bold text-2xl mb-3 flex items-center gap-2 relative z-10">
            <Icons.Info className="text-brand-400" />
            {TOOLTIPS.dashboard.scoreHelp.title}
          </h3>
          
          <p className="text-slate-300 text-sm mb-8 leading-relaxed relative z-10">
            {TOOLTIPS.dashboard.scoreHelp.description}
          </p>

          <div className="space-y-4 relative z-10">
            {TOOLTIPS.dashboard.scoreHelp.criteria.map((criteria, index) => (
              <div 
                key={index} 
                className="flex items-center gap-3 bg-white/5 p-3 rounded-xl backdrop-blur-md border border-white/10 hover:bg-white/10 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-brand-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]"></div>
                <span className="text-sm font-medium text-slate-200">{criteria}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-center relative z-10">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Inteligência Artificial TR Imóveis
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminDashboard;