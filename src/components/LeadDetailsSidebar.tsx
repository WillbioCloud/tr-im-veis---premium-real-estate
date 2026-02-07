import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus, Task, TimelineEvent, Property } from '../types';
import { Icons } from './Icons';

// Função auxiliar para formatar data de forma amigável
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface Template {
  id: string;
  title: string;
  content: string;
}

interface LeadDetailsSidebarProps {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (status: LeadStatus) => void;
}

const LeadDetailsSidebar: React.FC<LeadDetailsSidebarProps> = ({ lead, onClose, onStatusChange }) => {
  const [activeTab, setActiveTab] = useState<'timeline' | 'info' | 'tasks'>('timeline');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newNote, setNewNote] = useState('');

  // Features que já existiam no arquivo anterior (mantidas)
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [originProperty, setOriginProperty] = useState<Property | null>(null);
  const [matches, setMatches] = useState<Property[]>([]);
  const [viewedProperties, setViewedProperties] = useState<Property[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const leadPhoneClean = useMemo(() => (lead.phone || '').replace(/\D/g, ''), [lead.phone]);

  const leadCreatedAt =
    (lead as any).createdAt || (lead as any).created_at || (lead as any).created_at?.toString?.() || new Date().toISOString();

  // ===== Helpers =====
  const addTimelineLog = async (type: TimelineEvent['type'], description: string) => {
    await supabase.from('timeline_events').insert([{ lead_id: lead.id, type, description }]);

    const { data } = await supabase
      .from('timeline_events')
      .select('*')
      .eq('lead_id', lead.id)
      .order('created_at', { ascending: false });

    if (data) setEvents(data as any);
  };

  const fetchMatches = async (origin: Property) => {
    setLoadingMatches(true);
    try {
      const originPrice = (origin as any).price ?? 0;
      const minPrice = originPrice * 0.8;
      const maxPrice = originPrice * 1.2;

      const originCity = (origin as any).location?.city || (origin as any).city;
      const originType = (origin as any).type;

      if (!originCity || !originType || !originPrice) {
        setMatches([]);
        return;
      }

      const { data } = await supabase
        .from('properties')
        .select('*')
        .eq('location->>city', originCity)
        .eq('type', originType)
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
    message = message.replace(/{nome}/g, (lead.name || '').split(' ')[0] || '');
    message = message.replace(/{imovel}/g, originProperty?.title || (lead as any)?.property?.title || 'imóvel');

    const url = `https://wa.me/${leadPhoneClean}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    await addTimelineLog('whatsapp', `Enviou msg: ${template.title}`);

    // Automação antiga (mantida): se era NEW, vira QUALIFYING (se existir no enum)
    if (lead.status === (LeadStatus as any).NEW && (LeadStatus as any).QUALIFYING) {
      const { error } = await supabase
        .from('leads')
        .update({ status: (LeadStatus as any).QUALIFYING })
        .eq('id', lead.id);
      if (!error) {
        onStatusChange((LeadStatus as any).QUALIFYING);
        await addTimelineLog('status_change', 'Status alterado automaticamente para Em Atendimento');
      }
    }

    setShowTemplateModal(false);
  };

  const shareProperty = async (property: Property) => {
    if (!leadPhoneClean) return;
    const firstName = (lead.name || '').split(' ')[0] || '';
    const origin = window.location.origin;
    const slug = (property as any).slug;
    const text = `Olá ${firstName}, encontrei este outro imóvel que tem o perfil que você procura: ${origin}/imoveis/${slug}`;
    window.open(`https://wa.me/${leadPhoneClean}?text=${encodeURIComponent(text)}`, '_blank');
    await addTimelineLog('whatsapp', `Enviou sugestão: ${(property as any).title || 'imóvel'}`);
  };

  // ===== Fetch principal (tarefas, timeline, templates, origem, interesses) =====
  useEffect(() => {
    const fetchData = async () => {
      if (!lead?.id) return;

      // 1) Tarefas
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('lead_id', lead.id)
        .order('due_date', { ascending: true });
      if (tasksData) setTasks(tasksData as any);

      // 2) Eventos (Timeline)
      const { data: eventsData } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      if (eventsData) setEvents(eventsData as any);

      // 3) Templates WhatsApp (mantido)
      const { data: tplData } = await supabase.from('message_templates').select('*').eq('active', true);
      if (tplData) setTemplates(tplData as any);

      // 4) Imóvel de origem (tenta pegar do join do lead primeiro; se não tiver, busca)
      const joinedProperty = (lead as any).property || (lead as any).property?.[0];
      const propId = (lead as any).propertyId || (lead as any).property_id;

      if (joinedProperty) {
        setOriginProperty(joinedProperty as any);
        fetchMatches(joinedProperty as any);
      } else if (propId) {
        const { data: origin } = await supabase.from('properties').select('*').eq('id', propId).single();
        if (origin) {
          setOriginProperty(origin as any);
          fetchMatches(origin as any);
        } else {
          setOriginProperty(null);
          setMatches([]);
        }
      } else {
        setOriginProperty(null);
        setMatches([]);
      }

      // 5) Histórico (lead_interests) (mantido)
      const { data: interests } = await supabase
        .from('lead_interests')
        .select('property:properties(*)')
        .eq('lead_id', lead.id);

      if (interests) {
        const props = (interests as any[])
          .map((i) => i.property)
          .filter(Boolean) as Property[];

        const unique = Array.from(new Map(props.map((p) => [p.id, p])).values());
        setViewedProperties(unique);
      } else {
        setViewedProperties([]);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  // Função: Adicionar Nova Tarefa
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const taskData = {
      title: newTask,
      lead_id: lead.id,
      completed: false,
      type: 'call',
      due_date: new Date().toISOString()
    };

    const { data, error } = await supabase.from('tasks').insert([taskData]).select().single();

    if (!error && data) {
      setTasks([...tasks, data as any]);
      setNewTask('');
      await addTimelineLog('system', `Criou a tarefa: ${taskData.title}`);
    }
  };

  // Função: Adicionar Nota (Timeline)
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const eventData = {
      type: 'note',
      description: newNote,
      lead_id: lead.id
    };

    const { data, error } = await supabase.from('timeline_events').insert([eventData]).select().single();

    if (!error && data) {
      setEvents([data as any, ...events]);
      setNewNote('');
    }
  };

  // Função: Marcar Tarefa como Concluída
  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    const { error } = await supabase.from('tasks').update({ completed: !currentStatus }).eq('id', taskId);
    if (!error) {
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, completed: !currentStatus } : t)));
      if (!currentStatus) {
        const taskTitle = tasks.find((t) => t.id === taskId)?.title || 'tarefa';
        await addTimelineLog('system', `Concluiu a tarefa: ${taskTitle}`);
      }
    }
  };

  const handleStatusChange = async (status: LeadStatus) => {
    // mantém comportamento antigo: salva no banco + loga na timeline
    const { error } = await supabase.from('leads').update({ status }).eq('id', lead.id);
    if (!error) {
      onStatusChange(status);
      await addTimelineLog('status_change', `Status alterado para: ${status}`);
    }
  };

  const propertyTitle = (lead as any)?.property?.title || originProperty?.title;
  const propertySlug = (lead as any)?.property?.slug || (originProperty as any)?.slug;
  const propertyAgent = (lead as any)?.property?.agent || (originProperty as any)?.agent;
  const propertyId = (lead as any)?.property_id || (lead as any)?.propertyId;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-out overflow-hidden flex flex-col border-l border-slate-100">
      {/* === HEADER === */}
      <div className="p-6 border-b border-slate-100 bg-slate-50">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">{lead.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-500">{lead.phone}</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  (lead as any).score > 70 ? 'bg-green-100 text-green-700' : 'bg-brand-50 text-brand-600'
                }`}
              >
                Score: {(lead as any).score}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors">
            <Icons.X size={20} />
          </button>
        </div>

        {/* === CARD DE ORIGEM DO LEAD === */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm mb-4">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-1">
            <Icons.MapPin size={12} /> Origem do Interesse
          </p>
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-slate-700 truncate max-w-[250px]">
                {propertyTitle || 'Interesse Geral (Sem Imóvel específico)'}
              </p>

              {/* Lógica: Se tem agente, mostra ele. Se não, é da empresa. */}
              {propertyAgent ? (
                <p className="text-xs text-indigo-600 font-medium flex items-center gap-1 mt-1 bg-indigo-50 px-2 py-1 rounded w-fit">
                  <Icons.User size={12} /> Captado por: {propertyAgent.name}
                </p>
              ) : (
                <p className="text-xs text-brand-600 font-medium flex items-center gap-1 mt-1 bg-brand-50 px-2 py-1 rounded w-fit">
                  <Icons.Shield size={12} /> Imóvel Oficial da Imobiliária
                </p>
              )}
            </div>

            {propertyId && (
              <a
                href={`/imoveis/${propertySlug || '#'}`}
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-slate-50 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors group"
                title="Ver Imóvel no Site"
              >
                <Icons.ArrowRight size={16} className="group-hover:-rotate-45 transition-transform" />
              </a>
            )}
          </div>
        </div>

        {/* Status Selector (Scrollable) */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {Object.values(LeadStatus).map((status) => (
            <button
              key={status as any}
              onClick={() => handleStatusChange(status as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all border ${
                lead.status === status
                  ? 'bg-slate-800 text-white border-slate-800 shadow-md'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {status as any}
            </button>
          ))}
        </div>
      </div>

      {/* === ABAS === */}
      <div className="flex border-b border-slate-100 bg-white">
        {[
          { id: 'timeline', label: 'Histórico', icon: Icons.Clock },
          { id: 'tasks', label: 'Tarefas', icon: Icons.CheckSquare },
          { id: 'info', label: 'Informações', icon: Icons.Info }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* === CONTEÚDO DAS ABAS === */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
        {/* ABA: HISTÓRICO (TIMELINE) */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            {/* Input de Nota */}
            <form
              onSubmit={handleAddNote}
              className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-brand-100 transition-all"
            >
              <textarea
                className="w-full text-sm outline-none resize-none text-slate-700 placeholder:text-slate-400"
                placeholder="Escreva uma observação sobre este cliente..."
                rows={3}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <div className="flex justify-end mt-2 pt-2 border-t border-slate-50">
                <button
                  type="submit"
                  className="bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Salvar Nota
                </button>
              </div>
            </form>

            <div className="relative pl-4 border-l-2 border-slate-200 space-y-8">
              {/* Evento de Criação (Fixo) */}
              <div className="relative">
                <div className="absolute -left-[21px] top-0 w-3 h-3 bg-brand-500 rounded-full border-2 border-white shadow-sm"></div>
                <p className="text-xs text-slate-400 mb-1">{formatDate(leadCreatedAt)}</p>
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                  <p className="text-sm font-bold text-slate-700">Lead Criado</p>
                  <p className="text-xs text-slate-500 mt-1">Cliente cadastrado através do site.</p>
                </div>
              </div>

              {/* Eventos Dinâmicos */}
              {events.map((event) => (
                <div key={(event as any).id} className="relative animate-fade-in">
                  <div
                    className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 border-white shadow-sm ${
                      (event as any).type === 'note'
                        ? 'bg-amber-400'
                        : (event as any).type === 'whatsapp'
                        ? 'bg-emerald-400'
                        : (event as any).type === 'status_change'
                        ? 'bg-blue-400'
                        : 'bg-slate-400'
                    }`}
                  ></div>
                  <p className="text-xs text-slate-400 mb-1">{formatDate((event as any).created_at)}</p>
                  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{(event as any).description}</p>
                  </div>
                </div>
              ))}

              {events.length === 0 && (
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                  <p className="text-sm text-slate-500">Sem registros ainda.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABA: TAREFAS */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
              <input
                type="text"
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 transition-colors"
                placeholder="Nova tarefa..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              <button type="submit" className="bg-brand-600 text-white p-3 rounded-xl hover:bg-brand-700 transition-colors">
                <Icons.Plus size={20} />
              </button>
            </form>

            {tasks.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Nenhuma tarefa pendente.</p>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm group hover:border-brand-200 transition-colors"
                >
                  <button
                    onClick={() => toggleTask(task.id, (task as any).completed)}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      (task as any).completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-slate-300 hover:border-brand-500'
                    }`}
                  >
                    {(task as any).completed && <Icons.CheckSquare size={12} />}
                  </button>
                  <span
                    className={`text-sm flex-1 ${(task as any).completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                  >
                    {task.title}
                  </span>
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">
                    {new Date((task as any).due_date).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ABA: INFORMAÇÕES */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase">Dados de Contato</h3>
                <button
                  onClick={handleWhatsAppClick}
                  className="text-xs font-bold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                  title="Enviar mensagem no WhatsApp"
                  type="button"
                >
                  WhatsApp
                </button>
              </div>

              <div className="space-y-4 mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Icons.User size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Nome Completo</p>
                    <p className="text-sm font-bold text-slate-700">{lead.name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center">
                    <Icons.Phone size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-slate-400">Telefone / WhatsApp</p>
                    <p className="text-sm font-bold text-slate-700">{lead.phone}</p>
                  </div>
                  <a
                    href={`https://wa.me/${leadPhoneClean}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-green-600 text-xs font-bold hover:underline"
                  >
                    Abrir
                  </a>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                    <Icons.Mail size={16} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Email</p>
                    <p className="text-sm font-bold text-slate-700">{lead.email || 'Não informado'}</p>
                  </div>
                </div>
              </div>
            </div>

            {(lead as any).message && (
              <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Mensagem Original</h3>
                <p className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded-lg">"{(lead as any).message}"</p>
              </div>
            )}

            {/* Mantido: Smart Match + Histórico de navegação (aparece só se tiver dados) */}
            {(viewedProperties.length > 0 || matches.length > 0 || loadingMatches) && (
              <div className="space-y-4">
                {viewedProperties.length > 0 && (
                  <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2">
                      <Icons.Activity size={14} /> Histórico de Navegação ({viewedProperties.length})
                    </h3>
                    <div className="space-y-2">
                      {viewedProperties
                        .filter((p) => p.id !== originProperty?.id)
                        .slice(0, 6)
                        .map((prop) => (
                          <div key={prop.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                            <img
                              src={(prop as any).images?.[0] || 'https://via.placeholder.com/100'}
                              alt={(prop as any).title}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-700 truncate">{(prop as any).title}</p>
                              <p className="text-xs text-slate-500 truncate">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                  (prop as any).price || 0
                                )}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-slate-400 uppercase">Oportunidades Similares</h3>
                    <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">{matches.length}</span>
                  </div>

                  {loadingMatches ? (
                    <p className="text-sm text-slate-500">Buscando similares...</p>
                  ) : matches.length > 0 ? (
                    <div className="space-y-2">
                      {matches.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg">
                          <img
                            src={(m as any).images?.[0] || 'https://via.placeholder.com/100'}
                            alt={(m as any).title}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-700 truncate">{(m as any).title}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((m as any).price || 0)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => shareProperty(m)}
                            className="text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-2 rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            Enviar
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">Nenhuma sugestão encontrada para esse perfil.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL TEMPLATES (mantido do arquivo anterior) */}
      {showTemplateModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm p-4 rounded-2xl border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">Escolha uma mensagem</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-500 hover:text-slate-700">
                <Icons.X />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => sendTemplate(tpl)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <p className="font-bold text-slate-800 text-sm">{tpl.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {tpl.content
                      .replace('{nome}', (lead.name || '').split(' ')[0] || '')
                      .replace('{imovel}', originProperty?.title || (lead as any)?.property?.title || 'imóvel')}
                  </p>
                </button>
              ))}

              {templates.length === 0 && <div className="p-3 text-sm text-slate-500 italic">Sem templates ativos no momento.</div>}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <button onClick={openWhatsAppDirectly} className="text-xs text-slate-500 hover:text-emerald-700 font-bold">
                Ou abrir conversa em branco
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadDetailsSidebar;
