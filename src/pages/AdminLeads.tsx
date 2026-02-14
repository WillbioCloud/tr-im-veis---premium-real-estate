import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus } from '../types';
import { Icons } from '../components/Icons';
import LeadDetailsSidebar from '../components/LeadDetailsSidebar';
import { useAuth } from '../contexts/AuthContext';
import { TOOLTIPS } from '../constants/tooltips';
import Loading from '../components/Loading';
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


const isAbortError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;
  const maybe = error as { name?: string; message?: string };
  return maybe.name === 'AbortError' || maybe.message?.includes('AbortError') === true;
};

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

        {metadata?.visited_properties && metadata.visited_properties.length > 1 && (
          <span
            className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200 flex items-center w-fit gap-1 font-semibold"
            title="Visitou múltiplos imóveis"
          >
            <Icons.MapPin size={10} /> +{metadata.visited_properties.length - 1} vistos
          </span>
        )}
      </div>

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
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [closingLead, setClosingLead] = useState<Lead | null>(null);
  const [dealValue, setDealValue] = useState('');
  const [isCustomValue, setIsCustomValue] = useState(false);
  const [savingClosing, setSavingClosing] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const fetchLeads = async () => {
    if (!user?.id) return;

    const shouldShowInitialLoading = leads.length === 0;
    if (shouldShowInitialLoading) {
      setLoading(true);
    }

    let aborted = false;

    try {
      let query = supabase
        .from('leads')
        .select(`
          *,
          property:properties (
            title,
            price,
            agent_id,
            agent:profiles (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        query = query.eq('assigned_to', user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) setLeads(data as Lead[]);
    } catch (error) {
      if (isAbortError(error)) {
        aborted = true;
        return;
      }

      console.error('Erro ao buscar leads:', error);
    } finally {
      if (!aborted && shouldShowInitialLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeads();
    }
  }, [user]);

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
      if (newStatus === LeadStatus.CLOSED) {
        const suggestedValue = Number((lead as any)?.property?.price || 0);
        setClosingLead(lead);
        setIsCustomValue(false);
        setDealValue(suggestedValue > 0 ? String(Math.round(suggestedValue)) : '');
        return;
      }

      setLeads((prev) => prev.map((l) => (l.id === leadId ? { ...l, status: newStatus } : l)));
      await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
    }
  };

  const handleConfirmClosing = async () => {
    if (!closingLead) return;

    setSavingClosing(true);
    const parsedValue = Number(String(dealValue).replace(/\./g, '').replace(',', '.')) || 0;

    await supabase
      .from('leads')
      .update({ status: LeadStatus.CLOSED, deal_value: parsedValue })
      .eq('id', closingLead.id);

    setClosingLead(null);
    setDealValue('');
    setIsCustomValue(false);
    await fetchLeads();
    setSavingClosing(false);
  };

  const activeLead = useMemo(() => (activeId ? leads.find((l) => l.id === activeId) : null), [activeId, leads]);
  const selectedLeadHistory = useMemo(() => {
    const visited = (selectedLead as { metadata?: { visited_properties?: unknown } } | null)?.metadata?.visited_properties;
    if (!Array.isArray(visited)) return [];

    return visited.filter((item): item is { title: string; slug: string; visited_at: string } => {
      if (!item || typeof item !== 'object') return false;
      const candidate = item as { title?: unknown; slug?: unknown; visited_at?: unknown };
      return (
        typeof candidate.title === 'string' &&
        typeof candidate.slug === 'string' &&
        typeof candidate.visited_at === 'string'
      );
    });
  }, [selectedLead]);

  if (loading && leads.length === 0) return <Loading />;

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col animate-fade-in">
      <div className="mb-6 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-800 flex items-center gap-2">
              Gestão de Leads <Icons.Info size={16} className="text-slate-400" />
            </h1>
            <p className="text-sm text-slate-500">Arraste os cards para atualizar o status.</p>
          </div>
          
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${
            isAdmin 
              ? 'bg-purple-50 text-purple-700 border-purple-200' 
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            {isAdmin ? 'Visão Admin (Total)' : 'Meus Leads'}
          </span>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-xs font-bold text-slate-600">Auto Distribuição</span>
            <div className="w-8 h-4 bg-brand-600 rounded-full relative cursor-pointer">
              <div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full shadow-sm"></div>
            </div>
          </div>
        )}
      </div>

      {selectedLead && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">
            Histórico de navegação: {selectedLead.name}
          </p>
          {selectedLeadHistory.length > 0 ? (
            <ul className="space-y-1 text-sm text-slate-600">
              {selectedLeadHistory.slice(0, 5).map((visit, index) => (
                <li key={`${visit.slug}-${visit.visited_at}-${index}`} className="flex justify-between gap-2">
                  <span className="truncate">{visit.title}</span>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(visit.visited_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic">Sem histórico registrado no metadata.</p>
          )}
        </div>
      )}

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

        <DragOverlay dropAnimation={dropAnimation}>
          {activeLead ? <LeadCard lead={activeLead} isAdmin={isAdmin} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {selectedLead && (
        <LeadDetailsSidebar
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusChange={async (status) => {
            setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? { ...l, status } : l)));
            await supabase.from('leads').update({ status }).eq('id', selectedLead.id);
            setSelectedLead({ ...(selectedLead as any), status } as any);
          }}
        />
      )}

      {closingLead && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Confirmar Fechamento</h3>
              <p className="text-sm text-slate-500 mt-1">Lead: <span className="font-semibold text-slate-700">{closingLead.name}</span></p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-slate-700">Vendeu o imóvel de interesse?</p>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="closing-value"
                  checked={!isCustomValue}
                  onChange={() => {
                    setIsCustomValue(false);
                    const suggestedValue = Number((closingLead as any)?.property?.price || 0);
                    setDealValue(suggestedValue > 0 ? String(Math.round(suggestedValue)) : '');
                  }}
                />
                Sim
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="closing-value"
                  checked={isCustomValue}
                  onChange={() => setIsCustomValue(true)}
                />
                Não - Outro Valor
              </label>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor do Fechamento</label>
              <input
                type="number"
                min={0}
                step="0.01"
                className="w-full px-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-brand-500"
                value={dealValue}
                onChange={(e) => setDealValue(e.target.value)}
                placeholder="Ex: 850000"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setClosingLead(null);
                  setDealValue('');
                  setIsCustomValue(false);
                }}
                className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClosing}
                disabled={savingClosing}
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-60"
              >
                {savingClosing ? 'Confirmando...' : 'Confirmar Venda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeads;
