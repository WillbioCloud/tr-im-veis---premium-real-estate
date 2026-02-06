import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus } from '../types';
import { Icons } from '../components/Icons';
import LeadDetailsSidebar from '../components/LeadDetailsSidebar';
import { useAuth } from '../contexts/AuthContext';
import { TOOLTIPS } from '../constants/tooltips';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';

// === COMPONENTES DE APOIO ===

// 1. Tooltip (Balão de Ajuda)
const InfoTooltip = ({ text }: { text: string }) => (
  <div className="group relative inline-flex items-center ml-2 z-20">
    <Icons.Info size={14} className="text-slate-400 cursor-help hover:text-brand-500 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl group-hover:block z-50 text-center leading-relaxed font-normal">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 h-2 w-2 -rotate-45 bg-slate-800"></div>
    </div>
  </div>
);

// 2. Coluna do Kanban (Droppable)
const DroppableColumn = ({ id, children, className, count, title }: { id: string; children: React.ReactNode; className?: string; count: number; title: string }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-w-[300px] bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col h-full ${
        isOver ? 'ring-2 ring-brand-400 bg-brand-50' : ''
      } transition-all`}
    >
      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide flex items-center">
          {title}
        </h3>
        <span className="bg-white px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-100">
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
        {children}
      </div>
    </div>
  );
};

// 3. Card do Lead (Draggable)
const DraggableCard = ({ lead, onClick, isAdmin }: { lead: Lead; onClick: () => void; isAdmin: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className={`bg-white p-4 rounded-xl shadow-sm border border-slate-100 group cursor-grab active:cursor-grabbing hover:shadow-md transition-all hover:-translate-y-1 relative ${
        isDragging ? 'opacity-50 rotate-3 scale-105 z-50' : ''
      }`}
    >
      {/* Header do Card */}
      <div className="flex justify-between items-start mb-2">
        <h4 className="font-bold text-slate-800 line-clamp-1">{lead.name}</h4>
        {lead.score > 70 && <Icons.Flame size={14} className="text-orange-500" title="Lead Quente!" />}
      </div>

      {/* Badges de Origem (Só Admin Vê) */}
      {isAdmin && (
        <div className="mb-3">
          {lead.property?.agent ? (
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-bold border border-indigo-100 flex items-center w-fit gap-1">
              <Icons.User size={10} /> De: {lead.property.agent.name.split(' ')[0]}
            </span>
          ) : (
            <span className="text-[10px] bg-brand-50 text-brand-600 px-2 py-1 rounded-md font-bold border border-brand-100 flex items-center w-fit gap-1">
              <Icons.Shield size={10} /> Oficial
            </span>
          )}
        </div>
      )}

      {/* Mensagem e Data */}
      <p className="text-xs text-slate-500 mb-3 line-clamp-2 italic">
        "{lead.message || 'Sem mensagem'}"
      </p>
      
      <div className="flex justify-between items-center border-t border-slate-50 pt-2 mt-2">
        <span className="text-[10px] text-slate-400 font-medium">
          {new Date(lead.createdAt).toLocaleDateString()}
        </span>
        <div className="flex items-center gap-1">
          <div className={`w-1.5 h-1.5 rounded-full ${lead.score > 50 ? 'bg-green-500' : 'bg-amber-400'}`}></div>
          <span className="text-xs font-bold text-slate-600">{lead.score} pts</span>
        </div>
      </div>
    </div>
  );
};

// === COMPONENTE PRINCIPAL ===

const AdminLeads: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [autoDistribution, setAutoDistribution] = useState(true);

  // DnD Sensors (Para evitar bugs de clique vs arraste)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const fetchLeads = async () => {
    setLoading(true);
    // Query inteligente que traz dados do imóvel e do corretor dono
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        property:properties (
          title,
          agent_id,
          agent:profiles (name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) console.error('Erro:', error);
    else setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Lógica ao soltar o card
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as LeadStatus;
    const lead = leads.find(l => l.id === leadId);

    if (lead && lead.status !== newStatus) {
      // Atualiza visualmente (Otimista)
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));

      // Salva no banco
      const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
      if (error) {
        console.error('Erro ao mover:', error);
        fetchLeads(); // Reverte em caso de erro
      }
    }
  };

  const getLeadsByStatus = (status: LeadStatus) => leads.filter(l => l.status === status);

  return (
    <div className="space-y-8 animate-fade-in pb-20 h-full flex flex-col">
      
      {/* === CABEÇALHO === */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-3xl font-serif font-bold text-slate-800 flex items-center">
            Gestão de Leads
            <InfoTooltip text={TOOLTIPS.leads.pageTitle} />
          </h1>
          <p className="text-slate-500 mt-1">Acompanhe seu funil de vendas em tempo real.</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Controle de Distribuição (Apenas Admin) */}
          {isAdmin && (
            <div className="hidden md:flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm mr-2">
              <span className="text-sm font-bold text-slate-600 flex items-center gap-1">
                Distribuição Automática
                <InfoTooltip text={TOOLTIPS.leads.distribution} />
              </span>
              <button 
                onClick={() => setAutoDistribution(!autoDistribution)}
                className={`w-11 h-6 rounded-full p-1 transition-all duration-300 ${autoDistribution ? 'bg-brand-600' : 'bg-slate-300'}`}
              >
                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${autoDistribution ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          )}

          {/* Troca de Visualização */}
          <div className="bg-white border border-slate-200 p-1 rounded-xl flex shadow-sm">
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-slate-100 text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Lista"
            >
              <Icons.Menu size={20} />
            </button>
            <button 
              onClick={() => setViewMode('kanban')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'kanban' ? 'bg-slate-100 text-brand-600' : 'text-slate-400 hover:text-slate-600'}`}
              title="Kanban"
            >
              <Icons.LayoutDashboard size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* === ÁREA PRINCIPAL === */}
      {viewMode === 'list' ? (
        // === MODO LISTA ===
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex-1">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left p-4 font-bold text-slate-600 text-sm">Cliente</th>
                  <th className="text-left p-4 font-bold text-slate-600 text-sm flex items-center">
                    Score <InfoTooltip text={TOOLTIPS.leads.table.score} />
                  </th>
                  <th className="text-left p-4 font-bold text-slate-600 text-sm flex items-center">
                    Status <InfoTooltip text={TOOLTIPS.leads.table.status} />
                  </th>
                  
                  {/* Coluna Exclusiva Admin */}
                  {isAdmin && (
                    <th className="text-left p-4 font-bold text-slate-600 text-sm flex items-center">
                      Origem <InfoTooltip text={TOOLTIPS.leads.table.origin} />
                    </th>
                  )}
                  
                  <th className="text-left p-4 font-bold text-slate-600 text-sm">Interesse</th>
                  <th className="text-right p-4 font-bold text-slate-600 text-sm">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedLead(lead)}>
                    <td className="p-4">
                      <p className="font-bold text-slate-800">{lead.name}</p>
                      <p className="text-xs text-slate-400 font-medium">{lead.phone}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-slate-100 rounded-full w-16 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${lead.score > 70 ? 'bg-green-500' : lead.score > 40 ? 'bg-amber-500' : 'bg-slate-300'}`} 
                            style={{ width: `${lead.score}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{lead.score}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider
                        ${lead.status === LeadStatus.NEW ? 'bg-blue-100 text-blue-700' : 
                          lead.status === LeadStatus.CLOSED ? 'bg-green-100 text-green-700' : 
                          lead.status === LeadStatus.LOST ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}
                      `}>
                        {lead.status}
                      </span>
                    </td>

                    {/* Dados da Origem (Admin) */}
                    {isAdmin && (
                      <td className="p-4">
                        {lead.property?.agent ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-100">
                              {lead.property.agent.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700">{lead.property.agent.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium uppercase">Parceiro</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center text-xs font-bold border border-brand-100">
                              <Icons.Shield size={14} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-700">TR Imóveis</p>
                              <p className="text-[10px] text-slate-400 font-medium uppercase">Oficial</p>
                            </div>
                          </div>
                        )}
                      </td>
                    )}

                    <td className="p-4">
                      <p className="text-sm text-slate-600 truncate max-w-[180px]" title={lead.property?.title}>
                        {lead.property?.title || 'Interesse Geral'}
                      </p>
                    </td>
                    <td className="p-4 text-right">
                      <button className="text-slate-400 hover:text-brand-600 p-2 rounded-full hover:bg-slate-100 transition-colors">
                        <Icons.ArrowRight size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        // === MODO KANBAN (DnD) ===
        <div className="flex-1 overflow-x-auto pb-4">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full min-w-max pb-2">
              {Object.values(LeadStatus).map(status => (
                <DroppableColumn 
                  key={status} 
                  id={status} 
                  title={status} 
                  count={getLeadsByStatus(status).length}
                >
                  {getLeadsByStatus(status).map(lead => (
                    <DraggableCard 
                      key={lead.id} 
                      lead={lead} 
                      isAdmin={isAdmin}
                      onClick={() => setSelectedLead(lead)} 
                    />
                  ))}
                </DroppableColumn>
              ))}
            </div>
          </DndContext>
        </div>
      )}

      {/* Sidebar de Detalhes */}
      {selectedLead && (
        <LeadDetailsSidebar 
          lead={selectedLead} 
          onClose={() => setSelectedLead(null)} 
          onStatusChange={async (newStatus) => {
            // Atualização rápida
            setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status: newStatus } : l));
            const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', selectedLead.id);
            if (error) fetchLeads();
          }}
        />
      )}
    </div>
  );
};

export default AdminLeads;