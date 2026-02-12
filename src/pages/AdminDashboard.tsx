import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { LeadStatus } from '../types';

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(n || 0);

const getLevelTitle = (xp: number) => {
  if (xp >= 4000) return 'Corretor Elite';
  if (xp >= 2500) return 'Corretor Sênior';
  if (xp >= 1200) return 'Corretor Pleno';
  return 'Corretor Júnior';
};

const getLevelProgress = (xp: number) => {
  const checkpoints = [0, 1200, 2500, 4000, 6000];
  const currentLevel = checkpoints.findLastIndex((point) => xp >= point);
  const start = checkpoints[Math.max(currentLevel, 0)] ?? 0;
  const end = checkpoints[Math.min(currentLevel + 1, checkpoints.length - 1)] ?? 6000;
  const progress = Math.min(100, ((xp - start) / Math.max(1, end - start)) * 100);
  return { progress, nextAt: end };
};

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [loading, setLoading] = useState(true);

  const [adminStats, setAdminStats] = useState({
    totalLeads: 0,
    totalProperties: 0,
    totalVgv: 0,
    activeDeals: 0,
  });

  const [corretorStats, setCorretorStats] = useState({
    myPendingTasks: 0,
    myHotLeads: 0,
    myXp: 0,
    myOpenLeads: 0,
  });

  const [hotLeads, setHotLeads] = useState<any[]>([]);
  const [agenda, setAgenda] = useState<any[]>([]);
  const [agentsPerformance, setAgentsPerformance] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [user?.id, isAdmin]);

  const fetchDashboardData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      if (isAdmin) {
        const [propertiesRes, leadsRes, activeDealsRes, hotLeadsRes, agentsRes] = await Promise.all([
          supabase.from('properties').select('id, price, listing_type, agent_id'),
          supabase.from('leads').select('id', { count: 'exact', head: true }),
          supabase.from('leads').select('id', { count: 'exact', head: true }).not('status', 'in', `(${LeadStatus.LOST},${LeadStatus.CLOSED})`),
          supabase
            .from('leads')
            .select('id, name, status, lead_score, created_at, property:properties(title)')
            .order('lead_score', { ascending: false })
            .limit(6),
          supabase.from('profiles').select('id, name, role').eq('role', 'corretor'),
        ]);

        const properties = propertiesRes.data || [];
        const totalVgv = properties
          .filter((property: any) => property.listing_type !== 'rent')
          .reduce((acc: number, property: any) => acc + Number(property.price || 0), 0);

        const perfRows = (agentsRes.data || []).map((agent: any) => {
          const agentProperties = properties.filter((property: any) => property.agent_id === agent.id).length;
          return {
            id: agent.id,
            name: agent.name,
            properties: agentProperties,
          };
        });

        const { data: leadsByAgent } = await supabase.from('leads').select('assigned_to, status');
        const perf = perfRows.map((row: any) => {
          const myLeads = (leadsByAgent || []).filter((lead: any) => lead.assigned_to === row.id);
          const won = myLeads.filter((lead: any) => lead.status === LeadStatus.CLOSED).length;
          return {
            ...row,
            leads: myLeads.length,
            winRate: myLeads.length ? Math.round((won / myLeads.length) * 100) : 0,
          };
        });

        setAdminStats({
          totalProperties: properties.length,
          totalLeads: leadsRes.count || 0,
          activeDeals: activeDealsRes.count || 0,
          totalVgv,
        });
        setHotLeads(hotLeadsRes.data || []);
        setAgentsPerformance(perf);
      } else {
        const [profileRes, hotLeadsRes, tasksRes, openLeadsRes] = await Promise.all([
          supabase.from('profiles').select('xp_points').eq('id', user.id).maybeSingle(),
          supabase
            .from('leads')
            .select('id, name, status, lead_score, property:properties(title)')
            .eq('assigned_to', user.id)
            .order('lead_score', { ascending: false })
            .limit(5),
          supabase
            .from('tasks')
            .select('id, title, due_date, completed, type')
            .eq('user_id', user.id)
            .eq('completed', false)
            .order('due_date', { ascending: true })
            .limit(6),
          supabase
            .from('leads')
            .select('id', { count: 'exact', head: true })
            .eq('assigned_to', user.id)
            .not('status', 'in', `(${LeadStatus.LOST},${LeadStatus.CLOSED})`),
        ]);

        const xp = Number(profileRes.data?.xp_points || 0);

        setCorretorStats({
          myXp: xp,
          myHotLeads: (hotLeadsRes.data || []).filter((lead: any) => Number(lead.lead_score || 0) >= 12).length,
          myPendingTasks: (tasksRes.data || []).length,
          myOpenLeads: openLeadsRes.count || 0,
        });
        setHotLeads(hotLeadsRes.data || []);
        setAgenda(tasksRes.data || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const xpMeta = useMemo(() => getLevelProgress(corretorStats.myXp), [corretorStats.myXp]);

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-3">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-800">
            Olá, {user?.name?.split(' ')[0] || 'Gestor'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isAdmin
              ? 'Visão executiva completa da operação imobiliária.'
              : 'Seu cockpit de produtividade comercial e atendimento.'}
          </p>
        </div>
        <div className="text-sm text-slate-400 font-medium bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {isAdmin ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">VGV Total</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{loading ? '...' : formatBRL(adminStats.totalVgv)}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">Leads Totais</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{loading ? '...' : adminStats.totalLeads}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">Imóveis Cadastrados</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{loading ? '...' : adminStats.totalProperties}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">Negócios em Andamento</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{loading ? '...' : adminStats.activeDeals}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">Desempenho dos Corretores</h3>
                <button onClick={() => navigate('/admin/leads')} className="text-sm font-bold text-brand-700 hover:underline">Gerenciar Leads</button>
              </div>

              <div className="space-y-3">
                {agentsPerformance.map((agent) => (
                  <div key={agent.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{agent.name}</p>
                      <p className="text-xs text-slate-500">{agent.properties} imóveis • {agent.leads} leads</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600">Win rate: {agent.winRate}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Icons.Flame size={18} className="text-orange-500" />
                Leads Quentes
              </h3>
              <div className="space-y-3">
                {hotLeads.map((lead) => (
                  <div key={lead.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-semibold text-slate-800">{lead.name}</p>
                    <p className="text-xs text-slate-500 truncate">{lead.property?.title || 'Interesse geral'}</p>
                    <p className="text-xs font-bold text-orange-600 mt-1">Score: {lead.lead_score || 0}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">Leads Abertos</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{loading ? '...' : corretorStats.myOpenLeads}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">Leads Quentes</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{loading ? '...' : corretorStats.myHotLeads}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">Tarefas Pendentes</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{loading ? '...' : corretorStats.myPendingTasks}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-sm text-slate-500">XP Atual</p>
              <h3 className="text-3xl font-bold text-slate-900 mt-1">{loading ? '...' : corretorStats.myXp}</h3>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <p className="text-slate-300 text-sm">Nível atual</p>
                <h3 className="text-2xl font-bold">{getLevelTitle(corretorStats.myXp)}</h3>
              </div>
              <Icons.TrendingUp className="text-brand-400" />
            </div>
            <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-amber-400 to-yellow-300" style={{ width: `${xpMeta.progress}%` }} />
            </div>
            <p className="text-xs text-slate-300 mt-2">{corretorStats.myXp} XP • Próximo nível em {xpMeta.nextAt} XP</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800">Minha Agenda</h3>
                <button onClick={() => navigate('/admin/tarefas')} className="text-sm font-bold text-brand-700 hover:underline">Ver tarefas</button>
              </div>
              <div className="space-y-3">
                {agenda.length === 0 ? (
                  <p className="text-slate-400 text-sm">Nenhuma tarefa pendente.</p>
                ) : (
                  agenda.map((task) => (
                    <div key={task.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                      <p className="font-semibold text-slate-800">{task.title}</p>
                      <p className="text-xs text-slate-500">{new Date(task.due_date).toLocaleString('pt-BR')}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
              <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Icons.Flame size={18} className="text-orange-500" />
                Meus Leads Quentes
              </h3>
              <div className="space-y-3">
                {hotLeads.map((lead) => (
                  <div key={lead.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="font-semibold text-slate-800">{lead.name}</p>
                    <p className="text-xs text-slate-500 truncate">{lead.property?.title || 'Interesse geral'}</p>
                    <p className="text-xs font-bold text-orange-600 mt-1">Score: {lead.lead_score || 0}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;