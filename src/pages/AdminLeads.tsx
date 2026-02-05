import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Lead, LeadStatus } from '../types';
import LeadDetailsSidebar from '../components/LeadDetailsSidebar';
import { Icons } from '../components/Icons';

const AdminLeads: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // 👇 controla aba inicial do sidebar
  const [sidebarTab, setSidebarTab] = useState<'info' | 'activity'>('info');

  const statusColumns = useMemo(
    () => [
      { id: LeadStatus.NEW, title: 'Novos' },
      { id: LeadStatus.CONTACTED, title: 'Em Contato' },
      { id: LeadStatus.PROPOSAL, title: 'Proposta' },
      { id: LeadStatus.VISIT, title: 'Visita' },
      { id: LeadStatus.CLOSED, title: 'Fechado' },
      { id: LeadStatus.LOST, title: 'Perdido' }
    ],
    []
  );

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (data) setLeads(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // =====================================================
  // 🔥 ABERTURA AUTOMÁTICA VIA URL (?open=ID&tab=activity)
  // =====================================================
  useEffect(() => {
    const leadIdToOpen = searchParams.get('open');
    const tabToOpen = searchParams.get('tab');

    if (leadIdToOpen && leads.length > 0) {
      const targetLead = leads.find((l) => l.id === leadIdToOpen);

      if (targetLead) {
        setSelectedLead(targetLead);

        if (tabToOpen === 'activity') setSidebarTab('activity');
        else setSidebarTab('info');
      }
    }
  }, [leads, searchParams]);

  const handleCloseSidebar = () => {
    setSelectedLead(null);
    setSearchParams({});
  };

  const updateLeadStatus = async (lead: Lead, status: LeadStatus) => {
    await supabase.from('leads').update({ status }).eq('id', lead.id);
    fetchLeads();
  };

  if (loading) return <div className="p-10 text-center text-crm-muted">Carregando leads…</div>;

  return (
    <div className="h-full flex gap-6 overflow-x-auto pb-6">
      {statusColumns.map((col) => (
        <div key={col.id} className="min-w-[280px] flex-shrink-0">
          <h3 className="text-sm font-extrabold mb-3 text-crm-muted uppercase tracking-wide">
            {col.title}
          </h3>

          <div className="space-y-3">
            {leads
              .filter((l) => l.status === col.id)
              .map((lead) => (
                <div
                  key={lead.id}
                  onClick={() => {
                    setSelectedLead(lead);
                    setSidebarTab('info');
                  }}
                  className="crm-card p-4 cursor-pointer hover:shadow-md transition ease-in-out"
                >
                  <p className="font-extrabold text-crm-text truncate">{lead.name}</p>
                  <p className="text-xs text-crm-muted mt-1">{lead.phone}</p>

                  <div className="flex justify-between items-center mt-3">
                    <span className="text-xs font-bold text-crm-primary">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(lead.value || 0)}
                    </span>

                    <div className="flex gap-1 ">
                      {statusColumns.map((s) => (
                        <button
                          key={s.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            updateLeadStatus(lead, s.id);
                          }}
                          className={`w-2.5 h-2.5 rounded-full ${
                            s.id === lead.status ? 'bg-crm-primary' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      {/* SIDEBAR */}
      {selectedLead && (
        <LeadDetailsSidebar
          lead={selectedLead}
          onClose={handleCloseSidebar}
          onUpdate={fetchLeads}
          initialTab={sidebarTab}
        />
      )}
    </div>
  );
};

export default AdminLeads;
