-- TR Imóveis - Segurança e RLS
-- Executar no SQL Editor do Supabase

BEGIN;

-- 1) Leads: obrigar RLS
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leads FORCE ROW LEVEL SECURITY;

-- 2) Limpeza de políticas antigas para evitar conflitos
DROP POLICY IF EXISTS "Leads access policy" ON public.leads;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.leads;
DROP POLICY IF EXISTS "Leads visibility" ON public.leads;

-- 3) Política definitiva: admin vê tudo; corretor vê apenas os próprios leads
CREATE POLICY "Leads access policy"
ON public.leads
FOR SELECT
TO authenticated
USING (
  assigned_to = auth.uid()
  OR EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
  )
);

-- 4) Profiles: leitura pública para páginas de imóveis
DROP POLICY IF EXISTS "Public profiles visibility" ON public.profiles;
CREATE POLICY "Public profiles visibility"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- 5) Profiles: update apenas do próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

COMMIT;
