import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from './Icons';
import { COMPANY_NAME } from '../constants';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  const menuItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: Icons.Dashboard },
    { label: 'Imóveis', path: '/admin/imoveis', icon: Icons.Building },
    { label: 'Leads (CRM)', path: '/admin/leads', icon: Icons.Users },
    { label: 'Configurações', path: '/admin/config', icon: Icons.Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
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
              {/* Verificação de segurança: Só renderiza se o ícone existir */}
              {item.icon && <item.icon size={20} />}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
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
        {/* Mobile Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 md:hidden p-4 flex justify-between items-center">
          <span className="font-bold text-slate-900">{COMPANY_NAME} Admin</span>
          <button className="text-slate-600">
            <Icons.Menu />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
             {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;