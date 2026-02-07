import React from 'react';
import { Link } from 'react-router-dom';
import { Property } from '../types';
import { Icons } from './Icons';

interface PropertyCardProps {
  property: Property;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  return (
    <Link to={`/imoveis/${property.slug}`} className="group bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col h-full">
      <div className="relative h-64 overflow-hidden">
        <img 
          src={property.images[0] || 'https://placehold.co/600x400'} 
          alt={property.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
        
        <div className="absolute top-4 left-4">
          <span className="bg-white/90 backdrop-blur-md text-brand-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
            {property.type}
          </span>
        </div>
        
        <div className="absolute bottom-4 left-4 text-white">
          <p className="text-xl font-bold font-serif">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
          </p>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex-1">
          <h3 className="font-bold text-lg text-slate-800 mb-2 line-clamp-1 group-hover:text-brand-600 transition-colors">
            {property.title}
          </h3>
          <p className="text-slate-500 text-sm flex items-center gap-1 mb-4">
            <Icons.MapPin size={14} className="text-brand-500 shrink-0" />
            <span className="truncate">{property.location.neighborhood}, {property.location.city}</span>
          </p>

          <div className="flex items-center gap-4 text-slate-600 text-xs font-bold border-t border-slate-100 pt-4">
            <div className="flex items-center gap-1">
              <Icons.Bed size={16} className="text-slate-400" /> 
              {property.bedrooms} <span className="hidden sm:inline font-normal">Quartos</span>
            </div>
            <div className="flex items-center gap-1">
              <Icons.Car size={16} className="text-slate-400" /> 
              {property.garage} <span className="hidden sm:inline font-normal">Vagas</span>
            </div>
            <div className="flex items-center gap-1">
              <Icons.Home size={16} className="text-slate-400" /> 
              {property.area} m²
            </div>
          </div>
        </div>

        {/* --- NOVO: RODAPÉ DO CORRETOR --- */}
        <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${property.agent ? 'bg-emerald-500' : 'bg-brand-600'}`}>
              {property.agent ? property.agent.name.charAt(0) : 'T'}
            </div>
            <p className="text-xs font-bold text-slate-500">
              {property.agent ? property.agent.name.split(' ')[0] : 'TR Imóveis'}
            </p>
          </div>
          {property.agent && (
            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
              Parceiro
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default PropertyCard;