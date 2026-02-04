import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { AnimatePresence } from 'framer-motion'; // <--- Importante

import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';

// Public Pages
import Home from './pages/Home';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Login from './pages/Login';

// Admin Pages
import AdminDashboard from './pages/AdminDashboard';
import AdminProperties from './pages/AdminProperties';
import AdminPropertyForm from './pages/AdminPropertyForm';
import AdminLeads from './pages/AdminLeads';
import AnimatedPage from './components/AnimatedPage'; // <--- Importe o componente

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Componente auxiliar para envolver páginas públicas com animação
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <Layout>
    <AnimatedPage>{children}</AnimatedPage>
  </Layout>
);

const App: React.FC = () => {
  const location = useLocation(); // Necessário para o Framer Motion saber que a rota mudou

  return (
    <AuthProvider>
      <ScrollToTop />
      {/* mode="wait" faz a página antiga sair antes da nova entrar */}
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          
          {/* Public Routes - Agora com animação */}
          <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
          <Route path="/imoveis" element={<PageWrapper><Properties /></PageWrapper>} />
          <Route path="/imoveis/:slug" element={<PageWrapper><PropertyDetail /></PageWrapper>} />
          
          {/* SEO Redirects */}
          <Route path="/bairros/:slug" element={<PageWrapper><Properties /></PageWrapper>} />
          <Route path="/servicos" element={<PageWrapper><div className="p-20 text-center">Serviços</div></PageWrapper>} />
          <Route path="/sobre" element={<PageWrapper><div className="p-20 text-center">Sobre Nós</div></PageWrapper>} />
          <Route path="/contato" element={<PageWrapper><div className="p-20 text-center">Contato</div></PageWrapper>} />

          {/* Admin Login - Animação diferente se quiser, ou padrão */}
          <Route path="/admin/login" element={
            <AnimatedPage>
              <Login />
            </AnimatedPage>
          } />
          
          {/* Admin Routes - Geralmente não animamos tanto admin para ser rápido, mas pode por */}
          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
            
            <Route path="/admin/imoveis" element={<AdminLayout><AdminProperties /></AdminLayout>} />
            <Route path="/admin/imoveis/novo" element={<AdminLayout><AdminPropertyForm /></AdminLayout>} />
            <Route path="/admin/imoveis/editar/:id" element={<AdminLayout><AdminPropertyForm /></AdminLayout>} />
            
            <Route path="/admin/leads" element={<AdminLayout><AdminLeads /></AdminLayout>} />
            <Route path="/admin/config" element={<AdminLayout><div className="p-4">Configurações</div></AdminLayout>} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </AuthProvider>
  );
};

export default App;