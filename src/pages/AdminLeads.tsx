import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useLeads } from '../hooks/useLeads';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from '../components/Icons';
import LeadDetailsSidebar from '../components/LeadDetailsSidebar';
import Loading from '../components/Loading';
import { supabase } from '../lib/supabase';
import { Lead } from '../types';

const AdminLeads: React.FC = () => {
  const { leads, loading, updateLeadStatus, refreshLeads } = useLeads();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal de Fechamento
  const [closingLead, setClosingLead] = useState<Lead | null>(null);
  const [dealValue, setDealValue] = useState<string>('');
  const [isCustomValue, setIsCustomValue] = useState(false);

  const columns = [
    { id: 'new', title: 'Novos', color: 'border-blue-500' },
    { id: 'contacted', title: 'Contatado', color: 'border-indigo-500' },
    { id: 'visiting', title: 'Visita', color: 'border-purple-500' },
    { id: 'negotiating', title: 'Proposta', color: 'border-pink-500' },
    { id: 'closed', title: 'Fechado', color: 'border-emerald-500' },
  ];

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;

    if (newStatus === 'closed') {
      const lead = leads.find(l => l.id === draggableId);
      if (lead) {
        setClosingLead(lead);
        // Tenta pegar preço do imóvel se existir, senão zera
        // @ts-ignore
        if (lead.properties?.price) setDealValue(lead.properties.price.toString());
        setIsCustomValue(false);
      }
      return; 
    }
    await updateLeadStatus(draggableId, newStatus);
  };

  const confirmClosing = async () => {
    if (!closingLead || !dealValue) return;
    try {
      const { error } = await supabase
        .from('leads')
        .update({ status: 'closed', deal_value: parseFloat(dealValue), updated_at: new Date().toISOString() })
        .eq('id', closingLead.id);
      if (error) throw error;
      await refreshLeads();
      setClosingLead(null);
      setDealValue('');
    } catch (error) { alert('Erro ao registrar fechamento.'); }
  };

  const filteredLeads = leads.filter(lead => lead.name.toLowerCase().includes(searchTerm.toLowerCase()));
  if (loading) return <Loading />;

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <div><h1 className="text-2xl font-bold text-slate-800 dark:text-white">Gestão de Leads (Funil)</h1></div>
        <div className="relative">
          <Icons.Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input type="text" placeholder="Buscar lead..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 bg-white dark:bg-dark-card border rounded-lg" />
        </div>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 overflow-x-auto">
          <div className="flex gap-6 min-w-max h-full pb-4 px-1">
            {columns.map(column => (
              <div key={column.id} className="w-80 flex flex-col bg-slate-50 dark:bg-dark-card/50 rounded-xl border border-slate-200 dark:border-dark-border/50">
                <div className={`p-4 border-b-2 ${column.color} bg-white dark:bg-dark-card rounded-t-xl`}>
                  <h3 className="font-bold text-slate-700 dark:text-white flex justify-between">
                    {column.title}
                    <span className="bg-slate-100 px-2 rounded-full text-xs">{filteredLeads.filter(l => l.status === column.id).length}</span>
                  </h3>
                </div>
                <Droppable droppableId={column.id}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className="p-3 flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                      {filteredLeads.filter(l => l.status === column.id).map((lead, index) => (
                          <Draggable key={lead.id} draggableId={lead.id} index={index}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} onClick={() => setSelectedLead(lead)} className="bg-white dark:bg-dark-card p-4 rounded-lg shadow-sm hover:shadow-md cursor-pointer">
                                <span className="font-bold block mb-2">{lead.name}</span>
                                {lead.deal_value && lead.status === 'closed' && (
                                   <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded inline-block">
                                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.deal_value)}
                                   </div>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </div>
      </DragDropContext>

      <LeadDetailsSidebar lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={refreshLeads} />

      {closingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-dark-card w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Confirmar Venda 🎉</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="saleType" checked={!isCustomValue} onChange={() => setIsCustomValue(false)} />
                <span>Vendeu o imóvel de interesse</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="saleType" checked={isCustomValue} onChange={() => { setIsCustomValue(true); setDealValue(''); }} />
                <span>Vendeu outro imóvel (Digitar valor)</span>
              </label>
              <input type="number" value={dealValue} onChange={e => setDealValue(e.target.value)} className="w-full mt-1 px-4 py-3 border rounded-lg font-bold text-lg" placeholder="0,00" />
              <div className="flex gap-3 mt-6">
                <button onClick={() => setClosingLead(null)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-lg">Cancelar</button>
                <button onClick={confirmClosing} disabled={!dealValue} className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800">Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminLeads;
