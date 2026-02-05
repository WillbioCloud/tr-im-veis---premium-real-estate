import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Icons } from '../components/Icons';
import { COMPANY_NAME } from '../constants';

type MenuItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
};

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  const menuItems: MenuItem[] = useMemo(
    () => [
      { label: 'Dashboard', path: '/admin/dashboard', icon: Icons.Dashboard },
      { label: 'Agenda', path: '/admin/tarefas', icon: Icons.Calendar },
      { label: 'Imóveis', path: '/admin/imoveis', icon: Icons.Building },
      { label: 'Leads (CRM)', path: '/admin/leads', icon: Icons.Users },
      { label: 'Configurações', path: '/admin/config', icon: Icons.Settings },
    ],
    []
  );

  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Brand */}
      <div className="px-7 py-7 border-b border-white/10">
        <Link
          to="/"
          className="text-2xl font-serif font-bold tracking-wide text-white/95 hover:text-white transition-colors"
          onClick={() => setMobileOpen(false)}
        >
          {COMPANY_NAME}
        </Link>
        <div className="mt-2 flex items-center gap-2">
          <span className="crm-pill">CRM</span>
          <span className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest">
            Nexus Style
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {menuItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={[
                'group relative flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-extrabold transition-all duration-200',
                active
                  ? 'bg-white/10 text-white shadow-soft2'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white',
              ].join(' ')}
            >
              {/* Barra verde do ativo (muito parecida com a UI do print) */}
              {active && (
                <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-crm-primary" />
              )}

              <Icon
                size={20}
                className={[
                  'transition-colors',
                  active ? 'text-white' : 'text-slate-500 group-hover:text-white',
                ].join(' ')}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer actions */}
      <div className="px-5 py-5 border-t border-white/10 space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
        >
          {theme === 'dark' ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
          {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-extrabold text-red-300/80 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <Icons.LogOut size={18} />
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-crm-bg dark:bg-dark-bg flex transition-colors duration-300 font-sans">
      {/* Sidebar Desktop */}
      <aside className="w-72 bg-crm-navy text-white hidden md:flex flex-col shadow-2xl z-20">
        <SidebarContent />
      </aside>

      {/* Overlay + Drawer Mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-crm-navy text-white shadow-2xl">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-dark-card border-b border-crm-border dark:border-dark-border px-4 md:px-8 py-4 flex items-center justify-between z-20">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Icons.Menu />
            </button>

            <div className="leading-tight">
              <div className="text-sm font-extrabold text-crm-text dark:text-white">
                {COMPANY_NAME}
              </div>
              <div className="text-xs font-bold text-crm-muted dark:text-dark-muted">
                Painel Administrativo
              </div>
            </div>
          </div>

          {/* Right actions (estilo “topbar clean”) */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg border border-crm-border dark:border-dark-border bg-white dark:bg-dark-card text-crm-body dark:text-dark-text hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-sm font-bold"
              title="Alternar tema"
            >
              {theme === 'dark' ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />}
              <span className="hidden md:inline">
                {theme === 'dark' ? 'Claro' : 'Escuro'}
              </span>
            </button>
          </div>
        </header>

        {/* Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto pb-10">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
