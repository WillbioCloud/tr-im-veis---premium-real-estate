import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLeads } from '../hooks/useLeads';
import { useProperties } from '../hooks/useProperties';
import { Icons } from '../components/Icons';
import DashboardCalendar from '../components/DashboardCalendar';
import Loading from '../components/Loading';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  // Importante: useLeads agora consome o Contexto Global, garantindo sincronia
  const { leads, loading: leadsLoading } = useLeads();
  const { properties, loading: propsLoading } = useProperties();

  const isAdmin = user?.role === 'admin';
  const currentYear = new Date().getFullYear();

  const stats = useMemo(() => {
    // 1. Filtro de Segurança: Admin vê tudo, Corretor vê apenas seus dados
    const myLeads = isAdmin ? leads : leads.filter(l => l.agent_id === user?.id);
    const myProperties = isAdmin ? properties : properties.filter(p => p.agent_id === user?.id);

    // 2. Cálculo VGV Total (Apenas Admin vê o card, mas calculamos para garantir)
    // Consideramos 'closed' como venda realizada.
    const closedLeads = myLeads.filter(l => l.status === 'closed');
    const vgvTotal = closedLeads.reduce((acc, lead) => acc + (lead.deal_value || 0), 0);

    // 3. Cálculo VGV Anual (Vendas deste ano)
    const annualLeads = closedLeads.filter(l => {
      const date = new Date(l.updated_at || new Date()); // Usa updated_at ou created_at
      return date.getFullYear() === currentYear;
    });
    const vgvAnnual = annualLeads.reduce((acc, lead) => acc + (lead.deal_value || 0), 0);

    // 4. Portfólios (Imóveis Ativos e Disponíveis)
    const salePortfolio = myProperties
      .filter(p => p.listing_type === 'sale' && p.status === 'active')
      .reduce((acc, p) => acc + Number(p.price), 0);

    const rentPortfolio = myProperties
      .filter(p => p.listing_type === 'rent' && p.status === 'active')
      .reduce((acc, p) => acc + Number(p.price), 0);

    // 5. Funil de Vendas (Contagem por status)
    const funnel = {
      new: myLeads.filter(l => l.status === 'new').length,
      contacted: myLeads.filter(l => l.status === 'contacted').length,
      visiting: myLeads.filter(l => l.status === 'visiting').length,
      negotiating: myLeads.filter(l => l.status === 'negotiating').length,
      closed: myLeads.filter(l => l.status === 'closed').length,
    };

    return { vgvTotal, vgvAnnual, salePortfolio, rentPortfolio, funnel };
  }, [leads, properties, isAdmin, user?.id, currentYear]);

  if (leadsLoading || propsLoading) return <Loading />;

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Olá, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 dark:text-gray-400">
            Resumo de performance e resultados.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-dark-card px-4 py-2 rounded-lg border border-slate-200 dark:border-dark-border">
          <Icons.Calendar size={20} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-600 dark:text-gray-300">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Grid de KPIs - Cards Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

        {/* VGV Total - EXCLUSIVO ADMIN */}
        {isAdmin && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/10 rounded-xl">
                <Icons.TrendingUp size={24} className="text-emerald-400" />
              </div>
              <span className="text-xs font-medium bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">
                Total Histórico
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-1">VGV Total</p>
            <h3 className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.vgvTotal)}
            </h3>
          </div>
        )}

        {/* VGV Anual - VISÍVEL PARA TODOS */}
        <div className={`bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm ${!isAdmin ? 'lg:col-span-2' : ''}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <Icons.CalendarCheck size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">
              {currentYear}
            </span>
          </div>
          <p className="text-slate-500 dark:text-gray-400 text-sm mb-1">VGV Anual (Fechados)</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.vgvAnnual)}
          </h3>
        </div>

        {/* Portfólio de Venda - VISÍVEL PARA TODOS */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
              <Icons.Home size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-gray-400 text-sm mb-1">Portfólio de Venda</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.salePortfolio)}
          </h3>
        </div>

        {/* Portfólio de Aluguel - VISÍVEL PARA TODOS */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl">
              <Icons.Building size={24} className="text-indigo-600 dark:text-indigo-400" />
            </div>
          </div>
          <p className="text-slate-500 dark:text-gray-400 text-sm mb-1">Portfólio de Aluguel</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.rentPortfolio)}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* GRÁFICO DE FUNIL - VISÍVEL PARA TODOS */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Funil de Vendas</h3>
          <div className="grid grid-cols-5 gap-2 text-center h-48 items-end">
             {[
              { label: 'Novos', value: stats.funnel.new, color: 'bg-blue-500' },
              { label: 'Contato', value: stats.funnel.contacted, color: 'bg-indigo-500' },
              { label: 'Visita', value: stats.funnel.visiting, color: 'bg-purple-500' },
              { label: 'Proposta', value: stats.funnel.negotiating, color: 'bg-pink-500' },
              { label: 'Fechado', value: stats.funnel.closed, color: 'bg-emerald-500' },
            ].map((step, idx) => {
              // Altura relativa baseada no maior valor (para gráfico de barras)
              const maxVal = Math.max(stats.funnel.new, stats.funnel.contacted, stats.funnel.visiting, stats.funnel.negotiating, stats.funnel.closed, 1);
              const heightPerc = Math.max((step.value / maxVal) * 100, 15); // Mínimo de 15% para não sumir

              return (
                <div key={idx} className="flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="relative w-full flex items-end justify-center bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden h-full">
                    <div
                      className={`w-full ${step.color} transition-all duration-1000 group-hover:opacity-90 rounded-t-xl`}
                      style={{ height: `${heightPerc}%` }}
                    />
                    <span className="absolute bottom-2 font-bold text-slate-800 dark:text-white drop-shadow-md bg-white/50 dark:bg-black/50 px-2 rounded-full text-xs">
                      {step.value}
                    </span>
                  </div>
                  <span className="text-[10px] md:text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wider">{step.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calendário */}
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Agenda</h3>
          <DashboardCalendar />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
