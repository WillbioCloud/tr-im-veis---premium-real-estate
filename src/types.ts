// src/types.ts

export type ListingType = 'sale' | 'rent';

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
  listing_type?: ListingType;

  // Campos condicionais de venda/aluguel
  rent_package_price?: number;
  down_payment?: number;
  financing_available?: boolean;

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
    zip_code?: string;
  };

  // Estrutura Plana (Banco de Dados) - Opcionais para mapeamento
  city?: string;
  neighborhood?: string;
  state?: string;
  address?: string;
  zip_code?: string;

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

  // SEO
  seo_title?: string;
  seo_description?: string;

  // NOVO: Vinculo com Corretor
  agent_id?: string;
  agent?: {
    name: string;
    phone: string;
    email: string;
  };
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  completed: boolean;
  type: 'call' | 'meeting' | 'email' | 'visit' | 'whatsapp' | 'other';
  lead_id: string;
  user_id: string;
  created_at?: string;
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
  assigned_to?: string;

  // Lead scoring de interesse
  lead_score?: number;
  score_visit?: number;
  score_favorite?: number;
  score_whatsapp?: number;

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
  value?: number;
  probability?: number;
  loss_reason?: string;
  last_interaction?: string;
  expected_close_date?: string;
  score: number;
}

export interface FilterState {
  city: string;
  minPrice: number | '';
  maxPrice: number | '';
  bedrooms: number | '';
  type: string;
  listingType?: ListingType | '';
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  active: boolean;
  role?: string;
  phone?: string;

  // Gamificação do corretor
  xp_points?: number;
  level?: number;
  level_title?: string;
}

export interface Template {
  id: string;
  title: string;
  content: string;
  user_id: string;
  created_at?: string;
}

export interface Database {
  properties: Property;
  leads: Lead;
  tasks: Task;
  timeline_events: TimelineEvent;
  profiles: Profile;
  templates: Template;
}