import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Icons } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

const AdminLayout: React.FC = () => {
  // O 'user' aqui agora vem do nosso AuthContext atualizado, contendo o 'role' do banco de dados
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  // Itens do menu - Você pode filtrar aqui se quiser esconder algo de quem não é admin
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
          <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] mt-1 font-bold">Premium Real Estate</p>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-2 custom-scrollbar">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                ${isActive 
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-[0_0_20px_rgba(180,152,94,0.1)]' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }
              `}
            >
              <item.icon size={20} className="group-hover:scale-110 transition-transform" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3 px-2 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-brand-400 flex items-center justify-center text-white font-bold shadow-lg">
              {user?.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-200 truncate">{user?.email || 'Usuário'}</p>
              {/* AQUI ESTÁ A CORREÇÃO: Exibindo o role que vem do AuthContext */}
              <p className="text-[10px] text-brand-400 font-bold uppercase tracking-wider">
                {user?.role === 'admin' ? '👑 Administrador' : 'Corretor'}
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all font-bold text-sm"
          >
            <Icons.LogOut size={18} />
            Sair do Painel
          </button>
        </div>
      </aside>

      {/* Área de Conteúdo Principal */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 relative">
        {/* Header Mobile */}
        <div className="md:hidden flex items-center justify-between p-4 bg-slate-900 text-white">
          <h1 className="text-xl font-serif font-bold text-brand-400">TR Imóveis</h1>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
            {isMobileMenuOpen ? <Icons.X size={24} /> : <Icons.Menu size={24} />}
          </button>
        </div>

        {/* Menu Mobile Dropdown */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-[64px] left-0 right-0 bg-slate-900 z-50 border-t border-slate-800 p-4 animate-slide-down">
            {menuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) => `
                  flex items-center gap-3 px-4 py-4 rounded-lg mb-2
                  ${isActive ? 'bg-brand-500 text-white font-bold' : 'text-slate-400'}
                `}
              >
                <item.icon size={20} />
                {item.label}
              </NavLink>
            ))}
            <div className="pt-4 border-t border-slate-800 mt-2">
              <div className="flex items-center gap-3 px-4 py-2">
                <div className="w-9 h-9 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold">
                  {user?.email?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <p className="text-sm font-bold text-slate-200">{user?.email}</p>
                    <p className="text-xs text-brand-400 uppercase">{user?.role}</p>
                  </div>
              </div>
              <button 
                onClick={handleLogout} 
                className="w-full text-left px-4 py-4 text-red-500 text-sm font-bold flex items-center gap-2"
              >
                <Icons.LogOut size={16} /> Sair
              </button>
            </div>
          </div>
        )}

        {/* Área de Scroll do Conteúdo */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto pb-20">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;