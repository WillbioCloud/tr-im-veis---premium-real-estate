import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // Importe o Provider
import ProtectedRoute from './components/ProtectedRoute'; // Importe a Rota Protegida
import AdminPropertyForm from './pages/AdminPropertyForm';

import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';

// Public Pages
import Home from './pages/Home';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Login from './pages/Login'; // Importe o Login

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminProperties from './pages/AdminProperties'; // Importe a Lista
import AdminLeads from './pages/AdminLeads';
// import AdminPropertyForm from './pages/AdminPropertyForm'; // Faremos em seguida

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/imoveis" element={<Layout><Properties /></Layout>} />
        <Route path="/imoveis/:slug" element={<Layout><PropertyDetail /></Layout>} />
        
        {/* SEO Redirects / Placeholders */}
        <Route path="/bairros/:slug" element={<Layout><Properties /></Layout>} />
        <Route path="/servicos" element={<Layout><div className="p-20 text-center">Serviços</div></Layout>} />
        <Route path="/sobre" element={<Layout><div className="p-20 text-center">Sobre Nós</div></Layout>} />
        <Route path="/contato" element={<Layout><div className="p-20 text-center">Contato</div></Layout>} />

        {/* Admin Login */}
        <Route path="/admin/login" element={<Login />} />
        
        {/* Admin Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
          <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
          
          <Route path="/admin/imoveis" element={<AdminLayout><AdminProperties /></AdminLayout>} />
          {/* Novas rotas ativadas */}
          <Route path="/admin/imoveis/novo" element={<AdminLayout><AdminPropertyForm /></AdminLayout>} />
          <Route path="/admin/imoveis/editar/:id" element={<AdminLayout><AdminPropertyForm /></AdminLayout>} />
          
          <Route path="/admin/leads" element={<AdminLayout><AdminLeads /></AdminLayout>} />
          <Route path="/admin/config" element={<AdminLayout><div className="p-4">Configurações</div></AdminLayout>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;