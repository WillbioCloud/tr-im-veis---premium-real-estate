import React, { useMemo, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

type MenuItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const AdminLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const mainMenu: MenuItem[] = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: Icons.Dashboard },
    { label: 'Leads', path: '/admin/leads', icon: Icons.Users },
    { label: 'Imóveis', path: '/admin/imoveis', icon: Icons.Building },
    { label: 'Agenda', path: '/admin/tarefas', icon: Icons.Calendar },
  ];

  const adminMenu: MenuItem[] = useMemo(
    () =>
      user?.role === 'admin'
        ? [
            { label: 'Equipe', path: '/admin/config?tab=team', icon: Icons.Users },
            { label: 'Relatórios Financeiros', path: '/admin/dashboard?section=financeiro', icon: Icons.BarChart },
          ]
        : [],
    [user?.role]
  );

  const personalMenu: MenuItem[] = [
    { label: 'Meu Perfil', path: '/admin/config?tab=profile', icon: Icons.User },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const handleExitToHome = async () => {
    await signOut();
    navigate('/');
  };

  const userInitial = (user?.name?.charAt(0) || user?.email?.charAt(0) || 'U').toUpperCase();

  const renderMenuSection = (title: string, items: MenuItem[], mobile = false) => (
    <div className="space-y-1">
      <p className={`px-4 text-[10px] uppercase font-bold tracking-[0.15em] ${mobile ? 'text-slate-400' : 'text-slate-500'}`}>{title}</p>
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={() => mobile && setIsMobileMenuOpen(false)}
          className={({ isActive }) => `
            flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
            ${
              isActive
                ? mobile
                  ? 'bg-brand-50 text-brand-700 font-bold'
                  : 'bg-brand-600 text-white shadow-lg shadow-brand-900/20'
                : mobile
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }
          `}
        >
          <item.icon size={20} className="group-hover:scale-110 transition-transform" />
          <span className="font-medium text-sm">{item.label}</span>
        </NavLink>
      ))}
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden font-sans">
      <aside className="hidden md:flex flex-col w-72 bg-slate-900 text-white shadow-xl relative z-20">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-2xl font-serif font-bold tracking-wide text-brand-400">TR Imóveis</h1>
            <button
              className="text-slate-400 hover:text-brand-400 transition-colors flex items-center justify-center p-1 rounded-md hover:bg-slate-800"
              onClick={handleExitToHome}
              aria-label="Abrir site e Sair"
              title="Ir para o site (Sair)"
            >
              <Icons.Globe size={20} />
            </button>
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Gestão Premium</p>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-5 overflow-y-auto custom-scrollbar">
          {renderMenuSection('Principal', mainMenu)}
          {adminMenu.length > 0 && renderMenuSection('Admin', adminMenu)}
          {renderMenuSection('Pessoal', personalMenu)}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-3">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user?.name || 'Avatar'} className="w-11 h-11 rounded-full object-cover border-2 border-slate-700" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-slate-700 shrink-0">
                {userInitial}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{user?.name || user?.email || 'Usuário'}</p>
              <p className="text-[11px] text-slate-400 font-semibold truncate">Nível: {user?.level || 'Júnior'}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 text-xs font-bold transition-all border border-slate-700 hover:border-red-500/20"
          >
            <Icons.LogOut size={14} /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 md:rounded-l-[2.5rem] shadow-2xl relative z-10">
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-100">
          <div className="font-serif font-bold text-slate-800">TR Imóveis</div>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            <Icons.Menu />
          </button>
        </header>

        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-[60px] left-0 right-0 bg-white border-b border-slate-100 shadow-xl z-50 p-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
            {renderMenuSection('Principal', mainMenu, true)}
            {adminMenu.length > 0 && renderMenuSection('Admin', adminMenu, true)}
            {renderMenuSection('Pessoal', personalMenu, true)}

            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center gap-3 px-2 py-2">
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user?.name || 'Avatar'} className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold">{userInitial}</div>
                )}
                <div>
                  <p className="text-sm font-bold text-slate-700">{user?.name || user?.email}</p>
                  <p className="text-xs text-slate-500">Nível: {user?.level || 'Júnior'}</p>
                </div>
              </div>
              <button onClick={handleLogout} className="w-full text-left px-3 py-3 text-red-500 text-sm font-bold flex items-center gap-2">
                <Icons.LogOut size={16} /> Sair
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto pb-10">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
