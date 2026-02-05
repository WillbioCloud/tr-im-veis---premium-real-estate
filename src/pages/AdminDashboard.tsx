import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { LeadStatus } from '../types';

type KPI = {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accent: 'green' | 'purple' | 'navy';
};

const formatBRL = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

const AdminDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);

  // Counts
  const [leadsTotal, setLeadsTotal] = useState(0);
  const [leadsNew, setLeadsNew] = useState(0);
  const [leadsHot, setLeadsHot] = useState(0);

  const [propertiesTotal, setPropertiesTotal] = useState(0);

  const [tasksOpen, setTasksOpen] = useState(0);

  const [closedValue, setClosedValue] = useState(0);

  // Simple list
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [topLeads, setTopLeads] = useState<any[]>([]);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      // === LEADS ===
      const { data: leadsData } = await supabase
        .from('leads')
        .select('id,status,score,value,created_at,name,phone,source')
        .order('created_at', { ascending: false });

      const leads = (leadsData || []) as any[];

      setLeadsTotal(leads.length);
      setLeadsNew(leads.filter(l => l.status === LeadStatus.NEW).length);
      setLeadsHot(leads.filter(l => (l.score ?? 50) >= 80).length);

      // closed sum
      const sumClosed = leads
        .filter(l => l.status === LeadStatus.CLOSED)
        .reduce((acc, l) => acc + (Number(l.value) || 0), 0);
      setClosedValue(sumClosed);

      // recent leads
      setRecentLeads(leads.slice(0, 6));

      // top leads by score
      const top = [...leads]
        .sort((a, b) => (Number(b.score ?? 50) - Number(a.score ?? 50)))
        .slice(0, 6);
      setTopLeads(top);

      // === PROPERTIES ===
      const { count: propCount } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true });

      setPropertiesTotal(propCount || 0);

      // === TASKS ===
      // Se sua tabela tasks tiver "completed"
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id,completed');

      const tasks = (tasksData || []) as any[];
      setTasksOpen(tasks.filter(t => !t.completed).length);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const kpis: KPI[] = useMemo(() => {
    return [
      {
        label: 'Leads Totais',
        value: String(leadsTotal),
        sub: `${leadsNew} novos`,
        icon: Icons.Users,
        accent: 'navy',
      },
      {
        label: 'Leads Quentes',
        value: String(leadsHot),
        sub: 'Score ≥ 80',
        icon: Icons.TrendingUp,
        accent: 'green',
      },
      {
        label: 'Imóveis Ativos',
        value: String(propertiesTotal),
        sub: 'Cadastro total',
        icon: Icons.Building,
        accent: 'purple',
      },
      {
        label: 'Tarefas Abertas',
        value: String(tasksOpen),
        sub: 'Pendências',
        icon: Icons.CheckSquare,
        accent: 'navy',
      },
      {
        label: 'Vendas Fechadas',
        value: formatBRL(closedValue),
        sub: 'Somatório (CLOSED)',
        icon: Icons.DollarSign,
        accent: 'green',
      },
    ];
  }, [leadsTotal, leadsNew, leadsHot, propertiesTotal, tasksOpen, closedValue]);

  const accentStyles = (accent: KPI['accent']) => {
    if (accent === 'green') {
      return {
        pill: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        dot: 'bg-crm-primary',
        icon: 'text-emerald-600',
      };
    }
    if (accent === 'purple') {
      return {
        pill: 'bg-purple-50 text-purple-700 border border-purple-200',
        dot: 'bg-crm-secondary',
        icon: 'text-purple-600',
      };
    }
    return {
      pill: 'bg-slate-50 text-slate-700 border border-slate-200',
      dot: 'bg-crm-navy',
      icon: 'text-slate-700',
    };
  };

  const scorePill = (score: number) => {
    if (score >= 80) return 'bg-rose-50 text-rose-700 border border-rose-200';
    if (score >= 40) return 'bg-amber-50 text-amber-700 border border-amber-200';
    return 'bg-sky-50 text-sky-700 border border-sky-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-crm-text">Dashboard</h1>
          <p className="text-sm text-crm-muted">Resumo rápido do seu funil e operação.</p>
        </div>

        <button
          onClick={loadDashboard}
          className="crm-btn-ghost border border-crm-border bg-white hover:bg-crm-bg"
        >
          <span className="inline-flex items-center gap-2">
            <Icons.RefreshCw size={16} />
            Atualizar
          </span>
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {kpis.map((kpi) => {
          const s = accentStyles(kpi.accent);
          const Icon = kpi.icon;

          return (
            <div key={kpi.label} className="crm-card p-4">
              <div className="flex items-start justify-between">
                <div className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase ${s.pill}`}>
                  {kpi.label}
                </div>

                <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-crm-bg border border-crm-border`}>
                  <Icon size={18} className={s.icon} />
                </div>
              </div>

              <div className="mt-4">
                <div className="text-2xl font-extrabold text-crm-text">{kpi.value}</div>
                {kpi.sub && <div className="text-xs font-bold text-crm-muted mt-1">{kpi.sub}</div>}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                <span className="text-[11px] font-extrabold text-crm-muted uppercase tracking-widest">
                  Status
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent leads */}
        <div className="crm-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="crm-section-label">Novos Leads</div>
              <div className="text-lg font-extrabold text-crm-text">Últimos registros</div>
            </div>
            <span className="crm-pill">{recentLeads.length} itens</span>
          </div>

          {loading ? (
            <div className="p-6 text-center text-crm-muted animate-pulse">Carregando…</div>
          ) : recentLeads.length === 0 ? (
            <div className="p-6 text-center text-crm-muted italic">Sem leads ainda.</div>
          ) : (
            <div className="space-y-3">
              {recentLeads.map((l) => (
                <div key={l.id} className="bg-white border border-crm-border rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-crm-bg border border-crm-border flex items-center justify-center">
                    <Icons.User size={18} className="text-crm-muted" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-crm-text truncate">{l.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${scorePill(Number(l.score ?? 50))}`}>
                        Score {Number(l.score ?? 50)}
                      </span>
                    </div>
                    <p className="text-xs text-crm-muted truncate">{l.source || 'Site'} • {l.phone || ''}</p>
                  </div>

                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-crm-muted">
                    {new Date(l.created_at).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top leads */}
        <div className="crm-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="crm-section-label">Prioridade</div>
              <div className="text-lg font-extrabold text-crm-text">Leads com maior score</div>
            </div>
            <span className="crm-pill">{topLeads.length} itens</span>
          </div>

          {loading ? (
            <div className="p-6 text-center text-crm-muted animate-pulse">Carregando…</div>
          ) : topLeads.length === 0 ? (
            <div className="p-6 text-center text-crm-muted italic">Sem dados ainda.</div>
          ) : (
            <div className="space-y-3">
              {topLeads.map((l) => (
                <div key={l.id} className="bg-white border border-crm-border rounded-xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                    <Icons.Flame size={18} className="text-emerald-700" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-crm-text truncate">{l.name}</p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${scorePill(Number(l.score ?? 50))}`}>
                        {Number(l.score ?? 50)}
                      </span>
                    </div>
                    <p className="text-xs text-crm-muted truncate">
                      {l.value ? `Potencial: ${formatBRL(Number(l.value))}` : 'Sem valor definido'}
                    </p>
                  </div>

                  <button
                    className="px-3 py-2 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                    onClick={() => {
                      // Só navegação simples — se você quiser abrir sidebar, eu integro depois
                      window.location.href = '/admin/leads';
                    }}
                    title="Ir para CRM"
                  >
                    Ver
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
