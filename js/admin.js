/* ==============================================================================
   SISTEMA DE ADMINISTRACIÓN DE TIERRAS FISCALES - INRA BOLIVIA
   js/admin.js - Módulo de Gestión de Usuarios y Parámetros
   ============================================================================== */

import { getSupabase } from './supabase-client.js';
import { showToast } from './utils.js';

export async function fetchUsers() {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    showToast('Error cargando usuarios: ' + error.message, 'danger');
    return [];
  }
  return data;
}

export async function updateUserRole(userId, newRole) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('perfiles')
    .update({ rol: newRole })
    .eq('id', userId);

  if (error) {
    showToast('Error al cambiar rol: ' + error.message, 'danger');
  } else {
    showToast('Rol de usuario actualizado correctamente', 'success');
  }
}

export async function addCatalogValue(tipo, valor, orden = 0) {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data, error } = await supabase
    .from('catalogos')
    .insert([{ tipo, valor: valor.trim().toUpperCase(), orden, activo: true }])
    .select();

  if (error) {
    showToast('Error agregando opción: ' + error.message, 'danger');
    return null;
  }
  showToast('Valor agregado al catálogo', 'success');
  return data;
}
