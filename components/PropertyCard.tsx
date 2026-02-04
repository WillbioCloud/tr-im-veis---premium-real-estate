import React from 'react';
import { Link } from 'react-router-dom';
import { Property } from '../types';
import { Icons } from './Icons';

interface PropertyCardProps {
  property: Property;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  const formatPrice = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Link to={`/imoveis/${property.slug}`} className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img 
          src={property.images[0]} 
          alt={property.title} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-sm text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          {property.type}
        </div>
        {property.featured && (
          <div className="absolute top-3 right-3 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
            Destaque
          </div>
        )}
      </div>
      
      <div className="p-5">
        <div className="flex items-start justify-between mb-2">
          <p className="text-amber-600 font-bold text-xl">{formatPrice(property.price)}</p>
        </div>
        
        <h3 className="text-slate-900 font-bold text-lg mb-1 truncate group-hover:text-amber-600 transition-colors">
          {property.title}
        </h3>
        
        <p className="text-gray-500 text-sm mb-4 flex items-center gap-1">
          <Icons.MapPin size={14} /> {property.location.neighborhood}, {property.location.city}
        </p>
        
        <div className="flex items-center justify-between text-gray-600 text-sm border-t pt-4">
          <span className="flex items-center gap-1" title="Quartos">
            <Icons.Bed size={16} className="text-slate-400" /> {property.bedrooms}
          </span>
          <span className="flex items-center gap-1" title="Banheiros">
            <Icons.Bath size={16} className="text-slate-400" /> {property.bathrooms}
          </span>
          <span className="flex items-center gap-1" title="Vagas">
            <Icons.Car size={16} className="text-slate-400" /> {property.garage}
          </span>
          <span className="flex items-center gap-1" title="Área">
            <Icons.Home size={16} className="text-slate-400" /> {property.area}m²
          </span>
        </div>
      </div>
    </Link>
  );
};

export default PropertyCard;
