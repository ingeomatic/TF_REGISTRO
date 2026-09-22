-- ==============================================================================
-- SISTEMA DE ADMINISTRACIÓN DE TIERRAS FISCALES - INRA BOLIVIA
-- 01_schema.sql - Estructura completa de Base de Datos
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. TABLA: perfiles (Extensión de auth.users de Supabase)
CREATE TABLE IF NOT EXISTS public.perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre_completo TEXT NOT NULL,
  cargo TEXT,
  rol TEXT NOT NULL CHECK (rol IN ('administrador', 'editor', 'lectura')) DEFAULT 'lectura',
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABLA: catalogos (Valores parametrizables para todos los desplegables)
CREATE TABLE IF NOT EXISTS public.catalogos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, 
  valor TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_catalogo_tipo_valor UNIQUE (tipo, valor)
);

CREATE INDEX IF NOT EXISTS idx_catalogos_tipo ON public.catalogos(tipo);

-- 3. TABLA: unidades_territoriales (Departamentos, Provincias y Municipios)
CREATE TABLE IF NOT EXISTS public.unidades_territoriales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departamento TEXT NOT NULL,
  provincia TEXT NOT NULL,
  municipio TEXT NOT NULL,
  CONSTRAINT uq_unidades_territoriales UNIQUE (departamento, provincia, municipio)
);

CREATE INDEX IF NOT EXISTS idx_ut_departamento ON public.unidades_territoriales(departamento);
CREATE INDEX IF NOT EXISTS idx_ut_provincia ON public.unidades_territoriales(departamento, provincia);

-- 4. TABLA PRINCIPAL: tierras_fiscales
CREATE TABLE IF NOT EXISTS public.tierras_fiscales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 1. DATOS GENERALES
  codpred TEXT UNIQUE NOT NULL,
  nombre_tf TEXT NOT NULL DEFAULT 'TIERRA FISCAL',
  nombre_predio TEXT,
  nombre_tf_auxiliar TEXT,
  nombre_predio_auxiliar TEXT,
  resolucion_tf TEXT,
  fecha_res_tf DATE,
  tipo_de_res TEXT,
  superficie_predio NUMERIC(15,4),
  sup_disp NUMERIC(15,4),
  sup_nodisp NUMERIC(15,4) DEFAULT 0,
  tipo_tf TEXT,
  clasificacion TEXT,
  calificacion TEXT,
  departamento TEXT,
  provincia TEXT,
  municipio TEXT,
  modalidad TEXT,
  nro_folio_real TEXT,
  
  -- Rectificatoria / Modificatoria a la resolución
  res_recti_mod TEXT,
  fecha_res_rect_mod DATE,
  detalle_rectifi TEXT,
  
  -- 2. DATOS DE REMISIÓN
  nota_remision_uadm TEXT,
  fecha_rem DATE,
  hr_remision TEXT,
  fecha_hr DATE,
  gestion_reporte INTEGER,
  obs_reporte TEXT,
  
  -- 3. DATOS DE INVENTARIO
  cod_inv TEXT,
  expediente TEXT,
  numero_archivador TEXT,
  cuerpos INTEGER,
  gavetero TEXT,
  caja TEXT,
  obs_inventario TEXT,
  responsable TEXT,
  director TEXT,
  
  -- 4. DATOS EXTRAS (Históricos / Legacy)
  clase_res TEXT,
  nota_catastro_cc TEXT,
  certif_tan TEXT,
  fecha_revi DATE,
  registro_ddrr TEXT,
  nota_externa_envio_ddrr TEXT,
  hr_ddrr TEXT,
  nota_remitida_via_saneamiento_catastro TEXT,
  observacion_1 TEXT,
  
  -- 5. DATOS DE CONTROL DE ESTADO
  reporte_tf TEXT,
  proceso_contencioso BOOLEAN DEFAULT FALSE,
  estado TEXT,
  estado_global TEXT,
  observaciones_globales TEXT,
  
  -- 6. PROCESOS CONTENCIOSOS (Tribunal Agroambiental)
  nro_sentencia_agroambiental TEXT,
  fecha_sentencia DATE,
  estado_proceso_contencioso TEXT,
  resolucion_sentencia TEXT,
  obs_procont TEXT,
  
  -- 7. COMPENSACIONES A TCO
  nombre_tco TEXT,
  superficie_compensada NUMERIC(15,4),
  estado_compensacion TEXT,
  obs_compensacion TEXT,
  
  -- AUDITORÍA
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_tf_codpred ON public.tierras_fiscales(codpred);
CREATE INDEX IF NOT EXISTS idx_tf_expediente ON public.tierras_fiscales(expediente);
CREATE INDEX IF NOT EXISTS idx_tf_departamento ON public.tierras_fiscales(departamento);
CREATE INDEX IF NOT EXISTS idx_tf_estado_global ON public.tierras_fiscales(estado_global);
CREATE INDEX IF NOT EXISTS idx_tf_gestion ON public.tierras_fiscales(gestion_reporte);
CREATE INDEX IF NOT EXISTS idx_tf_clasificacion ON public.tierras_fiscales(clasificacion);

-- 5. TABLA: remision_expedientes (Trazabilidad de Movimientos)
CREATE TABLE IF NOT EXISTS public.remision_expedientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codpred TEXT NOT NULL REFERENCES public.tierras_fiscales(codpred) ON UPDATE CASCADE ON DELETE CASCADE,
  expediente TEXT,
  tipo_movimiento TEXT NOT NULL CHECK (tipo_movimiento IN ('SALIDA', 'RETORNO')),
  direccion_destino TEXT NOT NULL,
  motivo TEXT NOT NULL,
  nota_remision TEXT,
  fecha_nota DATE,
  hr_remision TEXT,
  fecha_hr DATE,
  nro_cuerpos INTEGER DEFAULT 1,
  nro_fojas INTEGER,
  funcionario_remitente TEXT,
  fecha_retorno DATE,
  nota_retorno TEXT,
  hr_retorno TEXT,
  obs_remision TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_rem_codpred ON public.remision_expedientes(codpred);
CREATE INDEX IF NOT EXISTS idx_rem_expediente ON public.remision_expedientes(expediente);
CREATE INDEX IF NOT EXISTS idx_rem_tipo ON public.remision_expedientes(tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_rem_created_at ON public.remision_expedientes(created_at);

-- 6. TRIGGERS Y FUNCIONES AUTOMÁTICAS
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tf_updated_at ON public.tierras_fiscales;
CREATE TRIGGER trg_tf_updated_at
  BEFORE UPDATE ON public.tierras_fiscales
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

DROP TRIGGER IF EXISTS trg_perfiles_updated_at ON public.perfiles;
CREATE TRIGGER trg_perfiles_updated_at
  BEFORE UPDATE ON public.perfiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE OR REPLACE FUNCTION public.fn_calcular_campos_tf()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.nombre_tf IS NULL OR TRIM(NEW.nombre_tf) = '' THEN
    NEW.nombre_tf := 'TIERRA FISCAL';
  END IF;

  IF NEW.superficie_predio IS NOT NULL THEN
    NEW.sup_disp := COALESCE(NEW.superficie_predio, 0) - COALESCE(NEW.sup_nodisp, 0);
  END IF;

  IF NEW.fecha_rem IS NOT NULL THEN
    NEW.gestion_reporte := EXTRACT(YEAR FROM NEW.fecha_rem)::INTEGER;
  ELSIF NEW.gestion_reporte IS NULL AND NEW.created_at IS NOT NULL THEN
    NEW.gestion_reporte := EXTRACT(YEAR FROM NEW.created_at)::INTEGER;
  END IF;

  IF (NEW.nro_sentencia_agroambiental IS NOT NULL AND TRIM(NEW.nro_sentencia_agroambiental) <> '') 
     OR (NEW.obs_procont IS NOT NULL AND TRIM(NEW.obs_procont) <> '') THEN
    NEW.proceso_contencioso := TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tf_calculos ON public.tierras_fiscales;
CREATE TRIGGER trg_tf_calculos
  BEFORE INSERT OR UPDATE ON public.tierras_fiscales
  FOR EACH ROW EXECUTE FUNCTION public.fn_calcular_campos_tf();

CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre_completo, cargo, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre_completo', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'cargo', 'Técnico de Tierras Fiscales'),
    COALESCE(NEW.raw_user_meta_data->>'rol', 'lectura')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_on_auth_user_created ON auth.users;
CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();
