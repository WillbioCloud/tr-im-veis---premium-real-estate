import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion'; // <--- Importe
import { Property } from '../types';
import { Icons } from './Icons';

interface PropertyCardProps {
  property: Property;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property }) => {
  // Tratamento de segurança para imagens
  const bgImage = property.images && property.images.length > 0 
    ? property.images[0] 
    : 'https://via.placeholder.com/800x600?text=Sem+Foto';

  // Tratamento para location (caso venha do banco sem estrutura)
  const city = property.location?.city || 'Localização não inf.';
  const neighborhood = property.location?.neighborhood || 'Bairro';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      whileHover={{ y: -8 }} // <--- Efeito de "levantar"
      transition={{ duration: 0.3 }}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100"
    >
      <Link to={`/imoveis/${property.slug}`} className="block relative h-64 overflow-hidden">
        <div className="absolute inset-0 bg-slate-900/10 group-hover:bg-slate-900/0 transition-colors z-10" />
        <img 
          src={bgImage} 
          alt={property.title} 
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
        />
        
        {/* Badges Flutuantes */}
        <div className="absolute top-4 left-4 z-20 flex gap-2">
          <span className="bg-slate-900/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
            {property.type}
          </span>
          {property.featured && (
            <span className="bg-amber-500/90 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Icons.Star size={10} fill="currentColor" /> Destaque
            </span>
          )}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 pt-12 z-20 opacity-80 group-hover:opacity-100 transition-opacity">
           <p className="text-white font-medium flex items-center gap-1 text-sm">
             <Icons.MapPin size={14} className="text-amber-400"/> {neighborhood}, {city}
           </p>
        </div>
      </Link>

      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-bold text-slate-800 line-clamp-1 group-hover:text-amber-600 transition-colors">
            {property.title}
          </h3>
        </div>
        
        <p className="text-2xl font-serif font-bold text-slate-900 mb-4">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(property.price)}
        </p>
        
        <div className="flex items-center justify-between text-gray-500 text-sm border-t border-gray-100 pt-4">
          <div className="flex items-center gap-1.5" title="Quartos">
            <Icons.Bed size={16} className="text-amber-500" />
            <span className="font-medium">{property.bedrooms}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Banheiros">
             <Icons.Bath size={16} className="text-amber-500" />
            <span className="font-medium">{property.bathrooms}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Vagas">
             <Icons.Car size={16} className="text-amber-500" />
            <span className="font-medium">{property.garage}</span>
          </div>
          <div className="flex items-center gap-1.5" title="Área Útil">
             <Icons.Home size={16} className="text-amber-500" />
            <span className="font-medium">{property.area}m²</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default PropertyCard;