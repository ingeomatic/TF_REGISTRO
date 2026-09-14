/* ==============================================================================
   SISTEMA DE ADMINISTRACIÓN DE TIERRAS FISCALES - INRA BOLIVIA
   js/remisiones.js - Módulo de Remisión y Trazabilidad de Expedientes
   ============================================================================== */

import { getSupabase } from './supabase-client.js';
import { showToast } from './utils.js';

/**
 * Consulta todos los movimientos de expedientes registrados
 */
export async function fetchMovimientosExpedientes(filters = {}) {
  const supabase = getSupabase();
  if (!supabase) return [];

  let query = supabase
    .from('remision_expedientes')
    .select(`
      *,
      tierras_fiscales (
        nombre_predio,
        departamento,
        numero_archivador
      )
    `)
    .order('created_at', { ascending: false });

  if (filters.tipo_movimiento) {
    query = query.eq('tipo_movimiento', filters.tipo_movimiento);
  }

  if (filters.direccion_destino) {
    query = query.eq('direccion_destino', filters.direccion_destino);
  }

  if (filters.search) {
    const term = filters.search.trim();
    query = query.or(`codpred.ilike.%${term}%,expediente.ilike.%${term}%,hr_remision.ilike.%${term}%,nota_remision.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error cargando movimientos:', error);
    showToast('Error cargando movimientos: ' + error.message, 'danger');
    return [];
  }
  return data;
}

/**
 * Obtiene el historial de movimientos de un expediente específico
 */
export async function getHistorialPorCodpred(codpred) {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('remision_expedientes')
    .select('*')
    .eq('codpred', codpred)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error historial expediente:', error);
    return [];
  }
  return data;
}

/**
 * Registra una salida de expediente hacia otra Dirección
 */
export async function registrarSalidaExpediente(payload) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Cliente Supabase no disponible');

  const record = {
    codpred: payload.codpred,
    expediente: payload.expediente || null,
    tipo_movimiento: 'SALIDA',
    direccion_destino: payload.direccion_destino,
    motivo: payload.motivo,
    nota_remision: payload.nota_remision,
    fecha_nota: payload.fecha_nota || null,
    hr_remision: payload.hr_remision,
    fecha_hr: payload.fecha_hr || null,
    nro_cuerpos: parseInt(payload.nro_cuerpos) || 1,
    nro_fojas: payload.nro_fojas ? parseInt(payload.nro_fojas) : null,
    funcionario_remitente: payload.funcionario_remitente,
    obs_remision: payload.obs_remision || null
  };

  const { data, error } = await supabase
    .from('remision_expedientes')
    .insert([record])
    .select()
    .single();

  if (error) throw error;
  showToast('Salida de expediente registrada correctamente', 'success');
  return data;
}

/**
 * Registra el retorno de un expediente al Archivo INRA
 */
export async function registrarRetornoExpediente(payload) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Cliente Supabase no disponible');

  const record = {
    codpred: payload.codpred,
    expediente: payload.expediente || null,
    tipo_movimiento: 'RETORNO',
    direccion_destino: 'ARCHIVO TIERRAS FISCALES INRA',
    motivo: 'Retorno al archivo de custodia: ' + (payload.motivo || 'Devolución de trámite concluido'),
    nota_remision: payload.nota_retorno || null,
    fecha_nota: payload.fecha_retorno || null,
    hr_remision: payload.hr_retorno || null,
    fecha_hr: payload.fecha_retorno || null,
    nro_cuerpos: parseInt(payload.nro_cuerpos) || 1,
    nro_fojas: payload.nro_fojas ? parseInt(payload.nro_fojas) : null,
    funcionario_remitente: payload.funcionario_recepcion || 'Custodio de Archivo',
    fecha_retorno: payload.fecha_retorno || new Date().toISOString().split('T')[0],
    nota_retorno: payload.nota_retorno || null,
    hr_retorno: payload.hr_retorno || null,
    obs_remision: payload.obs_remision || null
  };

  const { data, error } = await supabase
    .from('remision_expedientes')
    .insert([record])
    .select()
    .single();

  if (error) throw error;
  showToast('Retorno de expediente registrado y archivado', 'success');
  return data;
}
