-- ==============================================================================
-- SISTEMA DE ADMINISTRACIÓN DE TIERRAS FISCALES - INRA BOLIVIA
-- 03_catalogos_seed.sql - Datos de Parametrización y Catálogos
-- ==============================================================================

-- 1. TIPO DE RESOLUCIÓN
INSERT INTO public.catalogos (tipo, valor, orden) VALUES
  ('tipo_de_res', 'ADMINISTRATIVA', 1),
  ('tipo_de_res', 'SUPREMA', 2)
ON CONFLICT (tipo, valor) DO NOTHING;

-- 2. TIPO DE TIERRA FISCAL
INSERT INTO public.catalogos (tipo, valor, orden) VALUES
  ('tipo_tf', 'IDENTIFICADA', 1),
  ('tipo_tf', 'ILEGALIDAD', 2),
  ('tipo_tf', 'IMPROCEDENCIA', 3),
  ('tipo_tf', 'RECORTE', 4),
  ('tipo_tf', 'SIN DEFINIR', 5)
ON CONFLICT (tipo, valor) DO NOTHING;

-- 3. CLASIFICACIÓN
INSERT INTO public.catalogos (tipo, valor, orden) VALUES
  ('clasificacion', 'TIERRA FISCAL', 1),
  ('clasificacion', 'COMUNITARIA', 2),
  ('clasificacion', 'MEDIANA', 3),
  ('clasificacion', 'PEQUEÑA', 4),
  ('clasificacion', 'SIN DEFINIR', 5)
ON CONFLICT (tipo, valor) DO NOTHING;

-- 4. CALIFICACIÓN
INSERT INTO public.catalogos (tipo, valor, orden) VALUES
  ('calificacion', 'TIERRA FISCAL', 1),
  ('calificacion', 'AGRICOLA', 2),
  ('calificacion', 'GANADERA', 3),
  ('calificacion', 'SIN DEFINIR', 4)
ON CONFLICT (tipo, valor) DO NOTHING;

-- 5. MODALIDAD DE SANEAMIENTO
INSERT INTO public.catalogos (tipo, valor, orden) VALUES
  ('modalidad', 'CAT-SAN', 1),
  ('modalidad', 'CAT-SAN Y SAN-TCO', 2),
  ('modalidad', 'SAN-SIM', 3),
  ('modalidad', 'SAN-TCO', 4),
  ('modalidad', 'SIN DEFINIR', 5)
ON CONFLICT (tipo, valor) DO NOTHING;

-- 6. ESTADO DE LA TIERRA FISCAL
INSERT INTO public.catalogos (tipo, valor, orden) VALUES
  ('estado', 'REPORTADO', 1),
  ('estado', 'REPORTADO - AREA URBANA', 2),
  ('estado', 'PROCESO CONTENCIOSO VIGENTE', 3),
  ('estado', 'COMPENSADO TCO', 4),
  ('estado', 'REVISAR REPORTE', 5),
  ('estado', 'REVISAR NOTA DE REMISION', 6)
ON CONFLICT (tipo, valor) DO NOTHING;

-- 7. ESTADO GLOBAL
INSERT INTO public.catalogos (tipo, valor, orden) VALUES
  ('estado_global', 'TIERRA FISCAL VIGENTE', 1),
  ('estado_global', 'TIERRA FISCAL EN PROCESO CONTENCIOSO', 2),
  ('estado_global', 'TIERRA FISCAL COMPENSADA A TCO', 3),
  ('estado_global', 'TIERRA FISCAL ANULADA', 4)
ON CONFLICT (tipo, valor) DO NOTHING;

-- 8. CLASE DE RESOLUCIÓN (DATOS EXTRA)
INSERT INTO public.catalogos (tipo, valor, orden) VALUES
  ('clase_res', 'RES', 1),
  ('clase_res', 'RECTIFICATORIA', 2)
ON CONFLICT (tipo, valor) DO NOTHING;

-- 9. REPORTE TF (VERIFICACIÓN)
INSERT INTO public.catalogos (tipo, valor, orden) VALUES
  ('reporte_tf', 'SI', 1),
  ('reporte_tf', 'NO', 2),
  ('reporte_tf', 'REVISAR REPORTE', 3),
  ('reporte_tf', 'REVISAR NOTA DE REMISION', 4)
ON CONFLICT (tipo, valor) DO NOTHING;

-- 10. ESTADO PROCESO CONTENCIOSO
INSERT INTO public.catalogos (tipo, valor, orden) VALUES
  ('estado_proceso_contencioso', 'EN PROCESO', 1),
  ('estado_proceso_contencioso', 'RESUELTO', 2),
  ('estado_proceso_contencioso', 'ARCHIVADO', 3)
ON CONFLICT (tipo, valor) DO NOTHING;

-- 11. RESOLUCIÓN DE LA SENTENCIA AGROAMBIENTAL
INSERT INTO public.catalogos (tipo, valor, orden) VALUES
  ('resolucion_sentencia', 'PROBADA LA DEMANDA', 1),
  ('resolucion_sentencia', 'IMPROBADA LA DEMANDA', 2),
  ('resolucion_sentencia', 'PARCIALMENTE PROBADA', 3),
  ('resolucion_sentencia', 'ANULADA', 4)
ON CONFLICT (tipo, valor) DO NOTHING;

-- 12. ESTADO DE COMPENSACIÓN TCO
INSERT INTO public.catalogos (tipo, valor, orden) VALUES
  ('estado_compensacion', 'PENDIENTE DE COMPENSACION', 1),
  ('estado_compensacion', 'EN TRÁMITE', 2),
  ('estado_compensacion', 'COMPENSADA TOTALMENTE', 3),
  ('estado_compensacion', 'COMPENSADA PARCIALMENTE', 4)
ON CONFLICT (tipo, valor) DO NOTHING;

-- 13. DIRECCIONES HABITUALES DE REMISIÓN DE EXPEDIENTES
INSERT INTO public.catalogos (tipo, valor, orden) VALUES
  ('direccion_destino', 'DIRECCIÓN GENERAL DE ASUNTOS JURÍDICOS', 1),
  ('direccion_destino', 'DIRECCIÓN GENERAL DE SANEAMIENTO', 2),
  ('direccion_destino', 'DIRECCIÓN GENERAL DE CATASTRO', 3),
  ('direccion_destino', 'DIRECCIÓN NACIONAL - DESPACHO', 4),
  ('direccion_destino', 'DIRECCIÓN DEPARTAMENTAL SANTA CRUZ', 5),
  ('direccion_destino', 'DIRECCIÓN DEPARTAMENTAL BENI', 6),
  ('direccion_destino', 'DIRECCIÓN DEPARTAMENTAL LA PAZ', 7),
  ('direccion_destino', 'DIRECCIÓN DEPARTAMENTAL PANDO', 8),
  ('direccion_destino', 'DIRECCIÓN DEPARTAMENTAL TARIJA', 9),
  ('direccion_destino', 'DIRECCIÓN DEPARTAMENTAL CHUQUISACA', 10),
  ('direccion_destino', 'DIRECCIÓN DEPARTAMENTAL COCHABAMBA', 11),
  ('direccion_destino', 'DIRECCIÓN DEPARTAMENTAL ORURO', 12),
  ('direccion_destino', 'DIRECCIÓN DEPARTAMENTAL POTOSÍ', 13),
  ('direccion_destino', 'TRIBUNAL AGROAMBIENTAL', 14),
  ('direccion_destino', 'OTRA UNIDAD / EXTERNO', 15)
ON CONFLICT (tipo, valor) DO NOTHING;
