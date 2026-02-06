export enum PropertyType {
  APARTMENT = 'Apartamento',
  HOUSE = 'Casa',
  PENTHOUSE = 'Cobertura',
  COMMERCIAL = 'Comercial',
  LAND = 'Terreno'
}

export enum LeadStatus {
  NEW = 'Novo',
  QUALIFYING = 'Qualificando',
  VISIT = 'Visita Agendada',
  PROPOSAL = 'Proposta',
  CONTACTED = 'Em Contato',
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
  location: {
    address: string;
    city: string;
    neighborhood: string;
    state: string;
  };
  features: string[];
  images: string[];
  featured?: boolean;
  
  // === NOVOS CAMPOS RICOS ===
  iptu?: number;
  condominium?: number;
  suites?: number;
  video_url?: string;
  owner_name?: string; // Visível apenas no admin
  owner_phone?: string; // Visível apenas no admin
  created_at?: string;
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
  type: 'status_change' | 'note' | 'call_log' | 'whatsapp' | 'system'; // <--- Tem que ter 'whatsapp' aqui
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
  assigned_to?: string; // <--- NOVO: ID do corretor dono
  
  // Campos CRM Premium
  value?: number;          // Valor potencial
  probability?: number;    // 0 a 100%
  loss_reason?: string;    // Se status for LOST
  last_interaction?: string; // Para SLA
  expected_close_date?: string;
  score: number; // <--- NOVO CAMPO
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
}

export interface Template {
  id: string;
  title: string;
  content: string;
}