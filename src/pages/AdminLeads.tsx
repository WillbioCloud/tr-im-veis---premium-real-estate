import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus } from '../types';
import { Icons } from '../components/Icons';
import LeadDetailsSidebar from '../components/LeadDetailsSidebar';

const COLUMNS = [
  { id: LeadStatus.NEW, label: 'Novos', color: 'border-blue-500' },
  { id: LeadStatus.QUALIFYING, label: 'Em Atendimento', color: 'border-amber-500' },
  { id: LeadStatus.VISIT, label: 'Visitas', color: 'border-purple-500' },
  { id: LeadStatus.PROPOSAL, label: 'Propostas', color: 'border-green-500' },
  { id: LeadStatus.CLOSED, label: 'Fechados', color: 'border-emerald-600 bg-emerald-50' },
  { id: LeadStatus.LOST, label: 'Perdidos', color: 'border-red-200 opacity-70' },
];

// Helper para definir a "Temperatura" do Lead
const getLeadTemperature = (score: number = 50) => {
  if (score >= 80) return { label: 'Quente', color: 'text-red-500', bg: 'bg-red-50', icon: Icons.TrendingUp, barColor: 'bg-red-500' };
  if (score >= 40) return { label: 'Morno', color: 'text-amber-500', bg: 'bg-amber-50', icon: Icons.Activity, barColor: 'bg-amber-500' };
  return { label: 'Frio', color: 'text-blue-400', bg: 'bg-blue-50', icon: Icons.Clock, barColor: 'bg-blue-300' };
};

const AdminLeads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('score', { ascending: false }); // Ordenar pelos mais quentes!

      if (error) throw error;
      setLeads(data as any);
    } catch (error) {
      console.error('Erro ao buscar leads:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  const updateStatus = async (id: string, newStatus: LeadStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    setLeads(prev => prev.map(lead => lead.id === id ? { ...lead, status: newStatus } : lead));
    
    // Atualiza status e recalcula score se for visita (via trigger do banco)
    await supabase.from('leads').update({ status: newStatus }).eq('id', id);
    fetchLeads(); // Recarrega para pegar o score novo calculado pelo banco
  };

  const deleteLead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Excluir este lead permanentemente?')) return;
    setLeads(prev => prev.filter(l => l.id !== id));
    await supabase.from('leads').delete().eq('id', id);
    if (selectedLead?.id === id) setSelectedLead(null);
  };

  // Helpers de navegação
  const statusOrder = [LeadStatus.NEW, LeadStatus.QUALIFYING, LeadStatus.VISIT, LeadStatus.PROPOSAL, LeadStatus.CLOSED];
  const getNextStatus = (current: string) => {
    const idx = statusOrder.indexOf(current as LeadStatus);
    return idx >= 0 && idx < statusOrder.length - 1 ? statusOrder[idx + 1] : LeadStatus.CLOSED;
  };
  const getPrevStatus = (current: string) => {
    const idx = statusOrder.indexOf(current as LeadStatus);
    return idx > 0 ? statusOrder[idx - 1] : LeadStatus.NEW;
  };

  if (loading && leads.length === 0) return <div className="p-8 text-center animate-pulse">Carregando Pipeline...</div>;

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <div className="flex justify-between items-center mb-6 px-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Pipeline de Vendas</h1>
          <p className="text-sm text-gray-500">Gerencie seus negócios por temperatura.</p>
        </div>
        <button onClick={fetchLeads} className="text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm">
          <Icons.RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4">
        <div className="flex gap-4 min-w-max h-full">
          {COLUMNS.map(column => {
            const columnLeads = leads.filter(l => l.status === column.id);

            return (
              <div key={column.id} className={`w-80 flex-shrink-0 bg-gray-50/80 backdrop-blur-sm rounded-xl flex flex-col h-full border-t-4 ${column.color} shadow-sm border-x border-b border-gray-200`}>
                <div className="p-3 border-b border-gray-200 flex justify-between items-center bg-white/50 rounded-t-lg">
                  <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{column.label}</h3>
                  <span className="bg-white border border-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full font-bold shadow-sm">
                    {columnLeads.length}
                  </span>
                </div>

                <div className="p-2 overflow-y-auto flex-1 space-y-2 custom-scrollbar">
                  {columnLeads.map(lead => {
                    const temp = getLeadTemperature(lead.score);
                    
                    return (
                      <div 
                        key={lead.id} 
                        onClick={() => setSelectedLead(lead)} 
                        className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group hover:border-brand-300 relative overflow-hidden"
                      >
                        {/* Barra de Score */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${temp.barColor}`}></div>

                        <div className="flex justify-between items-start mb-2 pl-2">
                          <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${temp.bg} ${temp.color}`}>
                            <temp.icon size={10} /> {temp.label} ({lead.score || 50})
                          </div>
                          <button onClick={(e) => deleteLead(lead.id, e)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1">
                            <Icons.X size={14} />
                          </button>
                        </div>
                        
                        <div className="pl-2">
                          <h4 className="font-bold text-slate-800 leading-tight">{lead.name}</h4>
                          {lead.value && lead.value > 0 && (
                            <p className="text-xs font-bold text-green-600 mt-1">
                               {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.value)}
                            </p>
                          )}
                          <div className="text-xs text-gray-500 space-y-1 mt-2 pb-2 border-b border-gray-50">
                            {lead.phone && <p className="flex items-center gap-1.5 truncate"><Icons.Phone size={10} /> {lead.phone}</p>}
                          </div>
                        </div>

                        <div className="mt-2 pl-2 flex justify-between gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                           {column.id !== LeadStatus.NEW && (
                             <button onClick={(e) => updateStatus(lead.id, getPrevStatus(column.id), e)} className="text-xs bg-gray-100 hover:bg-gray-200 p-1.5 rounded text-gray-600">
                               <Icons.ArrowRight className="rotate-180" size={12}/>
                             </button>
                           )}
                           {column.id !== LeadStatus.CLOSED && column.id !== LeadStatus.LOST && (
                             <button onClick={(e) => updateStatus(lead.id, getNextStatus(column.id), e)} className="text-xs flex-1 bg-slate-800 hover:bg-slate-700 text-white px-2 py-1.5 rounded font-medium flex items-center justify-center gap-1">
                               Avançar <Icons.ArrowRight size={10}/>
                             </button>
                           )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedLead && (
        <LeadDetailsSidebar 
          lead={selectedLead} 
          onClose={() => setSelectedLead(null)} 
          onUpdate={() => fetchLeads()}
        />
      )}
    </div>
  );
};

export default AdminLeads;