import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, Task, TimelineEvent, LeadStatus, Property } from '../types';
import { Icons } from './Icons';

interface LeadDetailsSidebarProps {
  lead: Lead;
  onClose: () => void;
  onUpdate: () => void;
  initialTab?: 'info' | 'activity' | 'timeline' | 'matches';
}

interface Template {
  id: string;
  title: string;
  content: string;
}

type TabKey = 'info' | 'activity' | 'timeline';

const statusBadge = (status: LeadStatus) => {
  // Bem “SaaS”: badges suaves e legíveis
  switch (status) {
    case LeadStatus.NEW:
      return 'bg-sky-50 text-sky-700 border border-sky-200';
    case LeadStatus.CLOSED:
      return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    case LeadStatus.LOST:
      return 'bg-rose-50 text-rose-700 border border-rose-200';
    case LeadStatus.PROPOSAL:
      return 'bg-indigo-50 text-indigo-700 border border-indigo-200';
    case LeadStatus.VISIT:
      return 'bg-purple-50 text-purple-700 border border-purple-200';
    default:
      return 'bg-amber-50 text-amber-700 border border-amber-200';
  }
};

const LeadDetailsSidebar: React.FC<LeadDetailsSidebarProps> = ({
  lead,
  onClose,
  onUpdate,
  initialTab = 'info'
}) => {

  // Tabs
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'timeline' | 'matches'>(initialTab);
    
    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);


  // Dados CRM
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [matches, setMatches] = useState<Property[]>([]);
  const [originProperty, setOriginProperty] = useState<Property | null>(null);
  const [viewedProperties, setViewedProperties] = useState<Property[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Form estados
  const [newTaskText, setNewTaskText] = useState('');
  const [newNote, setNewNote] = useState('');

  // Templates WhatsApp
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const leadPhoneClean = useMemo(() => (lead.phone || '').replace(/\D/g, ''), [lead.phone]);

  // ===== Fetch principal =====
  useEffect(() => {
    if (!lead?.id) return;
    fetchFullLeadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);

  const fetchFullLeadData = async () => {
    // 1) Tasks
    const { data: tasksData } = await supabase
      .from('tasks')
      .select('*')
      .eq('lead_id', lead.id)
      .order('due_date', { ascending: true });
    if (tasksData) setTasks(tasksData as any);

    // 2) Timeline
    const { data: timelineData } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
    if (timelineData) setTimeline(timelineData as any);

    // 3) Templates
    const { data: tplData } = await supabase.from('message_templates').select('*').eq('active', true);
    if (tplData) setTemplates(tplData as any);

    // 4) Imóvel de origem
    const propId = lead.propertyId || (lead as any).property_id;
    if (propId) {
      const { data: origin } = await supabase.from('properties').select('*').eq('id', propId).single();
      if (origin) {
        setOriginProperty(origin as any);
        fetchMatches(origin as any);
      }
    } else {
      setOriginProperty(null);
      setMatches([]);
    }

    // 5) Histórico (lead_interests)
    const { data: interests } = await supabase
      .from('lead_interests')
      .select('property:properties(*)')
      .eq('lead_id', lead.id);

    if (interests) {
      const props = (interests as any[])
        .map((i) => i.property)
        .filter(Boolean) as Property[];

      // remove duplicados por id
      const unique = Array.from(new Map(props.map((p) => [p.id, p])).values());
      setViewedProperties(unique);
    } else {
      setViewedProperties([]);
    }
  };

  const fetchMatches = async (origin: Property) => {
    setLoadingMatches(true);
    try {
      const minPrice = origin.price * 0.8;
      const maxPrice = origin.price * 1.2;

      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('location->>city', origin.location?.city || (origin as any).city)
        .eq('type', origin.type)
        .neq('id', origin.id)
        .gte('price', minPrice)
        .lte('price', maxPrice)
        .limit(5);

      if (data) setMatches(data as any);
    } catch (err) {
      console.error('Erro no matching:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  // ===== Timeline helpers =====
  const addTimelineLog = async (type: TimelineEvent['type'], description: string) => {
    await supabase.from('timeline_events').insert([{ lead_id: lead.id, type, description }]);
    const { data } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });
    if (data) setTimeline(data as any);
  };

  // ===== WhatsApp =====
  const openWhatsAppDirectly = () => {
    if (!leadPhoneClean) return;
    window.open(`https://wa.me/${leadPhoneClean}`, '_blank');
  };

  const handleWhatsAppClick = () => {
    if (templates.length > 0) setShowTemplateModal(true);
    else openWhatsAppDirectly();
  };

  const sendTemplate = async (template: Template) => {
    if (!leadPhoneClean) return;

    let message = template.content;
    message = message.replace(/{nome}/g, lead.name.split(' ')[0]);
    message = message.replace(/{imovel}/g, originProperty?.title || 'imóvel');

    const url = `https://wa.me/${leadPhoneClean}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    await addTimelineLog('whatsapp', `Enviou msg: ${template.title}`);

    // automação: move status se era Novo
    if (lead.status === LeadStatus.NEW) {
      const { error } = await supabase.from('leads').update({ status: LeadStatus.QUALIFYING }).eq('id', lead.id);
      if (!error) {
        onUpdate();
        await addTimelineLog('status_change', 'Status alterado automaticamente para Em Atendimento');
      }
    }

    setShowTemplateModal(false);
  };

  // ===== Tasks =====
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;

    const { error } = await supabase.from('tasks').insert([
      {
        title: newTaskText,
        lead_id: lead.id,
        type: 'call',
        due_date: new Date().toISOString(),
        completed: false
      }
    ]);

    if (!error) {
      setNewTaskText('');
      const { data } = await supabase
        .from('tasks')
        .select('*')
        .eq('lead_id', lead.id)
        .order('due_date', { ascending: true });
      if (data) setTasks(data as any);
      await addTimelineLog('system', `Criou a tarefa: ${newTaskText}`);
    }
  };

  const toggleTask = async (task: Task) => {
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('lead_id', lead.id)
      .order('due_date', { ascending: true });
    if (data) setTasks(data as any);

    if (!task.completed) await addTimelineLog('system', `Concluiu a tarefa: ${task.title}`);
  };

  // ===== Notes =====
  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addTimelineLog('note', newNote);
    setNewNote('');
  };

  // ===== Lead quick fields =====
  const updateLeadValue = async (field: string, value: any) => {
    await supabase.from('leads').update({ [field]: value }).eq('id', lead.id);
    onUpdate();
  };

  const shareProperty = async (property: Property) => {
    if (!leadPhoneClean) return;
    const text = `Olá ${lead.name.split(' ')[0]}, encontrei este outro imóvel que tem o perfil que você procura: ${window.location.origin}/imoveis/${property.slug}`;
    window.open(`https://wa.me/${leadPhoneClean}?text=${encodeURIComponent(text)}`, '_blank');
    await addTimelineLog('whatsapp', `Enviou sugestão: ${property.title}`);
  };

  // ===== Render =====
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl h-full bg-crm-surface shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="px-6 py-5 border-b border-crm-border bg-white">
          <div className="flex justify-between items-start gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl md:text-2xl font-extrabold text-crm-text truncate">{lead.name}</h2>
                <span className={`px-3 py-1 rounded-full text-[11px] font-extrabold uppercase ${statusBadge(lead.status)}`}>
                  {lead.status}
                </span>
                <span className="crm-pill hidden sm:inline">Score: {lead.score ?? 50}</span>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-crm-muted">
                {lead.email && (
                  <span className="flex items-center gap-1.5">
                    <Icons.Mail size={14} /> {lead.email}
                  </span>
                )}
                {lead.phone && (
                  <span className="flex items-center gap-1.5">
                    <Icons.Phone size={14} /> {lead.phone}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-black/5 text-crm-muted hover:text-crm-text transition-colors"
              aria-label="Fechar"
            >
              <Icons.X />
            </button>
          </div>
        </div>

        {/* Quick actions / fields */}
        <div className="px-6 py-4 border-b border-crm-border bg-crm-bg/40">
          <div className="grid grid-cols-3 gap-3">
            <div className="crm-card p-3">
              <label className="crm-section-label">Valor (R$)</label>
              <div className="flex items-center gap-2 mt-1">
                <Icons.DollarSign size={16} className="text-emerald-600" />
                <input
                  type="number"
                  className="w-full bg-transparent outline-none font-extrabold text-crm-text"
                  defaultValue={lead.value || ''}
                  onBlur={(e) => updateLeadValue('value', Number(e.target.value))}
                />
              </div>
            </div>

            <div className="crm-card p-3">
              <label className="crm-section-label">Probabilidade</label>
              <div className="flex items-center gap-2 mt-1">
                <Icons.TrendingUp size={16} className="text-sky-600" />
                <select
                  className="w-full bg-transparent outline-none font-extrabold text-crm-text"
                  defaultValue={lead.probability || 20}
                  onChange={(e) => updateLeadValue('probability', Number(e.target.value))}
                >
                  <option value="20">20% (Frio)</option>
                  <option value="50">50% (Morno)</option>
                  <option value="80">80% (Quente)</option>
                  <option value="100">100% (Fechado)</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleWhatsAppClick}
              className="crm-card p-3 hover:border-emerald-200 hover:bg-emerald-50 transition-colors group"
              title="Enviar mensagem"
            >
              <div className="h-full flex flex-col items-center justify-center">
                <Icons.MessageCircle size={22} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                <span className="mt-1 text-xs font-extrabold text-emerald-700">WhatsApp</span>
              </div>
            </button>
          </div>
        </div>

        {/* Tabs (underline verde do concept) */}
        <div className="px-6 bg-white border-b border-crm-border">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`${activeTab === 'info' ? 'crm-tab crm-tab-active' : 'crm-tab'}`}
            >
              Interesse
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`${activeTab === 'activity' ? 'crm-tab crm-tab-active' : 'crm-tab'}`}
            >
              Tarefas
            </button>
            <button
              onClick={() => setActiveTab('timeline')}
              className={`${activeTab === 'timeline' ? 'crm-tab crm-tab-active' : 'crm-tab'}`}
            >
              Timeline
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-crm-bg custom-scrollbar">
          {/* ======================
              TAB: INTERESSE
             ====================== */}
          {activeTab === 'info' && (
            <div className="space-y-8">
              {/* Origin */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="crm-section-label">Imóvel de Origem</h3>
                  {originProperty?.id && (
                    <span className="crm-pill">Ref: {originProperty.id.slice(0, 6)}</span>
                  )}
                </div>

                {originProperty ? (
                  <div className="crm-card overflow-hidden">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-44 h-32 bg-slate-100">
                        <img
                          src={originProperty.images?.[0] || 'https://via.placeholder.com/300x200'}
                          alt={originProperty.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="p-4 flex-1">
                        <h4 className="font-extrabold text-crm-text text-lg leading-tight">
                          {originProperty.title}
                        </h4>

                        <p className="mt-1 text-2xl font-extrabold text-emerald-700">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originProperty.price)}
                        </p>

                        <p className="mt-2 text-sm text-crm-muted">
                          {originProperty.location?.neighborhood}, {originProperty.location?.city} • {originProperty.type}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="crm-card p-4 text-sm text-crm-muted italic">
                    Nenhum imóvel vinculado diretamente.
                  </div>
                )}
              </div>

              {/* Viewed history */}
              <div>
                <h3 className="crm-section-label mb-3 flex items-center gap-2">
                  <Icons.Activity size={14} /> Histórico de Navegação ({viewedProperties.length})
                </h3>

                {viewedProperties.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {viewedProperties
                      .filter((p) => p.id !== originProperty?.id)
                      .map((prop) => (
                        <div
                          key={prop.id}
                          className="crm-card p-3 flex items-center gap-3 opacity-90 hover:opacity-100 transition-opacity"
                        >
                          <img
                            src={prop.images?.[0] || 'https://via.placeholder.com/100'}
                            alt={prop.title}
                            className="w-12 h-12 rounded-lg object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-extrabold text-sm text-crm-text truncate">{prop.title}</p>
                            <p className="text-xs font-extrabold text-emerald-700">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prop.price)}
                            </p>
                          </div>

                          <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-1 rounded-full bg-white border border-crm-border text-crm-muted">
                            Visto
                          </span>
                        </div>
                      ))}

                    {viewedProperties.filter((p) => p.id !== originProperty?.id).length === 0 && (
                      <p className="text-sm text-crm-muted italic">
                        Cliente só visualizou o imóvel de origem.
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-crm-muted">Sem histórico de navegação rastreado.</p>
                )}
              </div>

              {/* Smart match */}
              <div className="pt-6 border-t border-crm-border">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="crm-section-label">Oportunidades Similares (Smart Match)</h3>
                  <span className="crm-pill">{matches.length} sugestões</span>
                </div>

                {loadingMatches ? (
                  <div className="crm-card p-6 text-center text-crm-muted animate-pulse">Buscando similares...</div>
                ) : matches.length > 0 ? (
                  <div className="space-y-3">
                    {matches.map((m) => (
                      <div key={m.id} className="crm-card p-3 flex items-center gap-3">
                        <img
                          src={m.images?.[0] || 'https://via.placeholder.com/100'}
                          alt={m.title}
                          className="w-12 h-12 rounded-lg object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-extrabold text-crm-text truncate">{m.title}</p>
                          <p className="text-xs text-crm-muted">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.price)}
                          </p>
                        </div>
                        <button
                          onClick={() => shareProperty(m)}
                          className="px-3 py-2 rounded-xl text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          Enviar
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="crm-card p-4 text-sm text-crm-muted italic">
                    Nenhuma sugestão encontrada para esse perfil ainda.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================
              TAB: TASKS
             ====================== */}
          {activeTab === 'activity' && (
            <div className="space-y-6">
              <div className="crm-card p-4">
                <h3 className="crm-section-label mb-3">Tarefas</h3>

                <form onSubmit={handleAddTask} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nova tarefa…"
                    className="flex-1 px-4 py-3 rounded-xl border border-crm-border outline-none focus:ring-2 focus:ring-crm-primary bg-white"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                  />
                  <button type="submit" className="crm-btn-primary px-4">
                    <Icons.Plus size={16} />
                  </button>
                </form>
              </div>

              <div className="space-y-2">
                {tasks.map((task) => (
                  <div key={task.id} className="crm-card p-3 flex items-center gap-3">
                    <input
                      type="checkbox"
                      className="w-5 h-5 cursor-pointer"
                      checked={task.completed}
                      onChange={() => toggleTask(task)}
                      style={{ accentColor: '#50C070' }}
                    />
                    <span className={task.completed ? 'text-crm-muted line-through' : 'text-crm-body font-bold'}>
                      {task.title}
                    </span>
                  </div>
                ))}

                {tasks.length === 0 && (
                  <div className="crm-card p-4 text-sm text-crm-muted italic">
                    Nenhuma tarefa ainda. Crie a primeira ação para esse lead.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ======================
              TAB: TIMELINE
             ====================== */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              <div className="crm-card p-4">
                <h3 className="crm-section-label mb-2">Nota rápida</h3>
                <textarea
                  placeholder="Escreva uma observação…"
                  className="w-full text-sm outline-none resize-none h-20 bg-transparent"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <div className="pt-2">
                  <button onClick={handleAddNote} className="crm-btn-primary px-4 py-2">
                    Salvar
                  </button>
                </div>
              </div>

              <div className="relative border-l-2 border-crm-border ml-3 space-y-6 pl-6">
                {timeline.map((event) => (
                  <div key={event.id} className="relative">
                    <div
                      className={[
                        'absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white',
                        event.type === 'status_change'
                          ? 'bg-sky-500'
                          : event.type === 'whatsapp'
                          ? 'bg-emerald-500'
                          : event.type === 'note'
                          ? 'bg-crm-secondary'
                          : 'bg-slate-400',
                      ].join(' ')}
                    />

                    <p className="text-xs text-crm-muted mb-1">
                      {new Date(event.created_at).toLocaleString('pt-BR')}
                    </p>

                    <div className="crm-card p-3 text-sm text-crm-body">{event.description}</div>
                  </div>
                ))}

                {timeline.length === 0 && (
                  <div className="crm-card p-4 text-sm text-crm-muted italic">
                    Sem registros ainda. Tudo que você fizer aqui vai virar histórico.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* MODAL TEMPLATES */}
          {showTemplateModal && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="crm-card-elevated w-full max-w-sm p-4 animate-slide-up">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-extrabold text-crm-text">Escolha uma mensagem</h3>
                  <button
                    onClick={() => setShowTemplateModal(false)}
                    className="text-crm-muted hover:text-crm-text"
                  >
                    <Icons.X />
                  </button>
                </div>

                <div className="space-y-2 max-h-[60vh] overflow-y-auto custom-scrollbar pr-1">
                  {templates.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => sendTemplate(tpl)}
                      className="w-full text-left p-3 rounded-xl border border-crm-border hover:bg-crm-bg transition-colors"
                    >
                      <p className="font-extrabold text-crm-text text-sm">{tpl.title}</p>
                      <p className="text-xs text-crm-muted line-clamp-2 mt-1">
                        {tpl.content
                          .replace('{nome}', lead.name.split(' ')[0])
                          .replace('{imovel}', originProperty?.title || 'imóvel')}
                      </p>
                    </button>
                  ))}

                  {templates.length === 0 && (
                    <div className="crm-card p-3 text-sm text-crm-muted italic">
                      Sem templates ativos no momento.
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-crm-border text-center">
                  <button onClick={openWhatsAppDirectly} className="text-xs text-crm-muted hover:text-emerald-700 font-bold">
                    Ou abrir conversa em branco
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Animations fallback */}
        <style>{`
          @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
          .animate-slide-in-right { animation: slideInRight 0.28s ease-out forwards; }
        `}</style>
      </div>
    </div>
  );
};

export default LeadDetailsSidebar;
