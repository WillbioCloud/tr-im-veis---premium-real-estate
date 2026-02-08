import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus, Task, TimelineEvent, Property } from '../types';
import { Icons } from './Icons';

// --- Interfaces ---
interface Template {
  id: string;
  title: string;
  content: string;
}

const DEFAULT_TEMPLATES: Template[] = [
  {
    id: '1',
    title: '👋 Saudação Inicial',
    content: 'Olá {nome}, tudo bem? Sou da TR Imóveis. Vi que se interessou pelo {imovel}.'
  },
  {
    id: '2',
    title: '📅 Agendar Visita',
    content: 'Oi {nome}, gostaria de agendar uma visita para conhecer o {imovel}?'
  }
];

// Função auxiliar para formatar data de forma amigável
const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

interface LeadDetailsSidebarProps {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (status: LeadStatus) => void;
}

type TabId = 'timeline' | 'tasks' | 'info' | 'history';

const LeadDetailsSidebar: React.FC<LeadDetailsSidebarProps> = ({ lead, onClose, onStatusChange }) => {
  // Aba 'history' é nova
  const [activeTab, setActiveTab] = useState<TabId>('timeline');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newNote, setNewNote] = useState('');

  // Mantidas do “sidebar turbinado”
  const [originProperty, setOriginProperty] = useState<Property | null>(null);
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Mantidas (histórico/interesses + matching)
  const [viewedProperties, setViewedProperties] = useState<Property[]>([]);
  const [matches, setMatches] = useState<Property[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const leadFirstName = useMemo(() => (lead.name || '').trim().split(' ')[0] || 'tudo bem', [lead.name]);
  const leadPhoneClean = useMemo(() => (lead.phone || '').replace(/\D/g, ''), [lead.phone]);

  const leadCreatedAt = useMemo(() => {
    // compat com createdAt / created_at
    const val = (lead as any).createdAt ?? (lead as any).created_at ?? new Date().toISOString();
    return String(val);
  }, [lead]);

  const score = useMemo(() => (lead as any).score ?? 0, [lead]);
  const message = useMemo(() => (lead as any).message ?? '', [lead]);

  // =========================
  // Helpers / funcionalidades mantidas
  // =========================
  const addTimelineLog = async (type: TimelineEvent['type'], description: string) => {
    // Insere
    await supabase.from('timeline_events').insert([{ lead_id: lead.id, type, description }]);

    // Recarrega a timeline (mantém a UI sempre correta)
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
        .limit(6);

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

  const sendWhatsApp = async (template: Template) => {
    if (!leadPhoneClean) return;

    const imovel = originProperty?.title || (lead as any)?.property?.title || 'imóvel';
    const text = template.content.replaceAll('{nome}', leadFirstName).replaceAll('{imovel}', imovel);

    window.open(`https://wa.me/${leadPhoneClean}?text=${encodeURIComponent(text)}`, '_blank');

    // Mantém função antiga: logar na timeline
    await addTimelineLog('whatsapp', `Enviou msg: ${template.title}`);
  };

  const shareProperty = async (property: Property) => {
    if (!leadPhoneClean) return;

    const origin = window.location.origin;
    const slug = (property as any).slug;
    const title = (property as any).title || 'um imóvel';

    const text = `Olá ${leadFirstName}, encontrei este outro imóvel que combina com seu perfil: ${title}\n${origin}/imoveis/${slug}`;
    window.open(`https://wa.me/${leadPhoneClean}?text=${encodeURIComponent(text)}`, '_blank');

    await addTimelineLog('whatsapp', `Enviou sugestão: ${title}`);
  };

  const handleStatusChange = async (status: LeadStatus) => {
    // Atualiza no banco + log (sem depender do parent)
    const { error } = await supabase.from('leads').update({ status }).eq('id', lead.id);
    if (!error) {
      onStatusChange(status);
      await addTimelineLog('status_change', `Status alterado para: ${status}`);
    }
  };

  // =========================
  // Fetch inicial (mantendo tudo)
  // =========================
  useEffect(() => {
    const fetchData = async () => {
      if (!lead?.id) return;

      // 1) Tasks
      const { data: t } = await supabase
        .from('tasks')
        .select('*')
        .eq('lead_id', lead.id)
        .order('due_date', { ascending: true });
      if (t) setTasks(t as any);

      // 2) Timeline
      const { data: e } = await supabase
        .from('timeline_events')
        .select('*')
        .eq('lead_id', lead.id)
        .order('created_at', { ascending: false });
      if (e) setEvents(e as any);

      // 3) Templates (usa DB se existir; fallback nos DEFAULT)
      const { data: tplData } = await supabase.from('message_templates').select('*').eq('active', true);
      if (tplData && tplData.length > 0) setTemplates(tplData as any);
      else setTemplates(DEFAULT_TEMPLATES);

      // 4) Property Origin
      const joinedProperty = (lead as any).property || (lead as any).property?.[0];
      const propId = (lead as any).property_id || (lead as any).propertyId;

      if (joinedProperty) {
        setOriginProperty(joinedProperty as any);
        fetchMatches(joinedProperty as any);
      } else if (propId) {
        const { data: p } = await supabase.from('properties').select('*').eq('id', propId).single();
        if (p) {
          setOriginProperty(p as any);
          fetchMatches(p as any);
        } else {
          setOriginProperty(null);
          setMatches([]);
        }
      } else {
        setOriginProperty(null);
        setMatches([]);
      }

      // 5) Histórico (lead_interests) - mantido
      const { data: interests } = await supabase
        .from('lead_interests')
        .select('property:properties(*)')
        .eq('lead_id', lead.id);

      if (interests) {
        const props = (interests as any[]).map((i) => i.property).filter(Boolean) as Property[];
        const unique = Array.from(new Map(props.map((p) => [p.id, p])).values());
        setViewedProperties(unique);
      } else {
        setViewedProperties([]);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead.id]);

  // =========================
  // Actions (Tasks / Notes)
  // =========================
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const payload = {
      title: newTask,
      lead_id: lead.id,
      completed: false,
      type: 'call',
      due_date: new Date().toISOString()
    };

    const { data, error } = await supabase.from('tasks').insert([payload]).select().single();

    if (!error && data) {
      setTasks((prev) => [...prev, data as any]);
      setNewTask('');
      await addTimelineLog('system', `Criou a tarefa: ${payload.title}`);
    }
  };

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
      setEvents((prev) => [data as any, ...prev]);
      setNewNote('');
    }
  };

  const toggleTask = async (id: string, completed: boolean) => {
    const { error } = await supabase.from('tasks').update({ completed: !completed }).eq('id', id);
    if (!error) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t)));
      if (!completed) {
        const title = tasks.find((t) => t.id === id)?.title || 'tarefa';
        await addTimelineLog('system', `Concluiu a tarefa: ${title}`);
      }
    }
  };

  // =========================
  // Status rápidos (seguros — só usa os que existirem no enum)
  // =========================
  const quickStatuses = useMemo(() => {
    const candidates = [
      (LeadStatus as any).NEW,
      (LeadStatus as any).CONTACTED,
      (LeadStatus as any).VISIT,
      (LeadStatus as any).PROPOSAL,
      (LeadStatus as any).CLOSED
    ].filter(Boolean);

    // remove duplicatas
    return Array.from(new Set(candidates)) as LeadStatus[];
  }, []);

  // =========================
  // Navegação (metadata.visited_properties)
  // =========================
  const visitedFromMetadata = useMemo(() => {
    const meta = (lead as any).metadata;
    const arr = meta?.visited_properties;
    if (!Array.isArray(arr)) return [];
    return arr
      .map((v: any) => ({
        title: v?.title,
        slug: v?.slug,
        visited_at: v?.visited_at
      }))
      .filter((v: any) => v.title && v.visited_at);
  }, [lead]);

  // =========================
  // UI
  // =========================
  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-[60] transform transition-transform duration-300 ease-out flex flex-col border-l border-slate-100">
      {/* === HEADER OTIMIZADO === */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-serif font-bold text-slate-800">{lead.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  score > 70 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'
                }`}
              >
                Score: {score}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">Desde {new Date(leadCreatedAt).toLocaleDateString()}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <Icons.X size={20} />
          </button>
        </div>

        {/* STATUS RÁPIDOS (BOTÕES) */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-1">
          {quickStatuses.map((status) => {
            const isActive = lead.status === status;

            // base neutra
            let cls = 'border-slate-200 hover:border-slate-300 text-slate-500 bg-white';

            if (isActive) {
              // cores fortes só quando ativo (menos cansaço)
              if (String(status) === String((LeadStatus as any).NEW)) cls = 'bg-blue-600 text-white border-blue-600';
              else if (String(status) === String((LeadStatus as any).CLOSED)) cls = 'bg-emerald-600 text-white border-emerald-600';
              else cls = 'bg-slate-800 text-white border-slate-800';
            }

            return (
              <button
                key={String(status)}
                onClick={() => handleStatusChange(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all shadow-sm ${cls}`}
                title={`Mover para: ${String(status)}`}
                type="button"
              >
                {String(status)}
              </button>
            );
          })}
        </div>
      </div>

      {/* === ABAS === */}
      <div className="flex border-b border-slate-100 bg-white">
        {[
          { id: 'timeline', label: 'Timeline', icon: Icons.Clock },
          { id: 'history', label: 'Navegação', icon: Icons.MapPin }, // NOVA ABA
          { id: 'tasks', label: 'Tarefas', icon: Icons.CheckSquare },
          { id: 'info', label: 'Infos', icon: Icons.Info }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600 bg-brand-50/30'
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
            type="button"
          >
            <tab.icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* === CONTEÚDO === */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
        {/* ========================================================= */}
        {/* ABA: NAVEGAÇÃO (NOVA) */}
        {/* ========================================================= */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            {/* Imóvel de entrada */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                <Icons.MapPin size={16} className="text-brand-500" />
                Imóvel de Entrada
              </h3>

              <div className="flex gap-3 items-start">
                <img
                  src={(originProperty as any)?.images?.[0] || 'https://placehold.co/100'}
                  className="w-16 h-16 rounded-lg object-cover bg-slate-100"
                  alt={originProperty?.title || 'Imóvel'}
                />
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm line-clamp-2">{originProperty?.title || 'Interesse Geral'}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {(originProperty as any)?.location?.neighborhood || 'Local não definido'}
                  </p>

                  {originProperty && (
                    <a
                      href={`/imoveis/${(originProperty as any)?.slug || '#'}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-[11px] font-bold text-brand-700 mt-2 hover:underline"
                    >
                      Ver no site <Icons.ArrowRight size={14} />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Sessão (metadata.visited_properties) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Icons.Activity size={16} className="text-slate-500" />
                  Histórico de Visitas (Sessão)
                </h3>
                <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-1 rounded font-bold border border-slate-200">
                  {visitedFromMetadata.length}
                </span>
              </div>

              {visitedFromMetadata.length > 0 ? (
                <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                  {visitedFromMetadata.map((visit: any, index: number) => (
                    <div key={`${visit.slug || visit.title}-${index}`} className="relative">
                      <div className="absolute -left-[21px] top-2 w-3 h-3 rounded-full border-2 border-white bg-slate-400 shadow-sm" />
                      <p className="text-[10px] text-slate-400 mb-1">{new Date(visit.visited_at).toLocaleString()}</p>

                      <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex justify-between items-center group">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-700 truncate">{visit.title}</p>
                          <p className="text-xs text-slate-500">Visualizou detalhes do imóvel</p>
                        </div>

                        {visit.slug ? (
                          <a
                            href={`/imoveis/${visit.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-brand-600 transition-opacity"
                            title="Abrir imóvel"
                          >
                            <Icons.ArrowRight size={16} />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm italic">
                  Nenhum histórico de navegação registrado na sessão para este lead.
                </div>
              )}
            </div>

            {/* Histórico do banco (lead_interests) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <Icons.List size={16} className="text-slate-500" />
                  Navegação Registrada (Banco)
                </h3>
                <span className="text-[10px] bg-slate-50 text-slate-500 px-2 py-1 rounded font-bold border border-slate-200">
                  {viewedProperties.length}
                </span>
              </div>

              {viewedProperties.length > 0 ? (
                <div className="space-y-2">
                  {viewedProperties.slice(0, 10).map((p) => (
                    <div key={p.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <img
                        src={(p as any).images?.[0] || 'https://placehold.co/100'}
                        alt={(p as any).title}
                        className="w-10 h-10 rounded-lg object-cover bg-white"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{(p as any).title}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format((p as any).price || 0)}
                        </p>
                      </div>
                      {(p as any).slug ? (
                        <a
                          href={`/imoveis/${(p as any).slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-slate-400 hover:text-brand-600 transition-colors"
                          title="Abrir imóvel"
                        >
                          <Icons.ArrowRight size={16} />
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-slate-400 text-sm italic">Sem navegação salva no banco para este lead.</div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA: TIMELINE (Mantida + Templates + Nota) */}
        {/* ========================================================= */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            {/* Ações rápidas (WhatsApp templates) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase">Ações Rápidas</h3>
                <button
                  type="button"
                  onClick={() => (templates.length > 0 ? setShowTemplateModal(true) : openWhatsAppDirectly())}
                  className="text-xs font-bold bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors"
                  title="Enviar mensagem no WhatsApp"
                >
                  WhatsApp
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {templates.slice(0, 4).map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => sendWhatsApp(tpl)}
                    className="text-left p-3 rounded-lg border border-slate-100 hover:border-green-400 hover:bg-green-50 transition-all group"
                    type="button"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icons.MessageCircle size={14} className="text-green-600" />
                      <span className="text-xs font-bold text-slate-700 group-hover:text-green-700">WhatsApp</span>
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{tpl.title}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Nova Nota */}
            <form
              onSubmit={handleAddNote}
              className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm focus-within:ring-2 focus-within:ring-brand-100 transition-all"
            >
              <textarea
                className="w-full text-sm outline-none resize-none text-slate-700 placeholder:text-slate-400"
                placeholder="Escreva uma nota interna..."
                rows={2}
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
              />
              <div className="flex justify-end mt-2 pt-2 border-t border-slate-50">
                <button type="submit" className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-slate-700">
                  Salvar Nota
                </button>
              </div>
            </form>

            {/* Eventos */}
            <div className="space-y-4">
              {/* Evento fixo de criação */}
              <div className="flex gap-3">
                <div className="mt-1 w-2 h-2 rounded-full shrink-0 bg-brand-500" />
                <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex-1">
                  <p className="text-[10px] text-slate-400 mb-1">{formatDate(leadCreatedAt)}</p>
                  <p className="text-sm font-bold text-slate-700">Lead Criado</p>
                  <p className="text-xs text-slate-500 mt-1">Cliente cadastrado através do site.</p>
                </div>
              </div>

              {events.map((event: any) => (
                <div key={event.id} className="flex gap-3">
                  <div
                    className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                      event.type === 'whatsapp' ? 'bg-green-500' : event.type === 'status_change' ? 'bg-blue-500' : 'bg-amber-400'
                    }`}
                  />
                  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex-1">
                    <p className="text-[10px] text-slate-400 mb-1">{formatDate(event.created_at)}</p>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{event.description}</p>
                  </div>
                </div>
              ))}

              {events.length === 0 && (
                <div className="text-center py-6 text-slate-400 text-sm italic">Sem eventos ainda.</div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA: TAREFAS */}
        {/* ========================================================= */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <form onSubmit={handleAddTask} className="flex gap-2 mb-2">
              <input
                type="text"
                className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-brand-500 transition-colors"
                placeholder="Nova tarefa..."
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
              />
              <button type="submit" className="bg-brand-600 text-white p-3 rounded-xl hover:bg-brand-700 transition-colors" title="Adicionar tarefa">
                <Icons.Plus size={20} />
              </button>
            </form>

            {tasks.length === 0 ? (
              <p className="text-center text-slate-400 py-8 text-sm">Nenhuma tarefa pendente.</p>
            ) : (
              tasks.map((task: any) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm group hover:border-brand-200 transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => toggleTask(task.id, !!task.completed)}
                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                      task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 hover:border-brand-500'
                    }`}
                    title={task.completed ? 'Marcar como pendente' : 'Marcar como concluída'}
                  >
                    {task.completed && <Icons.CheckSquare size={12} />}
                  </button>

                  <span className={`text-sm flex-1 ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                    {task.title}
                  </span>

                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded">
                    {task.due_date ? new Date(task.due_date).toLocaleDateString() : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* ABA: INFOS (com smart match + histórico resumido) */}
        {/* ========================================================= */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            {/* Contato */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase">Contato</h3>

              <div>
                <p className="text-xs text-slate-400">Email</p>
                <p className="font-bold text-slate-700">{lead.email || 'Não informado'}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400">Telefone</p>
                <p className="font-bold text-slate-700">{lead.phone}</p>
              </div>

              <div className="flex gap-2">
                <a
                  href={`https://wa.me/${leadPhoneClean}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-50 text-green-700 font-bold rounded-lg hover:bg-green-100 transition-colors border border-green-200"
                >
                  <Icons.MessageCircle size={16} /> WhatsApp
                </a>

                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2 bg-white text-slate-700 font-bold rounded-lg hover:bg-slate-50 transition-colors border border-slate-200"
                >
                  <Icons.Send size={16} /> Templates
                </button>
              </div>
            </div>

            {/* Mensagem original */}
            {message ? (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Mensagem Original</h3>
                <p className="text-sm text-slate-600 italic bg-slate-50 p-3 rounded-lg border border-slate-100">"{message}"</p>
              </div>
            ) : null}

            {/* Smart match */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase">Oportunidades Similares</h3>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">{matches.length}</span>
              </div>

              {loadingMatches ? (
                <p className="text-sm text-slate-500">Buscando similares...</p>
              ) : matches.length > 0 ? (
                <div className="space-y-2">
                  {matches.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <img src={m.images?.[0] || 'https://placehold.co/100'} alt={m.title} className="w-10 h-10 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-700 truncate">{m.title}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.price || 0)}
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

            {/* Histórico resumido */}
            {viewedProperties.length > 0 ? (
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Histórico (Resumo)</h3>
                <div className="space-y-2">
                  {viewedProperties.slice(0, 5).map((p: any) => (
                    <div key={p.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <img src={p.images?.[0] || 'https://placehold.co/100'} alt={p.title} className="w-10 h-10 rounded-lg object-cover bg-white" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{p.title}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(p.price || 0)}
                        </p>
                      </div>
                      {p.slug ? (
                        <a
                          href={`/imoveis/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-2 text-slate-400 hover:text-brand-600 transition-colors"
                          title="Abrir imóvel"
                        >
                          <Icons.ArrowRight size={16} />
                        </a>
                      ) : null}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('history')}
                  className="mt-3 w-full text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 py-2 rounded-lg hover:bg-brand-100 transition-colors"
                >
                  Ver Navegação completa
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ========================= */}
      {/* MODAL: Templates WhatsApp */}
      {/* ========================= */}
      {showTemplateModal && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[70]">
          <div className="bg-white w-full max-w-sm p-4 rounded-2xl border border-slate-200 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">Escolha uma mensagem</h3>
              <button onClick={() => setShowTemplateModal(false)} className="text-slate-500 hover:text-slate-700" type="button">
                <Icons.X />
              </button>
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => {
                    setShowTemplateModal(false);
                    sendWhatsApp(tpl);
                  }}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                  type="button"
                >
                  <p className="font-bold text-slate-800 text-sm">{tpl.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {tpl.content
                      .replaceAll('{nome}', leadFirstName)
                      .replaceAll('{imovel}', originProperty?.title || (lead as any)?.property?.title || 'imóvel')}
                  </p>
                </button>
              ))}

              {templates.length === 0 && <div className="p-3 text-sm text-slate-500 italic">Sem templates ativos no momento.</div>}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-center">
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  openWhatsAppDirectly();
                }}
                className="text-xs text-slate-500 hover:text-emerald-700 font-bold"
                type="button"
              >
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
