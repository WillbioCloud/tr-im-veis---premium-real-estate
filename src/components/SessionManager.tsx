// src/components/SessionManager.tsx
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const SessionManager = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Verifica se a rota atual NÃO começa com /admin
    const isPublicRoute = !location.pathname.startsWith('/admin');

    // Se o usuário estiver logado E estiver em uma rota pública
    if (user && isPublicRoute) {
      console.log("Usuário saindo da área administrativa. Encerrando sessão...");
      
      // Força o logout para evitar conflitos de RLS/Supabase
      signOut(); 
    }
  }, [location.pathname, user, signOut]);

  return null; // Esse componente não renderiza nada visualmente
};