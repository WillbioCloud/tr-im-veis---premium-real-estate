import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Lead, LeadStatus } from '../types';

interface LeadsContextType {
  leads: Lead[];
  loading: boolean;
  refreshLeads: () => Promise<void>;
  updateLeadStatus: (leadId: string, status: LeadStatus) => Promise<void>;
}

export const LeadsContext = createContext<LeadsContextType | undefined>(undefined);

export const LeadsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshLeads = useCallback(async () => {
    if (!user?.id) {
      setLeads([]);
      setLoading(false);
      return;
    }

    const shouldShowInitialLoading = leads.length === 0;
    if (shouldShowInitialLoading) {
      setLoading(true);
    }

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

    if (user.role !== 'admin') {
      query = query.eq('assigned_to', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erro ao buscar leads:', error);
    } else if (data) {
      setLeads(data as Lead[]);
    }

    if (shouldShowInitialLoading) {
      setLoading(false);
    }
  }, [leads.length, user?.id, user?.role]);

  const updateLeadStatus = useCallback(async (leadId: string, status: LeadStatus) => {
    let previousLead: Lead | undefined;

    setLeads((prev) => {
      previousLead = prev.find((lead) => lead.id === leadId);
      return prev.map((lead) => (lead.id === leadId ? { ...lead, status } : lead));
    });

    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId);

    if (error && previousLead) {
      setLeads((prev) => prev.map((lead) => (lead.id === leadId ? previousLead as Lead : lead)));
      console.error('Erro ao atualizar status do lead:', error);
    }
  }, []);

  useEffect(() => {
    void refreshLeads();
  }, [refreshLeads]);

  const value = useMemo(
    () => ({
      leads,
      loading,
      refreshLeads,
      updateLeadStatus,
    }),
    [leads, loading, refreshLeads, updateLeadStatus]
  );

  return <LeadsContext.Provider value={value}>{children}</LeadsContext.Provider>;
};
