import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icons } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

interface Profile { id: string; name: string; email: string; role?: string; avatar_url?: string; active: boolean; }

const AdminConfig: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'team'>('profile');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [autoDistribute, setAutoDistribute] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', email: '' });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user) { setProfileForm({ name: user.name || '', email: user.email || '', phone: '' }); fetchConfig(); }
  }, [user]);

  const fetchConfig = async () => {
    const { data: settings } = await supabase.from('settings').select('*').single();
    if (settings) setAutoDistribute(settings.auto_distribute);
    if (user?.role === 'admin') {
      const { data: team } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
      if (team) setProfiles(team);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    const { error } = await supabase.from('profiles').update({ name: profileForm.name }).eq('id', user?.id);
    if (!error) { await refreshUser(); alert('Perfil atualizado!'); }
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault(); if (passwordForm.newPassword !== passwordForm.confirmPassword) return alert('Senhas não conferem');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword });
    setLoading(false);
    if (error) alert(error.message); else { alert('Senha alterada!'); setPasswordForm({ newPassword: '', confirmPassword: '' }); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploadingAvatar(true);
    const file = e.target.files[0];
    const fileName = `${user?.id}-${Math.random()}.${file.name.split('.').pop()}`;
    const { error } = await supabase.storage.from('avatars').upload(fileName, file);
    if (!error) {
       const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
       await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user?.id);
       await refreshUser();
    }
    setUploadingAvatar(false);
  };

  const toggleUserStatus = async (id: string, currentStatus: boolean) => {
    const { error } = await supabase.from('profiles').update({ active: !currentStatus }).eq('id', id);
    if (!error) fetchConfig();
  };
  const deleteUser = async (id: string) => {
    if (!window.confirm('Certeza?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (!error) fetchConfig();
  };
  const toggleAutoDistribute = async () => {
    const newValue = !autoDistribute;
    const { error } = await supabase.from('settings').update({ auto_distribute: newValue }).eq('id', 1);
    if (!error) setAutoDistribute(newValue);
  };

  const pendingUsers = profiles.filter(p => !p.active);
  const activeUsers = profiles.filter(p => p.active);

  return (
    <div className="max-w-4xl mx-auto animate-fade-in pb-20">
      <h1 className="text-2xl font-bold mb-6">Configurações</h1>
      <div className="flex gap-4 mb-8 border-b">
        <button onClick={() => setActiveTab('profile')} className={`pb-3 px-1 ${activeTab === 'profile' ? 'border-b-2 border-slate-900 font-bold' : ''}`}>Meu Perfil</button>
        <button onClick={() => setActiveTab('password')} className={`pb-3 px-1 ${activeTab === 'password' ? 'border-b-2 border-slate-900 font-bold' : ''}`}>Segurança</button>
        {user?.role === 'admin' && <button onClick={() => setActiveTab('team')} className={`pb-3 px-1 ${activeTab === 'team' ? 'border-b-2 border-slate-900 font-bold' : ''}`}>Equipe</button>}
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white dark:bg-dark-card p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-6 mb-8">
            <div className="relative w-24 h-24 rounded-full bg-slate-100 overflow-hidden">
               {user?.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full font-bold">{user?.name?.charAt(0)}</div>}
               <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 p-2 bg-slate-900 text-white rounded-full"><Icons.Camera size={16} /></button>
               <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" />
            </div>
            <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md w-full">
              <input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full p-3 border rounded-lg" />
              <button disabled={loading} className="px-6 py-2 bg-slate-900 text-white rounded-lg">Salvar</button>
            </form>
          </div>
        </div>
      )}
      {activeTab === 'password' && (
        <form onSubmit={handleChangePassword} className="bg-white dark:bg-dark-card p-6 rounded-2xl max-w-md space-y-4">
           <input type="password" placeholder="Nova Senha" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} className="w-full p-3 border rounded-lg" />
           <input type="password" placeholder="Confirmar Senha" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} className="w-full p-3 border rounded-lg" />
           <button disabled={loading} className="w-full py-3 bg-slate-900 text-white rounded-lg">Alterar Senha</button>
        </form>
      )}
      {activeTab === 'team' && user?.role === 'admin' && (
        <div className="space-y-8">
          <div className="bg-slate-900 p-6 rounded-2xl text-white flex justify-between">
            <h3>Distribuição Automática</h3>
            <button onClick={toggleAutoDistribute} className={`w-14 h-8 rounded-full p-1 ${autoDistribute ? 'bg-emerald-500' : 'bg-slate-600'}`}><div className={`w-6 h-6 bg-white rounded-full transform ${autoDistribute ? 'translate-x-6' : ''}`} /></button>
          </div>
          {pendingUsers.length > 0 && (
             <div className="bg-yellow-50 p-6 rounded-2xl">
                <h3>Pendentes ({pendingUsers.length})</h3>
                {pendingUsers.map(u => ( <div key={u.id} className="flex justify-between bg-white p-4 mt-2 rounded-xl"><span>{u.name}</span><div className="flex gap-2"><button onClick={() => deleteUser(u.id)}><Icons.Trash /></button><button onClick={() => toggleUserStatus(u.id, false)} className="text-emerald-600">Aprovar</button></div></div> ))}
             </div>
          )}
          <div>
            <h3>Ativos ({activeUsers.length})</h3>
            {activeUsers.map(u => ( <div key={u.id} className="flex justify-between bg-white border p-4 mt-2 rounded-xl"><span>{u.name}</span>{u.id !== user?.id && <div className="flex gap-2"><button onClick={() => deleteUser(u.id)}><Icons.Trash /></button><button onClick={() => toggleUserStatus(u.id, true)}>Pausar</button></div>}</div> ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default AdminConfig;
