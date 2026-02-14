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

const AdminConfig: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const isAdmin = user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'team'>('profile');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [autoDistribute, setAutoDistribute] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    fetchSettings();
    if (isAdmin) {
      fetchProfiles();
    }
  }, [isAdmin]);

  useEffect(() => {
    setProfileForm({
      name: user?.name ?? '',
      phone: user?.phone ?? '',
      email: user?.email ?? '',
    });
  }, [user?.name, user?.phone, user?.email]);

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').single();
    if (data) setAutoDistribute(Boolean(data.auto_distribution));
  };

  const fetchProfiles = async () => {
    const { data } = await supabase.from('profiles').select('*').order('name');
    if (data) setProfiles(data as Profile[]);
  };

  const toggleAutoDistribution = async () => {
    const nextValue = !autoDistribute;
    setAutoDistribute(nextValue);
    await supabase.from('settings').update({ auto_distribution: nextValue }).eq('id', 1);
  };

  const updateProfileStatus = async (id: string, active: boolean) => {
    await supabase.from('profiles').update({ active }).eq('id', id);
    await fetchProfiles();
  };

  const deleteProfile = async (id: string) => {
    await supabase.from('profiles').delete().eq('id', id);
    await fetchProfiles();
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
      if (isAdmin) await fetchProfiles();
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
        if (isAdmin) await fetchProfiles();
      }
    }

    setUploadingAvatar(false);
    event.target.value = '';
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.password || passwordForm.password !== passwordForm.confirmPassword) return;

    setSavingPassword(true);
    await supabase.auth.updateUser({ password: passwordForm.password });
    setPasswordForm({ password: '', confirmPassword: '' });
    setSavingPassword(false);
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

  const pendingProfiles = useMemo(() => profiles.filter((profile) => !profile.active), [profiles]);
  const activeProfiles = useMemo(() => profiles.filter((profile) => profile.active), [profiles]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif font-bold text-slate-800 dark:text-white">Configurações</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400">Gerencie seu perfil, segurança e equipe.</p>
      </div>

      <div className="flex gap-6 border-b border-gray-200 dark:border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-4 px-2 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'profile' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          <Icons.User size={18} /> Perfil
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-4 px-2 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'security' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
        >
          <Icons.Lock size={18} /> Segurança
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-4 px-2 text-sm font-bold transition-colors border-b-2 flex items-center gap-2 whitespace-nowrap ${activeTab === 'team' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
          >
            <Icons.Users size={18} /> Equipe
          </button>
        )}
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-dark-border space-y-6">
            <div className="flex items-center gap-5">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative w-20 h-20 rounded-full bg-brand-100 dark:bg-slate-700 text-brand-700 dark:text-white overflow-hidden flex items-center justify-center"
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
                <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${(progressCurrent / progressMax) * 100}%` }} />
              </div>
              <p className="text-xs text-slate-300 mt-2">Faltam {pointsToNext} pontos para o próximo nível.</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="max-w-2xl bg-white dark:bg-dark-card p-6 rounded-2xl border border-gray-200 dark:border-dark-border">
          <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <Icons.Lock size={18} /> Alterar Senha
          </h3>

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nova Senha</label>
              <input
                type="password"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                value={passwordForm.password}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                required
                minLength={6}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar Nova Senha</label>
              <input
                type="password"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-slate-600 dark:bg-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-brand-500"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                required
                minLength={6}
              />
            </div>

            {passwordForm.confirmPassword && passwordForm.password !== passwordForm.confirmPassword && (
              <p className="text-xs text-red-500">As senhas não coincidem.</p>
            )}

            <button
              type="submit"
              disabled={savingPassword || passwordForm.password !== passwordForm.confirmPassword}
              className="bg-slate-900 text-white px-6 py-2 rounded-lg font-bold hover:bg-slate-800 disabled:opacity-60"
            >
              {savingPassword ? 'Atualizando...' : 'Atualizar Senha'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'team' && isAdmin && (
        <div className="space-y-6">
          <div className={`p-6 rounded-2xl border shadow-sm transition-all ${autoDistribute ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800' : 'bg-white border-gray-200 dark:bg-dark-card dark:border-dark-border'}`}>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white">Distribuição Automática de Leads</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">{autoDistribute ? 'Ativado (Round Robin)' : 'Desativado (Manual)'}</p>
              </div>
              <button
                onClick={toggleAutoDistribution}
                className={`px-5 py-2 rounded-xl font-bold transition-colors ${autoDistribute ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-900 hover:bg-slate-800 text-white'}`}
              >
                {autoDistribute ? 'Desativar' : 'Ativar'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-white">Pendentes ({pendingProfiles.length})</h3>
              </div>
              {pendingProfiles.map((profile) => (
                <div key={profile.id} className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-slate-800 last:border-0">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{profile.name || 'Sem nome'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{profile.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateProfileStatus(profile.id, true)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Aprovar</button>
                    <button onClick={() => deleteProfile(profile.id)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-100 text-red-700 hover:bg-red-200">Rejeitar</button>
                  </div>
                </div>
              ))}
              {pendingProfiles.length === 0 && <p className="p-5 text-sm text-gray-400">Sem usuários pendentes.</p>}
            </div>

            <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-slate-800">
                <h3 className="font-bold text-slate-800 dark:text-white">Ativos ({activeProfiles.length})</h3>
              </div>
              {activeProfiles.map((profile) => (
                <div key={profile.id} className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-slate-800 last:border-0">
                  <div>
                    <p className="font-bold text-slate-800 dark:text-white">{profile.name || 'Sem nome'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{profile.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => updateProfileStatus(profile.id, false)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200">Pausar</button>
                    <button onClick={() => deleteProfile(profile.id)} className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-100 text-red-700 hover:bg-red-200">Excluir</button>
                  </div>
                </div>
              ))}
              {activeProfiles.length === 0 && <p className="p-5 text-sm text-gray-400">Sem usuários ativos.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminConfig;