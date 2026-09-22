/* ==============================================================================
   SISTEMA DE ADMINISTRACIÓN DE TIERRAS FISCALES - INRA BOLIVIA
   js/auth.js - Control de Autenticación, Roles y Permisos
   ============================================================================== */

import { getSupabase } from './supabase-client.js';
import { showToast } from './utils.js';

let currentUser = null;
let currentPerfil = null;

/**
 * Iniciar sesión con Correo y Contraseña
 */
export async function login(email, password) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Cliente Supabase no configurado');

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

/**
 * Cerrar sesión
 */
export async function logout() {
  const supabase = getSupabase();
  if (supabase) {
    await supabase.auth.signOut();
  }
  window.location.href = 'index.html';
}

/**
 * Obtener perfil extendido del usuario actual
 */
export async function getCurrentProfile() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  currentUser = user;

  const { data, error } = await supabase
    .from('perfiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!error && data) {
    currentPerfil = data;
  } else {
    // Perfil fallback básico
    currentPerfil = {
      id: user.id,
      nombre_completo: user.email.split('@')[0],
      cargo: 'Técnico',
      rol: 'lectura'
    };
  }
  return currentPerfil;
}

/**
 * Guardia de ruta: Requiere sesión activa y rol mínimo
 * @param {'lectura'|'editor'|'administrador'} minRole 
 */
export async function checkAuthGuard(minRole = 'lectura') {
  const supabase = getSupabase();
  if (!supabase) {
    window.location.href = 'index.html';
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }

  const perfil = await getCurrentProfile();
  if (!perfil) {
    window.location.href = 'index.html';
    return null;
  }

  // Verificar jerarquía de rol
  const roleHierarchy = {
    'lectura': 1,
    'editor': 2,
    'administrador': 3
  };

  const userLevel = roleHierarchy[perfil.rol] || 1;
  const requiredLevel = roleHierarchy[minRole] || 1;

  if (userLevel < requiredLevel) {
    showToast('No cuenta con permisos suficientes para esta sección', 'danger');
    window.location.href = 'dashboard.html';
    return null;
  }

  renderUserInLayout(perfil);
  applyRoleVisibility(perfil.rol);
  return perfil;
}

/**
 * Muestra el nombre y rol del usuario en el sidebar y topbar
 */
function renderUserInLayout(perfil) {
  const nameEl = document.getElementById('layout-user-name');
  const roleEl = document.getElementById('layout-user-role');
  const avatarEl = document.getElementById('layout-user-avatar');

  if (nameEl) nameEl.textContent = perfil.nombre_completo || 'Usuario';
  if (roleEl) roleEl.textContent = perfil.rol.toUpperCase();
  if (avatarEl) {
    const initials = (perfil.nombre_completo || 'U')
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    avatarEl.textContent = initials;
  }
}

/**
 * Oculta o inhabilita elementos según el rol del usuario
 */
export function applyRoleVisibility(rol) {
  const isReader = rol === 'lectura';
  const isAdmin = rol === 'administrador';

  // Si es solo lectura, ocultar botones de creación/edición/eliminación
  if (isReader) {
    document.querySelectorAll('[data-role-required="editor"]').forEach(el => {
      el.style.display = 'none';
    });
    // Inhabilitar inputs en formularios de edición
    document.querySelectorAll('form.protected-form input, form.protected-form select, form.protected-form textarea').forEach(el => {
      el.setAttribute('disabled', 'true');
    });
  }

  // Si no es admin, ocultar enlaces y opciones de administración
  if (!isAdmin) {
    document.querySelectorAll('[data-role-required="administrador"]').forEach(el => {
      el.style.display = 'none';
    });
  }
}
