import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import { runWithSessionRecovery, supabase } from '../lib/supabase';

interface Profile {
  id: string;
  name: string;
  email: string;
  active: boolean;
  role?: string;
  phone?: string;
  avatar_url?: string;
  level?: string;
  xp?: number;
  next_level_xp?: number;
}

interface MessageTemplate {
  id: string;
  title: string;
  content: string;
  user_id?: string | null;
  is_global?: boolean;
}

const AdminConfig: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') as 'profile' | 'templates' | 'team' | null;
  const [activeTab, setActiveTab] = useState<'profile' | 'templates' | 'team'>(initialTab === 'templates' || initialTab === 'team' ? initialTab : 'profile');

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [autoDistribute, setAutoDistribute] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);

  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(true);

  const [profileForm, setProfileForm] = useState({ name: '', phone: '', password: '' });
  const [templateForm, setTemplateForm] = useState({ title: '', content: '' });
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    setSearchParams((prev) => {
      prev.set('tab', activeTab);
      return prev;
    });
  }, [activeTab, setSearchParams]);

  useEffect(() => {
    setProfileForm({ name: user?.name ?? '', phone: user?.phone ?? '', password: '' });
  }, [user?.name, user?.phone]);

  useEffect(() => {
    fetchTemplates();
    if (user?.role === 'admin') {
      fetchProfiles();
      fetchSettings();
    }
  }, [user?.role]);

  const fetchTemplates = async () => {
    setLoadingTemplates(true);
    const { data } = await runWithSessionRecovery(() =>
      supabase.from('message_templates').select('id, title, content, user_id, is_global').order('created_at', { ascending: true })
    );
    setTemplates((data as MessageTemplate[]) ?? []);
    setLoadingTemplates(false);
  };

  const fetchSettings = async () => {
    const { data } = await runWithSessionRecovery(() => supabase.from('settings').select('*').single());
    if (data) setAutoDistribute(Boolean((data as { auto_distribution?: boolean }).auto_distribution));
  };

  const fetchProfiles = async () => {
    const { data } = await runWithSessionRecovery(() =>
      supabase.from('profiles').select('id, name, email, active, role, phone, avatar_url, level, xp, next_level_xp').order('name')
    );
    setProfiles((data as Profile[]) ?? []);
  };

  const myXp = user?.xp ?? 0;
  const nextLevelXp = user?.next_level_xp ?? 100;
  const xpProgress = Math.min(100, Math.round((myXp / Math.max(nextLevelXp, 1)) * 100));

  const globalTemplates = useMemo(
    () => templates.filter((tpl) => tpl.is_global || !tpl.user_id || tpl.user_id !== user?.id),
    [templates, user?.id]
  );

  const myTemplates = useMemo(
    () => templates.filter((tpl) => tpl.user_id === user?.id || (!tpl.is_global && !tpl.user_id)),
    [templates, user?.id]
  );

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setSavingProfile(true);

    const updates: Record<string, unknown> = {
      name: profileForm.name,
      phone: profileForm.phone,
    };

    const { error: profileError } = await runWithSessionRecovery(() => supabase.from('profiles').update(updates).eq('id', user.id));

    if (!profileError) {
      await supabase.auth.updateUser({
        data: { name: profileForm.name, phone: profileForm.phone },
        ...(profileForm.password ? { password: profileForm.password } : {}),
      });
      setProfileForm((prev) => ({ ...prev, password: '' }));
      await refreshUser();
      alert('Perfil atualizado com sucesso.');
    } else {
      alert('Não foi possível atualizar o perfil.');
    }

    setSavingProfile(false);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploadingAvatar(true);
    const extension = file.name.split('.').pop() ?? 'png';
    const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });

    if (uploadError) {
      alert('Falha ao enviar avatar.');
      setUploadingAvatar(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
    const avatar_url = data.publicUrl;

    await supabase.from('profiles').update({ avatar_url }).eq('id', user.id);
    await supabase.auth.updateUser({ data: { avatar_url } });
    await refreshUser();
    setUploadingAvatar(false);
  };

  const toggleAutoDistribution = async () => {
    const newValue = !autoDistribute;
    setAutoDistribute(newValue);
    await supabase.from('settings').update({ auto_distribution: newValue }).eq('id', 1);
  };

  const toggleAgentStatus = async (id: string, currentStatus: boolean) => {
    setProfiles((prev) => prev.map((profile) => (profile.id === id ? { ...profile, active: !currentStatus } : profile)));
    await supabase.from('profiles').update({ active: !currentStatus }).eq('id', id);
  };

  const handleSaveTemplate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !templateForm.title || !templateForm.content) return;

    setSavingTemplate(true);

    if (editingTemplateId) {
      await supabase.from('message_templates').update(templateForm).eq('id', editingTemplateId).eq('user_id', user.id);
    } else {
      await supabase.from('message_templates').insert([{ ...templateForm, user_id: user.id, is_global: false }]);
    }

    setTemplateForm({ title: '', content: '' });
    setEditingTemplateId(null);
    await fetchTemplates();
    setSavingTemplate(false);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!window.confirm('Excluir este modelo?')) return;
    await supabase.from('message_templates').delete().eq('id', id).eq('user_id', user?.id);
    await fetchTemplates();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif font-bold text-slate-800">Configurações</h1>
        <p className="text-sm text-gray-500">Perfil, produtividade e preferências da sua operação.</p>
      </div>

      <div className="flex gap-4 border-b border-gray-200 overflow-auto">
        <button onClick={() => setActiveTab('profile')} className={`pb-3 px-2 text-sm font-bold border-b-2 ${activeTab === 'profile' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'}`}>
          Meu Perfil
        </button>
        <button onClick={() => setActiveTab('templates')} className={`pb-3 px-2 text-sm font-bold border-b-2 ${activeTab === 'templates' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'}`}>
          Modelos de Mensagem
        </button>
        {user?.role === 'admin' && (
          <button onClick={() => setActiveTab('team')} className={`pb-3 px-2 text-sm font-bold border-b-2 ${activeTab === 'team' ? 'border-brand-500 text-brand-600' : 'border-transparent text-gray-500'}`}>
            Equipe & Sistema
          </button>
        )}
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleProfileSave} className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
            <h3 className="font-bold text-slate-800">Dados do Corretor</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">Nome</label>
                <input value={profileForm.name} onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200" required />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">WhatsApp</label>
                <input value={profileForm.phone} onChange={(e) => setProfileForm((prev) => ({ ...prev, phone: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">E-mail</label>
                <input value={user?.email ?? ''} readOnly className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-100 bg-gray-100 text-gray-500" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">Nova senha</label>
                <input type="password" value={profileForm.password} onChange={(e) => setProfileForm((prev) => ({ ...prev, password: e.target.value }))} className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200" placeholder="Opcional" />
              </div>
            </div>
            <button type="submit" disabled={savingProfile} className="px-5 py-2.5 bg-slate-900 text-white rounded-lg font-bold disabled:opacity-60">
              {savingProfile ? 'Salvando...' : 'Salvar Perfil'}
            </button>
          </form>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-5">
            <div className="flex flex-col items-center gap-3">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-brand-100" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-brand-500 text-white text-3xl font-bold flex items-center justify-center border-4 border-brand-100">
                  {(user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase()}
                </div>
              )}
              <label className="cursor-pointer text-sm font-semibold text-brand-600 flex items-center gap-2">
                <Icons.Upload size={16} /> {uploadingAvatar ? 'Enviando...' : 'Alterar foto'}
                <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploadingAvatar} />
              </label>
            </div>

            <div>
              <p className="text-xs uppercase font-bold text-gray-500 mb-1">Gamificação</p>
              <p className="font-bold text-slate-800">Nível atual: {user?.level || 'Júnior'}</p>
              <div className="mt-3 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-brand-500 to-amber-400" style={{ width: `${xpProgress}%` }} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{myXp} XP de {nextLevelXp} XP</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 h-fit">
            <h3 className="font-bold text-slate-800 mb-4">Seus Modelos</h3>
            <form onSubmit={handleSaveTemplate} className="space-y-3">
              <input value={templateForm.title} onChange={(e) => setTemplateForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Título" className="w-full px-3 py-2 rounded-lg border border-gray-200" required />
              <textarea value={templateForm.content} onChange={(e) => setTemplateForm((prev) => ({ ...prev, content: e.target.value }))} placeholder="Mensagem" className="w-full px-3 py-2 rounded-lg border border-gray-200 h-32" required />
              <div className="flex justify-end gap-2">
                {editingTemplateId && (
                  <button type="button" onClick={() => { setEditingTemplateId(null); setTemplateForm({ title: '', content: '' }); }} className="px-4 py-2 text-sm rounded-lg border border-gray-200">Cancelar</button>
                )}
                <button type="submit" disabled={savingTemplate} className="px-4 py-2 bg-slate-900 text-white rounded-lg font-bold disabled:opacity-70">
                  {savingTemplate ? 'Salvando...' : editingTemplateId ? 'Atualizar' : 'Criar modelo'}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            {loadingTemplates ? (
              <p className="text-sm text-gray-400">Carregando modelos...</p>
            ) : (
              <>
                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <p className="text-xs uppercase font-bold text-gray-500 mb-2">Modelos Globais (somente leitura)</p>
                  <div className="space-y-2">
                    {globalTemplates.map((tpl) => (
                      <div key={tpl.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <p className="font-semibold text-sm text-slate-800">{tpl.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{tpl.content}</p>
                      </div>
                    ))}
                    {globalTemplates.length === 0 && <p className="text-xs text-gray-400">Nenhum modelo global cadastrado.</p>}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-gray-200">
                  <p className="text-xs uppercase font-bold text-gray-500 mb-2">Modelos Pessoais</p>
                  <div className="space-y-2">
                    {myTemplates.map((tpl) => (
                      <div key={tpl.id} className="p-3 rounded-lg border border-gray-100 group">
                        <p className="font-semibold text-sm text-slate-800">{tpl.title}</p>
                        <p className="text-xs text-gray-500 mt-1">{tpl.content}</p>
                        <div className="flex justify-end gap-1 mt-2 opacity-80">
                          <button onClick={() => { setEditingTemplateId(tpl.id); setTemplateForm({ title: tpl.title, content: tpl.content }); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Icons.Edit size={14} /></button>
                          <button onClick={() => handleDeleteTemplate(tpl.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Icons.Trash size={14} /></button>
                        </div>
                      </div>
                    ))}
                    {myTemplates.length === 0 && <p className="text-xs text-gray-400">Crie seu primeiro modelo personalizado.</p>}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {activeTab === 'team' && user?.role === 'admin' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 space-y-4">
            <h3 className="font-bold text-slate-800">Sistema</h3>
            <p className="text-sm text-gray-500">Distribuição automática de leads e ajustes globais do CRM.</p>
            <button onClick={toggleAutoDistribution} className={`w-full py-2.5 rounded-xl font-bold text-white ${autoDistribute ? 'bg-emerald-600' : 'bg-slate-900'}`}>
              {autoDistribute ? 'Desativar Distribuição' : 'Ativar Distribuição'}
            </button>
          </div>

          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-800">Equipe ({profiles.length})</h3>
              <button className="px-3 py-2 rounded-lg text-sm font-semibold bg-brand-50 text-brand-700">Criar Corretor</button>
            </div>
            {profiles.map((profile) => (
              <div key={profile.id} className="p-4 border-b border-gray-100 last:border-b-0 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-800">{profile.name || profile.email}</p>
                  <p className="text-xs text-gray-500">{profile.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded font-bold uppercase ${profile.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {profile.active ? 'Ativo' : 'Bloqueado'}
                  </span>
                  <button onClick={() => toggleAgentStatus(profile.id, profile.active)} className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-bold">
                    {profile.active ? 'Bloquear' : 'Liberar'}
                  </button>
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
