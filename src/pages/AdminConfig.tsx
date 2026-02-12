import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  avatar_url?: string;
  level?: number;
  xp?: number;
  active: boolean;
}

interface Template {
  id: string;
  title: string;
  content: string;
}

const AdminConfig: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'templates'>('profile');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [autoDistribute, setAutoDistribute] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', email: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSettings();
    fetchProfiles();
    fetchTemplates();
  }, []);

  useEffect(() => {
    setProfileForm({
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      email: user?.email ?? '',
    });
  }, [user?.name, user?.phone, user?.email]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').single();
    if (data) setAutoDistribute(data.auto_distribution);
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('name');
    if (data) setProfiles(data as Profile[]);
  };

  const fetchTemplates = async () => {
    const { data } = await supabase.from('message_templates').select('*').order('created_at', { ascending: true });
    if (data) setTemplates(data as Template[]);
    setLoading(false);
  };

  const toggleAutoDistribution = async () => {
    const newValue = !autoDistribute;
    setAutoDistribute(newValue);
    await supabase.from('settings').update({ auto_distribution: newValue }).eq('id', 1);
  };

  const toggleAgentStatus = async (id: string, currentStatus: boolean) => {
    setProfiles(prev => prev.map(p => (p.id === id ? { ...p, active: !currentStatus } : p)));
    await supabase.from('profiles').update({ active: !currentStatus }).eq('id', id);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.content) return;

    if (editingId) {
      await supabase.from('message_templates').update(formData).eq('id', editingId);
    } else {
      await supabase.from('message_templates').insert([formData]);
    }

    setFormData({ title: '', content: '' });
    setEditingId(null);
    fetchTemplates();
  };

  const handleDeleteTemplate = async (id: string) => {
    if (confirm('Excluir?')) {
      await supabase.from('message_templates').delete().eq('id', id);
      fetchTemplates();
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({ name: profileForm.name, phone: profileForm.phone })
      .eq('id', user.id);

    if (!error) {
      await refreshUser();
      await fetchProfiles();
    }

    setSavingProfile(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setUploadingAvatar(true);

    const extension = file.name.split('.').pop() || 'jpg';
    const filePath = `${user.id}/${Date.now()}.${extension}`;

    const uploadResult = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (!uploadResult.error) {
      const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const avatarUrl = publicData.publicUrl;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (!updateError) {
        await refreshUser();
        await fetchProfiles();
      }
    }

    setUploadingAvatar(false);
    event.target.value = '';
  };

  const currentLevel = Math.max(1, Number(user?.level ?? 1));
  const currentXP = Math.max(0, Number(user?.xp ?? 0));
  const progressMax = 100;
  const progressCurrent = currentXP % progressMax;
  const pointsToNext = progressMax - progressCurrent;

  const roleLabel = useMemo(() => {
    if (user?.role === 'admin') return 'Administrador';
    if (!user?.role) return 'Corretor';
    return `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}`;
  }, [user?.role]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">Configurações</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">Gerencie seu perfil, equipe e automações do sistema.</p>
      </div>

      <div className="flex gap-6 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-4 px-2 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'profile' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          <Icons.User size={18} /> Meu Perfil
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`pb-4 px-2 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'team' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          <Icons.Users size={18} /> Equipe & Distribuição
        </button>
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-4 px-2 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'templates' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          <Icons.MessageCircle size={18} /> Templates de Mensagem
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-dark-border">
            <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
              <Icons.User size={18} /> Meu Perfil
            </h3>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full bg-brand-100 text-brand-700 border border-brand-200 overflow-hidden flex items-center justify-center"
                title="Clique para alterar avatar"
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar do usuário" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-bold text-2xl">{(user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}</span>
                )}
                <span className="absolute inset-x-0 bottom-0 text-[10px] py-0.5 bg-black/50 text-white">{uploadingAvatar ? 'Enviando...' : 'Alterar'}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
              />

              <div>
                <p className="font-bold text-slate-800 dark:text-white">{user?.name || 'Usuário'}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{roleLabel}</p>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                  value={profileForm.name}
                  onChange={e => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefone</label>
                <input
                  type="text"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                  value={profileForm.phone}
                  onChange={e => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-mail</label>
                <input
                  type="email"
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 outline-none opacity-70 cursor-not-allowed"
                  value={profileForm.email}
                  disabled
                />
              </div>

              <button
                type="submit"
                disabled={savingProfile}
                className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-60"
              >
                {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
              </button>
            </form>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-2xl border border-slate-700 h-fit">
            <p className="text-xs uppercase tracking-widest text-brand-300">Gamificação</p>
            <h3 className="text-xl font-bold mt-2">Seu Nível: {currentLevel}</h3>
            <p className="text-sm text-slate-300 mt-1">XP Total: {currentXP}</p>

            <div className="mt-6">
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Progresso para o próximo nível</span>
                <span>{progressCurrent}/{progressMax}</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: `${(progressCurrent / progressMax) * 100}%` }}
                />
              </div>
              <p className="text-xs text-slate-300 mt-2">Faltam {pointsToNext} pontos para o próximo nível.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <div className={`p-6 rounded-2xl border shadow-sm transition-all ${autoDistribute ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-white border-gray-200 dark:bg-dark-card dark:border-dark-border'}`}>
              <div className="flex items-center gap-4 mb-4">
                <div className={`p-3 rounded-full ${autoDistribute ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                  <Icons.RefreshCw size={24} className={autoDistribute ? 'animate-spin-slow' : ''} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Distribuição Automática</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{autoDistribute ? 'Ativado (Round Robin)' : 'Desativado (Manual)'}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                Quando ativado, novos leads serão distribuídos sequencialmente entre os corretores marcados como "Disponível".
              </p>

              <button
                onClick={toggleAutoDistribution}
                className={`w-full py-3 rounded-xl font-bold transition-colors ${autoDistribute ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
              >
                {autoDistribute ? 'Desativar Distribuição' : 'Ativar Distribuição'}
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Icons.Users size={20} /> Membros da Equipe ({profiles.length})
            </h3>

            <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border overflow-hidden">
              {profiles.map((profile) => (
                <div key={profile.id} className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-slate-700 text-brand-700 dark:text-white flex items-center justify-center font-bold overflow-hidden">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt={profile.name || 'Avatar'} className="w-full h-full object-cover" />
                      ) : (
                        profile.name?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800 dark:text-white">{profile.name || 'Usuário sem nome'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{profile.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${profile.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {profile.active ? 'Disponível' : 'Pausado'}
                    </span>
                    <button
                      onClick={() => toggleAgentStatus(profile.id, profile.active)}
                      className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                      title={profile.active ? 'Pausar recebimento de leads' : 'Ativar recebimento'}
                    >
                      {profile.active ? <Icons.Pause size={18} /> : <Icons.Play size={18} />}
                    </button>
                  </div>
                </div>
              ))}
              {profiles.length === 0 && <p className="p-8 text-center text-gray-400">Nenhum membro encontrado.</p>}
            </div>

            <div className="bg-blue-50 dark:bg-slate-800/50 border border-blue-100 dark:border-slate-700 p-4 rounded-xl flex gap-3">
              <Icons.Info className="text-blue-500 flex-shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Para adicionar novos corretores, crie uma conta para eles na página de Login. Eles aparecerão aqui automaticamente.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-dark-border h-fit">
            <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
              <Icons.Edit size={18} className="text-brand-500" /> {editingId ? 'Editar Modelo' : 'Novo Modelo'}
            </h3>
            <form onSubmit={handleSaveTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Título</label>
                <input type="text" className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required placeholder="Ex: Boas vindas" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Conteúdo</label>
                <textarea className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none h-32 resize-none focus:ring-2 focus:ring-brand-500" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} required placeholder="Olá {nome}..." />
              </div>
              <div className="flex gap-2 justify-end">
                {editingId && <button type="button" onClick={() => { setEditingId(null); setFormData({ title: '', content: '' }); }} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancelar</button>}
                <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800">Salvar</button>
              </div>
            </form>
          </div>
          <div className="space-y-3">
            {!loading && templates.map(tpl => (
              <div key={tpl.id} className="bg-white dark:bg-dark-card p-4 rounded-xl border border-gray-200 dark:border-dark-border group relative">
                <h4 className="font-bold text-slate-800 dark:text-white">{tpl.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">"{tpl.content}"</p>
                <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingId(tpl.id); setFormData({ title: tpl.title, content: tpl.content }); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Icons.Edit size={16} /></button>
                  <button onClick={() => handleDeleteTemplate(tpl.id)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Icons.Trash size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConfig;
