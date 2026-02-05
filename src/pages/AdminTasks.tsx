import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Task } from '../types';
import { Icons } from '../components/Icons';

// Interface extendida para incluir os dados do Lead (Join)
interface TaskWithLead extends Task {
  leads: {
    name: string;
    phone: string;
  };
}

const AdminTasks: React.FC = () => {
  const [tasks, setTasks] = useState<TaskWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  const fetchTasks = async () => {
    try {
      setLoading(true);
      // Busca tarefas e faz o "Join" com a tabela leads para pegar o nome
      let query = supabase
        .from('tasks')
        .select('*, leads (name, phone)')
        .order('due_date', { ascending: true });

      if (filter === 'pending') query = query.eq('completed', false);
      if (filter === 'completed') query = query.eq('completed', true);

      const { data, error } = await query;

      if (error) throw error;
      setTasks(data as any);
    } catch (error) {
      console.error('Erro ao buscar agenda:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const toggleTask = async (task: TaskWithLead) => {
    // Atualiza localmente (Otimista)
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
    
    // Atualiza no banco
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);
    
    // Se mudou de filtro, recarrega para sumir da lista
    if (filter !== 'all') setTimeout(fetchTasks, 500);
  };

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'call': return <Icons.Phone size={16} className="text-blue-500" />;
      case 'visit': return <Icons.MapPin size={16} className="text-purple-500" />;
      case 'whatsapp': return <Icons.MessageCircle size={16} className="text-green-500" />;
      default: return <Icons.CheckCircle size={16} className="text-gray-400" />;
    }
  };

  const isOverdue = (dateString: string) => {
    return new Date(dateString) < new Date() && !dateString.includes(new Date().toISOString().split('T')[0]);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Minha Agenda</h1>
          <p className="text-sm text-gray-500">Tarefas e compromissos agendados.</p>
        </div>
        
        <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
          <button 
            onClick={() => setFilter('pending')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'pending' ? 'bg-slate-900 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setFilter('completed')}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filter === 'completed' ? 'bg-slate-900 text-white shadow' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Concluídas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 animate-pulse text-gray-400">Carregando tarefas...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
          <Icons.Calendar className="mx-auto text-gray-300 mb-3" size={48} />
          <h3 className="text-lg font-medium text-gray-600">Agenda vazia</h3>
          <p className="text-gray-400 text-sm">Nenhuma tarefa encontrada neste filtro.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const overdue = !task.completed && isOverdue(task.due_date);
            
            return (
              <div 
                key={task.id} 
                className={`bg-white p-4 rounded-xl border flex items-center gap-4 transition-all hover:shadow-md ${overdue ? 'border-red-200 bg-red-50/30' : 'border-gray-100'}`}
              >
                {/* Checkbox */}
                <div onClick={() => toggleTask(task)} className="cursor-pointer">
                  {task.completed ? (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white">
                      <Icons.CheckCircle size={16} />
                    </div>
                  ) : (
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center hover:bg-gray-50 ${overdue ? 'border-red-300' : 'border-gray-300'}`}>
                    </div>
                  )}
                </div>

                {/* Info Principal */}
                <div className="flex-1">
                   <div className="flex items-center gap-2 mb-1">
                      {getTaskIcon(task.type)}
                      <span className={`font-bold ${task.completed ? 'text-gray-400 line-through' : 'text-slate-800'}`}>
                        {task.title}
                      </span>
                      {overdue && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Atrasado
                        </span>
                      )}
                   </div>
                   <p className="text-sm text-gray-500">
                     Referente a: <span className="font-medium text-slate-700">{task.leads?.name || 'Lead sem nome'}</span>
                   </p>
                </div>

                {/* Data e Ações */}
                <div className="text-right">
                  <p className={`text-sm font-medium ${overdue ? 'text-red-600' : 'text-slate-600'}`}>
                     {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-gray-400">
                     {new Date(task.due_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                
                {/* Botão Whats Rapido */}
                {task.leads?.phone && (
                   <button 
                     onClick={() => window.open(`https://wa.me/${task.leads.phone.replace(/\D/g,'')}`, '_blank')}
                     className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-full transition-colors"
                     title="Abrir WhatsApp"
                   >
                     <Icons.MessageCircle size={20} />
                   </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminTasks;