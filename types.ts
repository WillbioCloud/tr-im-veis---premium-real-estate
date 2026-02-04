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
  area: number; // m²
  garage: number;
  location: {
    city: string;
    neighborhood: string;
    state: string;
  };
  features: string[];
  images: string[];
  featured?: boolean;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  message?: string;
  status: LeadStatus;
  propertyId?: string; // Interest in specific property
  createdAt: string;
  source: string;
}

export interface FilterState {
  city: string;
  minPrice: number | '';
  maxPrice: number | '';
  bedrooms: number | '';
  type: string;
}