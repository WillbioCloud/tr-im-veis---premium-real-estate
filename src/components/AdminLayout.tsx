import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

const AdminLayout: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  const menuItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: Icons.Dashboard },
    { label: 'Leads (CRM)', path: '/admin/leads', icon: Icons.Users },
    { label: 'Imóveis', path: '/admin/imoveis', icon: Icons.Building },
    { label: 'Tarefas', path: '/admin/tarefas', icon: Icons.Calendar },
    { label: 'Configurações', path: '/admin/config', icon: Icons.Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden font-sans">
      
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shadow-xl relative z-20">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-2xl font-serif font-bold tracking-wide text-brand-400">TR Imóveis</h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Gestão Premium</p>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                ${isActive 
                  ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
              `}
            >
              <item.icon size={20} className="group-hover:scale-110 transition-transform" />
              <span className="font-medium text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* === PERFIL DO USUÁRIO (RODAPÉ) === */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-lg shadow-md border-2 border-slate-700 shrink-0">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {user?.name || 'Usuário'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className={`w-1.5 h-1.5 rounded-full ${user?.role === 'admin' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold truncate">
                  {user?.role === 'admin' ? 'Administrador' : 'Corretor'}
                </p>
              </div>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 hover:bg-red-500/10 hover:text-red-400 text-slate-400 text-xs font-bold transition-all border border-slate-700 hover:border-red-500/20"
          >
            <Icons.LogOut size={14} /> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 md:rounded-l-[2.5rem] shadow-2xl relative z-10">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-100">
          <div className="font-serif font-bold text-slate-800">TR Imóveis</div>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <Icons.Menu />
          </button>
        </header>

        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-[60px] left-0 right-0 bg-white border-b border-slate-100 shadow-xl z-50 p-4 space-y-2 animate-in fade-in slide-in-from-top-4 duration-200">
            {menuItems.map(item => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-3 rounded-lg
                  ${isActive ? 'bg-brand-50 text-brand-700 font-bold' : 'text-slate-600'}
                `}
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
            <div className="pt-4 border-t border-slate-100 mt-2">
              <div className="flex items-center gap-3 px-4 py-2">
                <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold">
                  {user?.name?.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-700">{user?.name}</p>
                  <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout} 
                className="w-full text-left px-4 py-3 text-red-500 text-sm font-bold flex items-center gap-2"
              >
                <Icons.LogOut size={16} /> Sair
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Content Area */}
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