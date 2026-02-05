import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus } from '../types';
import { Icons } from '../components/Icons';
import LeadDetailsSidebar from '../components/LeadDetailsSidebar';
import { DndContext, useDraggable, useDroppable, DragEndEvent, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';

// === COMPONENTES INTERNOS (DND) ===
const DroppableColumn = ({ id, children, className }: { id: string, children: React.ReactNode, className?: string }) => {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`${className} ${isOver ? 'ring-2 ring-brand-400 bg-brand-50' : ''} transition-all`}>
      {children}
    </div>
  );
};

const DraggableCard = ({ lead, onClick, onDelete, temp }: { lead: Lead, onClick: () => void, onDelete: (e: any) => void, temp: any }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: lead.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 999 } : undefined;

  return (
    <div 
      ref={setNodeRef} style={style} {...listeners} {...attributes} onClick={onClick}
      className={`bg-white p-3 rounded-lg shadow-sm border border-gray-100 group relative overflow-hidden cursor-grab active:cursor-grabbing touch-none ${isDragging ? 'opacity-50 rotate-3 scale-105 shadow-2xl' : 'hover:shadow-md hover:border-brand-300'}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${temp.barColor}`}></div>
      <div className="flex justify-between items-start mb-2 pl-2">
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${temp.bg} ${temp.color}`}>
          <temp.icon size={10} /> {temp.label} ({lead.score || 50})
        </div>
        <button onPointerDown={(e) => e.stopPropagation()} onClick={onDelete} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
          <Icons.X size={14} />
        </button>
      </div>
      <div className="pl-2">
        <h4 className="font-bold text-slate-800 leading-tight">{lead.name}</h4>
        {lead.value && lead.value > 0 && <p className="text-xs font-bold text-green-600 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value)}</p>}
        <div className="text-xs text-gray-500 space-y-1 mt-2 pb-2 border-b border-gray-50">
          {lead.phone && <p className="flex items-center gap-1.5 truncate"><Icons.Phone size={10} /> {lead.phone}</p>}
        </div>
        <div className="mt-2 flex justify-between items-center">
           <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{lead.source || 'Site'}</span>
        </div>
      </div>
    </div>
  );
};

const COLUMNS = [
  { id: LeadStatus.NEW, label: 'Novos', color: 'border-blue-500' },
  { id: LeadStatus.QUALIFYING, label: 'Em Atendimento', color: 'border-amber-500' },
  { id: LeadStatus.VISIT, label: 'Visitas', color: 'border-purple-500' },
  { id: LeadStatus.PROPOSAL, label: 'Propostas', color: 'border-green-500' },
  { id: LeadStatus.CLOSED, label: 'Fechados', color: 'border-emerald-600 bg-emerald-50' },
  { id: LeadStatus.LOST, label: 'Perdidos', color: 'border-red-200 opacity-70' },
];

const getLeadTemperature = (score: number = 50) => {
  if (score >= 80) return { label: 'Quente', color: 'text-red-500', bg: 'bg-red-50', icon: Icons.TrendingUp, barColor: 'bg-red-500' };
  if (score >= 40) return { label: 'Morno', color: 'text-amber-500', bg: 'bg-amber-50', icon: Icons.Activity, barColor: 'bg-amber-500' };
  return { label: 'Frio', color: 'text-blue-400', bg: 'bg-blue-50', icon: Icons.Clock, barColor: 'bg-blue-300' };
};

const AdminLeads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({ name: '', phone: '', source: 'Manual' });
  const [filterSource, setFilterSource] = useState('Todos');

  // Estados para Modais de Fechamento/Perda
  const [pendingMove, setPendingMove] = useState<{ id: string, status: LeadStatus } | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showLossModal, setShowLossModal] = useState(false);
  const [closeValue, setCloseValue] = useState<number>(0);
  const [lossReason, setLossReason] = useState('');

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  const fetchLeads = async () => {
    try {
      setLoading(true);
      let query = supabase.from('leads').select('*').order('score', { ascending: false });
      if (filterSource !== 'Todos') {
        query = query.eq('source', filterSource);
      }
      const { data, error } = await query;
      if (error) throw error;
      setLeads(data as any);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchLeads(); }, [filterSource]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name || !newLeadForm.phone) return;
    const { error } = await supabase.from('leads').insert([{
      name: newLeadForm.name, phone: newLeadForm.phone, source: newLeadForm.source, status: LeadStatus.NEW, score: 50, value: 0
    }]);
    if (!error) { setShowNewLeadModal(false); setNewLeadForm({ name: '', phone: '', source: 'Manual' }); fetchLeads(); }
  };

  // === LÓGICA INTELIGENTE DE ARRASTAR ===
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as LeadStatus;
    const lead = leads.find(l => l.id === leadId);

    if (!lead || lead.status === newStatus) return;

    // 1. Se for Fechamento -> Abrir Modal de Valor
    if (newStatus === LeadStatus.CLOSED) {
      setPendingMove({ id: leadId, status: newStatus });
      setCloseValue(lead.value || 0); // Sugere o valor que já estava
      setShowCloseModal(true);
      return;
    }

    // 2. Se for Perda -> Abrir Modal de Motivo
    if (newStatus === LeadStatus.LOST) {
      setPendingMove({ id: leadId, status: newStatus });
      setShowLossModal(true);
      return;
    }

    // 3. Normal -> Atualiza direto
    executeMove(leadId, newStatus);
  };

  const executeMove = async (id: string, status: LeadStatus, extraData: any = {}) => {
    // Atualização Otimista
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status, ...extraData } : l));
    
    // Atualiza no Banco
    await supabase.from('leads').update({ status, ...extraData }).eq('id', id);
    
    // Limpa modais
    setPendingMove(null);
    setShowCloseModal(false);
    setShowLossModal(false);
    setLossReason('');
    
    // Log na timeline (opcional, mas bom)
    if (extraData.loss_reason) {
      await supabase.from('timeline_events').insert([{ lead_id: id, type: 'status_change', description: `Lead perdido. Motivo: ${extraData.loss_reason}` }]);
    } else if (status === LeadStatus.CLOSED) {
      await supabase.from('timeline_events').insert([{ lead_id: id, type: 'status_change', description: `Venda Fechada! Valor: R$ ${extraData.value}` }]);
    }
  };

  const confirmClose = () => {
    if (pendingMove) executeMove(pendingMove.id, pendingMove.status, { value: closeValue, expected_close_date: new Date() });
  };

  const confirmLoss = () => {
    if (pendingMove) executeMove(pendingMove.id, pendingMove.status, { loss_reason: lossReason });
  };

  const deleteLead = async (id: string, e: any) => {
    e.stopPropagation();
    if (!window.confirm('Excluir este lead permanentemente?')) return;
    setLeads(prev => prev.filter(l => l.id !== id));
    await supabase.from('leads').delete().eq('id', id);
    if (selectedLead?.id === id) setSelectedLead(null);
  };

  if (loading && leads.length === 0) return <div className="p-8 text-center animate-pulse">Carregando Pipeline...</div>;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center mb-6 px-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pipeline de Vendas</h1>
          <p className="text-sm text-gray-500">Arraste para mover. Solte para fechar.</p>
        </div>
        <div className="flex gap-2">
           {/* Filtro de Origem */}
           <select 
             className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900"
             value={filterSource}
             onChange={e => setFilterSource(e.target.value)}
           >
             <option value="Todos">Todas as Origens</option>
             <option value="Manual">Manual</option>
             <option value="Site - Página do Imóvel">Site</option>
             <option value="Instagram">Instagram</option>
             <option value="Indicação">Indicação</option>
           </select>

           <button onClick={() => setShowNewLeadModal(true)} className="text-sm bg-slate-900 text-white hover:bg-slate-800 px-4 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg hover:shadow-xl transition-all">
            <Icons.Plus size={16} /> Novo Lead
           </button>
        </div>
      </div>

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4">
          <div className="flex gap-4 min-w-max h-full">
            {COLUMNS.map(column => {
              const columnLeads = leads.filter(l => l.status === column.id);
              return (
                <DroppableColumn key={column.id} id={column.id} className={`w-80 flex-shrink-0 rounded-xl flex flex-col h-full border-t-4 ${column.color} shadow-sm border-x border-b border-gray-200 bg-gray-50/50`}>
                  <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white/50 rounded-t-lg">
                    <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{column.label}</h3>
                    <span className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">{columnLeads.length}</span>
                  </div>
                  <div className="p-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
                    {columnLeads.map(lead => (
                      <DraggableCard key={lead.id} lead={lead} temp={getLeadTemperature(lead.score)} onClick={() => setSelectedLead(lead)} onDelete={(e) => deleteLead(lead.id, e)}/>
                    ))}
                    {columnLeads.length === 0 && <div className="h-20 flex items-center justify-center text-gray-300 border-2 border-dashed border-gray-200 rounded-lg m-2"><span className="text-xs italic">Solte aqui</span></div>}
                  </div>
                </DroppableColumn>
              );
            })}
          </div>
        </div>
      </DndContext>

      {selectedLead && <LeadDetailsSidebar lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={fetchLeads}/>}
      
      {/* MODAL NOVO LEAD */}
      {showNewLeadModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md animate-slide-up">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800">Adicionar Lead Manual</h3>
              <button onClick={() => setShowNewLeadModal(false)}><Icons.X className="text-gray-400 hover:text-red-500"/></button>
            </div>
            <form onSubmit={handleCreateLead} className="space-y-4">
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label><input autoFocus type="text" required className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-slate-900" value={newLeadForm.name} onChange={e => setNewLeadForm({...newLeadForm, name: e.target.value})}/></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label><input type="tel" required className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-slate-900" value={newLeadForm.phone} onChange={e => setNewLeadForm({...newLeadForm, phone: e.target.value})}/></div>
              <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Origem</label><select className="w-full border border-gray-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-slate-900 bg-white" value={newLeadForm.source} onChange={e => setNewLeadForm({...newLeadForm, source: e.target.value})}><option value="Manual">Manual</option><option value="Indicação">Indicação</option><option value="Instagram">Instagram</option></select></div>
              <div className="pt-4"><button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors">Cadastrar Lead</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FECHAMENTO (VENDIDO) */}
      {showCloseModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-slide-up border-t-4 border-green-500">
            <h3 className="text-xl font-bold text-slate-900 mb-2">🎉 Venda Realizada!</h3>
            <p className="text-sm text-gray-500 mb-4">Parabéns! Confirme o valor final para atualizar suas métricas.</p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Final da Venda (R$)</label>
              <input type="number" autoFocus className="w-full border border-gray-300 rounded-lg px-4 py-3 text-lg font-bold text-green-700 outline-none focus:ring-2 focus:ring-green-500" value={closeValue} onChange={e => setCloseValue(Number(e.target.value))}/>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowCloseModal(false); setPendingMove(null); }} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button onClick={confirmClose} className="flex-1 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-lg shadow-green-200">Confirmar Venda</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PERDA */}
      {showLossModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm animate-slide-up border-t-4 border-red-400">
            <h3 className="text-xl font-bold text-slate-900 mb-2">😕 Lead Perdido</h3>
            <p className="text-sm text-gray-500 mb-4">Que pena. Nos ajude a melhorar informando o motivo.</p>
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Motivo da Perda</label>
              <select className="w-full border border-gray-300 rounded-lg px-4 py-3 outline-none focus:ring-2 focus:ring-red-500 bg-white" value={lossReason} onChange={e => setLossReason(e.target.value)}>
                <option value="">Selecione...</option>
                <option value="Preço alto">💰 Preço acima do orçamento</option>
                <option value="Comprou concorrente">🏢 Comprou com concorrente</option>
                <option value="Desistiu da compra">❌ Desistiu da compra</option>
                <option value="Localização">📍 Não gostou da localização</option>
                <option value="Sem resposta">👻 Parou de responder (Ghosting)</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setShowLossModal(false); setPendingMove(null); }} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
              <button disabled={!lossReason} onClick={confirmLoss} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed">Confirmar Perda</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeads;