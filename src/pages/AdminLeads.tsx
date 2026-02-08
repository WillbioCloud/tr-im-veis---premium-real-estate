import React, { useEffect, useMemo, useState } from 'react';
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
  DragOverlay,
  DragStartEvent,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  DropAnimation
} from '@dnd-kit/core';

// Configuração da animação suave ao soltar
const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: { opacity: '0.5' }
    }
  })
};

// === COMPONENTES INTERNOS ===

const DroppableColumn = ({
  id,
  children,
  count,
  title
}: {
  id: string;
  children: React.ReactNode;
  count: number;
  title: string;
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-80 flex flex-col h-full rounded-2xl transition-colors duration-300 ${
        isOver ? 'bg-slate-200/70 ring-2 ring-brand-400 ring-inset' : 'bg-slate-100/80'
      }`}
    >
      {/* Header da Coluna */}
      <div className="p-4 flex justify-between items-center sticky top-0 bg-inherit rounded-t-2xl z-10 backdrop-blur-sm">
        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              title === 'Novo'
                ? 'bg-blue-500'
                : title === 'Em Contato'
                ? 'bg-amber-500'
                : title === 'Fechado'
                ? 'bg-emerald-500'
                : 'bg-slate-400'
            }`}
          />
          {title}
        </h3>
        <span className="bg-white px-2.5 py-0.5 rounded-full text-xs font-bold text-slate-500 shadow-sm border border-slate-200">
          {count}
        </span>
      </div>

      {/* Área de Cards */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-3 custom-scrollbar">{children}</div>
    </div>
  );
};

// O Card agora aceita props de estilo para quando está sendo arrastado (isOverlay)
const LeadCard = ({
  lead,
  onClick,
  isAdmin,
  isOverlay = false
}: {
  lead: Lead;
  onClick?: () => void;
  isAdmin: boolean;
  isOverlay?: boolean;
}) => {
  const createdAt = (lead as any).createdAt ?? (lead as any).created_at ?? new Date().toISOString();
  const score = (lead as any).score ?? 0;
  const metadata = (lead as any).metadata;

  return (
    <div
      onClick={onClick}
      className={`
        bg-white p-4 rounded-xl border border-slate-200 group relative transition-all duration-200
        ${
          isOverlay
            ? 'shadow-2xl scale-105 rotate-2 cursor-grabbing ring-2 ring-brand-500 z-50'
            : 'shadow-sm hover:shadow-md cursor-grab hover:border-brand-300'
        }
      `}
    >
      {/* Header do Card */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <h4 className="font-bold text-slate-800 line-clamp-1 text-sm">{lead.name}</h4>
          <p className="text-[10px] text-slate-400 font-medium mt-0.5">
            {new Date(createdAt).toLocaleDateString()} •{' '}
            {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {score > 70 && (
          <span className="bg-orange-50 text-orange-600 p-1 rounded-md" title="Lead Quente">
            <Icons.Flame size={14} />
          </span>
        )}
      </div>

      {/* Badges de Origem */}
      {isAdmin && (
        <div className="mb-3 flex flex-wrap gap-1">
          {(lead as any).property?.agent ? (
            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-1 rounded border border-indigo-100 flex items-center w-fit gap-1 font-semibold">
              <Icons.User size={10} /> {(lead as any).property.agent.name.split(' ')[0]}
            </span>
          ) : (
            <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-1 rounded border border-brand-100 flex items-center w-fit gap-1 font-semibold">
              <Icons.Shield size={10} /> Imobiliária
            </span>
          )}

          {/* Badge de Histórico (Novo) */}
          {metadata?.visited_properties && metadata.visited_properties.length > 1 && (
            <span
              className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 flex items-center w-fit gap-1 font-semibold"
              title="Visitou múltiplos imóveis"
            >
              <Icons.MapPin size={10} /> +{metadata.visited_properties.length - 1} vistos
            </span>
          )}
        </div>
      )}

      {/* Mensagem Curta */}
      {(lead as any).message && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2 bg-slate-50 p-2 rounded-lg italic border border-slate-100">
          "{(lead as any).message}"
        </p>
      )}

      {/* Footer do Card */}
      <div className="flex justify-between items-center pt-2 border-t border-slate-100">
        <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
          {(lead as any).property?.title || 'Interesse Geral'}
        </p>
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${
                score > 60 ? 'bg-emerald-500' : score > 30 ? 'bg-amber-400' : 'bg-slate-300'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          <span className="text-[10px] font-bold text-slate-600">{score}</span>
        </div>
      </div>
    </div>
  );
};

// Wrapper para DND Kit
const DraggableCardWrapper = ({ lead, onClick, isAdmin }: { lead: Lead; onClick: () => void; isAdmin: boolean }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        className="opacity-30 grayscale p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl h-[160px]"
      >
        {/* Placeholder vazio onde o card estava */}
      </div>
    );
  }

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <LeadCard lead={lead} onClick={onClick} isAdmin={isAdmin} />
    </div>
  );
};

// === PÁGINA PRINCIPAL ===

const AdminLeads: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'admin';

  const [leads, setLeads] = useState<Lead[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null); // ID do card sendo arrastado
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Sensores (Mouse e Touch)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const fetchLeads = async () => {
    // O Supabase vai aplicar as regras de segurança automaticamente aqui
    const { data } = await supabase
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
    
    if (data) setLeads(data as any);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Eventos de Drag & Drop
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as LeadStatus;
    const lead = leads.find((l) => l.id === leadId);

    if (lead && lead.status !== newStatus) {
      // Atualização Otimista (Visual instantâneo)
      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));

      // Atualização no Banco
      await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
    }
  };

  const activeLead = useMemo(() => (activeId ? leads.find((l) => l.id === activeId) : null), [activeId, leads]);

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col animate-fade-in">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-2xl font-serif font-bold text-slate-800 flex items-center gap-2">
            Gestão de Leads <Icons.Info size={16} className="text-slate-400" />
          </h1>
          <p className="text-sm text-slate-500">Arraste os cards para atualizar o status.</p>
        </div>

        {/* Botão de Auto Distribuição (Admin) - Mantido igual */}
        {isAdmin && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-xs font-bold text-slate-600">Auto Distribuição</span>
            <div className="w-8 h-4 bg-brand-600 rounded-full relative cursor-pointer" title={(TOOLTIPS as any)?.autoAssign}>
              <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div>
            </div>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          <div className="flex h-full gap-6 min-w-max px-1">
            {Object.values(LeadStatus).map((status) => (
              <DroppableColumn
                key={status as any}
                id={status as any}
                title={status as any}
                count={leads.filter((l) => l.status === status).length}
              >
                {leads
                  .filter((l) => l.status === status)
                  .map((lead) => (
                    <DraggableCardWrapper
                      key={lead.id}
                      lead={lead}
                      isAdmin={isAdmin}
                      onClick={() => setSelectedLead(lead)}
                    />
                  ))}
              </DroppableColumn>
            ))}
          </div>
        </div>

        {/* O Segredo da Animação Lisa: DragOverlay */}
        <DragOverlay dropAnimation={dropAnimation}>
          {activeLead ? <LeadCard lead={activeLead} isAdmin={isAdmin} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Sidebar de Detalhes */}
      {selectedLead && (
        <LeadDetailsSidebar
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusChange={async (status) => {
            setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? { ...l, status } : l)));
            await supabase.from('leads').update({ status }).eq('id', selectedLead.id);
            // Atualiza o lead selecionado também para refletir a mudança na sidebar
            setSelectedLead({ ...(selectedLead as any), status } as any);
          }}
        />
      )}
    </div>
  );
};

export default AdminLeads;
