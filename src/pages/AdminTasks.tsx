import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // <--- Hook
import { supabase } from '../lib/supabase';
import { Task } from '../types';
import { Icons } from '../components/Icons';

interface TaskWithLead extends Task {
  leads: { name: string; phone: string };
}

const AdminTasks: React.FC = () => {
  const navigate = useNavigate(); // <--- Instância do navigate
  const [tasks, setTasks] = useState<TaskWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  const fetchTasks = async () => {
    try {
      setLoading(true);

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
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (task: TaskWithLead, e: React.MouseEvent) => {
    e.stopPropagation(); // <--- Impede abrir o lead ao clicar no checkbox

    // update otimista
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    );

    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);

    if (filter !== 'all') setTimeout(fetchTasks, 500);
  };

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const isOverdue = (dateString: string) => {
    return (
      new Date(dateString) < new Date() &&
      !dateString.includes(new Date().toISOString().split('T')[0])
    );
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">
          Minha Agenda
        </h1>

        <div className="flex bg-white dark:bg-dark-card rounded-lg p-1 border border-brand-100 dark:border-dark-border shadow-sm">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
              filter === 'pending'
                ? 'bg-brand-500 text-white shadow'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
            }`}
          >
            Pendentes
          </button>

          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-1.5 text-sm font-bold rounded-md transition-all ${
              filter === 'completed'
                ? 'bg-brand-500 text-white shadow'
                : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'
            }`}
          >
            Concluídas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-gray-400">Carregando...</div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const overdue = !task.completed && isOverdue(task.due_date);

            return (
              <div
                key={task.id}
                // AQUI: Ao clicar, vai para leads abrindo a aba 'activity' (tarefas)
                onClick={() => navigate(`/admin/leads?open=${task.lead_id}&tab=activity`)}
                className={`bg-white dark:bg-dark-card p-4 rounded-xl border flex items-center gap-4 transition-all hover:shadow-md cursor-pointer group ${
                  overdue
                    ? 'border-red-200 bg-red-50/30 dark:bg-red-900/10'
                    : 'border-gray-100 dark:border-dark-border hover:border-brand-300'
                }`}
              >
                {/* Checkbox */}
                <div onClick={(e) => toggleTask(task, e)} className="cursor-pointer">
                  {task.completed ? (
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white">
                      <Icons.CheckCircle size={16} />
                    </div>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-slate-700 ${
                        overdue ? 'border-red-300' : 'border-gray-300 dark:border-slate-500'
                      }`}
                    />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-bold ${
                        task.completed
                          ? 'text-gray-400 line-through'
                          : 'text-slate-800 dark:text-white'
                      }`}
                    >
                      {task.title}
                    </span>

                    {overdue && (
                      <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase">
                        Atrasado
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-500 dark:text-slate-400 group-hover:text-brand-600 transition-colors">
                    Referente a:{' '}
                    <span className="font-bold">{task.leads?.name || 'Lead sem nome'}</span>
                  </p>
                </div>

                {/* Data */}
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      overdue ? 'text-red-600' : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div className="p-10 text-center text-gray-400">Nenhuma tarefa encontrada.</div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminTasks;
