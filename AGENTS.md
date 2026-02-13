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
- `/src/contexts`:
  - `AuthContext`: Gerencia sessão, perfil de usuário e tolerância a falhas.
  - `ThemeContext`: Dark/Light mode (apenas para Admin).

## 4. REGRA DE OURO: ESTABILIDADE & TOLERÂNCIA A FALHAS
O projeto sofre com interrupções de conexão (Tab Sleep/Socket Disconnect). **Todo código gerado deve seguir estritamente estas regras:**

### A. Autenticação (AuthContext)
1.  **Sessão Suprema:** Se `supabase.auth.getSession()` retornar uma sessão, o usuário está logado. Ponto final.
2.  **Fallback de Perfil:** Se a busca na tabela `profiles` falhar (erro de rede), **NÃO DESLOGUE** o usuário. Use um objeto de fallback (`role: 'corretor'`) e permita o acesso.
3.  **Revalidação Silenciosa:** Ao detectar `visibilitychange` (aba ativa), tente renovar a sessão em background, sem bloquear a UI.

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
- **Vercel Deploy:** O Tailwind as vezes sofre purge excessivo. As cores da marca (`brand-500`) devem estar no safelist ou definidas explicitamente no `tailwind.config.js`.
- **Infinite Recursion:** O banco pode travar se as policies de RLS ficarem circulares. Sempre prefira funções simples de verificação.