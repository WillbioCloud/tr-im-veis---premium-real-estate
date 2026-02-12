// src/App.tsx
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import { AnimatePresence } from 'framer-motion';

// IMPORTAR O NOVO COMPONENTE
import { SessionManager } from './components/SessionManager';

import Layout from './components/Layout';
import AdminLayout from './components/AdminLayout';
import AnimatedPage from './components/AnimatedPage';

// Public Pages
import Home from './pages/Home';
import Properties from './pages/Properties';
import PropertyDetail from './pages/PropertyDetail';
import Login from './pages/Login';
import About from './pages/About';
import Services from './pages/Services';

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

// Wrapper simplificado para páginas públicas
const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <Layout>
    <AnimatedPage>{children}</AnimatedPage>
  </Layout>
);

const App: React.FC = () => {
  const location = useLocation();

  return (
    <AuthProvider>
      <ThemeProvider>
        <ScrollToTop />
        
        {/* ADICIONAR O SESSION MANAGER AQUI */}
        {/* Ele vai rodar silenciosamente monitorando a navegação */}
        <SessionManager />

        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            
            {/* === ROTAS PÚBLICAS === */}
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/imoveis" element={<PageWrapper><Properties /></PageWrapper>} />
            <Route path="/imoveis/:slug" element={<PageWrapper><PropertyDetail /></PageWrapper>} />
            
            {/* SEO / Landing Pages */}
            <Route path="/bairros/:slug" element={<PageWrapper><Properties /></PageWrapper>} />
            <Route path="/servicos" element={<PageWrapper><Services /></PageWrapper>} />
            <Route path="/sobre" element={<PageWrapper><About /></PageWrapper>} />
            <Route path="/contato" element={<PageWrapper><div className="pt-20 text-center dark:text-white">Contato</div></PageWrapper>} />

            {/* Admin Login */}
            <Route path="/admin/login" element={
              <AnimatedPage>
                <Login />
              </AnimatedPage>
            } />
            
            {/* === ROTAS PROTEGIDAS (ADMIN) === */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/imoveis" element={<AdminProperties />} />
                <Route path="/admin/imoveis/novo" element={<AdminPropertyForm />} />
                <Route path="/admin/imoveis/editar/:id" element={<AdminPropertyForm />} />
                <Route path="/admin/leads" element={<AdminLeads />} />
                <Route path="/admin/tarefas" element={<AdminTasks />} />
                <Route path="/admin/config" element={<AdminConfig />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;