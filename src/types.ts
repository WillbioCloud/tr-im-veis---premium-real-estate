// src/types.ts

export enum PropertyType {
  APARTMENT = 'Apartamento',
  HOUSE = 'Casa',
  PENTHOUSE = 'Cobertura',
  COMMERCIAL = 'Comercial',
  LAND = 'Terreno'
}

export enum LeadStatus {
  NEW = 'Novo',
  CONTACTED = 'Em Contato',
  QUALIFYING = 'Qualificando',
  VISIT = 'Visita Agendada',
  PROPOSAL = 'Proposta',
  CLOSED = 'Fechado',
  LOST = 'Perdido'
}

export interface Property {
  id: string;
  slug: string;
  title: string;
  description: string;
  price: number;
  type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  area: number;
  garage: number;
  
  // Estrutura Visual (Frontend)
  location: {
    city: string;
    neighborhood: string;
    state: string;
    address?: string;
  };

  // Estrutura Plana (Banco de Dados) - Opcionais para mapeamento
  city?: string;
  neighborhood?: string;
  state?: string;

  features: string[];
  images: string[];
  featured?: boolean;
  
  // Financeiro e Admin
  iptu?: number;
  condominium?: number;
  suites?: number;
  video_url?: string;
  owner_name?: string;
  owner_phone?: string;
  created_at?: string;

  // NOVO: Vinculo com Corretor
  agent_id?: string;
  agent?: {
    name: string;
    phone: string;
    email: string;
  };
}

// === NOVOS TIPOS PARA O CRM ===

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  completed: boolean;
  type: 'call' | 'meeting' | 'email' | 'visit' | 'whatsapp' | 'other';
  lead_id: string;
}

export interface TimelineEvent {
  id: string;
  created_at: string;
  type: 'status_change' | 'note' | 'call_log' | 'whatsapp' | 'system';
  description: string;
  metadata?: any;
  lead_id: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  status: LeadStatus;
  propertyId?: string;
  createdAt: string;
  source: string;
  assigned_to?: string; // ID do corretor dono do lead
  
  // JOIN: Dados expandidos do Imóvel e do Dono do Imóvel
  property?: {
    title: string;
    agent_id?: string;
    agent?: {
      name: string;
    };
  };

  // JOIN: Quem está atendendo (Assignee)
  assignee?: {
    name: string;
  };
  
  // Campos CRM Premium
  value?: number;          // Valor potencial
  probability?: number;    // 0 a 100%
  loss_reason?: string;    // Se status for LOST
  last_interaction?: string; // Para SLA
  expected_close_date?: string;
  score: number; // Score calculado
}

export interface FilterState {
  city: string;
  minPrice: number | '';
  maxPrice: number | '';
  bedrooms: number | '';
  type: string;
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  active: boolean;
  role?: string;
  phone?: string;
}

export interface Template {
  id: string;
  title: string;
  content: string;
}

export interface Database {
  properties: Property;
  leads: Lead;
  tasks: Task;
  timeline_events: TimelineEvent;
  profiles: Profile;
  templates: Template;
}