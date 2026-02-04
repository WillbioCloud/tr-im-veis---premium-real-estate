import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Icons } from './Icons';
import { COMPANY_NAME } from '../constants';

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  const navItems = [
    { path: '/admin/dashboard', label: 'Dashboard', icon: Icons.LayoutDashboard },
    { path: '/admin/imoveis', label: 'Imóveis', icon: Icons.Building },
    { path: '/admin/leads', label: 'Leads (CRM)', icon: Icons.Users },
    { path: '/admin/config', label: 'Configurações', icon: Icons.Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold font-serif">{COMPANY_NAME}</h2>
          <span className="text-xs text-slate-400">Admin Panel</span>
        </div>
        
        <nav className="flex-grow p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link 
                key={item.path}
                to={item.path} 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive ? 'bg-amber-500 text-slate-900 font-bold' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link to="/" className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <Icons.ArrowRight size={16} /> Voltar ao Site
          </Link>
        </div>
      </aside>

      {/* Main Admin Content */}
      <div className="flex-grow flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden bg-white shadow-sm p-4 flex justify-between items-center">
          <span className="font-bold">Admin</span>
          <button><Icons.Menu /></button>
        </header>

        <main className="flex-grow overflow-auto p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
