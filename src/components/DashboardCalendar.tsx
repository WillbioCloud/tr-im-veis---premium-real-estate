import React from 'react';
import { Icons } from './Icons';

const DashboardCalendar: React.FC = () => {
  const date = new Date();
  const currentDay = date.getDate();
  const currentMonth = date.toLocaleDateString('pt-BR', { month: 'long' });
  const currentYear = date.getFullYear();

  // Dias da semana
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  
  // Gera dias do mês (simples, 30 dias fixos para visual, ajustar lógica real se precisar)
  // Para ficar perfeito precisaria de lógica de Date(), mas para visual "widget" isso atende
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="bg-white dark:bg-dark-card rounded-xl p-6 shadow-sm border border-brand-100 dark:border-dark-border h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="font-serif font-bold text-xl text-slate-800 dark:text-white capitalize">
            {currentMonth}
          </h3>
          <p className="text-xs text-gray-500 dark:text-dark-muted font-medium uppercase tracking-wider">
            {currentYear}
          </p>
        </div>
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full text-brand-500 transition-colors">
          <Icons.Calendar size={20} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {weekDays.map((d, i) => (
          <span key={i} className="text-center text-xs font-bold text-gray-400 dark:text-slate-500">
            {d}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2 flex-1">
        {days.map((day) => {
          const isToday = day === currentDay;
          // Simula tarefas aleatórias nos dias 5, 12, 18, 25
          const hasTask = [5, 12, 18, 25, currentDay + 2].includes(day);

          return (
            <div 
              key={day} 
              className={`
                aspect-square flex flex-col items-center justify-center rounded-lg text-sm font-medium transition-all cursor-pointer
                ${isToday 
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30 scale-105' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-brand-50 dark:hover:bg-slate-700'
                }
              `}
            >
              {day}
              {hasTask && !isToday && (
                <span className="w-1 h-1 bg-brand-400 rounded-full mt-1"></span>
              )}
            </div>
          );
        })}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
         <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500 dark:text-slate-400">Próxima tarefa:</span>
            <span className="font-bold text-brand-600 dark:text-brand-400">Hoje, 14:00</span>
         </div>
         <p className="text-sm font-bold text-slate-800 dark:text-white mt-1 truncate">
           Visita ao Residencial Ouro Verde
         </p>
      </div>
    </div>
  );
};

export default DashboardCalendar;