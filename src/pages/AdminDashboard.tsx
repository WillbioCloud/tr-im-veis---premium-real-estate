import React from 'react';
import { Icons } from '../components/Icons';
import { MOCK_LEADS, MOCK_PROPERTIES } from '../constants';

const AdminDashboard: React.FC = () => {
  const stats = [
    { label: 'Total Imóveis', value: MOCK_PROPERTIES.length, icon: Icons.Building, color: 'bg-blue-500' },
    { label: 'Total Leads', value: MOCK_LEADS.length, icon: Icons.Users, color: 'bg-green-500' },
    { label: 'Visitas Agendadas', value: '5', icon: Icons.Calendar, color: 'bg-amber-500' },
    { label: 'Fechamentos (Mês)', value: 'R$ 2.5M', icon: Icons.CheckCircle, color: 'bg-purple-500' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800 mb-8">Dashboard Geral</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm mb-1">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-800">{stat.value}</h3>
            </div>
            <div className={`${stat.color} text-white p-3 rounded-lg`}>
              <stat.icon size={24} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg mb-4">Últimos Leads</h3>
          <div className="space-y-4">
             {MOCK_LEADS.map(lead => (
               <div key={lead.id} className="flex justify-between items-center pb-4 border-b last:border-0">
                 <div>
                   <p className="font-bold text-sm">{lead.name}</p>
                   <p className="text-xs text-gray-500">{lead.source}</p>
                 </div>
                 <span className="text-xs px-2 py-1 bg-gray-100 rounded-full">{lead.status}</span>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-lg mb-4">Acesso Rápido</h3>
          <div className="grid grid-cols-2 gap-4">
             <button className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium">
               <Icons.Building className="mb-2 text-slate-500" /> Adicionar Imóvel
             </button>
             <button className="flex flex-col items-center justify-center p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium">
               <Icons.Users className="mb-2 text-slate-500" /> Ver Pipeline
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
