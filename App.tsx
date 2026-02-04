import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';

// Public Pages
import Home from './pages/Home';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminLeads from './pages/AdminLeads';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  return (
    <>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/imoveis" element={<Layout><Properties /></Layout>} />
        <Route path="/imoveis/:slug" element={<Layout><PropertyDetail /></Layout>} />
        
        {/* SEO Redirects / Placeholders */}
        <Route path="/bairros/:slug" element={<Layout><Properties /></Layout>} /> {/* In real app, render filtered view */}
        <Route path="/servicos" element={<Layout><div className="p-20 text-center">Página de Serviços (Em construção)</div></Layout>} />
        <Route path="/sobre" element={<Layout><div className="p-20 text-center">Sobre a TR Imóveis (Em construção)</div></Layout>} />
        <Route path="/contato" element={<Layout><div className="p-20 text-center">Página de Contato (Em construção)</div></Layout>} />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<div className="h-screen flex items-center justify-center bg-gray-900 text-white"><a href="/#/admin/dashboard" className="border px-6 py-2 rounded hover:bg-white hover:text-black">Entrar (Demo)</a></div>} />
        
        <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
        <Route path="/admin/imoveis" element={<AdminLayout><div className="p-4">Lista de Imóveis (CRUD aqui)</div></AdminLayout>} />
        <Route path="/admin/leads" element={<AdminLayout><AdminLeads /></AdminLayout>} />
        <Route path="/admin/config" element={<AdminLayout><div className="p-4">Configurações</div></AdminLayout>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export default App;
