/* ==============================================================================
   SISTEMA DE ADMINISTRACIÓN DE TIERRAS FISCALES - INRA BOLIVIA
   js/catalogos.js - Carga y Poblado de Desplegables Parametrizados
   ============================================================================== */

import { getSupabase } from './supabase-client.js';

// Catálogos base precargados en memoria (garantiza funcionamiento offline o inicial)
const DEFAULT_CATALOGOS = {
  tipo_de_res: ['ADMINISTRATIVA', 'SUPREMA'],
  tipo_tf: ['IDENTIFICADA', 'ILEGALIDAD', 'IMPROCEDENCIA', 'RECORTE', 'SIN DEFINIR'],
  clasificacion: ['TIERRA FISCAL', 'COMUNITARIA', 'MEDIANA', 'PEQUEÑA', 'SIN DEFINIR'],
  calificacion: ['TIERRA FISCAL', 'AGRICOLA', 'GANADERA', 'SIN DEFINIR'],
  modalidad: ['CAT-SAN', 'CAT-SAN Y SAN-TCO', 'SAN-SIM', 'SAN-TCO', 'SIN DEFINIR'],
  estado: ['REPORTADO', 'REPORTADO - AREA URBANA', 'PROCESO CONTENCIOSO VIGENTE', 'COMPENSADO TCO', 'REVISAR REPORTE', 'REVISAR NOTA DE REMISION'],
  estado_global: ['TIERRA FISCAL VIGENTE', 'TIERRA FISCAL EN PROCESO CONTENCIOSO', 'TIERRA FISCAL COMPENSADA A TCO', 'TIERRA FISCAL ANULADA'],
  clase_res: ['RES', 'RECTIFICATORIA'],
  reporte_tf: ['SI', 'NO', 'REVISAR REPORTE', 'REVISAR NOTA DE REMISION'],
  estado_proceso_contencioso: ['EN PROCESO', 'RESUELTO', 'ARCHIVADO'],
  resolucion_sentencia: ['PROBADA LA DEMANDA', 'IMPROBADA LA DEMANDA', 'PARCIALMENTE PROBADA', 'ANULADA'],
  estado_compensacion: ['PENDIENTE DE COMPENSACION', 'EN TRÁMITE', 'COMPENSADA TOTALMENTE', 'COMPENSADA PARCIALMENTE'],
  direccion_destino: [
    'DIRECCIÓN GENERAL DE ASUNTOS JURÍDICOS',
    'DIRECCIÓN GENERAL DE SANEAMIENTO',
    'DIRECCIÓN GENERAL DE CATASTRO',
    'DIRECCIÓN NACIONAL - DESPACHO',
    'DIRECCIÓN DEPARTAMENTAL SANTA CRUZ',
    'DIRECCIÓN DEPARTAMENTAL BENI',
    'DIRECCIÓN DEPARTAMENTAL LA PAZ',
    'DIRECCIÓN DEPARTAMENTAL PANDO',
    'DIRECCIÓN DEPARTAMENTAL TARIJA',
    'DIRECCIÓN DEPARTAMENTAL CHUQUISACA',
    'DIRECCIÓN DEPARTAMENTAL COCHABAMBA',
    'DIRECCIÓN DEPARTAMENTAL ORURO',
    'DIRECCIÓN DEPARTAMENTAL POTOSÍ',
    'TRIBUNAL AGROAMBIENTAL',
    'OTRA UNIDAD / EXTERNO'
  ]
};

let catalogoCache = {};

/**
 * Obtiene la lista de valores de un catálogo dado
 */
export async function getCatalogoValues(tipo) {
  if (catalogoCache[tipo]) return catalogoCache[tipo];

  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('catalogos')
        .select('valor, orden')
        .eq('tipo', tipo)
        .eq('activo', true)
        .order('orden', { ascending: true });

      if (!error && data && data.length > 0) {
        catalogoCache[tipo] = data.map(d => d.valor);
        return catalogoCache[tipo];
      }
    } catch (e) {
      console.warn(`No se pudo consultar Supabase para el catálogo ${tipo}, usando valores por defecto.`, e);
    }
  }

  // Si falló o no hay base de datos conectada, retornar valores por defecto
  catalogoCache[tipo] = DEFAULT_CATALOGOS[tipo] || [];
  return catalogoCache[tipo];
}

/**
 * Llena un elemento <select> con las opciones del catálogo
 */
export async function populateSelect(selectEl, tipo, selectedValue = '') {
  if (!selectEl) return;
  const values = await getCatalogoValues(tipo);

  const currentVal = selectedValue || selectEl.getAttribute('data-selected-value') || selectEl.value;
  selectEl.innerHTML = '<option value="">-- Seleccionar --</option>';

  values.forEach(val => {
    const opt = document.createElement('option');
    opt.value = val;
    opt.textContent = val;
    if (val === currentVal) {
      opt.selected = true;
    }
    selectEl.appendChild(opt);
  });
}

/**
 * Escanea y llena automáticamente todos los selects con atributo data-catalogo="nombre"
 */
export async function initAllCatalogSelects() {
  const selects = document.querySelectorAll('select[data-catalogo]');
  for (const sel of selects) {
    const tipo = sel.getAttribute('data-catalogo');
    await populateSelect(sel, tipo);
  }
}
