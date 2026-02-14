import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLeads } from '../hooks/useLeads';
import { useProperties } from '../hooks/useProperties';
import { Icons } from '../components/Icons';
import DashboardCalendar from '../components/DashboardCalendar';
import Loading from '../components/Loading';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const { leads, loading: leadsLoading } = useLeads();
  const { properties, loading: propsLoading } = useProperties();

  const isAdmin = user?.role === 'admin';
  const currentYear = new Date().getFullYear();

  const stats = useMemo(() => {
    const myLeads = isAdmin ? leads : leads.filter(l => l.agent_id === user?.id);
    const closedLeads = myLeads.filter(l => l.status === 'closed');
    const vgvTotal = closedLeads.reduce((acc, lead) => acc + (lead.deal_value || 0), 0);

    const annualLeads = closedLeads.filter(l => {
      const date = new Date(l.updated_at || new Date());
      return date.getFullYear() === currentYear;
    });
    const vgvAnnual = annualLeads.reduce((acc, lead) => acc + (lead.deal_value || 0), 0);

    const myProperties = isAdmin ? properties : properties.filter(p => p.agent_id === user?.id);
    const salePortfolio = myProperties
      .filter(p => p.listing_type === 'sale' && p.status === 'active')
      .reduce((acc, p) => acc + Number(p.price), 0);
      
    const rentPortfolio = myProperties
      .filter(p => p.listing_type === 'rent' && p.status === 'active')
      .reduce((acc, p) => acc + Number(p.price), 0);

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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
            Olá, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 dark:text-gray-400">Aqui está o resumo dos seus resultados.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {isAdmin && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl text-white shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-white/10 rounded-xl"><Icons.TrendingUp size={24} className="text-emerald-400" /></div>
              <span className="text-xs font-medium bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">Total Geral</span>
            </div>
            <p className="text-slate-400 text-sm mb-1">VGV Total</p>
            <h3 className="text-2xl font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.vgvTotal)}</h3>
          </div>
        )}
        <div className={`bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm ${!isAdmin ? 'md:col-span-2 lg:col-span-1' : ''}`}>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl"><Icons.CalendarCheck size={24} className="text-blue-600 dark:text-blue-400" /></div>
            <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-1 rounded-full">{currentYear}</span>
          </div>
          <p className="text-slate-500 dark:text-gray-400 text-sm mb-1">VGV Anual (Fechados)</p>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.vgvAnnual)}</h3>
        </div>
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm">
           <p className="text-slate-500 mb-1">Portfólio Venda</p>
           <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.salePortfolio)}</h3>
        </div>
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm">
           <p className="text-slate-500 mb-1">Portfólio Aluguel</p>
           <h3 className="text-2xl font-bold text-slate-800 dark:text-white">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(stats.rentPortfolio)}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CARD DE FUNIL DE VENDA */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-6">Funil de Vendas</h3>
          <div className="grid grid-cols-5 gap-2 text-center">
             {[
              { label: 'Novos', value: stats.funnel.new, color: 'bg-blue-500' },
              { label: 'Contato', value: stats.funnel.contacted, color: 'bg-indigo-500' },
              { label: 'Visita', value: stats.funnel.visiting, color: 'bg-purple-500' },
              { label: 'Proposta', value: stats.funnel.negotiating, color: 'bg-pink-500' },
              { label: 'Fechado', value: stats.funnel.closed, color: 'bg-emerald-500' },
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2 group">
                <div className="relative w-full h-32 flex items-end justify-center bg-slate-50 dark:bg-slate-800 rounded-xl overflow-hidden">
                  <div className={`w-full ${step.color} transition-all duration-1000`} style={{ height: `${stats.funnel.new ? (step.value / stats.funnel.new) * 100 : 0}%` }} />
                  <span className="absolute bottom-2 font-bold text-slate-800 dark:text-white">{step.value}</span>
                </div>
                <span className="text-xs font-medium text-slate-500">{step.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-dark-border shadow-sm">
          <DashboardCalendar />
        </div>
      </div>
    </div>
  );
};
export default AdminDashboard;
