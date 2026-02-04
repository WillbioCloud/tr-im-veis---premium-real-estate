import React, { useState } from 'react';
import { MOCK_LEADS } from '../constants';
import { LeadStatus, Lead } from '../types';
import { Icons } from '../components/Icons';

const AdminLeads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>(MOCK_LEADS);

  // Kanban Columns
  const columns = Object.values(LeadStatus);

  const moveLead = (id: string, newStatus: LeadStatus) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Pipeline de Vendas (CRM)</h1>
        <button className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
          <Icons.Users size={16} /> Novo Lead
        </button>
      </div>

      <div className="flex-grow flex gap-4 overflow-x-auto pb-4">
        {columns.map(status => (
          <div key={status} className="min-w-[300px] w-[300px] bg-gray-100 rounded-xl flex flex-col max-h-full">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-700">{status}</h3>
              <span className="bg-gray-200 text-xs px-2 py-1 rounded-full text-gray-600 font-bold">
                {leads.filter(l => l.status === status).length}
              </span>
            </div>
            
            <div className="p-2 flex-grow overflow-y-auto space-y-3">
              {leads.filter(l => l.status === status).map(lead => (
                <div key={lead.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-pointer hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-slate-900">{lead.name}</span>
                    <button className="text-gray-400 hover:text-slate-600"><Icons.MoreVertical size={16}/></button>
                  </div>
                  <div className="text-xs text-gray-500 mb-3 space-y-1">
                     <p className="flex items-center gap-1"><Icons.Mail size={12}/> {lead.email}</p>
                     <p className="flex items-center gap-1"><Icons.Phone size={12}/> {lead.phone}</p>
                  </div>
                  
                  {lead.propertyId && (
                     <div className="bg-blue-50 text-blue-700 text-xs p-2 rounded mb-3">
                       Interesse: Imóvel ID {lead.propertyId}
                     </div>
                  )}

                  {/* Move Controls (Simple Implementation) */}
                  <div className="flex justify-between items-center border-t pt-2 mt-2">
                    <button 
                       disabled={status === columns[0]}
                       onClick={() => {
                         const idx = columns.indexOf(status);
                         if(idx > 0) moveLead(lead.id, columns[idx - 1]);
                       }}
                       className="text-gray-400 hover:text-amber-500 disabled:opacity-20"
                    >
                      ←
                    </button>
                    <span className="text-[10px] text-gray-400">{new Date(lead.createdAt).toLocaleDateString()}</span>
                    <button 
                       disabled={status === columns[columns.length - 1]}
                       onClick={() => {
                         const idx = columns.indexOf(status);
                         if(idx < columns.length - 1) moveLead(lead.id, columns[idx + 1]);
                       }}
                       className="text-gray-400 hover:text-amber-500 disabled:opacity-20"
                    >
                      →
                    </button>
                  </div>
                </div>
              ))}
              {leads.filter(l => l.status === status).length === 0 && (
                 <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
                   Vazio
                 </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminLeads;
