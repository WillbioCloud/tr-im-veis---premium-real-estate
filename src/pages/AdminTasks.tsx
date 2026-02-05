import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Task } from '../types';
import { Icons } from '../components/Icons';

const AdminTasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');

  const fetchTasks = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('due_date', { ascending: true });

    if (data) setTasks(data as any);
    setLoading(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    await supabase.from('tasks').insert([
      {
        title: newTask,
        completed: false,
        due_date: new Date().toISOString()
      }
    ]);

    setNewTask('');
    fetchTasks();
  };

  const toggleTask = async (task: Task) => {
    await supabase.from('tasks').update({ completed: !task.completed }).eq('id', task.id);
    fetchTasks();
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Excluir esta tarefa?')) return;
    await supabase.from('tasks').delete().eq('id', id);
    fetchTasks();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-crm-text">Agenda</h1>
          <p className="text-sm text-crm-muted">Organize suas próximas ações.</p>
        </div>
      </div>

      {/* Nova tarefa */}
      <div className="crm-card p-4">
        <form onSubmit={addTask} className="flex gap-2">
          <input
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Digite uma nova tarefa..."
            className="flex-1 border border-crm-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-crm-primary bg-white"
          />
          <button type="submit" className="crm-btn-primary px-5">
            <Icons.Plus size={16} />
          </button>
        </form>
      </div>

      {/* Lista */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading && (
          <div className="col-span-full text-center text-crm-muted animate-pulse py-10">
            Carregando tarefas...
          </div>
        )}

        {!loading && tasks.length === 0 && (
          <div className="col-span-full crm-card p-6 text-center text-crm-muted italic">
            Nenhuma tarefa cadastrada.
          </div>
        )}

        {tasks.map((task) => (
          <div key={task.id} className="crm-card p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={task.completed}
                onChange={() => toggleTask(task)}
                className="mt-1 w-5 h-5 cursor-pointer"
                style={{ accentColor: '#50C070' }}
              />

              <div className="flex-1">
                <p
                  className={`font-extrabold ${
                    task.completed ? 'line-through text-crm-muted' : 'text-crm-text'
                  }`}
                >
                  {task.title}
                </p>

                {task.due_date && (
                  <p className="text-xs text-crm-muted mt-1 flex items-center gap-1">
                    <Icons.Calendar size={12} />
                    {new Date(task.due_date).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>

              <button
                onClick={() => deleteTask(task.id)}
                className="text-crm-muted hover:text-red-500 transition-colors"
              >
                <Icons.Trash size={16} />
              </button>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span
                className={`px-2 py-1 rounded-full font-extrabold ${
                  task.completed
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {task.completed ? 'Concluída' : 'Pendente'}
              </span>

              <span className="text-crm-muted font-bold uppercase tracking-widest text-[10px]">
                Task
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminTasks;
