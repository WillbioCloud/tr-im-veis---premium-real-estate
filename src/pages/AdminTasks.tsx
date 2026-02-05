import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Task } from '../types';
import { Icons } from '../components/Icons';

interface TaskWithLead extends Task {
  leads: { name: string; phone: string };
}

const AdminTasks: React.FC = () => {
  const navigate = useNavigate();

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
    e.stopPropagation();

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t))
    );

    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);

    if (filter !== 'all') setTimeout(fetchTasks, 400);
  };

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const isOverdue = (dateString: string) => {
    const today = new Date().toISOString().split('T')[0];
    return new Date(dateString) < new Date() && !dateString.includes(today);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-crm-text">Agenda</h1>
          <p className="text-sm text-crm-muted">Ações vinculadas aos seus leads.</p>
        </div>

        <div className="flex bg-white rounded-xl p-1 border border-crm-border shadow-sm">
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 text-sm font-extrabold rounded-lg transition-all ${
              filter === 'pending'
                ? 'bg-crm-primary text-white shadow'
                : 'text-crm-muted hover:text-crm-text'
            }`}
          >
            Pendentes
          </button>

          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 text-sm font-extrabold rounded-lg transition-all ${
              filter === 'completed'
                ? 'bg-crm-primary text-white shadow'
                : 'text-crm-muted hover:text-crm-text'
            }`}
          >
            Concluídas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-crm-muted animate-pulse">Carregando tarefas…</div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const overdue = !task.completed && isOverdue(task.due_date);

            return (
              <div
                key={task.id}
                onClick={() => navigate(`/admin/leads?open=${task.lead_id}&tab=activity`)}
                className={`crm-card p-4 flex items-center gap-4 cursor-pointer transition-all hover:shadow-md group ${
                  overdue ? 'border-rose-200 bg-rose-50/40' : ''
                }`}
              >
                {/* Checkbox */}
                <div onClick={(e) => toggleTask(task, e)}>
                  {task.completed ? (
                    <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                      <Icons.CheckCircle size={16} />
                    </div>
                  ) : (
                    <div
                      className={`w-6 h-6 rounded-full border-2 ${
                        overdue ? 'border-rose-400' : 'border-crm-border'
                      }`}
                    />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`font-extrabold ${
                        task.completed ? 'line-through text-crm-muted' : 'text-crm-text'
                      }`}
                    >
                      {task.title}
                    </span>

                    {overdue && (
                      <span className="text-[10px] font-extrabold bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full uppercase">
                        Atrasado
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-crm-muted group-hover:text-crm-primary transition-colors">
                    Referente a:{' '}
                    <span className="font-bold">
                      {task.leads?.name || 'Lead sem nome'}
                    </span>
                  </p>
                </div>

                {/* Date */}
                <div className="text-right">
                  <p
                    className={`text-sm font-extrabold ${
                      overdue ? 'text-rose-600' : 'text-crm-text'
                    }`}
                  >
                    {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </p>
                  <p className="text-xs text-crm-muted">
                    {new Date(task.due_date).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            );
          })}

          {tasks.length === 0 && (
            <div className="crm-card p-8 text-center text-crm-muted italic">
              Nenhuma tarefa encontrada para esse filtro.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminTasks;
