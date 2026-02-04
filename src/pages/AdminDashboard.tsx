import React from 'react';
import { Icons } from '../components/Icons';

const AdminDashboard: React.FC = () => {
  // Dados estáticos para exemplo (depois virão do Supabase)
  const stats = [
    { label: 'Total de Imóveis', value: '12', icon: Icons.Building, color: 'bg-blue-500' },
    { label: 'Leads Novos', value: '5', icon: Icons.Users, color: 'bg-green-500' },
    { label: 'Vendas no Mês', value: 'R$ 1.2M', icon: Icons.DollarSign, color: 'bg-amber-500' },
    { label: 'Visitas Agendadas', value: '3', icon: Icons.Calendar, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Visão Geral</h1>
        <span className="text-sm text-gray-500 flex items-center gap-2">
          <Icons.Clock size={16} /> Última atualização: Hoje, 14:30
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-4 rounded-lg text-white ${stat.color}`}>
              {/* Renderização Segura: Verifica se o ícone existe */}
              {stat.icon ? <stat.icon size={24} /> : <Icons.Activity size={24} />}
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Seção de Atividades Recentes (Placeholder) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Icons.TrendingUp size={20} className="text-blue-500" />
              Desempenho Recente
            </h3>
          </div>
          <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg text-gray-400">
            <div className="text-center">
              <Icons.PieChart size={48} className="mx-auto mb-2 opacity-50" />
              <p>Gráfico de Vendas (Em breve)</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Icons.Activity size={20} className="text-amber-500" />
              Últimos Leads
            </h3>
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                    L
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Novo Interessado</p>
                    <p className="text-xs text-gray-500">Há 2 horas • Via Site</p>
                  </div>
                </div>
                <Icons.ArrowRight size={16} className="text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;