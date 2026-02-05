import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext'; // <--- Importante para Dark Mode
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
import AdminTasks from './pages/AdminTasks';   // <--- Nova página de Agenda
import AdminConfig from './pages/AdminConfig'; // <--- Nova página de Configurações

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
  const location = useLocation();

  return (
    <AuthProvider>
      <ThemeProvider> {/* <--- Envolvendo a aplicação com o Tema */}
        <ScrollToTop />
        
        {/* AnimatePresence gerencia as transições de saída */}
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            
            {/* === ROTAS PÚBLICAS === */}
            <Route path="/" element={<PageWrapper><Home /></PageWrapper>} />
            <Route path="/imoveis" element={<PageWrapper><Properties /></PageWrapper>} />
            <Route path="/imoveis/:slug" element={<PageWrapper><PropertyDetail /></PageWrapper>} />
            
            {/* SEO / Landing Pages (Placeholders) */}
            <Route path="/bairros/:slug" element={<PageWrapper><Properties /></PageWrapper>} />
            <Route path="/servicos" element={<PageWrapper><div className="p-20 text-center dark:text-white">Serviços</div></PageWrapper>} />
            <Route path="/sobre" element={<PageWrapper><div className="p-20 text-center dark:text-white">Sobre Nós</div></PageWrapper>} />
            <Route path="/contato" element={<PageWrapper><div className="p-20 text-center dark:text-white">Contato</div></PageWrapper>} />

            {/* Admin Login */}
            <Route path="/admin/login" element={
              <AnimatedPage>
                <Login />
              </AnimatedPage>
            } />
            
            {/* === ROTAS PROTEGIDAS (ADMIN) === */}
            <Route element={<ProtectedRoute />}>
              <Route path="/admin" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
              <Route path="/admin/dashboard" element={<AdminLayout><AdminDashboard /></AdminLayout>} />
              
              {/* Gestão de Imóveis */}
              <Route path="/admin/imoveis" element={<AdminLayout><AdminProperties /></AdminLayout>} />
              <Route path="/admin/imoveis/novo" element={<AdminLayout><AdminPropertyForm /></AdminLayout>} />
              <Route path="/admin/imoveis/editar/:id" element={<AdminLayout><AdminPropertyForm /></AdminLayout>} />
              
              {/* CRM & Vendas */}
              <Route path="/admin/leads" element={<AdminLayout><AdminLeads /></AdminLayout>} />
              <Route path="/admin/tarefas" element={<AdminLayout><AdminTasks /></AdminLayout>} /> {/* <--- Rota da Agenda */}
              
              {/* Configurações */}
              <Route path="/admin/config" element={<AdminLayout><AdminConfig /></AdminLayout>} /> {/* <--- Rota de Config */}
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