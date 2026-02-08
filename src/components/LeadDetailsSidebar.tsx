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
  { id: '1', title: '👋 Saudação Inicial', content: 'Olá {nome}, tudo bem? Sou da TR Imóveis. Vi que se interessou pelo {imovel}. Podemos conversar?' },
  { id: '2', title: '📅 Agendar Visita', content: 'Oi {nome}, gostaria de agendar uma visita para conhecer o {imovel}? Tenho horários livres.' },
  { id: '3', title: '❓ Falta de Resposta', content: 'Olá {nome}, ainda tem interesse no {imovel}? Se não, vou encerrar seu atendimento por enquanto.' },
];

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

type TabId = 'whatsapp' | 'timeline' | 'history' | 'tasks' | 'info';

const LeadDetailsSidebar: React.FC<LeadDetailsSidebarProps> = ({ lead, onClose, onStatusChange }) => {
  const [activeTab, setActiveTab] = useState<TabId>('whatsapp');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [newTask, setNewTask] = useState('');
  const [newNote, setNewNote] = useState('');
  const [originProperty, setOriginProperty] = useState<Property | null>(null);
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [viewedProperties, setViewedProperties] = useState<Property[]>([]);
  const [matches, setMatches] = useState<Property[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const leadFirstName = useMemo(() => (lead.name || '').trim().split(' ')[0] || 'Cliente', [lead.name]);
  const leadPhoneClean = useMemo(() => (lead.phone || '').replace(/\D/g, ''), [lead.phone]);

  // =========================
  // Funções de Apoio (Timeline & Matching)
  // =========================
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
        .limit(6);

      if (data) setMatches(data as any);
    } catch (err) {
      console.error('Erro no matching:', err);
    } finally {
      setLoadingMatches(false);
    }
  };

  // =========================
  // Efeito de Carregamento Inicial
  // =========================
  useEffect(() => {
    const fetchData = async () => {
      if (!lead?.id) return;

      // Tasks & Timeline
      const [tasksRes, eventsRes, templatesRes, interestsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('lead_id', lead.id).order('due_date', { ascending: true }),
        supabase.from('timeline_events').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false }),
        supabase.from('message_templates').select('*').eq('active', true),
        supabase.from('lead_interests').select('property:properties(*)').eq('lead_id', lead.id)
      ]);

      if (tasksRes.data) setTasks(tasksRes.data as any);
      if (eventsRes.data) setEvents(eventsRes.data as any);
      if (templatesRes.data && templatesRes.data.length > 0) setTemplates(templatesRes.data as any);

      // Property Origin & Matching
      const joinedProperty = (lead as any).property;
      const propId = (lead as any).property_id || (lead as any).propertyId;

      if (joinedProperty) {
        setOriginProperty(joinedProperty);
        fetchMatches(joinedProperty);
      } else if (propId) {
        const { data: p } = await supabase.from('properties').select('*').eq('id', propId).single();
        if (p) {
          setOriginProperty(p);
          fetchMatches(p);
        }
      }

      // Histórico do banco
      if (interestsRes.data) {
        const props = (interestsRes.data as any[]).map((i) => i.property).filter(Boolean);
        setViewedProperties(Array.from(new Map(props.map((p: any) => [p.id, p])).values()) as any);
      }
    };

    fetchData();
  }, [lead.id]);

  // =========================
  // Handlers
  // =========================
  const handleStatusChange = async (status: LeadStatus) => {
    const { error } = await supabase.from('leads').update({ status }).eq('id', lead.id);
    if (!error) {
      onStatusChange(status);
      await addTimelineLog('status_change', `Status alterado para: ${status}`);
    }
  };

  const sendWhatsApp = async (template: Template) => {
    if (!leadPhoneClean) return;
    const imovel = originProperty?.title || 'imóvel';
    const text = template.content.replaceAll('{nome}', leadFirstName).replaceAll('{imovel}', imovel);
    window.open(`https://wa.me/${leadPhoneClean}?text=${encodeURIComponent(text)}`, '_blank');
    await addTimelineLog('whatsapp', `Enviou msg: "${text}"`);
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    const payload = { title: newTask, lead_id: lead.id, completed: false, type: 'call', due_date: new Date().toISOString() };
    const { data } = await supabase.from('tasks').insert([payload]).select().single();
    if (data) {
      setTasks((prev) => [...prev, data as any]);
      setNewTask('');
      await addTimelineLog('system', `Criou a tarefa: ${payload.title}`);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    const { data } = await supabase.from('timeline_events').insert([{ type: 'note', description: newNote, lead_id: lead.id }]).select().single();
    if (data) {
      setEvents((prev) => [data as any, ...prev]);
      setNewNote('');
    }
  };

  const toggleTask = async (id: string, completed: boolean) => {
    const { error } = await supabase.from('tasks').update({ completed: !completed }).eq('id', id);
    if (!error) {
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !completed } : t)));
      if (!completed) await addTimelineLog('system', `Concluiu a tarefa: ${tasks.find(t => t.id === id)?.title}`);
    }
  };

  const visitedFromMetadata = useMemo(() => {
    const arr = (lead as any).metadata?.visited_properties;
    return Array.isArray(arr) ? arr.filter((v: any) => v.title && v.visited_at) : [];
  }, [lead]);

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[500px] bg-white shadow-2xl z-[60] transform transition-transform duration-300 ease-out flex flex-col border-l border-slate-100">
      
      {/* HEADER */}
      <div className="p-6 border-b border-slate-100 bg-slate-50/50 backdrop-blur-sm">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-serif font-bold text-slate-800">{lead.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-slate-500 font-medium">{lead.phone}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${(lead as any).score > 70 ? 'bg-green-100 text-green-700' : 'bg-brand-50 text-brand-600'}`}>
                Score: {(lead as any).score || 0}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <Icons.X size={20} />
          </button>
        </div>

        {/* STATUS QUICK ACTIONS */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
          {[LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.VISIT, LeadStatus.PROPOSAL, LeadStatus.CLOSED].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusChange(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border transition-all shadow-sm ${
                lead.status === status ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* ORIGIN CARD */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] uppercase font-bold text-slate-400 mb-2 flex items-center gap-1">
            <Icons.MapPin size={12} /> Origem do Interesse
          </p>
          <div className="flex justify-between items-center">
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-700 truncate max-w-[250px]">{originProperty?.title || 'Interesse Geral'}</p>
              <p className="text-xs text-brand-600 font-medium flex items-center gap-1 mt-1 bg-brand-50 px-2 py-1 rounded w-fit">
                <Icons.Shield size={12} /> Imóvel Oficial
              </p>
            </div>
            {originProperty && (
              <a href={`/imoveis/${(originProperty as any).slug}`} target="_blank" rel="noreferrer" className="p-2 bg-slate-50 text-slate-400 hover:text-brand-600 rounded-lg">
                <Icons.ArrowRight size={16} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-slate-100 bg-white">
        {[
          { id: 'whatsapp', label: 'WhatsApp', icon: Icons.MessageCircle },
          { id: 'timeline', label: 'Timeline', icon: Icons.Clock },
          { id: 'history', label: 'Navegação', icon: Icons.MapPin },
          { id: 'tasks', label: 'Tarefas', icon: Icons.CheckSquare },
          { id: 'info', label: 'Infos', icon: Icons.Info }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-brand-600 text-brand-600 bg-brand-50/10' : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
          >
            <tab.icon size={16} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
        
        {/* TAB: WHATSAPP */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 p-4 rounded-xl mb-4">
              <p className="text-xs text-green-800 font-bold mb-1 flex items-center gap-2">
                <Icons.MessageCircle size={14} /> Atendimento Rápido
              </p>
              <p className="text-xs text-green-700">Clique em um modelo para iniciar a conversa.</p>
            </div>
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => sendWhatsApp(tpl)}
                className="w-full text-left bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:border-green-400 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-1 h-full bg-green-500 opacity-0 group-hover:opacity-100" />
                <span className="font-bold text-slate-700 block mb-1">{tpl.title}</span>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {tpl.content.replace('{nome}', leadFirstName).replace('{imovel}', originProperty?.title || 'imóvel')}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* TAB: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            <form onSubmit={handleAddNote} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
              <textarea
                className="w-full text-sm outline-none resize-none text-slate-700"
                placeholder="Nova nota interna..." rows={2} value={newNote} onChange={(e) => setNewNote(e.target.value)}
              />
              <div className="flex justify-end mt-2 pt-2 border-t border-slate-50">
                <button type="submit" className="bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg">Salvar Nota</button>
              </div>
            </form>
            <div className="relative pl-4 border-l-2 border-slate-200 space-y-6">
              {events.map((event: any) => (
                <div key={event.id} className="relative">
                  <div className={`absolute -left-[21px] top-0 w-3 h-3 rounded-full border-2 border-white ${
                    event.type === 'whatsapp' ? 'bg-green-500' : event.type === 'note' ? 'bg-amber-400' : 'bg-blue-400'
                  }`} />
                  <p className="text-[10px] text-slate-400 mb-1">{formatDate(event.created_at)}</p>
                  <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{event.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Histórico de Sessão</h3>
            {visitedFromMetadata.length > 0 ? (
              <div className="space-y-4">
                {visitedFromMetadata.map((visit: any, i: number) => (
                  <div key={i} className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm flex justify-between items-center group">
                    <div>
                      <p className="text-sm font-bold text-slate-700">{visit.title}</p>
                      <p className="text-[10px] text-slate-400">{new Date(visit.visited_at).toLocaleString()}</p>
                    </div>
                    <a href={`/imoveis/${visit.slug}`} target="_blank" className="p-2 text-slate-300 hover:text-brand-600"><Icons.ArrowRight size={16} /></a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-sm italic">Nenhuma navegação recente.</div>
            )}
          </div>
        )}

        {/* TAB: TASKS */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
              <input
                type="text" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none"
                placeholder="Nova tarefa..." value={newTask} onChange={(e) => setNewTask(e.target.value)}
              />
              <button className="bg-brand-600 text-white p-2 rounded-lg"><Icons.Plus size={20} /></button>
            </form>
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <button onClick={() => toggleTask(task.id, task.completed)} className={`w-5 h-5 rounded border flex items-center justify-center ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}>
                  {task.completed && <Icons.CheckSquare size={12} />}
                </button>
                <span className={`text-sm flex-1 ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.title}</span>
              </div>
            ))}
          </div>
        )}

        {/* TAB: INFO & MATCHING */}
        {activeTab === 'info' && (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-4">
              <div><p className="text-xs text-slate-400">Email</p><p className="font-bold text-slate-700">{lead.email || 'Não informado'}</p></div>
              <div><p className="text-xs text-slate-400">Telefone</p><p className="font-bold text-slate-700">{lead.phone}</p></div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">Sugestões de Matching</h3>
              {loadingMatches ? <p className="text-sm text-slate-500">Buscando...</p> : (
                <div className="space-y-2">
                  {matches.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <img src={m.images?.[0] || 'https://placehold.co/100'} className="w-10 h-10 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{m.title}</p>
                        <p className="text-[10px] text-slate-500">R$ {m.price?.toLocaleString()}</p>
                      </div>
                      <a href={`/imoveis/${m.slug}`} target="_blank" className="p-1 text-slate-400"><Icons.ArrowRight size={14} /></a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeadDetailsSidebar;