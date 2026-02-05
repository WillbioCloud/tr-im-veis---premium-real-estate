import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, Task, TimelineEvent, LeadStatus, Property } from '../types';
import { Icons } from './Icons';

interface LeadDetailsSidebarProps {
  lead: Lead;
  onClose: () => void;
  onUpdate: () => void;
}

// Interface local para os templates
interface Template {
  id: string;
  title: string;
  content: string;
}

const LeadDetailsSidebar: React.FC<LeadDetailsSidebarProps> = ({ lead, onClose, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'info' | 'activity' | 'timeline'>('info');
  const [originProperty, setOriginProperty] = useState<Property | null>(null);
  const [viewedProperties, setViewedProperties] = useState<Property[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [matches, setMatches] = useState<Property[]>([]);
  const [interestedProperty, setInterestedProperty] = useState<Property | null>(null); // Imóvel de interesse
  const [newTaskText, setNewTaskText] = useState('');
  const [newNote, setNewNote] = useState('');
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Estados para o Modal de Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Carregar dados ao abrir
  useEffect(() => {
    if (lead?.id) {
      fetchFullLeadData();
      fetchTemplates(); // Já deixa os templates prontos
    }
  }, [lead]);

  const fetchTasks = async () => {
    const { data } = await supabase.from('tasks').select('*').eq('lead_id', lead.id).order('due_date', { ascending: true });
    if (data) setTasks(data as any);
  };

  const fetchTimeline = async () => {
    const { data } = await supabase.from('timeline_events').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false });
    if (data) setTimeline(data as any);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from('message_templates').select('*').eq('active', true);
    if (data) setTemplates(data as any);
  };


  const fetchFullLeadData = async () => {
    // 1) Dados básicos
    await Promise.all([fetchTasks(), fetchTimeline()]);

    // 2) Imóvel de origem (onde ele enviou o form)
    const propId = lead.propertyId || (lead as any).property_id;
    if (propId) {
      const { data: origin } = await supabase.from('properties').select('*').eq('id', propId).single();
      if (origin) {
        setOriginProperty(origin as any);
        setInterestedProperty(origin as any); // mantém compatibilidade com templates
        fetchMatches(origin as any); // busca similares baseado no imóvel de origem
      }
    } else {
      setOriginProperty(null);
    }

    // 3) Histórico de navegação (lead_interests)
    const { data: interests } = await supabase
      .from('lead_interests')
      .select('property:properties(*)')
      .eq('lead_id', lead.id);

    if (interests) {
      const props = (interests as any[]).map((i: any) => i.property).filter(Boolean);
      setViewedProperties(props as any);
    } else {
      setViewedProperties([]);
    }
  };

  const fetchMatches = async (origin: Property) => {
    setLoadingMatches(true);
    try {
      const minPrice = origin.price * 0.8;
      const maxPrice = origin.price * 1.2;

      const { data: similar } = await supabase
        .from('properties')
        .select('*')
        .eq('location->>city', origin.location?.city || (origin as any).city)
        .eq('type', origin.type)
        .neq('id', origin.id)
        .gte('price', minPrice)
        .lte('price', maxPrice)
        .limit(5);

      if (similar) setMatches(similar as any);
      else setMatches([]);
    } catch (err) {
      console.error('Erro no matching:', err);
      setMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  };


  // === LÓGICA DE ENVIO DO WHATSAPP ===
  const handleWhatsAppClick = () => {
    // Se tiver templates, abre o modal. Se não, abre direto.
    if (templates.length > 0) {
      setShowTemplateModal(true);
    } else {
      openWhatsAppDirectly();
    }
  };

  const openWhatsAppDirectly = () => {
    if (!lead.phone) return;
    const cleanPhone = lead.phone.replace(/\D/g,'');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const sendTemplate = async (template: Template) => {
    if (!lead.phone) return;
    
    // 1. Prepara a mensagem
    let message = template.content;
    message = message.replace(/{nome}/g, lead.name.split(' ')[0]);
    message = message.replace(/{imovel}/g, interestedProperty?.title || 'imóvel');

    // 2. Abre o WhatsApp
    const cleanPhone = lead.phone.replace(/\D/g,'');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    
    // 3. Salva na Timeline (O que faltou aparecer antes)
    await addTimelineLog('whatsapp', `Enviou msg: ${template.title}`);
    
    // 4. AUTOMAÇÃO: Muda o status para "Em Atendimento" se o lead for "Novo"
    // Isso responde sua dúvida: sim, é uma mudança de status!
    if (lead.status === LeadStatus.NEW) {
      const { error } = await supabase
        .from('leads')
        .update({ status: LeadStatus.QUALIFYING }) // Move para 'Qualificando'
        .eq('id', lead.id);
        
      if (!error) {
        // Atualiza a tela para o corretor ver a mudança na hora
        onUpdate(); // Atualiza o Kanban atrás
        // Opcional: Adiciona log de mudança de status também
        await addTimelineLog('status_change', 'Status alterado automaticamente para Em Atendimento');
      }
    }

    setShowTemplateModal(false);
  };

  // ... (Resto das funções: handleAddTask, toggleTask, handleAddNote, addTimelineLog, updateLeadValue, shareProperty)
  // MANTENHA AS OUTRAS FUNÇÕES AQUI IGUAL AO ANTERIOR
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    const { error } = await supabase.from('tasks').insert([{
      title: newTaskText, lead_id: lead.id, type: 'call', due_date: new Date().toISOString()
    }]);
    if (!error) { setNewTaskText(''); fetchTasks(); await addTimelineLog('system', `Criou a tarefa: ${newTaskText}`); }
  };

  const toggleTask = async (task: Task) => {
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);
    fetchTasks();
    if (!task.completed) await addTimelineLog('system', `Concluiu a tarefa: ${task.title}`);
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addTimelineLog('note', newNote);
    setNewNote('');
  };

  const addTimelineLog = async (type: string, description: string) => {
    await supabase.from('timeline_events').insert([{ lead_id: lead.id, type, description }]);
    fetchTimeline();
  };

  const updateLeadValue = async (field: string, value: any) => {
    await supabase.from('leads').update({ [field]: value }).eq('id', lead.id);
    onUpdate();
  };

  const shareProperty = (property: Property) => {
    const text = `Olá ${lead.name.split(' ')[0]}, encontrei este outro imóvel que tem exatamente o perfil que você procura: ${window.location.origin}/imoveis/${property.slug}`;
    window.open(`https://wa.me/${lead.phone.replace(/\D/g,'')}?text=${encodeURIComponent(text)}`, '_blank');
    addTimelineLog('whatsapp', `Enviou sugestão: ${property.title}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-slate-50">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-slate-800">{lead.name}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                lead.status === LeadStatus.NEW ? 'bg-blue-100 text-blue-700' : 
                lead.status === LeadStatus.CLOSED ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {lead.status}
              </span>
            </div>
            <div className="flex gap-4 text-sm text-gray-500">
               {lead.email && <span className="flex items-center gap-1"><Icons.Mail size={14}/> {lead.email}</span>}
               {lead.phone && <span className="flex items-center gap-1"><Icons.Phone size={14}/> {lead.phone}</span>}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><Icons.X /></button>
        </div>

        {/* Quick Actions (COM O BOTÃO WHATSAPP NOVO) */}
        <div className="grid grid-cols-3 gap-4 p-4 border-b border-gray-100 bg-white">
          <div className="p-3 bg-gray-50 rounded-lg">
             <label className="text-xs font-bold text-gray-400 uppercase">Valor (R$)</label>
             <div className="flex items-center gap-2 mt-1">
               <Icons.DollarSign size={16} className="text-green-600"/>
               <input 
                 type="number" 
                 className="bg-transparent font-bold text-slate-800 w-full outline-none"
                 defaultValue={lead.value || ''}
                 onBlur={(e) => updateLeadValue('value', Number(e.target.value))}
               />
             </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
             <label className="text-xs font-bold text-gray-400 uppercase">Probabilidade</label>
             <div className="flex items-center gap-2 mt-1">
               <Icons.TrendingUp size={16} className="text-blue-600"/>
               <select 
                 className="bg-transparent font-bold text-slate-800 w-full outline-none"
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
          
          {/* BOTÃO WHATSAPP INTELIGENTE */}
          <div className="p-3 bg-gray-50 rounded-lg flex items-center justify-center cursor-pointer hover:bg-green-50 border border-transparent hover:border-green-200 transition-all group"
               onClick={handleWhatsAppClick} // <--- Chamando a função nova
          >
             <div className="text-center">
                <Icons.MessageCircle size={24} className="mx-auto text-green-500 group-hover:scale-110 transition-transform mb-1"/>
                <span className="text-xs font-bold text-green-700">WhatsApp</span>
             </div>
          </div>
        </div>

        {/* Tabs - Agora com "Interesse" primeiro */}
        <div className="flex border-b border-gray-200 px-4 bg-white">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'info'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Interesse
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Tarefas
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 py-4 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'timeline'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Timeline
          </button>
        </div>

{/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 relative">
          
          {/* ... (Todo o conteúdo das Tabs Activity e Timeline igual ao anterior) ... */}
          
          {/* === ABA DE INFORMAÇÕES (IMÓVEIS) === */}
          {activeTab === 'info' && (
            <div className="space-y-8">
              {/* Imóvel de Origem (Card Grande) */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  Imóvel de Origem (Lead)
                </h3>
                {originProperty ? (
                  <div className="bg-white rounded-xl shadow-sm border border-brand-200 overflow-hidden flex flex-col md:flex-row">
                    <div className="w-full md:w-40 h-32 relative">
                      <img
                        src={originProperty.images?.[0] || 'https://via.placeholder.com/300'}
                        className="w-full h-full object-cover"
                        alt={originProperty.title}
                      />
                      <div className="absolute top-2 left-2 bg-brand-500 text-white text-xs font-bold px-2 py-1 rounded">
                        Ref: {originProperty.id.slice(0, 6)}
                      </div>
                    </div>
                    <div className="p-4 flex-1">
                      <h4 className="font-bold text-slate-800 text-lg mb-1">{originProperty.title}</h4>
                      <p className="text-2xl font-serif font-bold text-brand-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originProperty.price)}
                      </p>
                      <p className="text-sm text-gray-500 mt-2">
                        {originProperty.location?.neighborhood}, {originProperty.location?.city}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-100 p-4 rounded-lg text-center text-gray-500">
                    Nenhum imóvel vinculado diretamente.
                  </div>
                )}
              </div>

              {/* Histórico de Navegação (Outros Vistos) */}
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Icons.Activity size={14} /> Histórico de Navegação ({viewedProperties.length})
                </h3>

                {viewedProperties.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {viewedProperties
                      .filter(p => p?.id && p.id !== originProperty?.id)
                      .map(prop => (
                        <div
                          key={prop.id}
                          className="bg-white p-3 rounded-lg border border-gray-200 flex items-center gap-3 opacity-80 hover:opacity-100 transition-opacity"
                        >
                          <img src={prop.images?.[0] || 'https://via.placeholder.com/80'} className="w-12 h-12 rounded object-cover" alt="" />
                          <div className="flex-1">
                            <p className="font-bold text-sm text-slate-700 line-clamp-1">{prop.title}</p>
                            <p className="text-xs text-green-600 font-bold">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prop.price)}
                            </p>
                          </div>
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded">Visto</span>
                        </div>
                      ))}

                    {viewedProperties.filter(p => p?.id && p.id !== originProperty?.id).length === 0 && (
                      <p className="text-sm text-gray-400 italic">Cliente só visualizou o imóvel de origem.</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Sem histórico de navegação rastreado.</p>
                )}
              </div>

              {/* Smart Match (Sugestões) */}
              <div className="pt-6 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Oportunidades Similares (Smart Match)</h3>
                  <span className="text-xs bg-brand-100 text-brand-700 px-2 py-1 rounded-full font-bold">
                    {matches.length} encontrados
                  </span>
                </div>

                {loadingMatches ? (
                  <div className="text-center py-10 animate-pulse text-gray-400">Buscando...</div>
                ) : matches.length > 0 ? (
                  <div className="space-y-3">
                    {matches.map(property => (
                      <div
                        key={property.id}
                        className="bg-white p-3 rounded-lg border border-gray-200 hover:border-brand-300 transition-colors group"
                      >
                        <div className="flex gap-3">
                          <img
                            src={property.images?.[0] || 'https://via.placeholder.com/100'}
                            alt=""
                            className="w-20 h-20 object-cover rounded-md"
                          />
                          <div className="flex-1">
                            <h4 className="font-bold text-slate-800 text-sm line-clamp-1">{property.title}</h4>
                            <p className="text-brand-600 font-bold text-sm">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => shareProperty(property)}
                          className="w-full mt-3 bg-green-50 text-green-700 border border-green-200 py-2 rounded flex items-center justify-center gap-2 text-xs font-bold hover:bg-green-100 transition-colors"
                        >
                          <Icons.MessageCircle size={14} /> Sugerir via WhatsApp
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Nenhuma oportunidade encontrada para esse perfil.</p>
                )}
              </div>
            </div>
          )}

{activeTab === 'activity' && (
             <div className="space-y-6">
               <form onSubmit={handleAddTask} className="flex gap-2">
                 <input type="text" placeholder="Nova tarefa..." className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-brand-500 outline-none" value={newTaskText} onChange={e => setNewTaskText(e.target.value)}/>
                 <button type="submit" className="bg-slate-900 text-white px-4 rounded-lg"><Icons.Plus /></button>
               </form>
               <div className="space-y-2">
                 {tasks.map(task => (
                   <div key={task.id} className="bg-white p-3 rounded-lg border border-gray-200 flex items-center gap-3">
                     <input type="checkbox" className="w-5 h-5 accent-brand-500 cursor-pointer" checked={task.completed} onChange={() => toggleTask(task)}/>
                     <span className={task.completed ? "text-gray-400 line-through" : "text-slate-700"}>{task.title}</span>
                   </div>
                 ))}
               </div>
            </div>
          )}

          {activeTab === 'timeline' && (
             <div className="space-y-6">
              <div className="bg-white p-4 rounded-lg border border-gray-200">
                <textarea placeholder="Nota rápida..." className="w-full text-sm outline-none resize-none h-20" value={newNote} onChange={e => setNewNote(e.target.value)}/>
                <button onClick={handleAddNote} className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded mt-2">Salvar</button>
              </div>
              <div className="relative border-l-2 border-gray-200 ml-4 space-y-6 pl-6">
                {timeline.map((event) => (
                  <div key={event.id} className="relative">
                    <div className={`absolute -left-[33px] top-1 w-4 h-4 rounded-full border-2 border-white ${event.type === 'status_change' ? 'bg-blue-500' : event.type === 'whatsapp' ? 'bg-green-500' : 'bg-gray-400'}`} />
                    <p className="text-xs text-gray-400 mb-1">{new Date(event.created_at).toLocaleString('pt-BR')}</p>
                    <div className="bg-white p-3 rounded-lg border border-gray-100 text-sm text-slate-700">{event.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* MODAL DE TEMPLATES (FLUTUANTE) */}
          {showTemplateModal && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
               <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-4 animate-slide-up">
                 <div className="flex justify-between items-center mb-4">
                   <h3 className="font-bold text-slate-800">Escolha uma mensagem</h3>
                   <button onClick={() => setShowTemplateModal(false)}><Icons.X className="text-gray-400 hover:text-gray-600"/></button>
                 </div>
                 
                 <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                   {templates.map(tpl => (
                     <button 
                       key={tpl.id}
                       onClick={() => sendTemplate(tpl)}
                       className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-brand-50 hover:border-brand-200 transition-all group"
                     >
                       <p className="font-bold text-slate-800 text-sm">{tpl.title}</p>
                       <p className="text-xs text-gray-500 line-clamp-2 mt-1 group-hover:text-slate-600">
                         {tpl.content.replace('{nome}', lead.name.split(' ')[0]).replace('{imovel}', interestedProperty?.title || 'imóvel')}
                       </p>
                     </button>
                   ))}
                 </div>

                 <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                   <button onClick={openWhatsAppDirectly} className="text-xs text-gray-400 hover:text-green-600 font-medium">
                     Ou abrir conversa em branco
                   </button>
                 </div>
               </div>
            </div>
          )}

        </div>
      </div>
      <style>{`
        @keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slideInRight 0.3s ease-out forwards; }
        .animate-slide-up { animation: slideUp 0.3s ease-out forwards; }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
    </div>
  );
};

export default LeadDetailsSidebar;