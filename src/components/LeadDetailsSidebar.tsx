import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { Lead, Property } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface LeadDetailsSidebarProps {
  lead: Lead | null;
  onClose: () => void;
  onUpdate: () => void;
}

const LeadDetailsSidebar: React.FC<LeadDetailsSidebarProps> = ({ lead, onClose, onUpdate }) => {
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [agents, setAgents] = useState<{id: string, name: string}[]>([]);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (lead?.property_id) {
      setLoading(true);
      supabase.from('properties').select('*').eq('id', lead.property_id).single().then(({ data }) => {
          setProperty(data);
          setLoading(false);
      });
    } else setProperty(null);
    
    if (isAdmin) {
       supabase.from('profiles').select('id, name').eq('active', true).then(({ data }) => { if (data) setAgents(data); });
    }
  }, [lead, isAdmin]);

  const handleTransferLead = async (newAgentId: string) => {
    if (!lead) return;
    const { error } = await supabase.from('leads').update({ agent_id: newAgentId }).eq('id', lead.id);
    if (!error) { onUpdate(); onClose(); }
  };

  if (!lead) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[450px] bg-white dark:bg-dark-card shadow-2xl z-50 transform transition-transform duration-300 animate-slide-in-right overflow-y-auto">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Detalhes do Lead</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><Icons.X size={20} /></button>
        </div>
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl space-y-3">
            <h3 className="font-bold text-slate-900 dark:text-white">{lead.name}</h3>
            <p className="text-sm text-slate-500">{lead.email}</p>
            <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300"><Icons.Phone size={16} />{lead.phone}</p>
            {lead.status === 'closed' && lead.deal_value && (
                <div className="mt-2 pt-2 border-t"><p className="text-xs uppercase font-bold text-slate-500">Valor Fechamento</p><p className="text-xl font-bold text-emerald-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(lead.deal_value)}</p></div>
            )}
          </div>

          <div className="border-t pt-4">
            <label className="text-xs font-bold text-slate-400 uppercase mb-2 block">Corretor Responsável</label>
            {isAdmin ? (
               <div className="relative">
                 <select className="w-full p-3 bg-white dark:bg-dark-card border rounded-lg" value={lead.agent_id || ''} onChange={(e) => handleTransferLead(e.target.value)}>
                   {agents.map(agent => ( <option key={agent.id} value={agent.id}>{agent.name}</option> ))}
                 </select>
               </div>
            ) : (
               <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"><Icons.User size={16} /><span>{lead.agent_id === user?.id ? 'Você' : 'Outro Corretor'}</span></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default LeadDetailsSidebar;
