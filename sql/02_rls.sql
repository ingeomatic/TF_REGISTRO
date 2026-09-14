-- ==============================================================================
-- SISTEMA DE ADMINISTRACIÓN DE TIERRAS FISCALES - INRA BOLIVIA
-- 02_rls.sql - Políticas de Seguridad de Nivel de Fila (Row Level Security)
-- ==============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catalogos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unidades_territoriales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tierras_fiscales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remision_expedientes ENABLE ROW LEVEL SECURITY;

-- Función de ayuda para obtener el rol del usuario autenticado actual
CREATE OR REPLACE FUNCTION public.get_user_rol()
RETURNS TEXT AS $$
  SELECT rol FROM public.perfiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ------------------------------------------------------------------------------
-- 1. POLÍTICAS: perfiles
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "perfiles_select" ON public.perfiles;
CREATE POLICY "perfiles_select" ON public.perfiles FOR SELECT
  USING (id = auth.uid() OR public.get_user_rol() = 'administrador');

DROP POLICY IF EXISTS "perfiles_insert" ON public.perfiles;
CREATE POLICY "perfiles_insert" ON public.perfiles FOR INSERT
  WITH CHECK (public.get_user_rol() = 'administrador' OR id = auth.uid());

DROP POLICY IF EXISTS "perfiles_update" ON public.perfiles;
CREATE POLICY "perfiles_update" ON public.perfiles FOR UPDATE
  USING (id = auth.uid() OR public.get_user_rol() = 'administrador');

DROP POLICY IF EXISTS "perfiles_delete" ON public.perfiles;
CREATE POLICY "perfiles_delete" ON public.perfiles FOR DELETE
  USING (public.get_user_rol() = 'administrador');

-- ------------------------------------------------------------------------------
-- 2. POLÍTICAS: catalogos
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "catalogos_select" ON public.catalogos;
CREATE POLICY "catalogos_select" ON public.catalogos FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "catalogos_insert" ON public.catalogos;
CREATE POLICY "catalogos_insert" ON public.catalogos FOR INSERT
  WITH CHECK (public.get_user_rol() = 'administrador');

DROP POLICY IF EXISTS "catalogos_update" ON public.catalogos;
CREATE POLICY "catalogos_update" ON public.catalogos FOR UPDATE
  USING (public.get_user_rol() = 'administrador');

DROP POLICY IF EXISTS "catalogos_delete" ON public.catalogos;
CREATE POLICY "catalogos_delete" ON public.catalogos FOR DELETE
  USING (public.get_user_rol() = 'administrador');

-- ------------------------------------------------------------------------------
-- 3. POLÍTICAS: unidades_territoriales
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "ut_select" ON public.unidades_territoriales;
CREATE POLICY "ut_select" ON public.unidades_territoriales FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "ut_insert" ON public.unidades_territoriales;
CREATE POLICY "ut_insert" ON public.unidades_territoriales FOR INSERT
  WITH CHECK (public.get_user_rol() = 'administrador');

DROP POLICY IF EXISTS "ut_update" ON public.unidades_territoriales;
CREATE POLICY "ut_update" ON public.unidades_territoriales FOR UPDATE
  USING (public.get_user_rol() = 'administrador');

DROP POLICY IF EXISTS "ut_delete" ON public.unidades_territoriales;
CREATE POLICY "ut_delete" ON public.unidades_territoriales FOR DELETE
  USING (public.get_user_rol() = 'administrador');

-- ------------------------------------------------------------------------------
-- 4. POLÍTICAS: tierras_fiscales
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "tf_select" ON public.tierras_fiscales;
CREATE POLICY "tf_select" ON public.tierras_fiscales FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "tf_insert" ON public.tierras_fiscales;
CREATE POLICY "tf_insert" ON public.tierras_fiscales FOR INSERT
  WITH CHECK (public.get_user_rol() IN ('administrador', 'editor'));

DROP POLICY IF EXISTS "tf_update" ON public.tierras_fiscales;
CREATE POLICY "tf_update" ON public.tierras_fiscales FOR UPDATE
  USING (public.get_user_rol() IN ('administrador', 'editor'));

DROP POLICY IF EXISTS "tf_delete" ON public.tierras_fiscales;
CREATE POLICY "tf_delete" ON public.tierras_fiscales FOR DELETE
  USING (public.get_user_rol() = 'administrador');

-- ------------------------------------------------------------------------------
-- 5. POLÍTICAS: remision_expedientes
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "rem_select" ON public.remision_expedientes;
CREATE POLICY "rem_select" ON public.remision_expedientes FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "rem_insert" ON public.remision_expedientes;
CREATE POLICY "rem_insert" ON public.remision_expedientes FOR INSERT
  WITH CHECK (public.get_user_rol() IN ('administrador', 'editor'));

DROP POLICY IF EXISTS "rem_update" ON public.remision_expedientes;
CREATE POLICY "rem_update" ON public.remision_expedientes FOR UPDATE
  USING (public.get_user_rol() IN ('administrador', 'editor'));

DROP POLICY IF EXISTS "rem_delete" ON public.remision_expedientes;
CREATE POLICY "rem_delete" ON public.remision_expedientes FOR DELETE
  USING (public.get_user_rol() = 'administrador');
