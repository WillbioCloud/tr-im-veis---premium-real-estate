import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus } from '../types';
import { Icons } from '../components/Icons';

// Mapeamento para garantir que as colunas fiquem na ordem certa
const COLUMNS = [
  { id: LeadStatus.NEW, label: 'Novos', color: 'border-blue-500' },
  { id: LeadStatus.QUALIFYING, label: 'Em Atendimento', color: 'border-amber-500' },
  { id: LeadStatus.VISIT, label: 'Visitas', color: 'border-purple-500' },
  { id: LeadStatus.PROPOSAL, label: 'Propostas', color: 'border-green-500' },
  { id: LeadStatus.CLOSED, label: 'Fechados', color: 'border-emerald-600 bg-emerald-50' },
  { id: LeadStatus.LOST, label: 'Perdidos', color: 'border-red-200 opacity-70' },
];

const AdminLeads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Carrega leads do Supabase
  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Mapeia snake_case do banco para camelCase do TS se necessário
      // Como criamos a tabela simples, vamos assumir compatibilidade direta ou ajustar aqui
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

  // Função para mudar o status do lead
  const updateStatus = async (id: string, newStatus: LeadStatus) => {
    // Atualiza otimisticamente na UI para parecer instantâneo
    setLeads(prev => prev.map(lead => 
      lead.id === id ? { ...lead, status: newStatus } : lead
    ));

    const { error } = await supabase
      .from('leads')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert('Erro ao atualizar status');
      fetchLeads(); // Reverte em caso de erro
    }
  };

  const deleteLead = async (id: string) => {
    if (!window.confirm('Excluir este lead permanentemente?')) return;
    
    setLeads(prev => prev.filter(l => l.id !== id));
    await supabase.from('leads').delete().eq('id', id);
  };

  if (loading) return <div className="p-8 text-center">Carregando CRM...</div>;

  return (
    <div className="h-[calc(100vh-100px)] overflow-x-auto">
      <div className="flex justify-between items-center mb-6 px-4">
        <h1 className="text-2xl font-bold text-slate-800">Pipeline de Vendas</h1>
        <button onClick={fetchLeads} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
          <Icons.RefreshCw size={14} /> Atualizar
        </button>
      </div>

      {/* Kanban Board Container */}
      <div className="flex gap-4 min-w-max px-4 pb-4 h-full">
        {COLUMNS.map(column => {
          // Filtra os leads desta coluna
          const columnLeads = leads.filter(l => l.status === column.id);

          return (
            <div key={column.id} className={`w-80 flex-shrink-0 bg-gray-50 rounded-xl flex flex-col max-h-full border-t-4 ${column.color} shadow-sm`}>
              {/* Column Header */}
              <div className="p-3 border-b border-gray-100 flex justify-between items-center bg-white rounded-t-lg">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{column.label}</h3>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full font-bold">
                  {columnLeads.length}
                </span>
              </div>

              {/* Cards List */}
              <div className="p-2 overflow-y-auto flex-1 space-y-2">
                {columnLeads.map(lead => (
                  <div key={lead.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        {lead.source || 'Site'}
                      </span>
                      <button onClick={() => deleteLead(lead.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icons.X size={14} />
                      </button>
                    </div>
                    
                    <h4 className="font-bold text-slate-800">{lead.name}</h4>
                    <div className="text-xs text-gray-500 space-y-1 mt-1">
                      {lead.email && <p className="flex items-center gap-1"><Icons.Mail size={10} /> {lead.email}</p>}
                      {lead.phone && <p className="flex items-center gap-1"><Icons.Phone size={10} /> {lead.phone}</p>}
                    </div>

                    {/* Ações Rápidas (Mover Card) */}
                    <div className="mt-3 pt-2 border-t border-gray-50 flex justify-between gap-1">
                       {/* Lógica simples: Botão para voltar ou avançar status */}
                       {column.id !== LeadStatus.NEW && (
                         <button 
                           onClick={() => updateStatus(lead.id, getPrevStatus(column.id))}
                           className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-600"
                           title="Voltar etapa"
                         >
                           ←
                         </button>
                       )}
                       
                       {column.id !== LeadStatus.CLOSED && column.id !== LeadStatus.LOST && (
                         <button 
                           onClick={() => updateStatus(lead.id, getNextStatus(column.id))}
                           className="text-xs flex-1 bg-slate-900 hover:bg-slate-800 text-white px-2 py-1 rounded font-medium"
                         >
                           Avançar →
                         </button>
                       )}
                    </div>
                  </div>
                ))}
                
                {columnLeads.length === 0 && (
                   <div className="text-center py-8 text-gray-400 text-xs italic">
                     Vazio
                   </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Helpers para navegação entre status
const statusOrder = [
  LeadStatus.NEW, 
  LeadStatus.QUALIFYING, 
  LeadStatus.VISIT, 
  LeadStatus.PROPOSAL, 
  LeadStatus.CLOSED
];

function getNextStatus(current: string): LeadStatus {
  const idx = statusOrder.indexOf(current as LeadStatus);
  return idx >= 0 && idx < statusOrder.length - 1 ? statusOrder[idx + 1] : LeadStatus.CLOSED;
}

function getPrevStatus(current: string): LeadStatus {
  const idx = statusOrder.indexOf(current as LeadStatus);
  return idx > 0 ? statusOrder[idx - 1] : LeadStatus.NEW;
}

export default AdminLeads;