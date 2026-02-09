import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import { AnimatePresence } from 'framer-motion';

import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import AnimatedPage from './components/AnimatedPage';

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
import AdminTasks from './pages/AdminTasks';
import AdminConfig from './pages/AdminConfig';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// Wrapper para animar páginas públicas
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <Layout>
    <AnimatedPage>{children}</AnimatedPage>
  </Layout>
);

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ScrollToTop />
        <AnimatePresence mode="wait">
          <Routes>
            {/* === ROTAS PÚBLICAS === */}
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/imoveis" element={<PageWrapper><Properties /></PageWrapper>} />
            <Route path="/imoveis/:slug" element={<PageWrapper><PropertyDetail /></PageWrapper>} />
            <Route path="/login" element={
              <AnimatedPage>
                <Login />
              </AnimatedPage>
            } />
            
            {/* === ROTAS PROTEGIDAS (ADMIN) === */}
            <Route element={<ProtectedRoute />}>
              {/* O AdminLayout agora envolve todas as rotas abaixo */}
              <Route element={<AdminLayout />}>
                
                {/* Redireciona /admin para o dashboard */}
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                
                {/* Gestão de Imóveis */}
                <Route path="/admin/imoveis" element={<AdminProperties />} />
                <Route path="/admin/imoveis/novo" element={<AdminPropertyForm />} />
                <Route path="/admin/imoveis/editar/:id" element={<AdminPropertyForm />} />
                
                {/* CRM & Vendas */}
                <Route path="/admin/leads" element={<AdminLeads />} />
                <Route path="/admin/tarefas" element={<AdminTasks />} />
                
                {/* Configurações */}
                <Route path="/admin/config" element={<AdminConfig />} />
                
              </Route>
            </Route>

            {/* Fallback (404) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;