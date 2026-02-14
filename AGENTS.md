# TR IMÓVEIS - AI CONTEXT & GUIDELINES

Este documento serve como fonte da verdade para Agentes de IA (Codex, Copilot, etc.) que trabalham neste projeto. Leia-o antes de gerar qualquer código.

## 1. Visão Geral do Projeto
**Nome:** Tr Imóveis CRM
**Tipo:** Plataforma Imobiliária Híbrida (Site Público + CRM Administrativo).
**Objetivo:** Permitir que clientes busquem imóveis (Venda/Aluguel) e corretores gerenciem leads, imóveis e tarefas em um painel administrativo.

## 2. Tech Stack
- **Framework:** React 18 + Vite (SPA - Single Page Application).
- **Linguagem:** TypeScript (Strict Mode).
- **Estilização:** Tailwind CSS (Mobile First).
- **Backend/Auth:** Supabase (Auth, Postgres DB, Storage, Realtime).
- **Ícones:** Lucide React.
- **Rotas:** React Router Dom v6.

## 3. Arquitetura de Pastas
- `/src/pages`:
  - **Públicas:** `Home`, `Properties`, `PropertyDetail`, `Login`, `About`, `Services`.
  - **Admin (Protegidas):** `AdminDashboard`, `AdminProperties`, `AdminLeads`, `AdminTasks`, `AdminConfig`.
- `/src/components`:
  - `AdminLayout`: Layout mestre do CRM (Sidebar + Topbar).
  - `Layout`: Layout mestre do Site Público (Navbar + Footer).
  - `ProtectedRoute`: Guarda de rotas que verifica sessão.

## 4. Authentication & State (CRÍTICO - LEIA COM ATENÇÃO)
O sistema de autenticação foi blindado contra loops de redirecionamento. **NÃO ALTERE A LÓGICA ABAIXO SEM COMPREENSÃO TOTAL.**

### A. Regra de Ouro do AuthContext (Prevenção de Loop)
O Supabase dispara eventos `SIGNED_IN` ou `TOKEN_REFRESHED` quando a aba do navegador ganha foco (visibilitychange).
1.  **Verificação de Estabilidade:** Ao receber um evento de auth, verifique se `newSession.user.id === currentUser.id`.
2.  **Ação:** Se os IDs forem iguais, **APENAS atualize o `setSession`** com o novo token e pare (`return`).
3.  **Proibido:** **JAMAIS** recarregue o perfil do usuário (`fetchProfileData`) ou limpe o estado `user` nesse cenário. Isso causa um "piscar" no estado que o `ProtectedRoute` interpreta como "não logado", gerando um loop infinito de Login <-> Dashboard.

### B. Fetch de Dados (Hooks)
1.  **Stale-While-Revalidate:** Nunca limpe o estado (ex: `setProperties([])`) antes de iniciar um fetch. Mantenha os dados antigos na tela até os novos chegarem.
2.  **Ignorar AbortError:** Se uma requisição for cancelada (mudança de aba), capture o `AbortError` e **ignore-o silenciosamente**. Não mostre erro, não limpe dados.
3.  **Botão de Refresh:** O refresh manual deve tentar renovar a sessão. Se der timeout (>3s), deve executar `window.location.reload()` (Hard Reload) para limpar sockets travados.

## 5. Banco de Dados (Supabase)
- **Tabelas Chave:** `properties` (imóveis), `leads` (clientes), `profiles` (extensão de usuários), `tasks` (tarefas).
- **RLS (Row Level Security):** Está ativo.
  - *Cuidado:* Evite criar políticas recursivas em `profiles` (ex: "admin vê admin"). Use funções `SECURITY DEFINER` para checar permissões.

## 6. Comandos
- `npm run dev`: Roda servidor local.
- `npm run build`: Gera build de produção (Vite).
- `npm run lint`: Verifica erros de TS/ESLint.

## 7. Known Issues (Problemas Conhecidos)
- **Vercel Deploy:** O Tailwind as vezes sofre purge excessivo. As cores devem estar na safelist ou usadas explicitamente.
- **Supabase Realtime:** Pode desconectar em conexões instáveis. O `App.tsx` não deve tentar reconectar manualmente agressivamente.