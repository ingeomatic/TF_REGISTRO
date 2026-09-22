/* ==============================================================================
   SISTEMA DE ADMINISTRACIÓN DE TIERRAS FISCALES - INRA BOLIVIA
   js/tierras-fiscales.js - Lógica de Negocio y CRUD Principal
   ============================================================================== */

import { getSupabase } from './supabase-client.js';
import { showToast, formatDate, formatHectareas } from './utils.js';

/**
 * Consulta la lista de tierras fiscales con filtros opcionales
 */
export async function fetchTierrasFiscales(filters = {}) {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from('tierras_fiscales')
    .select(`
      *,
      remision_expedientes (
        tipo_movimiento,
        direccion_destino,
        created_at
      )
    `)
    .order('created_at', { ascending: false });

  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(`codpred.ilike.%${term}%,nombre_predio.ilike.%${term}%,resolucion_tf.ilike.%${term}%,expediente.ilike.%${term}%`);
  }

  if (filters.departamento) {
    query = query.eq('departamento', filters.departamento);
  }

  if (filters.estado_global) {
    query = query.eq('estado_global', filters.estado_global);
  }

  if (filters.clasificacion) {
    query = query.eq('clasificacion', filters.clasificacion);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error al listar tierras fiscales:', error);
    showToast('Error al consultar tierras fiscales: ' + error.message, 'danger');
    return [];
  }

  // Calcular la ubicación actual del expediente en base al último movimiento
  return data.map(tf => {
    let ubicacion = 'ARCHIVO INRA';
    let estadoMov = 'EN_ARCHIVO';

    if (tf.remision_expedientes && tf.remision_expedientes.length > 0) {
      // Ordenar por fecha más reciente
      const movs = tf.remision_expedientes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const ultimo = movs[0];
      if (ultimo.tipo_movimiento === 'SALIDA') {
        ubicacion = ultimo.direccion_destino || 'REMITIDO';
        estadoMov = 'REMITIDO';
      }
    }

    return {
      ...tf,
      _ubicacion_expediente: ubicacion,
      _estado_expediente: estadoMov
    };
  });
}

/**
 * Obtiene una tierra fiscal por su CODPRED
 */
export async function getTierraFiscalByCodpred(codpred) {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('tierras_fiscales')
    .select('*')
    .eq('codpred', codpred)
    .single();

  if (error) {
    console.error('Error al obtener tierra fiscal:', error);
    return null;
  }
  return data;
}

/**
 * Guarda o actualiza un registro completo de Tierra Fiscal
 */
export async function saveTierraFiscal(record, isEdit = false) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Cliente Supabase no disponible');

  // Cálculos automáticos de negocio
  record.nombre_tf = 'TIERRA FISCAL';

  const supTotal = parseFloat(record.superficie_predio) || 0;
  const supNoDisp = parseFloat(record.sup_nodisp) || 0;
  record.sup_disp = Math.max(0, supTotal - supNoDisp);

  if (record.fecha_rem) {
    const d = new Date(record.fecha_rem);
    if (!isNaN(d.getFullYear())) {
      record.gestion_reporte = d.getFullYear();
    }
  }

  // Limpiar valores vacíos
  Object.keys(record).forEach(k => {
    if (record[k] === '') record[k] = null;
  });

  if (isEdit) {
    const { data, error } = await supabase
      .from('tierras_fiscales')
      .update(record)
      .eq('codpred', record.codpred)
      .select()
      .single();

    if (error) throw error;
    showToast('Tierra Fiscal actualizada exitosamente', 'success');
    return data;
  } else {
    const { data, error } = await supabase
      .from('tierras_fiscales')
      .insert([record])
      .select()
      .single();

    if (error) throw error;
    showToast('Tierra Fiscal registrada exitosamente', 'success');
    return data;
  }
}

/**
 * Elimina una Tierra Fiscal (solo rol administrador)
 */
export async function deleteTierraFiscal(codpred) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Cliente Supabase no disponible');

  const { error } = await supabase
    .from('tierras_fiscales')
    .delete()
    .eq('codpred', codpred);

  if (error) throw error;
  showToast(`Tierra Fiscal ${codpred} eliminada`, 'success');
}
