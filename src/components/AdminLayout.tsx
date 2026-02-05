import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Icons } from './Icons';
import { COMPANY_NAME } from '../constants';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    setIsMobileMenuOpen(false);
    await signOut();
    navigate('/admin/login');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const menuItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: Icons.Dashboard },
    { label: 'Agenda', path: '/admin/tarefas', icon: Icons.Calendar },
    { label: 'Imóveis', path: '/admin/imoveis', icon: Icons.Building },
    { label: 'Leads (CRM)', path: '/admin/leads', icon: Icons.Users },
    { label: 'Configurações', path: '/admin/config', icon: Icons.Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-dark-bg flex transition-colors duration-300">
      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar (Desktop) */}
      <aside className="w-64 bg-slate-900 dark:bg-black text-white flex-shrink-0 hidden md:flex flex-col border-r border-slate-800">
        <div className="p-6 border-b border-slate-800">
          <Link to="/" className="text-xl font-serif font-bold text-white block hover:text-amber-500 transition-colors">
            {COMPANY_NAME}
          </Link>
          <span className="text-xs text-slate-500 mt-1 block">Painel Administrativo</span>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-amber-500 text-slate-900 shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon && <item.icon size={20} />}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={() => {
              toggleTheme();
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg w-full transition-colors text-sm font-medium"
          >
            {theme === 'dark' ? (
              <Icons.Sun size={20} className="text-amber-400" />
            ) : (
              <Icons.Moon size={20} />
            )}
            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg w-full transition-colors text-sm font-medium"
          >
            <Icons.LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Sidebar (Mobile Drawer) */}
      <aside
        className={`fixed z-50 inset-y-0 left-0 w-72 bg-slate-900 dark:bg-black text-white border-r border-slate-800 md:hidden transform transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-5 border-b border-slate-800 flex items-start justify-between">
          <div>
            <Link
              to="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-lg font-serif font-bold text-white block hover:text-amber-500 transition-colors"
            >
              {COMPANY_NAME}
            </Link>
            <span className="text-xs text-slate-500 mt-1 block">Painel Administrativo</span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="p-2 rounded-full hover:bg-slate-800"
            aria-label="Fechar menu"
          >
            <Icons.X />
          </button>
        </div>

        <nav className="py-4 px-3 space-y-1">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-amber-500 text-slate-900 shadow-md'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon && <item.icon size={20} />}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button
            onClick={() => {
              toggleTheme();
              setIsMobileMenuOpen(false);
            }}
            className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:bg-slate-800 hover:text-white rounded-lg w-full transition-colors text-sm font-medium"
          >
            {theme === 'dark' ? (
              <Icons.Sun size={20} className="text-amber-400" />
            ) : (
              <Icons.Moon size={20} />
            )}
            {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-slate-800 hover:text-red-300 rounded-lg w-full transition-colors text-sm font-medium"
          >
            <Icons.LogOut size={20} />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-dark-card shadow-sm border-b border-gray-200 dark:border-dark-border md:hidden p-4 flex justify-between items-center transition-colors">
          <span className="font-bold text-slate-900 dark:text-white">{COMPANY_NAME} Admin</span>
          <button
            className="text-slate-600 dark:text-gray-300"
            onClick={() => setIsMobileMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <Icons.Menu />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
